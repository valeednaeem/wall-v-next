import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Conversation from "@/models/conversation";
import Lead from "@/models/lead";
import Inquiry from "@/models/inquiry";

// Called from the browser when a Dograh voice call ends
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { agentId, workflowRunId, durationSeconds, status } = body;

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

    return NextResponse.json({
      success: true,
      conversationId: conversation._id,
    });
  } catch (error) {
    console.error("[Voice Agent] Call-ended error:", error);
    return NextResponse.json({ error: "Failed to record call" }, { status: 500 });
  }
}
