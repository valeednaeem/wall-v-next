import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import CookieDefinition from "@/models/cookie-definition";
import { auth } from "@/lib/auth";
import slugify from "slugify";
import { pickFields } from "@/lib/pick-fields";

const COOKIE_DEF_FIELDS = ["name", "description", "category", "duration", "type", "isRequired", "isActive", "sortOrder", "purpose", "provider"];

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const activeOnly = searchParams.get("active") === "true";

    const query: Record<string, unknown> = {};
    if (category) query.category = category;
    if (activeOnly) query.isActive = true;

    const cookies = await CookieDefinition.find(query)
      .populate("category", "name slug")
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    return NextResponse.json({ success: true, data: cookies });
  } catch (error) {
    console.error("Cookie GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const body = await request.json();

    const slug = slugify(body.name, { lower: true, strict: true, trim: true });
    const cookieData = pickFields(body, COOKIE_DEF_FIELDS);
    const cookie = await CookieDefinition.create({ ...cookieData, slug });

    return NextResponse.json({ success: true, data: cookie }, { status: 201 });
  } catch (error) {
    console.error("Cookie POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
