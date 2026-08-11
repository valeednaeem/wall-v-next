import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import CookieCategory from "@/models/cookie-category";
import { auth } from "@/lib/auth";
import slugify from "slugify";

export async function GET() {
  try {
    await connectToDatabase();
    const categories = await CookieCategory.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .lean();
    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    console.error("Cookie categories GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role;
    if (!["super-admin", "admin"].includes(userRole || "")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    await connectToDatabase();
    const body = await request.json();

    const slug = slugify(body.name, { lower: true, strict: true, trim: true });
    const category = await CookieCategory.create({ ...body, slug });

    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (error) {
    console.error("Cookie categories POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
