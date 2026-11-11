import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getWorkflows, getWorkflowById, createFromTemplate, executeWorkflow, getWorkflowTemplates, getWorkflowHistory } from "@/lib/pm-workflows";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "list";

    if (action === "list") {
      const workflows = await getWorkflows();
      return NextResponse.json({ workflows });
    }

    if (action === "templates") {
      const templates = getWorkflowTemplates();
      return NextResponse.json({ templates });
    }

    if (action === "get") {
      const id = searchParams.get("id");
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
      const workflow = await getWorkflowById(id);
      if (!workflow) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
      return NextResponse.json({ workflow });
    }

    if (action === "history") {
      const history = await getWorkflowHistory();
      return NextResponse.json({ history });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Workflows API GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { action, ...data } = body;

    if (action === "create-from-template") {
      const workflow = await createFromTemplate(data.templateId);
      return NextResponse.json({ workflow });
    }

    if (action === "execute") {
      const execution = await executeWorkflow(data.workflowId, user.userId || "system");
      return NextResponse.json({ execution });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Workflows API POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
