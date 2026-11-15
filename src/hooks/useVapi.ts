"use client";

/**
 * Vapi voice-agent hook for Wall-V (Dograh → Vapi recovery).
 *
 * Mirrors the surface of the existing Dograh hook (`useDograh`) so widget-level
 * consumers can adopt Vapi with minimal behavioural drift:
 * - status: idle | connecting | connected | failed
 * - startCall(context) / endCall()
 * - onStatusChange / onCallConnected / onCallDisconnected / onError
 *
 * Call context maps to Vapi `assistantOverrides`:
 * - `firstMessage` → `assistantOverrides.firstMessage` (greeting)
 * - `variables` → `assistantOverrides.variableValues` (dynamic template vars)
 *
 * NOTE: `AssistantOverrides` has no `systemPrompt` field (verified against the
 * SDK's generated `api.ts`), so the system prompt is intentionally NOT
 * forwarded — it must be configured on the Vapi assistant itself.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import Vapi from "@vapi-ai/web";
import { getVapiAssistantId, getVapiPublicKey } from "@/lib/vapi-config";

export type VapiCallStatus = "idle" | "connecting" | "connected" | "failed";

export interface VapiCallContextInput {
  firstMessage?: string;
  variables?: Record<string, string>;
}

export interface UseVapiOptions {
  enabled?: boolean;
  assistantId?: string;
  /** Browser-safe public key (from public settings); falls back to NEXT_PUBLIC_VAPI_PUBLIC_KEY. */
  publicKey?: string;
  onStatusChange?: (status: VapiCallStatus, text?: string, subtext?: string) => void;
  onCallConnected?: (data: { agentId?: string; callId?: string }) => void;
  onCallDisconnected?: (data: { durationSeconds?: number }) => void;
  onError?: (error: unknown) => void;
}

export interface UseVapiResult {
  status: VapiCallStatus;
  duration: number;
  error: string | null;
  isConfigured: boolean;
  startCall: (context?: VapiCallContextInput) => Promise<unknown>;
  endCall: () => void;
}

let vapiClient: Vapi | null = null;
let vapiClientKey: string | null = null;

/**
 * Best-effort message extraction for Vapi SDK failures.
 *
 * The Web SDK's `error` events carry plain payloads such as
 * `{ type, stage, error: { message, name, stack } }` rather than `Error`
 * instances, so a bare `instanceof Error` check hides the real reason behind
 * a generic fallback. Handles: `Error`, string, `{ message }`, and the
 * SDK's nested `{ error: { message } }` / `{ error: "..." }` shapes.
 *
 * @param fallback Text to show when no message can be found.
 */
export function extractVapiErrorMessage(err: unknown, fallback: string): string {
  if (err === null || err === undefined) return fallback;
  if (err instanceof Error) return err.message.trim() || fallback;
  if (typeof err === "string") return err.trim() || fallback;

  if (typeof err === "object") {
    const obj = err as Record<string, unknown>;
    // Nested SDK shape: { type, stage, error: { message, name, stack } }
    // or { error: "string" }.
    const nested = obj["error"];
    if (typeof nested === "string" && nested.trim()) return nested.trim();
    if (nested !== null && typeof nested === "object") {
      const msg = (nested as Record<string, unknown>)["message"];
      if (typeof msg === "string" && msg.trim()) return msg.trim();
    }
    // Direct shape: { message: "..." }
    const msg = obj["message"];
    if (typeof msg === "string" && msg.trim()) return msg.trim();
    // Last resort — at least name the failure stage instead of hiding it.
    const type = typeof obj["type"] === "string" ? obj["type"] : "";
    const stage = typeof obj["stage"] === "string" ? obj["stage"] : "";
    if (type || stage) {
      const label = type && stage && type !== stage ? `${type} (${stage})` : type || stage;
      return `Vapi voice call error: ${label}.`;
    }
  }
  return fallback;
}

function getVapiClient(publicKeyOverride?: string): Vapi | null {
  const publicKey = publicKeyOverride?.trim() || getVapiPublicKey();
  if (!publicKey) return null;
  if (!vapiClient || vapiClientKey !== publicKey) {
    vapiClient = new Vapi(publicKey);
    vapiClientKey = publicKey;
  }
  return vapiClient;
}

export function useVapi(options: UseVapiOptions = {}): UseVapiResult {
  const {
    enabled = false,
    assistantId: assistantIdProp,
    publicKey: publicKeyProp,
    onStatusChange,
    onCallConnected,
    onCallDisconnected,
    onError,
  } = options;

  const [status, setStatus] = useState<VapiCallStatus>("idle");
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const callDurationRef = useRef(0);
  const assistantIdRef = useRef<string | null>(assistantIdProp ?? null);

  const callbacksRef = useRef({ onStatusChange, onCallConnected, onCallDisconnected, onError });
  useEffect(() => {
    callbacksRef.current = { onStatusChange, onCallConnected, onCallDisconnected, onError };
  });

  const setStatusSafe = useCallback((next: VapiCallStatus) => {
    setStatus(next);
    callbacksRef.current.onStatusChange?.(next);
  }, []);

  useEffect(() => {
    assistantIdRef.current = assistantIdProp ?? null;
  }, [assistantIdProp]);

  useEffect(() => {
    if (!enabled) return;
    const client = getVapiClient(publicKeyProp);
    if (!client) {
      setError("Vapi public key is not configured.");
      return;
    }

    const handleCallStart = () => {
      callDurationRef.current = 0;
      setDuration(0);
      setStatusSafe("connecting");
    };

    const handleCallStartSuccess = (event: { totalDuration?: number; callId?: string }) => {
      callDurationRef.current = event?.totalDuration ?? 0;
      setDuration(callDurationRef.current);
      setStatusSafe("connected");
      callbacksRef.current.onCallConnected?.({ callId: event?.callId });
    };

    const handleCallStartFailed = (event: { error?: unknown }) => {
      const message = extractVapiErrorMessage(event?.error, "Vapi call failed to start.");
      setStatusSafe("failed");
      setError(message);
      callbacksRef.current.onError?.(new Error(message));
    };

    const handleCallEnd = () => {
      setStatusSafe("idle");
      setDuration(0);
      callbacksRef.current.onCallDisconnected?.({ durationSeconds: callDurationRef.current });
    };

    const handleError = (err: unknown) => {
      const message = extractVapiErrorMessage(err, "Vapi voice call error.");
      setStatusSafe("failed");
      setError(message);
      callbacksRef.current.onError?.(err);
    };

    client.on("call-start", handleCallStart);
    client.on("call-start-success", handleCallStartSuccess);
    client.on("call-start-failed", handleCallStartFailed);
    client.on("call-end", handleCallEnd);
    client.on("error", handleError);

    return () => {
      client.off("call-start", handleCallStart);
      client.off("call-start-success", handleCallStartSuccess);
      client.off("call-start-failed", handleCallStartFailed);
      client.off("call-end", handleCallEnd);
      client.off("error", handleError);
    };
  }, [enabled, publicKeyProp, setStatusSafe]);

  const startCall = useCallback(
    async (context?: VapiCallContextInput) => {
      const client = getVapiClient(publicKeyProp);
      const assistantId = assistantIdProp ?? getVapiAssistantId();
      if (!client) throw new Error("Vapi public key is not configured.");
      if (!assistantId) throw new Error("Vapi assistant ID is not configured.");

      const assistantOverrides: {
        firstMessage?: string;
        variableValues?: Record<string, string>;
      } = {};
      // NOTE: never send `systemPrompt` here — it is not a field of Vapi's
      // `AssistantOverrides` and the API rejects/strips it. The system prompt
      // is configured on the Vapi assistant itself.
      if (context?.firstMessage) assistantOverrides.firstMessage = context.firstMessage;
      if (context?.variables) assistantOverrides.variableValues = context.variables;

      const call = await client.start(assistantId, assistantOverrides);
      return call;
    },
    [assistantIdProp, publicKeyProp]
  );

  const endCall = useCallback(() => {
    const client = getVapiClient(publicKeyProp);
    if (!client) return;
    client.end();
  }, [publicKeyProp]);

  const resolvedPublicKey = publicKeyProp?.trim() || getVapiPublicKey();
  const isConfigured = Boolean(resolvedPublicKey && (assistantIdProp ?? getVapiAssistantId()));

  return {
    status,
    duration,
    error,
    isConfigured,
    startCall,
    endCall,
  };
}
