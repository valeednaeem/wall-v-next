import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/user";
import { auth } from "@/lib/auth";
import { z } from "zod";

const profileUpdateSchema = z.object({
  profile: z.object({
    name: z.string().trim().min(2).max(120).optional(),
    phone: z.string().trim().max(40).optional(),
    avatar: z.string().url().max(2_000_000).or(z.literal("")).optional(),
    bio: z.string().trim().max(500).optional(),
    jobTitle: z.string().trim().max(120).optional(),
    company: z.string().trim().max(160).optional(),
    location: z.string().trim().max(160).optional(),
    website: z.string().url().max(2048).or(z.literal("")).optional(),
    socialLinks: z.object({
      linkedin: z.string().url().max(2048).or(z.literal("")),
      twitter: z.string().url().max(2048).or(z.literal("")),
      github: z.string().url().max(2048).or(z.literal("")),
      dribbble: z.string().url().max(2048).or(z.literal("")),
    }).optional(),
  }),
}).or(z.object({
  portfolio: z.array(z.object({
    id: z.string().min(1).max(100),
    title: z.string().trim().max(200),
    description: z.string().max(20_000),
    imageUrl: z.string().url().max(2048).or(z.literal("")),
    projectUrl: z.string().url().max(2048).or(z.literal("")),
    tags: z.array(z.string().trim().min(1).max(50)).max(20),
    featured: z.boolean(),
  })).max(50),
}).strict());

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

    const parsed = profileUpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      console.error("[Profile PUT] Validation error:", parsed.error.flatten());
      return NextResponse.json(
        { success: false, error: "VALIDATION_ERROR", message: "Please correct the highlighted profile fields.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const body = parsed.data;
    await connectToDatabase();

    if ("profile" in body) {
      const updates = Object.fromEntries(
        Object.entries(body.profile).filter(([, value]) => value !== undefined)
      );

      const updated = await User.findByIdAndUpdate(session.user.id, { $set: updates }, { new: true }).select("-password").lean();
      if (!updated) {
        console.log("[Profile PUT] User not found:", session.user.id);
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const profile = filterProfileFields(updated as Record<string, unknown>);
      return NextResponse.json({ success: true, data: { profile } });
    }

    if ("portfolio" in body) {
      await User.findByIdAndUpdate(session.user.id, { $set: { portfolio: body.portfolio } }, { new: true });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "No data provided" }, { status: 400 });
  } catch (error) {
    console.error("[Profile PUT] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
