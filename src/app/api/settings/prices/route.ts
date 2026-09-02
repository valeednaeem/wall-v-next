import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import ServicePrice from "@/models/service-price";
import { getAuthUser } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/api-middleware";

const PRICE_FIELDS = [
  "serviceKey", "name", "description", "category", "type", "basePrice",
  "currency", "hourlyRate", "tiers", "features", "technology",
  "estimatedHours", "estimatedWeeks", "displayOrder", "active",
  "agentVisible", "agentDescription",
];

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!ADMIN_ROLES.includes(user.role)) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    await connectToDatabase();
    const prices = await ServicePrice.find({}).sort({ displayOrder: 1, category: 1 }).lean();
    return NextResponse.json({ success: true, data: { prices } });
  } catch (error) {
    console.error("Error fetching prices:", error);
    return NextResponse.json({ error: "Failed to fetch prices" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!ADMIN_ROLES.includes(user.role)) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    await connectToDatabase();
    const body = await request.json();

    const existing = await ServicePrice.findOne({ serviceKey: body.serviceKey });
    if (existing) {
      return NextResponse.json({ error: "Service key already exists" }, { status: 409 });
    }

    // Whitelist allowed fields
    const priceData: Record<string, unknown> = {};
    for (const field of PRICE_FIELDS) {
      if (body[field] !== undefined) {
        priceData[field] = body[field];
      }
    }

    const price = await ServicePrice.create(priceData);
    return NextResponse.json({ success: true, data: { price } }, { status: 201 });
  } catch (error) {
    console.error("Error creating price:", error);
    return NextResponse.json({ error: "Failed to create price" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!ADMIN_ROLES.includes(user.role)) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    await connectToDatabase();
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    // Whitelist allowed fields for updates
    const safeUpdate: Record<string, unknown> = {};
    for (const field of PRICE_FIELDS) {
      if (updateData[field] !== undefined) {
        safeUpdate[field] = updateData[field];
      }
    }

    const price = await ServicePrice.findByIdAndUpdate(id, safeUpdate, { new: true }).lean();
    if (!price) {
      return NextResponse.json({ error: "Price not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { price } });
  } catch (error) {
    console.error("Error updating price:", error);
    return NextResponse.json({ error: "Failed to update price" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!ADMIN_ROLES.includes(user.role)) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await ServicePrice.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting price:", error);
    return NextResponse.json({ error: "Failed to delete price" }, { status: 500 });
  }
}
