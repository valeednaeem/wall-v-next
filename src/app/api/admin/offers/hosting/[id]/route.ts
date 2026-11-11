import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import HostingOffer from "@/models/hosting-offer";

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

    const offer = await HostingOffer.findByIdAndDelete(id);

    if (!offer) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Offer deleted successfully",
    });
  } catch (error) {
    console.error("Delete hosting offer error:", error);
    return NextResponse.json(
      { error: "Failed to delete hosting offer" },
      { status: 500 }
    );
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

    const offer = await HostingOffer.findByIdAndUpdate(id, body, {
      new: true,
    });

    if (!offer) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      offer,
    });
  } catch (error) {
    console.error("Update hosting offer error:", error);
    return NextResponse.json(
      { error: "Failed to update hosting offer" },
      { status: 500 }
    );
  }
}
