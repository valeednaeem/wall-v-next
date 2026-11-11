import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Lead from "@/models/lead";
import { getAuthUser } from "@/lib/auth";
import { pickFields } from "@/lib/pick-fields";
import { escapeRegex } from "@/lib/escape-regex";

const LEAD_FIELDS = ["name", "email", "company", "phone", "source", "status", "notes", "budget", "requirements", "serviceInterest", "tags"];

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user || !["super-admin", "admin", "manager", "staff"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const query: Record<string, unknown> = {};
    if (status) query.status = status;
    if (search) {
      const safeSearch = escapeRegex(search);
      query.$or = [
        { name: { $regex: safeSearch, $options: "i" } },
        { email: { $regex: safeSearch, $options: "i" } },
      ];
    }

    const leads = await Lead.find(query).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: leads });
  } catch (error) {
    console.error("Leads GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user || !["super-admin", "admin", "manager", "staff"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();
    const body = await request.json();
    const leadData = pickFields(body, LEAD_FIELDS);
    const lead = await Lead.create(leadData);
    return NextResponse.json({ success: true, data: lead }, { status: 201 });
  } catch (error) {
    console.error("Leads POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
