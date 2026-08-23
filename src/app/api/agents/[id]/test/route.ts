import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import Agent from "@/models/agent";
import AgentConversation from "@/models/agent-conversation";
import AgentExecution from "@/models/agent-execution";
import AgentMemory from "@/models/agent-memory";
import connectToDatabase from "@/lib/mongodb";
import { runAgentWithTools } from "@/lib/agent-tools";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    const { id } = await params;
    const { message, sessionId } = await request.json();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const agent = await Agent.findById(id);
    if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    const testSessionId = sessionId || `test-${Date.now()}`;

    // Create or get conversation
    let conversation = await AgentConversation.findOne({
      agent: agent._id,
      sessionId: testSessionId,
      status: "active",
    });

    if (!conversation) {
      conversation = await AgentConversation.create({
        agent: agent._id,
        sessionId: testSessionId,
        channel: "dashboard",
        context: { language: "en" },
        visitor: { id: user.userId, name: user.email },
        startedAt: new Date(),
        messageCount: 0,
        tokenUsage: { prompt: 0, completion: 0, total: 0 },
        cost: 0,
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

    // Create execution
    const execution = await AgentExecution.create({
      agent: agent._id,
      conversation: conversation._id,
      type: "chat",
      status: "running",
      input: { message },
      tokens: { prompt: 0, completion: 0, total: 0 },
      cost: 0,
      duration: 0,
      retryCount: 0,
      maxRetries: 3,
      startedAt: new Date(),
    });

    // Build context for AI response
    const conversationHistory = conversation.messages.slice(-20).map(
      (m: { role: string; content: string }) => ({ role: m.role, content: m.content })
    );

    // Get relevant memories
    const memories = await AgentMemory.find({
      agent: agent._id,
      type: { $in: ["long-term", "semantic"] },
    })
      .sort({ relevance: -1, accessCount: -1 })
      .limit(10);

    const memoryContext = memories.map((m) => `${m.category}: ${m.key} = ${JSON.stringify(m.value)}`).join("\n");

    // User context for the system prompt
    const userContext = conversation.visitor?.id
      ? `\n\n## Current User Context\n- User ID: ${conversation.visitor.id}\n- Email: ${conversation.visitor.name || "unknown"}\nYou are speaking with a logged-in admin user. You have full access to query the database using your tools.`
      : "";

    // Build system prompt with tool instructions
    const toolInstructions = `\n\n## Your Tools
You have access to the following tools to query the application database:
- get_projects: List projects (filter by status, clientEmail, projectType)
- get_project: Get single project details (by projectId or projectName)
- get_clients: List clients (search by name/email/company)
- get_client: Get single client (by clientId or email)
- get_leads: List leads (filter by status, search)
- get_invoices: List invoices (filter by projectId, status)
- get_quotes: List quotations (filter by projectId, status)
- get_company_info: Get Wall-V services and pricing
- get_project_requests: List AI project requests

IMPORTANT: Always use your tools to look up real data when the user asks about projects, clients, leads, invoices, quotes, or company info. Do not make up information — query the database.`;

    const fullSystemPrompt = [
      agent.systemPrompt,
      ...agent.instructions,
      memoryContext ? `\nRelevant memories:\n${memoryContext}` : "",
      userContext,
      toolInstructions,
    ].filter(Boolean).join("\n");

    const startTime = Date.now();

    // Run agent with tool-calling loop
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
      tokenCount: 0,
    });
    conversation.messageCount += 1;
    await conversation.save();

    // Update execution
    execution.status = "completed";
    execution.output = { response: responseText, toolCalls };
    execution.duration = duration;
    execution.completedAt = new Date();
    await execution.save();

    // Update agent stats
    agent.stats.totalConversations = (agent.stats.totalConversations || 0) + 1;
    agent.stats.totalMessages = (agent.stats.totalMessages || 0) + 2;
    agent.stats.lastActive = new Date();
    await agent.save();

    return NextResponse.json({
      response: responseText,
      conversation: {
        id: conversation._id,
        sessionId: testSessionId,
        messageCount: conversation.messageCount,
      },
      execution: {
        id: execution._id,
        duration,
        tokens: execution.tokens,
      },
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to test agent";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
