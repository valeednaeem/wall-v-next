import { NextRequest, NextResponse } from "next/server";
import Agent from "@/models/agent";
import AgentConversation from "@/models/agent-conversation";
import AgentExecution from "@/models/agent-execution";
import AgentMemory from "@/models/agent-memory";
import connectToDatabase from "@/lib/mongodb";
import { runAgentWithTools } from "@/lib/agent-tools";

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

    // Create or get conversation
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

    // Check conversation length guardrail
    if (conversation.messageCount >= (agent.guardrails?.maxConversationLength || 100)) {
      return NextResponse.json({
        response: agent.guardrails?.fallbackMessage || "I've reached the maximum conversation length. Please start a new session or contact support.",
        conversationId: conversation._id,
        sessionId: chatSessionId,
      });
    }

    // Add user message
    conversation.messages.push({
      role: "user",
      content: message,
      timestamp: new Date(),
    });
    conversation.messageCount += 1;
    await conversation.save();

    // Build context
    const conversationHistory = conversation.messages.slice(-20).map(
      (m: { role: string; content: string }) => ({ role: m.role, content: m.content })
    );

    const memories = await AgentMemory.find({
      agent: agent._id,
      type: { $in: ["long-term", "semantic"] },
    })
      .sort({ relevance: -1, accessCount: -1 })
      .limit(10);

    const memoryContext = memories.map((m) => `${m.category}: ${m.key} = ${JSON.stringify(m.value)}`).join("\n");

    const toolInstructions = `## CRITICAL: You MUST use your tools
You have database tools available. When the user asks about ANY of these topics, you MUST call the appropriate tool BEFORE responding:
- Projects → call get_projects or get_project
- Clients → call get_clients or get_client
- Leads → call get_leads
- Invoices/Payments → call get_invoices
- Quotes → call get_quotes
- Company info/pricing → call get_company_info
- Project requests → call get_project_requests

NEVER say "I don't have access" or "I can't see". You DO have access. USE YOUR TOOLS.`;

    const fullSystemPrompt = [
      toolInstructions,
      agent.systemPrompt,
      ...agent.instructions,
      memoryContext ? `\nRelevant memories:\n${memoryContext}` : "",
    ].filter(Boolean).join("\n");

    const startTime = Date.now();

    const { response: responseText, toolCalls } = await runAgentWithTools({
      systemPrompt: fullSystemPrompt,
      messages: conversationHistory,
      model: agent.aiModel || "gpt-4o",
      temperature: agent.temperature || 0.7,
      maxTokens: agent.maxTokens || 2048,
    });

    const duration = Date.now() - startTime;

    // Add assistant message
    conversation.messages.push({
      role: "assistant",
      content: responseText,
      timestamp: new Date(),
    });
    conversation.messageCount += 1;
    await conversation.save();

    // Create execution log
    await AgentExecution.create({
      agent: agent._id,
      conversation: conversation._id,
      type: "chat",
      status: "completed",
      input: { message },
      output: { response: responseText, toolCalls },
      tokens: { prompt: 0, completion: 0, total: 0 },
      cost: 0,
      duration,
      retryCount: 0,
      maxRetries: 3,
      startedAt: new Date(Date.now() - duration),
      completedAt: new Date(),
    });

    // Update agent stats
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
