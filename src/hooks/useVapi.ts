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
 * - `systemPrompt` → `assistantOverrides.systemPrompt` (system-role message)
 * - `firstMessage` → `assistantOverrides.firstMessage` (greeting)
 * - `variables` → `assistantOverrides.variableValues` (dynamic template vars)
 */
import { useCallback, useEffect, useRef, useState } from "react";
import Vapi from "@vapi-ai/web";
import { getVapiAssistantId, getVapiPublicKey } from "@/lib/vapi-config";

export type VapiCallStatus = "idle" | "connecting" | "connected" | "failed";

export interface VapiCallContextInput {
  systemPrompt?: string;
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

    const handleCallStartFailed = (event: { error?: string }) => {
      const message = event?.error ?? "Vapi call failed to start.";
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
      const message = err instanceof Error ? err.message : "Vapi voice call error.";
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
        systemPrompt?: string;
        firstMessage?: string;
        variableValues?: Record<string, string>;
      } = {};
      if (context?.systemPrompt) assistantOverrides.systemPrompt = context.systemPrompt;
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
