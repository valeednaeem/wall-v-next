import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Conversation from "@/models/conversation";
import Project from "@/models/project";

// Called from the browser when a Dograh voice call ends
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { agentId, workflowRunId, durationSeconds, status, clientName, clientEmail, clientPhone } = body;

    console.log("[Voice Agent] Call ended:", { agentId, workflowRunId, durationSeconds, status });

    await connectToDatabase();

    // Find the conversation by workflowRunId or create a new one
    let conversation = null;
    if (workflowRunId) {
      conversation = await Conversation.findOne({ "voiceAgent.workflowRunId": workflowRunId });
    }

    if (!conversation) {
      // Create new conversation record
      conversation = await Conversation.create({
        sessionId: `voice_${Date.now()}`,
        agentType: "voice-agent",
        channel: "voice",
        messages: [],
        messageCount: 0,
        startedAt: new Date(Date.now() - (durationSeconds || 0) * 1000),
        endedAt: new Date(),
        voiceAgent: {
          dograhAgentId: agentId || "",
          workflowRunId: workflowRunId || "",
          durationSeconds: durationSeconds || 0,
          callStatus: status || "completed",
        },
      });
    } else {
      // Update existing conversation
      conversation.endedAt = new Date();
      if (durationSeconds) conversation.voiceAgent.durationSeconds = durationSeconds;
      if (status) conversation.voiceAgent.callStatus = status;
      await conversation.save();
    }

    // Try to find the project (may have been created by the Dograh webhook)
    let previewUrl = null;
    let checkoutUrl = null;
    let projectId = null;

    if (conversation.projectId) {
      const project = await Project.findById(conversation.projectId)
        .select("_id demoId demoId status")
        .lean();
      if (project) {
        projectId = project._id.toString();
        previewUrl = `/preview/${project._id}`;
        checkoutUrl = `/checkout/${project._id}`;
      }
    }

    // If no project linked to conversation, try to find by client email
    if (!projectId && clientEmail) {
      const project = await Project.findOne({
        "client.email": clientEmail,
        status: "demo",
      })
        .sort({ createdAt: -1 })
        .select("_id demoId status")
        .lean();
      if (project) {
        projectId = project._id.toString();
        previewUrl = `/preview/${project._id}`;
        checkoutUrl = `/checkout/${project._id}`;
      }
    }

    return NextResponse.json({
      success: true,
      conversationId: conversation._id,
      previewUrl,
      checkoutUrl,
      projectId,
    });
  } catch (error) {
    console.error("[Voice Agent] Call-ended error:", error);
    return NextResponse.json({ error: "Failed to record call" }, { status: 500 });
  }
}
