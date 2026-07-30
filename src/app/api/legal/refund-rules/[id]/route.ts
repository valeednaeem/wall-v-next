import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import RefundRule from "@/models/refund-rule";
import { auth } from "@/lib/auth";
import { pickFields } from "@/lib/pick-fields";

const REFUND_RULE_FIELDS = ["name", "description", "serviceType", "conditions", "refundWindowDays", "refundPercentage", "refundMethod", "processingDays", "excludedItems", "notes", "isEligible", "requiresApproval", "isActive"];

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const { id } = await params;
    const body = await request.json();
    const ruleData = pickFields(body, REFUND_RULE_FIELDS);

    const updated = await RefundRule.findByIdAndUpdate(id, ruleData, { new: true });
    if (!updated) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Refund rule PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const { id } = await params;

    await RefundRule.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: "Rule deleted" });
  } catch (error) {
    console.error("Refund rule DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
