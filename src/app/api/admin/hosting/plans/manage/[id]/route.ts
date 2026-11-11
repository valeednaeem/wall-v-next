import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import HostingPlan from "@/models/hosting-plan";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user || !["super-admin", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    await connectToDatabase();

    const plan = await HostingPlan.findById(id).lean();
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, plan });
  } catch (error) {
    console.error("Get hosting plan error:", error);
    return NextResponse.json({ error: "Failed to get hosting plan" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user || !["super-admin", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    await connectToDatabase();

    const plan = await HostingPlan.findById(id);
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    if (body.price !== undefined || body.margin !== undefined) {
      const price = body.price ?? plan.price;
      const margin = body.margin ?? plan.margin;
      body.finalPrice = Math.round(price * (1 + margin / 100) * 100) / 100;
    }

    if (body.renewalPrice !== undefined || body.margin !== undefined) {
      const price = body.renewalPrice ?? plan.renewalPrice;
      const margin = body.margin ?? plan.margin;
      body.finalRenewalPrice = Math.round(price * (1 + margin / 100) * 100) / 100;
    }

    const updated = await HostingPlan.findByIdAndUpdate(id, body, { new: true }).lean();

    return NextResponse.json({ success: true, plan: updated });
  } catch (error) {
    console.error("Update hosting plan error:", error);
    return NextResponse.json({ error: "Failed to update hosting plan" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user || !["super-admin", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    await connectToDatabase();

    const plan = await HostingPlan.findByIdAndDelete(id);
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Plan deleted" });
  } catch (error) {
    console.error("Delete hosting plan error:", error);
    return NextResponse.json({ error: "Failed to delete hosting plan" }, { status: 500 });
  }
}
