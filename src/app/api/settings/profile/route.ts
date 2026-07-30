import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/user";
import { getAuthUserFromCookie } from "@/lib/auth-cookie";
import { verifyCsrfToken, CSRF_HEADER_NAME } from "@/lib/csrf";

export async function GET() {
  try {
    const authUser = await getAuthUserFromCookie();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findById(authUser.userId).select("-password").lean();

    return NextResponse.json({
      success: true,
      data: {
        profile: user || {},
        portfolio: (user as Record<string, unknown>)?.portfolio || [],
      },
    });
  } catch (error) {
    console.error("Profile GET error:", error);
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

    if (body.profile) {
      const allowedFields = ["name", "phone", "avatar", "bio", "jobTitle", "company", "location", "website", "socialLinks"];
      const updates: Record<string, unknown> = {};
      allowedFields.forEach((field) => {
        if (body.profile[field] !== undefined) updates[field] = body.profile[field];
      });
      await User.findByIdAndUpdate(authUser.userId, { $set: updates }, { new: true });
    }

    if (body.portfolio !== undefined) {
      await User.findByIdAndUpdate(authUser.userId, { $set: { portfolio: body.portfolio } }, { new: true });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Profile PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
