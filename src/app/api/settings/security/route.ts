import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/user";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findById(session.user.id)
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
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    await connectToDatabase();

    switch (body.type) {
      case "password": {
        if (!body.current || !body.newPass) {
          return NextResponse.json({ error: "Current and new password required" }, { status: 400 });
        }
        const user = await User.findById(session.user.id).select("+password");
        if (!user) {
          return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        const isValid = await bcrypt.compare(body.current, user.password);
        if (!isValid) {
          return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
        }
        const hashed = await bcrypt.hash(body.newPass, 12);
        await User.findByIdAndUpdate(session.user.id, { $set: { password: hashed } });
        return NextResponse.json({ success: true, message: "Password updated" });
      }

      case "2fa": {
        return NextResponse.json({ error: "2FA is not yet implemented" }, { status: 501 });
      }

      case "oauth": {
        const user = await User.findById(session.user.id).lean();
        const linked = (user as Record<string, unknown>)?.linkedAccounts as { provider: string; connected: boolean }[] || [];
        const existing = linked.find((l) => l.provider === body.provider);
        if (existing) {
          existing.connected = !existing.connected;
        } else {
          linked.push({ provider: body.provider, connected: true });
        }
        await User.findByIdAndUpdate(session.user.id, { $set: { linkedAccounts: linked } });
        return NextResponse.json({ success: true, message: `OAuth ${body.provider} toggled` });
      }

      case "revoke-session": {
        if (!body.sessionId) {
          return NextResponse.json({ error: "Session ID required" }, { status: 400 });
        }
        await User.findByIdAndUpdate(session.user.id, {
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
