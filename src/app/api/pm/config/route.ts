import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getPmConfig, updatePmConfig, getAgentTemplates, deployFromTemplate, getAllConfig } from "@/lib/pm-config";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "all";

    if (action === "all") {
      const config = await getAllConfig();
      return NextResponse.json({ config });
    }

    if (action === "pm") {
      const config = await getPmConfig();
      return NextResponse.json({ config });
    }

    if (action === "templates") {
      const templates = getAgentTemplates();
      return NextResponse.json({ templates });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Config API GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { action, ...data } = body;

    if (action === "update-pm-config") {
      const config = await updatePmConfig(data);
      return NextResponse.json({ config });
    }

    if (action === "deploy-template") {
      const { templateId, customizations } = data;
      const agent = await deployFromTemplate(templateId, customizations);
      return NextResponse.json({ agent });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Config API POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
