import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import CookieDefinition from "@/models/cookie-definition";
import CookieCategory from "@/models/cookie-category";

export async function GET() {
  try {
    await connectToDatabase();

    const categories = await CookieCategory.find({ isActive: true })
      .sort({ sortOrder: 1 })
      .lean();

    const cookies = await CookieDefinition.find({ isActive: true })
      .populate("category", "name slug isRequired")
      .sort({ sortOrder: 1 })
      .lean();

    const grouped = categories.map((cat) => ({
      ...cat,
      cookies: cookies.filter(
        (c) => c.category && (c.category as unknown as { _id: string })._id.toString() === cat._id.toString()
      ),
    }));

    return NextResponse.json({ success: true, data: grouped });
  } catch (error) {
    console.error("Public cookies GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
