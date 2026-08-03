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
      state = conversation.discoveryState as unknown as ConversationState;
      // Merge client-side brief updates (from handleSuggestionClick) into server state
      if (incomingConversationState?.brief) {
        const clientBrief = incomingConversationState.brief;
        const serverBrief = state.brief;
        // Only merge fields that the client has set but server hasn't
        if (clientBrief.projectType && !serverBrief.projectType) serverBrief.projectType = clientBrief.projectType;
        if (clientBrief.objective && !serverBrief.objective) serverBrief.objective = clientBrief.objective;
        if (clientBrief.features?.length > 0 && serverBrief.features.length === 0) serverBrief.features = clientBrief.features;
        if (clientBrief.estimatedBudget && !serverBrief.estimatedBudget) serverBrief.estimatedBudget = clientBrief.estimatedBudget;
        if (clientBrief.desiredTimeline && !serverBrief.desiredTimeline) serverBrief.desiredTimeline = clientBrief.desiredTimeline;
        if (clientBrief.targetAudience && !serverBrief.targetAudience) serverBrief.targetAudience = clientBrief.targetAudience;
        if (clientBrief.businessContext?.industry && !serverBrief.businessContext?.industry) serverBrief.businessContext = clientBrief.businessContext;
        if (clientBrief.designPreferences && !serverBrief.designPreferences) serverBrief.designPreferences = clientBrief.designPreferences;
        if (clientBrief.integrations?.length > 0 && serverBrief.integrations.length === 0) serverBrief.integrations = clientBrief.integrations;
      }
    } else if (incomingConversationState) {
      state = incomingConversationState as ConversationState;
    } else {
      state = initializeConversationState(language);
    }

    // Process user message through state machine (extracts entities, advances stage)
    const newState = processUserMessage(state, message);

    // Generate deterministic response FIRST — this is the source of truth
    const deterministicResponse = generateNextResponse(newState);

    console.log("[Discover]", {
      sid,
      stage: newState.stage,
      askedQuestions: newState.askedQuestions,
      lastQuestion: newState.lastQuestionCategory,
      turnCount: newState.turnCount,
      projectType: newState.brief.projectType,
      objective: newState.brief.objective,
      features: newState.brief.features,
      budget: newState.brief.estimatedBudget,
      targetAudience: newState.brief.targetAudience,
      businessContext: newState.brief.businessContext,
      nextAction: deterministicResponse.action,
      nextQuestion: deterministicResponse.nextQuestion,
    });

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

    // IMPORTANT: The state machine's question is the source of truth.
    // The AI can add natural language but MUST ask the same core question.
    systemPrompt += `\n\nCRITICAL INSTRUCTION: You MUST ask the following question to the user. Do NOT ask about any other topic. Do NOT ask about project type if it's already determined. The ONLY question you should ask is:\n"${deterministicResponse.message}"\n\nYou may rephrase it naturally, but the core question must be exactly this. After asking, provide your suggestions as clickable options.`;

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

    // Get AI response — always fall back to deterministic if AI fails or returns garbage
    let aiResponse: string;
    try {
      const generated = await generateAIContent(messages);
      if (generated && generated.length > 10) {
        aiResponse = generated;
      } else {
        aiResponse = deterministicResponse.message;
      }
    } catch (aiError) {
      console.error("AI provider error:", aiError);
      aiResponse = deterministicResponse.message;
    }

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

      const brief = newState.brief;

      await Conversation.findOneAndUpdate(
        { sessionId: sid },
        {
          sessionId: sid,
          language,
          agentType: "discovery",
          channel: "chat",
          messages: incomingMessages.slice(-42),
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
        suggestions: deterministicResponse.suggestions,
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
