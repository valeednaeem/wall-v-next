/**
 * Provider-aware AI adapter.
 *
 * Routes model calls to the correct provider (OpenAI or Anthropic)
 * based on the model name. Returns structured results with provider metadata.
 */

export type ProviderName = "openai" | "anthropic";

export interface ProviderMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: unknown[];
  tool_call_id?: string;
}

export interface ProviderToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ProviderChatOptions {
  model: string;
  messages: ProviderMessage[];
  tools?: ProviderToolDefinition[];
  temperature?: number;
  maxTokens?: number;
}

export interface ProviderToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface ProviderChatResult {
  provider: ProviderName;
  model: string;
  content: string;
  toolCalls: ProviderToolCall[];
  usage: { prompt: number; completion: number; total: number };
  finishReason: string | null;
}

export interface ProviderAdapter {
  name: ProviderName;
  chat(options: ProviderChatOptions): Promise<ProviderChatResult>;
  validate(): Promise<{ valid: boolean; error?: string }>;
}

// ─── Model Detection ────────────────────────────────────────────────────────

const ANTHROPIC_MODEL_PREFIXES = ["claude-", "anthropic"];

export function detectProvider(model: string): ProviderName {
  const lower = model.toLowerCase();
  if (ANTHROPIC_MODEL_PREFIXES.some((p) => lower.startsWith(p))) {
    return "anthropic";
  }
  return "openai";
}

export function validateProviderConfig(provider: ProviderName): { valid: boolean; error?: string } {
  if (provider === "openai") {
    const key = process.env.OPENAI_API_KEY;
    if (!key) return { valid: false, error: "OPENAI_API_KEY not configured" };
    return { valid: true };
  }
  if (provider === "anthropic") {
    const key = process.env.AI_API_KEY;
    if (!key) return { valid: false, error: "AI_API_KEY (Anthropic) not configured" };
    return { valid: true };
  }
  return { valid: false, error: `Unknown provider: ${provider}` };
}

// ─── OpenAI Adapter ─────────────────────────────────────────────────────────

class OpenAIAdapter implements ProviderAdapter {
  name: ProviderName = "openai";

  async validate(): Promise<{ valid: boolean; error?: string }> {
    return validateProviderConfig("openai");
  }

  async chat(options: ProviderChatOptions): Promise<ProviderChatResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

    const body: Record<string, unknown> = {
      model: options.model,
      messages: options.messages.map((m) => ({
        role: m.role,
        content: m.content,
        ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
        ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
      })),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
    };

    if (options.tools && options.tools.length > 0) {
      body.tools = options.tools;
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${data.error?.message || response.status}`);
    }

    const choice = data.choices?.[0];
    const message = choice?.message;

    return {
      provider: "openai",
      model: options.model,
      content: message?.content || "",
      toolCalls: (message?.tool_calls || []).map((tc: ProviderToolCall) => ({
        id: tc.id,
        name: tc.name,
        arguments: tc.arguments,
      })),
      usage: {
        prompt: data.usage?.prompt_tokens || 0,
        completion: data.usage?.completion_tokens || 0,
        total: data.usage?.total_tokens || 0,
      },
      finishReason: choice?.finish_reason || null,
    };
  }
}

// ─── Anthropic Adapter ──────────────────────────────────────────────────────

class AnthropicAdapter implements ProviderAdapter {
  name: ProviderName = "anthropic";

  async validate(): Promise<{ valid: boolean; error?: string }> {
    return validateProviderConfig("anthropic");
  }

  async chat(options: ProviderChatOptions): Promise<ProviderChatResult> {
    const apiKey = process.env.AI_API_KEY;
    if (!apiKey) throw new Error("AI_API_KEY (Anthropic) not configured");

    const systemMsg = options.messages.find((m) => m.role === "system");
    const userMessages = options.messages.filter((m) => m.role !== "system");

    if (userMessages.length === 0) {
      userMessages.push({ role: "user", content: "Hello" });
    }

    const body: Record<string, unknown> = {
      model: options.model,
      max_tokens: options.maxTokens ?? 4096,
      system: systemMsg?.content || "",
      messages: userMessages.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    };

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${data.error?.message || response.status}`);
    }

    const content = data.content?.[0]?.text || "";

    return {
      provider: "anthropic",
      model: options.model,
      content,
      toolCalls: [],
      usage: {
        prompt: data.usage?.input_tokens || 0,
        completion: data.usage?.output_tokens || 0,
        total: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
      finishReason: data.stop_reason || null,
    };
  }
}

// ─── Factory ────────────────────────────────────────────────────────────────

const adapters: Record<ProviderName, () => ProviderAdapter> = {
  openai: () => new OpenAIAdapter(),
  anthropic: () => new AnthropicAdapter(),
};

export function getProviderAdapter(model: string): ProviderAdapter {
  const provider = detectProvider(model);
  return adapters[provider]();
}

export function getProviderByName(name: ProviderName): ProviderAdapter {
  return adapters[name]();
}
