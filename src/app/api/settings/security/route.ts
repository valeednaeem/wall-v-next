import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/user";
import bcrypt from "bcryptjs";
import { getAuthUserFromCookie } from "@/lib/auth-cookie";
import { verifyCsrfToken, CSRF_HEADER_NAME } from "@/lib/csrf";

export async function GET() {
  try {
    const authUser = await getAuthUserFromCookie();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findById(authUser.userId)
      .select("loginHistory activeSessions")
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        loginHistory: (user as Record<string, unknown>)?.loginHistory || [],
        sessions: (user as Record<string, unknown>)?.activeSessions || [],
      },
    });
  } catch (error) {
    console.error("Security GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const authUser = await getAuthUserFromCookie();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const csrfToken = request.headers.get(CSRF_HEADER_NAME);
    if (!csrfToken || !verifyCsrfToken(csrfToken)) {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
    }

    const body = await request.json();
    await connectToDatabase();

    switch (body.type) {
      case "password": {
        if (!body.current || !body.newPass) {
          return NextResponse.json({ error: "Current and new password required" }, { status: 400 });
        }
        const user = await User.findById(authUser.userId).select("+password");
        if (!user) {
          return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        const isValid = await bcrypt.compare(body.current, user.password);
        if (!isValid) {
          return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
        }
        const hashed = await bcrypt.hash(body.newPass, 12);
        await User.findByIdAndUpdate(authUser.userId, { $set: { password: hashed } });
        return NextResponse.json({ success: true, message: "Password updated" });
      }

      case "2fa": {
        return NextResponse.json({ error: "2FA is not yet implemented" }, { status: 501 });
      }

      case "oauth": {
        // Toggle linked account
        const user = await User.findById(authUser.userId).lean();
        const linked = (user as Record<string, unknown>)?.linkedAccounts as { provider: string; connected: boolean }[] || [];
        const existing = linked.find((l) => l.provider === body.provider);
        if (existing) {
          existing.connected = !existing.connected;
        } else {
          linked.push({ provider: body.provider, connected: true });
        }
        await User.findByIdAndUpdate(authUser.userId, { $set: { linkedAccounts: linked } });
        return NextResponse.json({ success: true, message: `OAuth ${body.provider} toggled` });
      }

      case "revoke-session": {
        if (!body.sessionId) {
          return NextResponse.json({ error: "Session ID required" }, { status: 400 });
        }
        await User.findByIdAndUpdate(authUser.userId, {
          $pull: { activeSessions: { id: body.sessionId } },
        });
        return NextResponse.json({ success: true, message: "Session revoked" });
      }

      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (error) {
    console.error("Security PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
