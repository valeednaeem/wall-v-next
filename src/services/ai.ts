import type { AIProvider } from "@/lib/providers";
import type { AIChatMessage } from "@/types/ai";

class OpenAIProvider implements AIProvider {
  name = "openai";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async chat(messages: AIChatMessage[]): Promise<string> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${data.error?.message || response.status}`);
    }

    return data.choices?.[0]?.message?.content || "";
  }

  async generateContent(prompt: string): Promise<string> {
    return this.chat([{ role: "user", content: prompt }]);
  }
}

class AnthropicProvider implements AIProvider {
  name = "anthropic";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async chat(messages: AIChatMessage[]): Promise<string> {
    const systemMsg = messages.find((m) => m.role === "system");
    const userMessages = messages.filter((m) => m.role !== "system");

    if (userMessages.length === 0) {
      userMessages.push({ role: "user", content: "Hello" });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemMsg?.content || "",
        messages: userMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${data.error?.message || response.status}`);
    }

    return data.content?.[0]?.text || "";
  }

  async generateContent(prompt: string): Promise<string> {
    return this.chat([{ role: "user", content: prompt }]);
  }
}

// ─── Conversation AI (OpenAI) ────────────────────────────────────────────────
// Used for: chatbot conversation, discovery dialogue, natural language

function getConversationAI(): AIProvider {
  const apiKey = process.env.OPENAI_API_KEY || "";
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured in .env.local");
  }
  return new OpenAIProvider(apiKey);
}

// ─── Technical AI (Anthropic) ────────────────────────────────────────────────
// Used for: blog content, product descriptions, SEO, brief summaries, technical analysis

function getTechnicalAI(): AIProvider {
  const apiKey = process.env.AI_API_KEY || "";
  if (!apiKey) {
    throw new Error("AI_API_KEY (Anthropic) not configured in .env.local");
  }
  return new AnthropicProvider(apiKey);
}

// ─── Public API: Conversation (OpenAI) ───────────────────────────────────────

export async function generateAIContent(
  messages: AIChatMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const ai = getConversationAI();
  return ai.chat(messages);
}

// ─── Public API: Technical Tasks (Anthropic) ─────────────────────────────────

export async function generateTechnicalContent(
  messages: AIChatMessage[]
): Promise<string> {
  const ai = getTechnicalAI();
  return ai.chat(messages);
}

export async function generateBlogContent(topic: string): Promise<string> {
  const ai = getTechnicalAI();
  return ai.generateContent(
    `Write a comprehensive, SEO-optimized blog post about: ${topic}. Include headings, subheadings, and make it engaging.`
  );
}

export async function generateProductDescription(name: string, features: string[]): Promise<string> {
  const ai = getTechnicalAI();
  return ai.generateContent(
    `Write a compelling product description for "${name}" with these features: ${features.join(", ")}. Make it professional and persuasive.`
  );
}

export async function generateSEOContent(title: string): Promise<{ metaTitle: string; metaDescription: string; keywords: string[] }> {
  const ai = getTechnicalAI();
  const response = await ai.generateContent(
    `Generate SEO metadata for "${title}". Return JSON with metaTitle (max 60 chars), metaDescription (max 160 chars), and keywords (array of 5-10 relevant keywords).`
  );

  try {
    return JSON.parse(response);
  } catch {
    return {
      metaTitle: title,
      metaDescription: `${title} - Wall-V AI Digital Agency`,
      keywords: [title.toLowerCase(), "wall-v", "digital agency"],
    };
  }
}

export async function generateBriefSummary(brief: Record<string, unknown>): Promise<string> {
  const ai = getTechnicalAI();
  const prompt = `You are a technical project architect. Analyze this project brief and provide a professional summary with:

1. Project Overview (2-3 sentences)
2. Recommended Tech Stack
3. Key Features Breakdown
4. Estimated Timeline
5. Technical Considerations
6. Risk Assessment

Project Brief:
${JSON.stringify(brief, null, 2)}

Be specific, professional, and actionable. Focus on technical feasibility.`;

  return ai.generateContent(prompt);
}

// ─── Image Generation (OpenAI gpt-image-2) ──────────────────────────────────

export interface ImageGenerationOptions {
  prompt: string;
  size?: "1024x1024" | "1536x1024" | "1024x1536" | "auto";
  quality?: "low" | "medium" | "high";
  background?: "auto" | "transparent" | "opaque";
}

export interface ImageGenerationResult {
  success: boolean;
  imageUrl?: string;
  revisedPrompt?: string;
  error?: string;
}

export async function generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { success: false, error: "OPENAI_API_KEY not configured" };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-image-2",
        prompt: options.prompt,
        n: 1,
        size: options.size || "1024x1024",
        quality: options.quality || "medium",
        background: options.background || "auto",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error?.message || `Image generation failed (${response.status})`,
      };
    }

    const image = data.data?.[0];
    if (!image?.url) {
      return { success: false, error: "No image returned from API" };
    }

    return {
      success: true,
      imageUrl: image.url,
      revisedPrompt: image.revised_prompt,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Image generation failed",
    };
  }
}
