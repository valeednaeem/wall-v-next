import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/user";
import Role from "@/models/role";
import { signToken } from "@/lib/jwt";
import { cookies } from "next/headers";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const { allowed, remaining, resetAt } = checkRateLimit(`login:${ip}`, 10, 60000);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)) } }
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

    const user = await User.findOne({ email: email.toLowerCase() })
      .select("+password");

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "Account is deactivated" },
        { status: 403 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    user.lastLogin = new Date();
    user.loginCount += 1;

    const userAgent = request.headers.get("user-agent") || "";
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

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          role: roleSlug,
        },
        token,
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
