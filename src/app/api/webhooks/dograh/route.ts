import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Conversation from "@/models/conversation";
import Lead from "@/models/lead";
import Inquiry from "@/models/inquiry";

// Dograh sends webhook when a call ends
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("[Dograh Webhook] Received:", JSON.stringify(body).slice(0, 500));

    const {
      agentId,
      workflowRunId,
      status,
      duration,
      transcript,
      summary,
      sessionId,
      messages,
      callerInfo,
    } = body;

    await connectToDatabase();

    // Find or create conversation
    const filter = workflowRunId
      ? { "voiceAgent.workflowRunId": workflowRunId }
      : sessionId
        ? { sessionId }
        : null;

    if (!filter) {
      return NextResponse.json({ error: "Missing sessionId or workflowRunId" }, { status: 400 });
    }

    const conversationData: Record<string, unknown> = {
      agentType: "voice-agent",
      channel: "voice",
      endedAt: new Date(),
      voiceAgent: {
        dograhAgentId: agentId || "",
        workflowRunId: workflowRunId || "",
        durationSeconds: duration || 0,
        callStatus: status || "completed",
        transcript: transcript || "",
        summary: summary || "",
      },
    };

    if (messages && Array.isArray(messages)) {
      conversationData.messages = messages.map((m: { role: string; content: string; timestamp?: string }) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
        timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
      }));
      conversationData.messageCount = messages.length;
    }

    const conversation = await Conversation.findOneAndUpdate(
      filter,
      { $set: conversationData },
      { upsert: true, new: true }
    );

    // Auto-create lead and inquiry if caller info provided
    if (callerInfo?.email || callerInfo?.name) {
      let leadId = null;

      if (callerInfo.email) {
        const existingLead = await Lead.findOne({ email: callerInfo.email });
        if (existingLead) {
          leadId = existingLead._id;
        } else {
          const lead = await Lead.create({
            name: callerInfo.name || "Voice Agent Caller",
            email: callerInfo.email,
            phone: callerInfo.phone || "",
            source: "voice-agent",
            status: "new",
            score: 60,
            requirements: summary || "Inquiry from voice agent call",
            tags: ["voice-agent", "dograh"],
          });
          leadId = lead._id;
        }
      }

      const inquiry = await Inquiry.create({
        name: callerInfo.name || "Voice Agent Caller",
        email: callerInfo.email || "",
        phone: callerInfo.phone || "",
        subject: `Voice Agent Call — ${summary || "Inquiry"}`,
        message: transcript || summary || "Voice agent call completed",
        type: "sales",
        status: "new",
        priority: "medium",
        source: "voice-agent",
        lead: leadId,
        tags: ["voice-agent", "dograh"],
      });

      conversation.inquiryId = inquiry._id;
      if (leadId) conversation.leadId = leadId;
      conversation.outcome = "inquiry-created";
      await conversation.save();
    }

    return NextResponse.json({ success: true, conversationId: conversation._id });
  } catch (error) {
    console.error("[Dograh Webhook] Error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
