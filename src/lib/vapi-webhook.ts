/**
 * Vapi webhook security, validation, normalization, and idempotency helpers.
 *
 * Part of the Dograh → Vapi controlled voice recovery. The Vapi server URL
 * receives envelopes of the shape:
 *   { "message": { "type": "...", "call": { ... }, ... } }
 *
 * Mirrors the security posture of the existing Dograh webhook implementation
 * (fail-closed auth, size limits, object validation) while using Vapi's
 * credential-based auth model (Bearer / X-Vapi-Secret / HMAC via credentialId).
 */
import crypto from "crypto";

export const MAX_VAPI_WEBHOOK_BYTES = 1_000_000;
export const VAPI_WEBHOOK_EVENT_PREFIX = "vapi";

export interface VapiWebhookAuthResult {
  ok: boolean;
  status: 200 | 401 | 503;
  reason?: string;
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function authenticateVapiWebhook(request: Request): VapiWebhookAuthResult {
  const secret = process.env.VAPI_WEBHOOK_SECRET;
  if (!secret) {
    return {
      ok: false,
      status: 503,
      reason: "Vapi webhook authentication is not configured.",
    };
  }

  const headerName = process.env.VAPI_WEBHOOK_HEADER?.trim() || "X-Vapi-Secret";
  const providedSecret = request.headers.get(headerName);

  if (providedSecret && safeEqual(providedSecret, secret)) {
    return { ok: true, status: 200 };
  }

  return { ok: false, status: 401, reason: "Unauthorized Vapi webhook request." };
}

export function validateVapiWebhookBody(body: unknown): { valid: boolean; reason?: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { valid: false, reason: "Webhook payload must be a JSON object." };
  }

  const serializedLength = JSON.stringify(body).length;
  if (serializedLength > MAX_VAPI_WEBHOOK_BYTES) {
    return { valid: false, reason: "Webhook payload is too large." };
  }

  const message = (body as Record<string, unknown>).message;
  if (!message || typeof message !== "object" || Array.isArray(message)) {
    return { valid: false, reason: "Vapi webhook payload must contain a message object." };
  }

  const type = String((message as Record<string, unknown>).type ?? "");
  if (!type) {
    return { valid: false, reason: "Vapi webhook message is missing a type." };
  }

  return { valid: true };
}

export type VapiServerMessageType =
  | "assistant-request"
  | "end-of-call-report"
  | "tool-calls"
  | "transcript"
  | "status-update"
  | "conversation-update"
  | "hang"
  | (string & {});

export interface VapiCallEvent {
  type: VapiServerMessageType;
  callId?: string;
  endedReason?: string;
  durationSeconds?: number;
  transcript?: string;
  summary?: string;
  messages?: Array<{ role?: string; content?: string; timestamp?: string }>;
  /** True when either message-level or call-level `artifact` was present. */
  artifactPresent?: boolean;
}

export interface VapiWebhookExtraction {
  event?: VapiCallEvent;
  error?: string;
}

export function extractVapiCallEvent(body: unknown): VapiWebhookExtraction {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Webhook payload must be a JSON object." };
  }

  const message = (body as Record<string, unknown>).message;
  if (!message || typeof message !== "object" || Array.isArray(message)) {
    return { error: "Vapi webhook payload must contain a message object." };
  }

  const messageRecord = message as Record<string, unknown>;
  const type = String(messageRecord.type ?? "") as VapiServerMessageType;
  const call = messageRecord.call;
  const callRecord = call && typeof call === "object" && !Array.isArray(call) ? (call as Record<string, unknown>) : undefined;

  // Artifact locations — official Vapi docs place `artifact` at the MESSAGE
  // level (`message.artifact`); older/SDK payloads may carry it on the call
  // object (`message.call.artifact`). Message-level wins, call-level is the
  // compatibility fallback.
  const messageArtifact =
    messageRecord.artifact && typeof messageRecord.artifact === "object" && !Array.isArray(messageRecord.artifact)
      ? (messageRecord.artifact as Record<string, unknown>)
      : undefined;
  const callArtifact =
    callRecord && typeof callRecord.artifact === "object" && !Array.isArray(callRecord.artifact)
      ? (callRecord.artifact as Record<string, unknown>)
      : undefined;
  const artifactPresent = Boolean(messageArtifact || callArtifact);

  // Messages: message.artifact.messages → message.messages → call.artifact.messages.
  const rawMessages = Array.isArray(messageArtifact?.messages)
    ? (messageArtifact?.messages as unknown[])
    : Array.isArray(messageRecord.messages)
      ? (messageRecord.messages as unknown[])
      : Array.isArray(callArtifact?.messages)
        ? (callArtifact?.messages as unknown[])
        : undefined;
  const messages = rawMessages
    ? rawMessages
        .map((m) => {
          const record = m && typeof m === "object" ? (m as Record<string, unknown>) : {};
          const content = String(record.content ?? record.text ?? record.message ?? record.transcript ?? "");
          const rawRole = String(record.role ?? record.speaker ?? record.from ?? record.sender ?? "assistant").toLowerCase();
          const isUser = rawRole.includes("user") || rawRole.includes("caller") || rawRole.includes("human") || rawRole.includes("customer");
          return {
            role: isUser ? "user" : "assistant",
            content,
            timestamp: record.timestamp ? String(record.timestamp) : undefined,
          };
        })
        .filter((m) => m.content)
    : undefined;

  const durationRaw = callRecord?.duration ?? messageArtifact?.duration ?? callArtifact?.duration;
  const durationSeconds = typeof durationRaw === "number" ? durationRaw : parseFloat(String(durationRaw ?? "0")) || 0;

  // Transcript/summary/endedReason: message-level first (official docs), then
  // call-level fallback. First non-empty string wins.
  const transcript = firstNonEmptyString(
    messageArtifact?.transcript,
    messageRecord.transcript,
    callArtifact?.transcript
  );
  const summary = firstNonEmptyString(
    messageArtifact?.summary,
    messageRecord.summary,
    callArtifact?.summary
  );
  const endedReason = firstNonEmptyString(
    messageRecord.endedReason,
    callRecord?.endedReason,
    messageArtifact?.endedReason,
    callArtifact?.endedReason
  );

  const event: VapiCallEvent = {
    type,
    callId: callRecord ? String(callRecord.id ?? callRecord.callId ?? "") : undefined,
    endedReason,
    durationSeconds,
    transcript,
    summary,
    messages,
    artifactPresent,
  };

  return { event };
}

function firstNonEmptyString(...candidates: unknown[]): string | undefined {
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate;
    }
  }
  return undefined;
}

export function buildVapiEventKey(callId?: string, type?: string): string {
  const normalizedType = type ?? "end-of-call-report";
  return callId ? `vapi:${normalizedType}:${callId}` : `vapi:${normalizedType}:`;
}
