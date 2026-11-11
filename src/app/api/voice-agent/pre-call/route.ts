import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Client from "@/models/client";
import Project from "@/models/project";
import { corsHeaders, handleOPTIONS } from "@/lib/cors";

// Dograh Pre-Call Data Fetch endpoint
// Dograh sends POST before the call starts, we return client data as initial_context
export async function OPTIONS() {
  return handleOPTIONS();
}

export async function POST(request: Request) {
  const headers = corsHeaders(request);
  try {
    const body = await request.json();
    const { call_inbound } = body;

    console.log("[Pre-Call Fetch] Received:", JSON.stringify(body).slice(0, 300));

    const fromNumber = call_inbound?.from_number?.trim();

    if (!fromNumber) {
      return NextResponse.json({ call_inbound: { initial_context: {} } }, { headers });
    }

    await connectToDatabase();

    // Look up client by phone
    const client = await Client.findOne({ phone: fromNumber })
      .select("name email phone company status totalProjects totalSpent lastContact tags notes")
      .lean();

    if (!client) {
      return NextResponse.json({ call_inbound: { initial_context: {} } }, { headers });
    }

    // Fetch recent projects for context
    const projects = await Project.find({
      client: { name: client.name, email: client.email },
    })
      .select("name status")
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    // Return initial_context for Dograh to merge into the call
    return NextResponse.json({
      call_inbound: {
        initial_context: {
          customer_name: client.name,
          customer_email: client.email,
          customer_phone: client.phone,
          customer_company: client.company || "",
          account_status: client.status,
          total_projects: client.totalProjects || 0,
          total_spent: client.totalSpent || 0,
          is_returning_client: true,
          recent_projects: projects.map((p) => p.name).join(", ") || "none",
        },
      },
    }, { headers });
  } catch (error) {
    console.error("[Pre-Call Fetch] Error:", error);
    // Never block the call — return empty context on error
    return NextResponse.json({ call_inbound: { initial_context: {} } }, { headers });
  }
}

// Also support GET for health checks
export async function GET() {
  return NextResponse.json({ status: "ok", endpoint: "voice-agent/pre-call" });
}
