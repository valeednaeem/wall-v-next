import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/user";
import { signToken } from "@/lib/jwt";
import { cookies } from "next/headers";
import { checkRateLimit, getClientIp, RATE_LIMITS, logSecurityEvent, sanitizeString } from "@/lib/security";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const userAgent = request.headers.get("user-agent") || "unknown";

  try {
    // ─── IP Rate Limit ─────────────────────────────────────────────────
    const ipLimit = checkRateLimit(`login:${ip}`, RATE_LIMITS.LOGIN.maxRequests, RATE_LIMITS.LOGIN.windowMs);
    if (!ipLimit.allowed) {
      await logSecurityEvent({
        type: "rate_limit_triggered",
        severity: "high",
        ip,
        userAgent,
        path: "/api/auth/login",
        method: "POST",
        details: { limit: "login_ip" },
        blocked: true,
      });
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((ipLimit.resetAt - Date.now()) / 1000)) } }
      );
    }

    await connectToDatabase();
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const sanitizedEmail = sanitizeString(String(email), 254).toLowerCase();

    // ─── Email Rate Limit ──────────────────────────────────────────────
    const emailLimit = checkRateLimit(`login_email:${sanitizedEmail}`, RATE_LIMITS.LOGIN_EMAIL.maxRequests, RATE_LIMITS.LOGIN_EMAIL.windowMs);
    if (!emailLimit.allowed) {
      await logSecurityEvent({
        type: "rate_limit_triggered",
        severity: "high",
        email: sanitizedEmail,
        ip,
        userAgent,
        path: "/api/auth/login",
        method: "POST",
        details: { limit: "login_email" },
        blocked: true,
      });
      return NextResponse.json(
        { error: "Too many login attempts for this email. Please try again later." },
        { status: 429 }
      );
    }

    const user = await User.findOne({ email: sanitizedEmail })
      .select("+password");

    if (!user) {
      await logSecurityEvent({
        type: "login_failed",
        severity: "medium",
        email: sanitizedEmail,
        ip,
        userAgent,
        path: "/api/auth/login",
        method: "POST",
        details: { reason: "user_not_found" },
      });
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      await logSecurityEvent({
        type: "login_blocked",
        severity: "high",
        userId: user._id.toString(),
        email: sanitizedEmail,
        ip,
        userAgent,
        path: "/api/auth/login",
        method: "POST",
        details: { reason: "account_inactive" },
        blocked: true,
      });
      return NextResponse.json(
        { error: "Account is deactivated" },
        { status: 403 }
      );
    }

    const isPasswordValid = await bcrypt.compare(String(password), user.password);
    if (!isPasswordValid) {
      // Record failed login attempt
      user.loginHistory.push({
        ip,
        userAgent,
        timestamp: new Date(),
        success: false,
      });
      if (user.loginHistory.length > 20) {
        user.loginHistory = user.loginHistory.slice(-20);
      }
      await user.save();

      await logSecurityEvent({
        type: "login_failed",
        severity: "medium",
        userId: user._id.toString(),
        email: sanitizedEmail,
        ip,
        userAgent,
        path: "/api/auth/login",
        method: "POST",
        details: { reason: "invalid_password" },
      });
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // ─── Successful Login ──────────────────────────────────────────────
    user.lastLogin = new Date();
    user.loginCount += 1;

    const sessionId = uuidv4();

    user.loginHistory.push({
      ip,
      userAgent,
      timestamp: new Date(),
      success: true,
    });

    if (user.loginHistory.length > 20) {
      user.loginHistory = user.loginHistory.slice(-20);
    }

    user.activeSessions.push({
      id: sessionId,
      ip,
      userAgent,
      lastActive: new Date(),
      createdAt: new Date(),
    });

    if (user.activeSessions.length > 5) {
      user.activeSessions = user.activeSessions.slice(-5);
    }

    await user.save();

    const roleSlug = typeof user.role === "string" ? user.role : "customer";

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      role: roleSlug,
    });

    const cookieStore = await cookies();
    cookieStore.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    await logSecurityEvent({
      type: "login_success",
      severity: "low",
      userId: user._id.toString(),
      email: sanitizedEmail,
      ip,
      userAgent,
      path: "/api/auth/login",
      method: "POST",
      details: { emailVerified: user.isEmailVerified },
    });

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          role: roleSlug,
          isEmailVerified: user.isEmailVerified,
        },
        token,
        requiresEmailVerification: !user.isEmailVerified,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
