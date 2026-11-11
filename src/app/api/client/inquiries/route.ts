import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Inquiry from "@/models/inquiry";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const isAdmin = ["super-admin", "admin", "manager", "staff"].includes(user.role);
    const filter: Record<string, unknown> = isAdmin
      ? {}
      : { email: user.email?.toLowerCase() || "" };

    const [inquiries, total] = await Promise.all([
      Inquiry.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select("name email phone subject message status type priority source createdAt")
        .lean(),
      Inquiry.countDocuments(filter),
    ]);

    return NextResponse.json({ success: true, inquiries, total, page, limit });
  } catch (error) {
    console.error("Client inquiries GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
