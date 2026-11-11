import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import Client from "@/models/client";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();

    let client = await Client.findOne({ user: user.userId });
    if (!client) client = await Client.findOne({ email: user.email });

    if (!client) {
      return NextResponse.json({
        name: user.email?.split("@")[0] || "Client",
        email: user.email || "",
        phone: "",
        company: "",
        address: { street: "", city: "", state: "", country: "", zip: "" },
        type: "individual",
        status: "active",
      });
    }

    return NextResponse.json({
      _id: client._id,
      name: client.name,
      email: client.email,
      phone: client.phone || "",
      company: client.company || "",
      address: client.address || { street: "", city: "", state: "", country: "", zip: "" },
      type: client.type,
      status: client.status,
      totalProjects: client.totalProjects || 0,
      totalSpent: client.totalSpent || 0,
      lastContact: client.lastContact,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    await connectToDatabase();

    let client = await Client.findOne({ user: user.userId });
    if (!client) client = await Client.findOne({ email: user.email });

    if (!client) {
      client = await Client.create({
        user: user.userId,
        name: body.name || user.email?.split("@")[0],
        email: user.email,
        ...body,
      });
    } else {
      const allowed = ["name", "phone", "company", "address"];
      for (const key of allowed) {
        if (body[key] !== undefined) {
          (client as Record<string, unknown>)[key] = body[key];
        }
      }
      await client.save();
    }

    return NextResponse.json({ success: true, client });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
