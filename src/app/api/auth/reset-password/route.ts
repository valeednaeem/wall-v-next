import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/user";
import PasswordResetToken from "@/models/password-reset-token";

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const resetToken = await PasswordResetToken.findOne({
      token,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!resetToken) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await User.findByIdAndUpdate(resetToken.user, {
      password: hashedPassword,
    });

    resetToken.used = true;
    await resetToken.save();

    return NextResponse.json({
      success: true,
      message: "Password reset successful. You can now login.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
