import { NextResponse } from "next/server";
import { generateAIContent } from "@/services/ai";
import { buildServiceKnowledge } from "@/lib/price-knowledge";
import { connectToDatabase } from "@/lib/mongodb";
import Conversation from "@/models/conversation";

const PERSONALITY = `You are Wall-V AI, a senior project consultant and solution architect at Wall-V — an AI-powered digital agency. You help businesses and individuals plan, design, and build digital solutions.

PERSONALITY:
- You are a real consultant, not a chatbot. Talk naturally, like a human expert.
- Be warm but professional. Friendly but not fake.
- Give opinions and recommendations. Don't just ask questions — add value.
- If someone asks something unrelated to projects/services, answer helpfully but gently steer back.
- Never say "I'm just a bot" or similar. You ARE Wall-V AI.
- Match the user's language and energy. Casual? Be casual. Formal? Be formal.
- Be concise. Don't write essays. 2-4 sentences max unless they ask for detail.
- NEVER use emojis unless the user does.
- NEVER use generic filler like "Great question!" or "Thanks for sharing!"

COMPETITIVE POSITIONING:
- We build custom solutions that OWN the code — clients never pay monthly SaaS fees for features they control.
- vs. Wix/Squarespace ($17–$49/mo): Our custom websites start at $1,999 one-time, pay for themselves in 3–4 years, plus full ownership and no platform lock-in.
- vs. Tidio/Intercom ($29–$2,999/mo): Our AI chatbots start at $2,499 one-time — pays for itself in 3–8 months vs. SaaS.
- vs. Hiring in-house: We deliver agency-quality work at freelancer prices. No payroll, no benefits, no management overhead.
- Our hosting starts at $3.99/mo — cheaper than Wix ($17/mo) and Squarespace ($16/mo).
- We offer tiered packages (Basic/Standard/Premium) so clients can start small and scale.

CONVERSATION FLOW:
1. Greet warmly, introduce yourself, ask what they need
2. Listen actively — extract project type, goals, features from what they say
3. Ask smart follow-ups (one at a time) to fill gaps
4. Give recommendations based on what they've told you, including pricing tiers
5. Summarize when ready and offer to save as a project inquiry
6. Don't force the flow — if they ask about pricing, answer. If they ask about tech, answer. Then continue naturally.

RESPONSE RULES:
- Keep responses short and conversational (2-4 sentences typically)
- Ask ONE question at a time
- Don't ask what you already know
- If they mention a budget, acknowledge it and adjust your recommendations
- If they seem ready to buy, help them move forward
- If they're browsing, be helpful without pressure
- Always respond in the same language the user writes in`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, conversationHistory = [], language = "en", sessionId } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Build dynamic service knowledge from database prices
    const serviceKnowledge = await buildServiceKnowledge();
    const WALLV_KNOWLEDGE = `${PERSONALITY}\n\nWALL-V SERVICES (what we actually sell — prices are managed by admin):\n\n${serviceKnowledge}`;

    // Build conversation messages for AI
    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: WALLV_KNOWLEDGE },
    ];

    // Add conversation history (last 20 messages max to stay within token limits)
    const recentHistory = conversationHistory.slice(-20);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content,
      });
    }

    // Add current message
    messages.push({ role: "user", content: message });

    // Get AI response
    let aiResponse: string;
    try {
      const generated = await generateAIContent(messages);
      if (generated && generated.length > 5) {
        aiResponse = generated;
      } else {
        aiResponse = "I'd love to help you with that. Could you tell me a bit more about what you're looking for?";
      }
    } catch (aiError) {
      console.error("AI provider error:", aiError);
      // Intelligent fallback based on message content
      aiResponse = generateFallbackResponse(message);
    }

    // Try to extract suggestions from the AI response
    const suggestions = extractSuggestions(aiResponse, message);

    // Persist conversation for analytics
    try {
      await connectToDatabase();
      const sid = sessionId || `session_${Date.now()}`;
      const incomingMessages = [
        ...conversationHistory.map((m: { role: string; content: string }) => ({
          role: m.role,
          content: m.content,
          timestamp: new Date(),
        })),
        { role: "user" as const, content: message, timestamp: new Date() },
        { role: "assistant" as const, content: aiResponse, timestamp: new Date() },
      ];

      await Conversation.findOneAndUpdate(
        { sessionId: sid },
        {
          sessionId: sid,
          language,
          agentType: "discovery",
          messages: incomingMessages,
          messageCount: incomingMessages.length,
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

function generateFallbackResponse(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("hosting") || lower.includes("host")) {
    return "We offer hosting from $3.99/month — cheaper than Wix ($17/mo) and Squarespace ($16/mo). Basic at $3.99, Business at $9.99, and Cloud at $16.99. All plans include free SSL and 99.9% uptime. What kind of website are you planning to host?";
  }
  if (lower.includes("price") || lower.includes("cost") || lower.includes("how much")) {
    return "Pricing depends on what you need. Web development starts from $1,999, mobile apps from $4,999, AI chatbots from $2,499, and e-commerce from $3,999. Hosting starts at $3.99/month. All projects include tiered packages — Basic, Standard, and Premium. What are you looking to build?";
  }
  if (lower.includes("domain")) {
    return "We register domains from $9.99/year — .com, .net, .org, .pk, .io, .dev, .app, and .co. Do you have a specific domain in mind?";
  }
  if (lower.includes("ai") || lower.includes("chatbot") || lower.includes("voice")) {
    return "We specialize in AI solutions — custom chatbots from $2,499, voice agents from $3,999, and process automation from $1,999. Our AI solutions pay for themselves in 3–6 months vs. SaaS platforms ($29–$2,999/mo). What kind of AI features are you thinking about?";
  }

  return "I'm having trouble connecting to my AI backend right now. Could you rephrase your question, or I can help you with web development (from $1,999), mobile apps (from $4,999), AI solutions (from $1,999), hosting (from $3.99/mo), or digital marketing (from $999/mo)?";
}

function extractSuggestions(aiResponse: string, userMessage: string): string[] {
  const lower = userMessage.toLowerCase();
  const responseLower = aiResponse.toLowerCase();

  // Dynamic suggestions based on context
  if (responseLower.includes("what kind") || responseLower.includes("what type") || responseLower.includes("tell me about")) {
    return ["I need a website", "I need a mobile app", "I need AI/automation", "I need hosting", "Just exploring options"];
  }
  if (responseLower.includes("budget") || responseLower.includes("price") || responseLower.includes("cost")) {
    return ["Under $1,000", "$1,000 - $5,000", "$5,000 - $15,000", "Let's discuss later"];
  }
  if (responseLower.includes("timeline") || responseLower.includes("deadline") || responseLower.includes("when")) {
    return ["ASAP", "Within 1 month", "1-3 months", "No rush"];
  }
  if (responseLower.includes("feature") || responseLower.includes("functionality")) {
    return ["User login/accounts", "Payment processing", "Dashboard/admin panel", "AI features", "Mobile app"];
  }
  if (responseLower.includes("summar") || responseLower.includes("overview") || responseLower.includes("recommend")) {
    return ["Looks good, save it", "I need to make changes", "Tell me more about pricing"];
  }
  if (responseLower.includes("hosting") || responseLower.includes("host")) {
    return ["Basic plan", "Business plan", "Cloud plan", "Compare plans"];
  }

  // Generic helpful suggestions
  return ["Tell me more", "What's the pricing?", "Show me examples", "Let's get started"];
}
