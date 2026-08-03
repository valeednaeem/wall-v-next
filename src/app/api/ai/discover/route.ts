import { NextResponse } from "next/server";
import { generateAIContent } from "@/services/ai";
import { connectToDatabase } from "@/lib/mongodb";
import Conversation from "@/models/conversation";
import {
  initializeConversationState,
  processUserMessage,
  generateNextResponse,
  generateDiscoverySystemPrompt,
  getAgentPriceSummary,
  type ConversationState,
} from "@/lib/project-discovery";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      message,
      conversationHistory = [],
      language = "en",
      sessionId,
      incomingConversationState,
    } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Resolve session ID
    const sid = sessionId || `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Load existing conversation or create new
    let conversation = await Conversation.findOne({ sessionId: sid }).lean();
    let state: ConversationState;

    if (conversation?.discoveryState) {
      // Restore state from DB
      state = conversation.discoveryState as unknown as ConversationState;
    } else if (incomingConversationState) {
      // Use state sent from frontend (first request with fresh state)
      state = incomingConversationState as ConversationState;
    } else {
      // Fresh conversation
      state = initializeConversationState(language);
    }

    // Process user message through state machine (extracts entities, advances stage)
    const newState = processUserMessage(state, message);

    // Build dynamic service knowledge for system prompt
    let priceSummary: string;
    try {
      priceSummary = await getAgentPriceSummary();
    } catch {
      priceSummary = "";
    }

    // Build system prompt from state machine
    let systemPrompt = generateDiscoverySystemPrompt(newState);
    if (priceSummary) {
      systemPrompt += `\n\nCURRENT PRICING (from database):\n${priceSummary}`;
    }

    // Build conversation messages for AI
    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemPrompt },
    ];

    // Add conversation history (last 20 messages)
    const recentHistory = conversationHistory.slice(-20);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content,
      });
    }

    // Add current user message
    messages.push({ role: "user", content: message });

    // Get AI response
    let aiResponse: string;
    try {
      const generated = await generateAIContent(messages);
      if (generated && generated.length > 5) {
        aiResponse = generated;
      } else {
        // Fallback: use deterministic response from state machine
        const deterministic = generateNextResponse(newState);
        aiResponse = deterministic.message;
      }
    } catch (aiError) {
      console.error("AI provider error:", aiError);
      // Fallback: use deterministic response from state machine
      const deterministic = generateNextResponse(newState);
      aiResponse = deterministic.message;
    }

    // Get stage-appropriate suggestions
    const deterministicResponse = generateNextResponse(newState);
    const suggestions = deterministicResponse.suggestions;

    // Persist to MongoDB
    try {
      const incomingMessages = [
        ...(conversation?.messages || []).map((m: { role: string; content: string }) => ({
          role: m.role,
          content: m.content,
          timestamp: new Date(),
        })),
        { role: "user" as const, content: message, timestamp: new Date() },
        { role: "assistant" as const, content: aiResponse, timestamp: new Date() },
      ];

      // Sync projectBrief from discovery state
      const brief = newState.brief;

      await Conversation.findOneAndUpdate(
        { sessionId: sid },
        {
          sessionId: sid,
          language,
          agentType: "discovery",
          channel: "chat",
          messages: incomingMessages.slice(-42), // keep last 42 (21 pairs)
          messageCount: incomingMessages.length,
          discoveryState: newState as unknown as Record<string, unknown>,
          projectBrief: {
            projectType: brief.projectType || undefined,
            features: brief.features.length > 0 ? brief.features : undefined,
            budget: brief.estimatedBudget || undefined,
            timeline: brief.desiredTimeline || undefined,
            clientName: (brief as unknown as Record<string, unknown>)._contactName as string || undefined,
            clientEmail: (brief as unknown as Record<string, unknown>)._contactEmail as string || undefined,
            clientPhone: (brief as unknown as Record<string, unknown>)._contactPhone as string || undefined,
          },
          $setOnInsert: { startedAt: new Date() },
        },
        { upsert: true, new: true }
      );
    } catch (trackErr) {
      console.error("[Discover] Conversation tracking failed:", trackErr);
    }

    return NextResponse.json({
      success: true,
      data: {
        message: aiResponse,
        suggestions,
        language,
        sessionId: sid,
        conversationState: newState,
        stage: newState.stage,
        action: deterministicResponse.action,
        brief: deterministicResponse.action === "confirm" ? newState.brief : undefined,
      },
    });
  } catch (error) {
    console.error("Discover API error:", error);
    return NextResponse.json(
      { error: "Service temporarily unavailable" },
      { status: 500 }
    );
  }
}
