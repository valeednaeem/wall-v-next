import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/user";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findById(session.user.id).select("-password").lean();

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
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    await connectToDatabase();

    if (body.profile) {
      const allowedFields = ["name", "phone", "avatar", "bio", "jobTitle", "company", "location", "website", "socialLinks"];
      const updates: Record<string, unknown> = {};
      allowedFields.forEach((field) => {
        if (body.profile[field] !== undefined) updates[field] = body.profile[field];
      });
      await User.findByIdAndUpdate(session.user.id, { $set: updates }, { new: true });
    }

    if (body.portfolio !== undefined) {
      await User.findByIdAndUpdate(session.user.id, { $set: { portfolio: body.portfolio } }, { new: true });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Profile PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
