/**
 * Vapi client/server configuration helpers.
 *
 * Security rules (Vapi docs: "Never expose your private API key in the browser"):
 * - NEXT_PUBLIC_VAPI_PUBLIC_KEY  → browser-safe public key only
 * - VAPI_ASSISTANT_ID            → server env, merged into /api/settings/public (IDs are not secrets)
 * - VAPI_WEBHOOK_SECRET          → server-only, never referenced from client code
 *
 * This module must never reference a private Vapi API key.
 */

export const VAPI_PUBLIC_KEY_ENV = "NEXT_PUBLIC_VAPI_PUBLIC_KEY";
export const VAPI_ASSISTANT_ID_ENV = "VAPI_ASSISTANT_ID";
export const VAPI_WEBHOOK_SECRET_ENV = "VAPI_WEBHOOK_SECRET";

export interface VapiClientConfig {
  /** Browser-safe Vapi public key. */
  publicKey: string;
  /** Vapi assistant ID resolved from settings (or empty). */
  assistantId: string;
}

export interface VapiConfigValidation {
  valid: boolean;
  reason?: string;
}

/**
 * Active voice provider (decision D1).
 * Persisted as settings.voice.provider; defaults to "dograh" so production
 * behavior is byte-identical until Vapi is deliberately enabled.
 */
export type VoiceProvider = "dograh" | "vapi";

/**
 * Whitelists the provider value coming from the DB / API.
 * Anything other than the exact string "vapi" falls back to "dograh" —
 * an unknown value can never silently enable Vapi.
 */
export function normalizeVoiceProvider(value: unknown): VoiceProvider {
  return value === "vapi" ? "vapi" : "dograh";
}

/** Public (client-safe) view of the Vapi configuration. */
export interface PublicVoiceVapiConfig {
  /** Whitelisted provider, defaults to "dograh". */
  provider: VoiceProvider;
  /** Assistant ID served to the browser (IDs are not secrets). */
  vapiAssistantId: string;
  /** True only when BOTH public key and assistant ID are present. */
  vapiConfigured: boolean;
  /** Human-readable reason when not configured ("" when configured). */
  vapiConfigError: string;
}

/**
 * Builds the public voice-provider view for /api/settings/public.
 * Never reads or returns VAPI_WEBHOOK_SECRET (server-only).
 *
 * Assistant ID precedence: settings.voice.vapiAssistantId → VAPI_ASSISTANT_ID env.
 * A separate key from voice.agentId is intentional: voice.agentId keeps holding
 * the Dograh agent ID so Dograh stays a working rollback path.
 */
export function resolvePublicVoiceVapiConfig(
  stored: { provider?: unknown; vapiAssistantId?: unknown }
): PublicVoiceVapiConfig {
  const provider = normalizeVoiceProvider(stored.provider);
  const vapiAssistantId =
    typeof stored.vapiAssistantId === "string" && stored.vapiAssistantId.trim()
      ? stored.vapiAssistantId.trim()
      : process.env[VAPI_ASSISTANT_ID_ENV]?.trim() ?? "";
  const publicKey = getVapiPublicKey();

  if (!publicKey) {
    return {
      provider,
      vapiAssistantId,
      vapiConfigured: false,
      vapiConfigError: "Vapi public key is not configured.",
    };
  }
  if (!vapiAssistantId) {
    return {
      provider,
      vapiAssistantId,
      vapiConfigured: false,
      vapiConfigError: "Vapi assistant ID is not configured.",
    };
  }
  return { provider, vapiAssistantId, vapiConfigured: true, vapiConfigError: "" };
}

/**
 * Reads the browser-safe Vapi public key from the environment.
 *
 * NOTE: this reads the literal `process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY`
 * (not `process.env[VAPI_PUBLIC_KEY_ENV]`) so the Next.js build can inline
 * the value into the browser bundle. Dynamic/computed access is only
 * resolvable at runtime in Node — in the browser it is always undefined.
 */
export function getVapiPublicKey(): string {
  return process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY?.trim() ?? "";
}

/**
 * Resolves the assistant ID for client use.
 * Source of truth is settings.voice.vapiAssistantId (served by
 * /api/settings/public, which merges the server-side VAPI_ASSISTANT_ID env as
 * fallback). Kept separate from voice.agentId, which still holds the Dograh
 * agent ID for rollback.
 */
export function resolveVapiAssistantId(settingsAssistantId: string | null | undefined): string {
  if (typeof settingsAssistantId !== "string") return "";
  return settingsAssistantId.trim();
}

/** Server-side check: is a Vapi assistant ID configured? */
export function isServerVapiConfigured(): boolean {
  return Boolean(process.env[VAPI_ASSISTANT_ID_ENV]?.trim());
}

/**
 * Validates that the voice experience can start a Vapi call.
 * Mirrors the validateDograhWidgetUrl() pattern: loud, human-readable reasons.
 */
export function validateVapiConfig(config: Partial<VapiClientConfig>): VapiConfigValidation {
  const publicKey = typeof config.publicKey === "string" ? config.publicKey.trim() : "";
  const assistantId = typeof config.assistantId === "string" ? config.assistantId.trim() : "";

  if (!publicKey) {
    return { valid: false, reason: "Vapi public key is not configured." };
  }
  if (/\s/.test(publicKey)) {
    return { valid: false, reason: "Vapi public key is invalid." };
  }
  if (!assistantId) {
    return { valid: false, reason: "Vapi assistant ID is not configured." };
  }

  return { valid: true };
}
