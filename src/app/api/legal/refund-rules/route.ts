import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import RefundRule from "@/models/refund-rule";
import { getAuthUser } from "@/lib/auth";
import slugify from "slugify";

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const serviceType = searchParams.get("serviceType");
    const activeOnly = searchParams.get("active") === "true";

    const query: Record<string, unknown> = {};
    if (serviceType) query.serviceType = serviceType;
    if (activeOnly) query.isActive = true;

    const rules = await RefundRule.find(query).sort({ sortOrder: 1, name: 1 }).lean();
    return NextResponse.json({ success: true, data: rules });
  } catch (error) {
    console.error("Refund rules GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const body = await request.json();
    const slug = slugify(body.name, { lower: true, strict: true, trim: true });

    const rule = await RefundRule.create({ ...body, slug });
    return NextResponse.json({ success: true, data: rule }, { status: 201 });
  } catch (error) {
    console.error("Refund rules POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
