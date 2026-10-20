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

/** Reads the browser-safe Vapi public key from the environment. */
export function getVapiPublicKey(): string {
  return process.env[VAPI_PUBLIC_KEY_ENV]?.trim() ?? "";
}

/**
 * Resolves the assistant ID for client use.
 * Source of truth is settings.voice.agentId (served by /api/settings/public,
 * which merges the server-side VAPI_ASSISTANT_ID env as fallback).
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
