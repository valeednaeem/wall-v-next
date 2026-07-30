import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import ServicePrice from "@/models/service-price";
import { getAuthUser } from "@/lib/auth";
import { pickFields } from "@/lib/pick-fields";

const PRICE_FIELDS = ["serviceKey", "name", "description", "category", "tiers", "features", "displayOrder", "isActive"];

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const prices = await ServicePrice.find({}).sort({ displayOrder: 1, category: 1 }).lean();
    return NextResponse.json({ prices });
  } catch (error) {
    console.error("Error fetching prices:", error);
    return NextResponse.json({ error: "Failed to fetch prices" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user || !["super-admin", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const body = await request.json();

    const existing = await ServicePrice.findOne({ serviceKey: body.serviceKey });
    if (existing) {
      return NextResponse.json({ error: "Service key already exists" }, { status: 409 });
    }

    const priceData = pickFields(body, PRICE_FIELDS);
    const price = await ServicePrice.create(priceData);
    return NextResponse.json({ price }, { status: 201 });
  } catch (error) {
    console.error("Error creating price:", error);
    return NextResponse.json({ error: "Failed to create price" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user || !["super-admin", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const price = await ServicePrice.findByIdAndUpdate(id, updateData, { new: true }).lean();
    if (!price) {
      return NextResponse.json({ error: "Price not found" }, { status: 404 });
    }

    return NextResponse.json({ price });
  } catch (error) {
    console.error("Error updating price:", error);
    return NextResponse.json({ error: "Failed to update price" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user || !["super-admin", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
