import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Conversation from "@/models/conversation";
import { authenticateDograhWebhook } from "@/lib/dograh-webhook";

// Deprecated compatibility endpoint. Authenticated Dograh webhooks are authoritative.
// This endpoint may update an existing voice conversation, but it never creates records
// from browser-controlled input.
export async function POST(request: Request) {
  const auth = authenticateDograhWebhook(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.reason }, { status: auth.status });
  }

  try {
    let body: Record<string, unknown>;
    try {
      const parsed = await request.json();
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 });
      }
      body = parsed as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }
    const workflowRunId = typeof body.workflowRunId === "string" ? body.workflowRunId.trim() : "";
    const durationSeconds = typeof body.durationSeconds === "number" ? body.durationSeconds : 0;
    const status = typeof body.status === "string" ? body.status.trim().slice(0, 50) : "completed";

    if (!workflowRunId || workflowRunId.length > 200) {
      return NextResponse.json({ error: "workflowRunId is required" }, { status: 400 });
    }
    if (!Number.isFinite(durationSeconds) || durationSeconds < 0 || durationSeconds > 24 * 60 * 60) {
      return NextResponse.json({ error: "Invalid durationSeconds" }, { status: 400 });
    }

    await connectToDatabase();
    const conversation = await Conversation.findOne({
      channel: "voice",
      "voiceAgent.workflowRunId": workflowRunId,
    });

    if (!conversation) {
      return NextResponse.json({
        success: true,
        accepted: true,
        message: "Conversation will be created by the authenticated Dograh webhook.",
      }, { status: 202 });
    }

    conversation.endedAt = new Date();
    conversation.voiceAgent = {
      ...conversation.voiceAgent,
      durationSeconds,
      callStatus: status || conversation.voiceAgent?.callStatus || "completed",
    };
    await conversation.save();

    return NextResponse.json({ success: true, conversationId: conversation._id });
  } catch (error) {
    console.error("[Voice Agent] Authenticated call-ended update failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Failed to record call" }, { status: 500 });
  }
}
