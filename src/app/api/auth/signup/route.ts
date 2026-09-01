import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/user";
import { signToken } from "@/lib/jwt";
import { cookies } from "next/headers";
import {
  getClientIp,
  checkRateLimit,
  RATE_LIMITS,
  checkHoneypot,
  checkTiming,
  validateEmail,
  validateName,
  validatePassword,
  sanitizeString,
  detectRegistrationAbuse,
  logSecurityEvent,
  verifyCaptcha,
} from "@/lib/security";
import { sendEmail, generateAccountCreatedEmail } from "@/lib/mail";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const userAgent = request.headers.get("user-agent") || "unknown";

  try {
    await connectToDatabase();
    const body = await request.json();
    const { name, email, password } = body;

    // ─── Honeypot Check ────────────────────────────────────────────────
    if (!checkHoneypot(body)) {
      await logSecurityEvent({
        type: "honeypot_triggered",
        severity: "medium",
        ip,
        userAgent,
        path: "/api/auth/signup",
        method: "POST",
        details: { email: email || "unknown" },
        blocked: true,
      });
      // Return success to confuse bots
      return NextResponse.json({
        success: true,
        data: { user: { id: "dummy", name: "User", email: "dummy@example.com", role: "customer" } },
      });
    }

    // ─── Timing Check ──────────────────────────────────────────────────
    if (!checkTiming(body, 3)) {
      await logSecurityEvent({
        type: "timing_check_failed",
        severity: "medium",
        ip,
        userAgent,
        path: "/api/auth/signup",
        method: "POST",
        details: { email: email || "unknown" },
        blocked: true,
      });
      return NextResponse.json({ error: "Registration failed" }, { status: 400 });
    }

    // ─── CAPTCHA Verification ──────────────────────────────────────────
    const captchaToken = body["cf-turnstile-response"] || body.captchaToken;
    const captchaResult = await verifyCaptcha(captchaToken, ip);
    if (!captchaResult.success) {
      await logSecurityEvent({
        type: "captcha_failed",
        severity: "medium",
        ip,
        userAgent,
        path: "/api/auth/signup",
        method: "POST",
        details: { email: email || "unknown", error: captchaResult.error },
        blocked: true,
      });
      return NextResponse.json({ error: "CAPTCHA verification failed" }, { status: 400 });
    }

    // ─── Rate Limiting ─────────────────────────────────────────────────
    const rateLimit = checkRateLimit(`signup:${ip}`, RATE_LIMITS.SIGNUP.maxRequests, RATE_LIMITS.SIGNUP.windowMs);
    if (!rateLimit.allowed) {
      await logSecurityEvent({
        type: "rate_limit_triggered",
        severity: "high",
        ip,
        userAgent,
        path: "/api/auth/signup",
        method: "POST",
        details: { email: email || "unknown", limit: "signup" },
        blocked: true,
      });
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        { status: 429 }
      );
    }

    // ─── Input Validation ──────────────────────────────────────────────
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    const sanitizedName = sanitizeString(String(name), 100);
    const sanitizedEmail = sanitizeString(String(email), 254).toLowerCase();

    if (!validateName(sanitizedName)) {
      return NextResponse.json(
        { error: "Invalid name format" },
        { status: 400 }
      );
    }

    if (!validateEmail(sanitizedEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    const passwordCheck = validatePassword(String(password));
    if (!passwordCheck.valid) {
      return NextResponse.json(
        { error: passwordCheck.reason },
        { status: 400 }
      );
    }

    // ─── Abuse Detection ───────────────────────────────────────────────
    const abuse = detectRegistrationAbuse(ip, sanitizedEmail);
    if (abuse.suspicious) {
      await logSecurityEvent({
        type: "suspicious_activity",
        severity: "high",
        ip,
        userAgent,
        path: "/api/auth/signup",
        method: "POST",
        details: { email: sanitizedEmail, reason: abuse.reason },
        blocked: true,
      });
      return NextResponse.json(
        { error: "Registration failed. Please try again later." },
        { status: 429 }
      );
    }

    // ─── Duplicate Check ───────────────────────────────────────────────
    const existingUser = await User.findOne({ email: sanitizedEmail });
    if (existingUser) {
      // Don't reveal whether email exists — return success-like response
      await logSecurityEvent({
        type: "signup_attempt",
        severity: "low",
        ip,
        userAgent,
        path: "/api/auth/signup",
        method: "POST",
        details: { email: sanitizedEmail, result: "duplicate" },
      });
      return NextResponse.json({
        success: true,
        data: { message: "If this email is not already registered, you will receive a verification link." },
      });
    }

    // ─── Create Account ────────────────────────────────────────────────
    const hashedPassword = await bcrypt.hash(String(password), 12);
    const slug = sanitizedName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const user = await User.create({
      name: sanitizedName,
      email: sanitizedEmail,
      password: hashedPassword,
      slug: `${slug}-${Date.now()}`,
      role: "customer", // ALWAYS customer for public registration
      isEmailVerified: false,
      isActive: true,
    });

    await logSecurityEvent({
      type: "signup_success",
      severity: "low",
      userId: user._id.toString(),
      email: sanitizedEmail,
      ip,
      userAgent,
      path: "/api/auth/signup",
      method: "POST",
    });

    // ─── Send Welcome Email ───────────────────────────────────────────
    const welcomeEmail = generateAccountCreatedEmail({ name: sanitizedName, email: sanitizedEmail });
    sendEmail({ to: sanitizedEmail, ...welcomeEmail, template: "account-created" }).catch(() => {});

    // ─── Issue Token ───────────────────────────────────────────────────
    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      role: "customer",
    });

    const cookieStore = await cookies();
    cookieStore.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: "customer",
        },
        token,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    await logSecurityEvent({
      type: "signup_attempt",
      severity: "medium",
      ip,
      userAgent,
      path: "/api/auth/signup",
      method: "POST",
      details: { error: String(error) },
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
