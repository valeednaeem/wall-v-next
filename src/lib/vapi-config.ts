/**
 * Vapi configuration resolution for Wall-V's voice agent.
 *
 * Server-safe module: reads environment variables only (no DB access here).
 * `NEXT_PUBLIC_VAPI_PUBLIC_KEY` is accessed statically so Next.js inlines it
 * into the browser bundle at build time, as required by the Vapi Web SDK.
 */
import Vapi from "@vapi-ai/web";

export const VAPI_PUBLIC_KEY_ENV = "NEXT_PUBLIC_VAPI_PUBLIC_KEY";
export const VAPI_ASSISTANT_ID_ENV = "VAPI_ASSISTANT_ID";
export const VAPI_WEBHOOK_SECRET_ENV = "VAPI_WEBHOOK_SECRET";
export const VAPI_API_KEY_ENV = "VAPI_API_KEY";
export const VAPI_ORGANIZATION_ID_ENV = "VAPI_ORGANIZATION_ID";
export const VAPI_SERVER_URL_ENV = "VAPI_SERVER_URL";

export interface VapiResolvedConfig {
  publicKey: string | null;
  assistantId: string | null;
  serverUrl: string | null;
  webhookSecret: string | null;
  apiKey: string | null;
  organizationId: string | null;
}

function readEnv(name: string): string | null {
  const value: string | undefined = process.env[name];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Vapi public key (browser-safe; inlined at build time for NEXT_PUBLIC_*). */
export function getVapiPublicKey(): string | null {
  return readEnv(VAPI_PUBLIC_KEY_ENV);
}

/** Vapi assistant ID used for calls (server-side source of truth). */
export function getVapiAssistantId(): string | null {
  return readEnv(VAPI_ASSISTANT_ID_ENV);
}

/** Vapi server URL — backend endpoint that receives Vapi server events. */
export function getVapiServerUrl(): string | null {
  return readEnv(VAPI_SERVER_URL_ENV) ?? readEnv("NEXT_PUBLIC_APP_URL");
}

/** Vapi webhook secret (Vapi credential secret / legacy secret equivalent). */
export function getVapiWebhookSecret(): string | null {
  return readEnv(VAPI_WEBHOOK_SECRET_ENV);
}

/** Vapi private API key (server-side only — never expose to the client). */
export function getVapiApiKey(): string | null {
  return readEnv(VAPI_API_KEY_ENV);
}

/** Vapi organization ID (when multi-org scoping is required). */
export function getVapiOrganizationId(): string | null {
  return readEnv(VAPI_ORGANIZATION_ID_ENV);
}

export function resolveVapiConfig(): VapiResolvedConfig {
  return {
    publicKey: getVapiPublicKey(),
    assistantId: getVapiAssistantId(),
    serverUrl: getVapiServerUrl(),
    webhookSecret: getVapiWebhookSecret(),
    apiKey: getVapiApiKey(),
    organizationId: getVapiOrganizationId(),
  };
}

export function createVapiClient(publicKey: string): Vapi {
  return new Vapi(publicKey);
}

export function isVapiConfigured(): boolean {
  const config = resolveVapiConfig();
  return Boolean(config.publicKey && config.assistantId);
}
