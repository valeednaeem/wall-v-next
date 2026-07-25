import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import LegalPage from "@/models/legal-page";
import { generateSlug } from "@/lib/generate-slug";

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    const query: Record<string, unknown> = { isActive: true };
    if (type) query.type = type;

    const pages = await LegalPage.find(query).sort({ title: 1 }).lean();
    return NextResponse.json({ success: true, data: pages });
  } catch (error) {
    console.error("Legal GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();

    const slug = generateSlug(body.title);
    const page = await LegalPage.create({ ...body, slug });
    return NextResponse.json({ success: true, data: page }, { status: 201 });
  } catch (error) {
    console.error("Legal POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
