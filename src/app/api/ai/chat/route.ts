import { NextResponse } from "next/server";
import { generateAIContent } from "@/services/ai";

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  ar: "Arabic",
  zh: "Chinese",
  ja: "Japanese",
  ko: "Korean",
  pt: "Portuguese",
  ru: "Russian",
  hi: "Hindi",
  tr: "Turkish",
  ur: "Urdu",
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messages, language = "en", agentType = "general" } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Messages array is required" }, { status: 400 });
    }

    const langName = LANGUAGE_NAMES[language] || "English";

    const systemPrompts: Record<string, string> = {
      general: `You are Wall-V AI, a helpful assistant for Wall-V, an AI-powered digital agency. You help with general inquiries about our services (web development, AI automation, ERP/CRM, hosting, mobile apps, digital marketing). Be friendly, professional, and concise. IMPORTANT: Always respond in ${langName}. The user's interface language is ${langName}.`,
      sales: `You are Wall-V AI Sales Agent. You help potential clients understand our services and pricing. Our plans start at $499 (Starter), $1,499 (Professional), and $2,999+ (Enterprise). We also offer hosting from $1.99/mo to $29.99/mo. Be persuasive but honest. IMPORTANT: Always respond in ${langName}.`,
      support: `You are Wall-V AI Support Agent. You help existing clients with technical issues, hosting problems, and account questions. Be patient and thorough. IMPORTANT: Always respond in ${langName}.`,
      content: `You are Wall-V AI Content Writer. You help create blog posts, website copy, and marketing content. Be creative and engaging. IMPORTANT: Always respond in ${langName}.`,
      technical: `You are Wall-V AI Technical Assistant. You help with technical questions about our stack: Next.js, React, Node.js, MongoDB, Tailwind CSS, AI/ML, cloud hosting. Be precise and technical. IMPORTANT: Always respond in ${langName}.`,
    };

    const systemMessage = {
      role: "system" as const,
      content: systemPrompts[agentType] || systemPrompts.general,
    };

    const apiMessages = [systemMessage, ...messages.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }))];

    const response = await generateAIContent(apiMessages);

    return NextResponse.json({
      success: true,
      data: { content: response },
    });
  } catch (error) {
    console.error("AI chat error:", error);
    return NextResponse.json({ error: "AI service error" }, { status: 500 });
  }
}
