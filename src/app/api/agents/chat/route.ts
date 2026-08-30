import { NextRequest, NextResponse } from "next/server";
import Agent from "@/models/agent";
import AgentConversation from "@/models/agent-conversation";
import AgentExecution from "@/models/agent-execution";
import AgentMemory from "@/models/agent-memory";
import connectToDatabase from "@/lib/mongodb";
import { executeAIRequest } from "@/lib/ai-execution-engine";
import { captureMemoriesFromMessage } from "@/lib/agent-memory";
import { findMatchingSkills, buildSkillContext, trackSkillUsage } from "@/lib/agent-skills";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const { message, agentId, sessionId, visitor, context } = await request.json();

    if (!message || !agentId) {
      return NextResponse.json({ error: "Message and agentId are required" }, { status: 400 });
    }

    const agent = await Agent.findById(agentId);
    if (!agent || agent.status !== "active") {
      return NextResponse.json({ error: "Agent not available" }, { status: 404 });
    }

    const chatSessionId = sessionId || `chat-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    let conversation = await AgentConversation.findOne({
      agent: agent._id,
      sessionId: chatSessionId,
      status: "active",
    });

    if (!conversation) {
      conversation = await AgentConversation.create({
        agent: agent._id,
        sessionId: chatSessionId,
        channel: "website",
        visitor: visitor || {},
        context: context || {},
        startedAt: new Date(),
        messageCount: 0,
        tokenUsage: { prompt: 0, completion: 0, total: 0 },
        cost: 0,
      });
    }

    if (conversation.messageCount >= (agent.guardrails?.maxConversationLength || 100)) {
      return NextResponse.json({
        response: agent.guardrails?.fallbackMessage || "I've reached the maximum conversation length. Please start a new session or contact support.",
        conversationId: conversation._id,
        sessionId: chatSessionId,
      });
    }

    conversation.messages.push({
      role: "user",
      content: message,
      timestamp: new Date(),
    });
    conversation.messageCount += 1;
    await conversation.save();

    captureMemoriesFromMessage(
      agent._id.toString(),
      message,
      conversation._id.toString(),
      chatSessionId
    ).catch(() => {});

    const conversationHistory = conversation.messages.slice(-20).map(
      (m: { role: string; content: string }) => ({ role: m.role as "user" | "assistant", content: m.content })
    );

    const matchedSkills = await findMatchingSkills(agent._id.toString(), message);
    for (const skill of matchedSkills) {
      await trackSkillUsage(skill.skillId, true);
    }

    const startTime = Date.now();

    const result = await executeAIRequest({
      message,
      context: {
        userId: visitor?.userId,
        userRole: visitor?.role,
        visitorId: visitor?.id || `visitor-${Date.now()}`,
        visitorName: visitor?.name || "Visitor",
        visitorEmail: visitor?.email || "",
        channel: "website",
        conversationId: conversation._id.toString(),
        page: context?.page || "",
      },
      conversationHistory,
      agentId,
    });

    const responseText = result.response;
    const duration = Date.now() - startTime;

    conversation.messages.push({
      role: "assistant",
      content: responseText,
      timestamp: new Date(),
    });
    conversation.messageCount += 1;
    await conversation.save();

    await AgentExecution.create({
      agent: agent._id,
      conversation: conversation._id,
      type: "chat",
      status: "completed",
      input: { message },
      output: { response: responseText },
      tokens: result.tokenUsage || { prompt: 0, completion: 0, total: 0 },
      cost: result.cost || 0,
      duration,
      retryCount: 0,
      maxRetries: 3,
      startedAt: new Date(Date.now() - duration),
      completedAt: new Date(),
    });

    agent.stats.totalConversations = (agent.stats.totalConversations || 0) + (conversation.messageCount === 1 ? 1 : 0);
    agent.stats.totalMessages = (agent.stats.totalMessages || 0) + 1;
    agent.stats.lastActive = new Date();
    await agent.save();

    return NextResponse.json({
      response: responseText,
      conversationId: conversation._id,
      sessionId: chatSessionId,
      messageCount: conversation.messageCount,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Chat failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
