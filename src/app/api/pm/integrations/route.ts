import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getIntegrations, updateIntegration, getWebhooks, createWebhook, deleteWebhook, testWebhook, getIntegrationSummary } from "@/lib/pm-integrations";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "list";

    if (action === "list") {
      const integrations = await getIntegrations();
      return NextResponse.json({ integrations });
    }

    if (action === "summary") {
      const summary = await getIntegrationSummary();
      return NextResponse.json({ summary });
    }

    if (action === "webhooks") {
      const webhooks = await getWebhooks();
      return NextResponse.json({ webhooks });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Integrations API GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { action, ...data } = body;

    if (action === "update-status") {
      const integration = await updateIntegration(data.integrationId, { status: data.status });
      return NextResponse.json({ integration });
    }

    if (action === "create-webhook") {
      const webhook = await createWebhook(data);
      return NextResponse.json({ webhook });
    }

    if (action === "test-webhook") {
      const result = await testWebhook(data.webhookId);
      return NextResponse.json({ result });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Integrations API POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "delete-webhook") {
      const webhookId = searchParams.get("webhookId");
      if (!webhookId) return NextResponse.json({ error: "webhookId required" }, { status: 400 });
      const deleted = await deleteWebhook(webhookId);
      return NextResponse.json({ deleted });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Integrations API DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
