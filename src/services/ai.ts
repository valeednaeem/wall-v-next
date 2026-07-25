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
    return data.choices[0].message.content;
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

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-opus-20240229",
        max_tokens: 4096,
        system: systemMsg?.content,
        messages: userMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    const data = await response.json();
    return data.content[0].text;
  }

  async generateContent(prompt: string): Promise<string> {
    return this.chat([{ role: "user", content: prompt }]);
  }
}

export function getAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER || "openai";
  const apiKey = process.env.AI_API_KEY || "";

  if (!apiKey) {
    throw new Error(
      "AI API key not configured. Set AI_PROVIDER and AI_API_KEY in .env.local."
    );
  }

  switch (provider) {
    case "anthropic":
      return new AnthropicProvider(apiKey);
    case "openai":
    default:
      return new OpenAIProvider(apiKey);
  }
}

export async function generateAIContent(
  messages: AIChatMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const ai = getAIProvider();
  return ai.chat(messages);
}

export async function generateBlogContent(topic: string): Promise<string> {
  const ai = getAIProvider();
  return ai.generateContent(
    `Write a comprehensive, SEO-optimized blog post about: ${topic}. Include headings, subheadings, and make it engaging.`
  );
}

export async function generateProductDescription(name: string, features: string[]): Promise<string> {
  const ai = getAIProvider();
  return ai.generateContent(
    `Write a compelling product description for "${name}" with these features: ${features.join(", ")}. Make it professional and persuasive.`
  );
}

export async function generateSEOContent(title: string): Promise<{ metaTitle: string; metaDescription: string; keywords: string[] }> {
  const ai = getAIProvider();
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
