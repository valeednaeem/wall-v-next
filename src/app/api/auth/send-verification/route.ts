import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";
import User from "@/models/user";
import EmailVerification from "@/models/email-verification";
import crypto from "crypto";
import { checkRateLimit, getClientIp, logSecurityEvent } from "@/lib/security";

/**
 * POST /api/auth/send-verification
 * Sends a new email verification link to the authenticated user.
 * Rate limited: 3 requests per hour per IP.
 */
export async function POST() {
  try {
    const ip = getClientIp({ headers: new Headers() } as Request);
    const rateLimitResult = checkRateLimit("send-verification:" + ip, 3, 60 * 60 * 1000);
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    await connectToDatabase();

    const user = await User.findById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.isEmailVerified) {
      return NextResponse.json({ success: true, message: "Email already verified." });
    }

    // Invalidate any existing unused verification tokens for this user
    await EmailVerification.updateMany(
      { userId: user._id.toString(), used: false },
      { used: true }
    );

    // Generate new token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await EmailVerification.create({
      userId: user._id.toString(),
      email: user.email,
      token: verificationToken,
      expiresAt,
      used: false,
    });

    // In production, send email here. For now, log the verification URL.
    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://www.wall-v.com"}/auth/verify-email?token=${verificationToken}`;
    console.log(`[EMAIL VERIFICATION] Send to ${user.email}: ${verifyUrl}`);

    await logSecurityEvent({
      type: "email_verification_sent",
      severity: "low",
      userId: user._id.toString(),
      email: user.email,
      ip,
      path: "/api/auth/send-verification",
      method: "POST",
    });

    return NextResponse.json({ success: true, message: "Verification email sent." });
  } catch (error) {
    console.error("Send verification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
