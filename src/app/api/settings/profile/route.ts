import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/user";
import { auth } from "@/lib/auth";

function filterProfileFields(user: Record<string, unknown>) {
  return {
    name: user.name || "",
    email: user.email || "",
    phone: user.phone || "",
    avatar: user.avatar || "",
    bio: user.bio || "",
    jobTitle: user.jobTitle || "",
    company: user.company || "",
    location: user.location || "",
    website: user.website || "",
    socialLinks: user.socialLinks || { linkedin: "", twitter: "", github: "", dribbble: "" },
  };
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      console.log("[Profile GET] No session");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findById(session.user.id).select("-password").lean();
    if (!user) {
      console.log("[Profile GET] User not found:", session.user.id);
      return NextResponse.json({ success: true, data: { profile: {}, portfolio: [] } });
    }

    const profile = filterProfileFields(user as Record<string, unknown>);

    return NextResponse.json({
      success: true,
      data: {
        profile,
        portfolio: (user as Record<string, unknown>)?.portfolio || [],
      },
    });
  } catch (error) {
    console.error("[Profile GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      console.log("[Profile PUT] No session");
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

      const updated = await User.findByIdAndUpdate(session.user.id, { $set: updates }, { new: true }).select("-password").lean();
      if (!updated) {
        console.log("[Profile PUT] User not found:", session.user.id);
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const profile = filterProfileFields(updated as Record<string, unknown>);
      return NextResponse.json({ success: true, data: { profile } });
    }

    if (body.portfolio !== undefined) {
      await User.findByIdAndUpdate(session.user.id, { $set: { portfolio: body.portfolio } }, { new: true });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "No data provided" }, { status: 400 });
  } catch (error) {
    console.error("[Profile PUT] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
