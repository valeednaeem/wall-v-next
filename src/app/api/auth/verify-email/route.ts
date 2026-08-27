import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/user";
import EmailVerification from "@/models/email-verification";

/**
 * GET /api/auth/verify-email?token=xxx
 * Verifies email address using a one-time token.
 * Token expires after 24 hours. Idempotent — re-verifying returns success.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return NextResponse.json({ success: false, error: "Missing verification token" }, { status: 400 });
    }

    await connectToDatabase();

    const verification = await EmailVerification.findOne({
      token,
      used: false,
    });

    if (!verification) {
      // Token not found or already used — return same message to prevent enumeration
      return NextResponse.json({
        success: true,
        message: "Email verified successfully. You can now log in.",
        alreadyVerified: false,
      });
    }

    // Check expiry
    if (verification.expiresAt < new Date()) {
      return NextResponse.json({ success: false, error: "Verification token has expired. Please request a new one." }, { status: 400 });
    }

    // Mark token as used
    verification.used = true;
    await verification.save();

    // Update user's email verification status
    const user = await User.findById(verification.userId);
    if (user && !user.isEmailVerified) {
      user.isEmailVerified = true;
      user.emailVerified = new Date();
      await user.save();
    }

    return NextResponse.json({
      success: true,
      message: "Email verified successfully. You can now log in.",
      alreadyVerified: false,
    });
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
