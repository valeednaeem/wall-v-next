import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import Agent from "@/models/agent";
import AgentConversation from "@/models/agent-conversation";
import AgentExecution from "@/models/agent-execution";
import AgentMemory from "@/models/agent-memory";
import connectToDatabase from "@/lib/mongodb";

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
      (m: { role: string; content: string }) => `${m.role}: ${m.content}`
    );

    // Get relevant memories
    const memories = await AgentMemory.find({
      agent: agent._id,
      type: { $in: ["long-term", "semantic"] },
    })
      .sort({ relevance: -1, accessCount: -1 })
      .limit(10);

    const memoryContext = memories.map((m) => `${m.category}: ${m.key} = ${JSON.stringify(m.value)}`).join("\n");

    // Build system prompt
    const userContext = conversation.visitor?.id
      ? `\n\n## Current User Context\n- User ID: ${conversation.visitor.id}\n- Email: ${conversation.visitor.name || "unknown"}\nYou are speaking with a logged-in user. You can reference their account information.`
      : "";

    const systemParts = [
      agent.systemPrompt,
      ...agent.instructions,
      memoryContext ? `\nRelevant memories:\n${memoryContext}` : "",
      userContext,
      `\nConversation history:\n${conversationHistory.join("\n")}`,
    ].filter(Boolean);

    const fullSystemPrompt = systemParts.join("\n");

    const startTime = Date.now();

    // Call AI (using fetch to OpenAI-compatible API)
    const apiKey = process.env.OPENAI_API_KEY;
    let responseText = "";

    if (apiKey) {
      try {
        const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: agent.aiModel || "gpt-4o",
            messages: [
              { role: "system", content: fullSystemPrompt },
              { role: "user", content: message },
            ],
            temperature: agent.temperature,
            max_tokens: agent.maxTokens,
          }),
        });

        if (aiResponse.ok) {
          const data = await aiResponse.json();
          responseText = data.choices?.[0]?.message?.content || "No response generated.";
          execution.tokens = {
            prompt: data.usage?.prompt_tokens || 0,
            completion: data.usage?.completion_tokens || 0,
            total: data.usage?.total_tokens || 0,
          };
        } else {
          responseText = `AI API error: ${aiResponse.status}`;
        }
      } catch {
        responseText = "Failed to call AI API. Check your configuration.";
      }
    } else {
      responseText = `[Test Mode] Agent "${agent.name}" received: "${message}"\n\nNo AI API key configured. Set OPENAI_API_KEY to enable real responses.`;
    }

    const duration = Date.now() - startTime;

    // Add assistant message
    conversation.messages.push({
      role: "assistant",
      content: responseText,
      timestamp: new Date(),
      tokenCount: execution.tokens.completion,
    });
    conversation.messageCount += 1;
    conversation.tokenUsage = {
      prompt: conversation.tokenUsage.prompt + execution.tokens.prompt,
      completion: conversation.tokenUsage.completion + execution.tokens.completion,
      total: conversation.tokenUsage.total + execution.tokens.total,
    };
    await conversation.save();

    // Update execution
    execution.status = "completed";
    execution.output = { response: responseText };
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
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to test agent";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
