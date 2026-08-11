import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import RefundRule from "@/models/refund-rule";
import { auth } from "@/lib/auth";
import slugify from "slugify";
import { pickFields } from "@/lib/pick-fields";

const REFUND_RULE_FIELDS = ["name", "description", "serviceType", "conditions", "refundWindowDays", "refundPercentage", "refundMethod", "processingDays", "excludedItems", "notes", "isEligible", "requiresApproval", "isActive", "sortOrder"];

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

    const ruleData = pickFields(body, REFUND_RULE_FIELDS);
    const rule = await RefundRule.create({ ...ruleData, slug });
    return NextResponse.json({ success: true, data: rule }, { status: 201 });
  } catch (error) {
    console.error("Refund rules POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
