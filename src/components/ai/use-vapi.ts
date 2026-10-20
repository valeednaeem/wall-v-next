"use client";

/**
 * useVapi() — the single controlled Wall-V abstraction over the Vapi Web SDK.
 *
 * Replaces useDograh() (see ./voice-agent.tsx) while keeping the same result
 * surface so the voice UI components can swap implementations with minimal
 * changes: { status, scriptLoaded, scriptError, duration, containerRef,
 *             startCall, endCall, isLive, getStatusLabel, getStatusColor }.
 *
 * Responsibilities owned here (Phase 7 of the migration plan):
 *  - exactly ONE Vapi instance for the whole app (module-level singleton), so
 *    FloatingVoiceWidget + InlineVoicePanel can never create duplicate SDK
 *    instances or duplicate event listeners
 *  - lifecycle: init -> start -> stop -> cleanup on unmount
 *  - call state machine: idle | connecting | connected | listening |
 *    speaking | ending | ended | error
 *  - transcript handling: only `type: "transcript"` messages are treated as
 *    transcripts, split by role (user/assistant) and partial/final
 *  - duplicate-call prevention, duration tracking, error redaction
 *
 * Security: only the browser-safe public key (NEXT_PUBLIC_VAPI_PUBLIC_KEY)
 * is read here. No private Vapi credential is ever referenced by this file.
 */

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import Vapi from "@vapi-ai/web";
import {
  getVapiPublicKey,
  resolveVapiAssistantId,
  validateVapiConfig,
} from "@/lib/vapi-config";

// ─── Public types ─────────────────────────────────────────────────────────────

export type VapiCallStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "listening"
  | "speaking"
  | "ending"
  | "ended"
  | "error";

export interface VapiTranscript {
  role: "user" | "assistant";
  text: string;
  final: boolean;
  at: number;
}

export interface VapiCallContext {
  assistantId: string;
  callId?: string;
}

export type VapiVariableValues = Record<string, string>;

export interface UseVapiConfig {
  enabled?: boolean;
  /** From settings.voice.agentId (served by /api/settings/public). */
  assistantId?: string | null;
  onStatusChange?: (status: VapiCallStatus, text?: string, subtext?: string) => void;
  onCallConnected?: (data: VapiCallContext) => void;
  onCallDisconnected?: (data: VapiCallContext & { durationSeconds: number }) => void;
  onError?: (error: Error) => void;
  onTranscript?: (transcript: VapiTranscript) => void;
}

export interface UseVapiResult {
  status: VapiCallStatus;
  /** Voice runtime ready (config valid + SDK instance available). */
  scriptLoaded: boolean;
  scriptError: string | null;
  duration: number;
  containerRef: RefObject<HTMLDivElement | null>;
  transcripts: VapiTranscript[];
  /** Last error message (redacted), if any. */
  error: string | null;
  startCall: (context?: VapiVariableValues) => Promise<void>;
  endCall: () => void;
  reset: () => void;
  isLive: boolean;
  getStatusLabel: () => string;
  getStatusColor: () => string;
}

// ─── Module-level singleton ───────────────────────────────────────────────────

let sharedInstance: Vapi | null = null;
let sharedPublicKey = "";

function getSharedVapi(publicKey: string): Vapi {
  if (sharedInstance && sharedPublicKey === publicKey) return sharedInstance;
  if (sharedInstance) {
    // Configuration changed — drop listeners tied to the old key.
    sharedInstance.removeAllListeners();
  }
  sharedInstance = new Vapi(publicKey);
  sharedPublicKey = publicKey;
  return sharedInstance;
}

/** Test/shutdown helper: destroy the shared instance and all its listeners. */
export function resetSharedVapiInstance(): void {
  if (sharedInstance) sharedInstance.removeAllListeners();
  sharedInstance = null;
  sharedPublicKey = "";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LIVE_STATUSES: VapiCallStatus[] = [
  "connecting",
  "connected",
  "listening",
  "speaking",
  "ending",
];

function isLiveStatus(status: VapiCallStatus): boolean {
  return LIVE_STATUSES.includes(status);
}

/** Extracts a safe, human-readable message from an SDK error object. */
export function describeVapiError(error: unknown): string {
  let message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Voice call failed.";

  // Never let credentials/tokens leak into UI state or logs.
  message = message
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer [redacted]")
    .replace(/\b(pk|vk|tok)_[A-Za-z0-9._\-]{8,}/gi, "[redacted]")
    .slice(0, 300);

  return message || "Voice call failed.";
}

interface TranscriptLike {
  type?: unknown;
  role?: unknown;
  transcript?: unknown;
  transcriptType?: unknown;
}

/** Returns normalized transcript data, or null for non-transcript messages. */
export function parseTranscriptMessage(message: unknown): VapiTranscript | null {
  if (!message || typeof message !== "object") return null;
  const m = message as TranscriptLike;

  const type = typeof m.type === "string" ? m.type : "";
  // Client message types include `transcript` and `transcript[transcriptType="final"]`.
  if (!type.startsWith("transcript")) return null;

  const role = m.role === "user" || m.role === "assistant" ? m.role : null;
  if (!role) return null;

  const text = typeof m.transcript === "string" ? m.transcript : "";
  if (!text.trim()) return null;

  const final =
    m.transcriptType === "final" ||
    type === 'transcript[transcriptType="final"]';

  return { role, text, final, at: Date.now() };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useVapi(config: UseVapiConfig = {}): UseVapiResult {
  const {
    enabled = true,
    assistantId,
    onStatusChange,
    onCallConnected,
    onCallDisconnected,
    onError,
    onTranscript,
  } = config;

  const [status, setStatusState] = useState<VapiCallStatus>("idle");
  const [duration, setDuration] = useState(0);
  const [transcripts, setTranscripts] = useState<VapiTranscript[]>([]);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const statusRef = useRef<VapiCallStatus>("idle");
  const callStartRef = useRef<number>(0);
  const callIdRef = useRef<string | undefined>(undefined);
  const assistantIdRef = useRef<string>("");
  const startingRef = useRef(false);
  const endedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Callback refs — always current without resubscribing to SDK events.
  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;
  const onCallConnectedRef = useRef(onCallConnected);
  onCallConnectedRef.current = onCallConnected;
  const onCallDisconnectedRef = useRef(onCallDisconnected);
  onCallDisconnectedRef.current = onCallDisconnected;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  // ── Configuration resolution ────────────────────────────────────────────────
  const publicKey = getVapiPublicKey();
  const resolvedAssistantId = resolveVapiAssistantId(assistantId);
  const validation = validateVapiConfig({ publicKey, assistantId: resolvedAssistantId });
  const ready = enabled && validation.valid;
  const scriptError = enabled ? (validation.reason ?? null) : null;
  assistantIdRef.current = resolvedAssistantId;

  const applyStatus = useCallback(
    (next: VapiCallStatus, text?: string, subtext?: string) => {
      statusRef.current = next;
      setStatusState(next);
      onStatusChangeRef.current?.(next, text, subtext);
    },
    []
  );

  const clearEndedTimer = useCallback(() => {
    if (endedTimerRef.current) {
      clearTimeout(endedTimerRef.current);
      endedTimerRef.current = null;
    }
  }, []);

  // ── Event subscriptions (single, fully cleaned up) ─────────────────────────
  useEffect(() => {
    if (!ready) return;
    const vapi = getSharedVapi(publicKey);

    const handleCallStart = () => {
      callStartRef.current = Date.now();
      setDuration(0);
      if (statusRef.current === "connecting" || statusRef.current === "ended") {
        applyStatus("connected");
      }
    };

    const handleCallStartSuccess = (event: { callId?: string }) => {
      callIdRef.current = event?.callId;
      if (statusRef.current === "connecting") applyStatus("connected");
      onCallConnectedRef.current?.({
        assistantId: assistantIdRef.current,
        callId: event?.callId,
      });
    };

    const handleCallStartFailed = (event: { error?: string }) => {
      const message = describeVapiError(event?.error);
      setError(message);
      applyStatus("error", message);
      onErrorRef.current?.(new Error(message));
    };

    const handleSpeechStart = () => {
      if (isLiveStatus(statusRef.current) && statusRef.current !== "connecting") {
        applyStatus("speaking");
      }
    };

    const handleSpeechEnd = () => {
      if (statusRef.current === "speaking" || statusRef.current === "connected") {
        applyStatus("listening");
      }
    };

    const handleMessage = (message: unknown) => {
      const parsed = parseTranscriptMessage(message);
      if (!parsed) return; // not a transcript (speech-update, metadata, …)

      setTranscripts((prev) => {
        const last = prev[prev.length - 1];
        // Replace an in-flight partial from the same role; commit finals.
        if (!parsed.final && last && last.role === parsed.role && !last.final) {
          return [...prev.slice(0, -1), parsed];
        }
        if (parsed.final && last && last.role === parsed.role && !last.final) {
          return [...prev.slice(0, -1), parsed];
        }
        return [...prev, parsed];
      });
      onTranscriptRef.current?.(parsed);
    };

    const handleCallEnd = () => {
      const seconds = callStartRef.current
        ? Math.max(0, Math.round((Date.now() - callStartRef.current) / 1000))
        : 0;
      const payload = {
        assistantId: assistantIdRef.current,
        callId: callIdRef.current,
        durationSeconds: seconds,
      };
      startingRef.current = false;
      callIdRef.current = undefined;
      applyStatus("ended");
      onCallDisconnectedRef.current?.(payload);

      // Return to a clean idle state so a second call can start immediately.
      clearEndedTimer();
      endedTimerRef.current = setTimeout(() => {
        if (statusRef.current === "ended") applyStatus("idle");
      }, 700);
    };

    const handleError = (err: unknown) => {
      const message = describeVapiError(err);
      console.error("[Vapi] error:", message);
      setError(message);
      if (isLiveStatus(statusRef.current) || statusRef.current === "idle") {
        applyStatus("error", message);
      }
      onErrorRef.current?.(new Error(message));
    };

    const subscriptions: Array<[Parameters<Vapi["on"]>[0], Parameters<Vapi["on"]>[1]]> = [
      ["call-start", handleCallStart],
      ["call-start-success", handleCallStartSuccess as Parameters<Vapi["on"]>[1]],
      ["call-start-failed", handleCallStartFailed as Parameters<Vapi["on"]>[1]],
      ["speech-start", handleSpeechStart],
      ["speech-end", handleSpeechEnd],
      ["message", handleMessage as Parameters<Vapi["on"]>[1]],
      ["call-end", handleCallEnd],
      ["error", handleError as Parameters<Vapi["on"]>[1]],
    ];

    subscriptions.forEach(([event, listener]) => vapi.on(event, listener));

    return () => {
      subscriptions.forEach(([event, listener]) =>
        vapi.removeListener(event, listener)
      );
    };
  }, [ready, publicKey, applyStatus, clearEndedTimer]);

  // ── Duration timer (live calls only) ──────────────────────────────────────
  useEffect(() => {
    if (status !== "connected" && status !== "listening" && status !== "speaking") {
      return;
    }
    const interval = setInterval(() => setDuration((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [status]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearEndedTimer();
      startingRef.current = false;
    };
  }, [clearEndedTimer]);

  // ── start() MUST run inside a user-gesture handler (click) for mic access. ─
  const startCall = useCallback(
    async (context?: VapiVariableValues) => {
      if (!enabled) return;
      if (!validation.valid) {
        console.warn("[Vapi] Cannot start:", validation.reason);
        return;
      }
      // Prevent duplicate calls (rapid double-click, overlapping components).
      if (startingRef.current || isLiveStatus(statusRef.current)) return;

      startingRef.current = true;
      clearEndedTimer();
      setError(null);
      setTranscripts([]);
      setDuration(0);
      callIdRef.current = undefined;
      applyStatus("connecting");

      try {
        const vapi = getSharedVapi(publicKey);
        const variableValues: VapiVariableValues = {
          page_url: typeof window !== "undefined" ? window.location.href : "",
          current_date: new Date().toISOString().slice(0, 10),
          ...(context ?? {}),
        };
        await vapi.start(resolvedAssistantId, {
          variableValues,
          metadata: {
            source: "wall-v-website",
            pathname:
              typeof window !== "undefined" ? window.location.pathname : "",
          },
        });
      } catch (err) {
        const message = describeVapiError(err);
        console.error("[Vapi] start failed:", message);
        setError(message);
        applyStatus("error", message);
        onErrorRef.current?.(new Error(message));
      } finally {
        startingRef.current = false;
      }
    },
    [enabled, validation.valid, validation.reason, publicKey, resolvedAssistantId, applyStatus, clearEndedTimer]
  );

  const endCall = useCallback(() => {
    if (!isLiveStatus(statusRef.current)) return;
    applyStatus("ending");
    const vapi = sharedInstance;
    if (!vapi) {
      applyStatus("idle");
      return;
    }
    try {
      void vapi.stop().catch(() => {
        // Call already gone — settle back to a clean state.
        if (statusRef.current === "ending") applyStatus("idle");
      });
    } catch {
      if (statusRef.current === "ending") applyStatus("idle");
    }
  }, [applyStatus]);

  const reset = useCallback(() => {
    clearEndedTimer();
    startingRef.current = false;
    callIdRef.current = undefined;
    callStartRef.current = 0;
    setError(null);
    setTranscripts([]);
    setDuration(0);
    applyStatus("idle");
  }, [applyStatus, clearEndedTimer]);

  const isLive = isLiveStatus(status);

  const getStatusLabel = useCallback(() => {
    switch (status) {
      case "connecting":
        return "Connecting…";
      case "ending":
        return "Ending…";
      case "connected":
      case "listening":
      case "speaking":
        return "End Call";
      case "error":
        return "Retry";
      default:
        return "Talk to AI";
    }
  }, [status]);

  const getStatusColor = useCallback(() => {
    switch (status) {
      case "connecting":
      case "ending":
        return "bg-yellow-500 cursor-wait";
      case "connected":
      case "listening":
      case "speaking":
        return "bg-green-500 hover:bg-green-600";
      case "error":
        return "bg-red-500 hover:bg-red-600";
      default:
        return "bg-primary hover:bg-primary/90";
    }
  }, [status]);

  return {
    status,
    scriptLoaded: ready,
    scriptError,
    duration,
    containerRef,
    transcripts,
    error,
    startCall,
    endCall,
    reset,
    isLive,
    getStatusLabel,
    getStatusColor,
  };
}
