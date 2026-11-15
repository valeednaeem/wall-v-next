"use client";

/**
 * Vapi floating voice widget.
 *
 * Renders when the site's active voice provider is "vapi" and voice is
 * enabled. Uses the `useVapi` hook (Vapi Web SDK) with the DB-managed
 * assistant ID, system prompt, and first message from public settings.
 * Dograh is never imported or initialized here.
 *
 * Three-layer gating:
 *  1. provider must be "vapi" (Dograh widget renders instead otherwise)
 *  2. voice must be enabled
 *  3. configuration must be complete (public key + assistant ID) — when it
 *     is NOT, the required error is shown instead of silently rendering
 *     nothing or falling back to Dograh.
 */
import { useCallback, useEffect, useState } from "react";
import { Mic, PhoneOff, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVapi, extractVapiErrorMessage } from "@/hooks/useVapi";
import { VAPI_NOT_CONFIGURED_MESSAGE } from "@/lib/vapi-config";

interface VapiWidgetSettings {
  enabled: boolean;
  provider: "dograh" | "vapi";
  position: "bottom-left" | "bottom-right";
  buttonColor: string;
  buttonText: string;
  systemPrompt: string;
  vapi?: {
    assistantId: string;
    publicKey: string;
    publicKeyConfigured: boolean;
    assistantIdConfigured?: boolean;
    configured?: boolean;
    firstMessage: string;
  };
}

export function VapiWidget() {
  const [settings, setSettings] = useState<VapiWidgetSettings | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings/public")
      .then((r) => r.json())
      .then((d) => {
        if (d?.data?.voice) setSettings(d.data.voice);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const voiceActive = Boolean(loaded && settings?.enabled && settings?.provider === "vapi");
  // Prefer the server-computed combined flag; fall back to component-level
  // derivation for older cached responses.
  const configured = Boolean(
    voiceActive &&
      (settings?.vapi?.configured ??
        (settings?.vapi?.publicKeyConfigured && settings?.vapi?.assistantId))
  );

  const { status, duration, error, startCall, endCall } = useVapi({
    enabled: voiceActive && configured,
    assistantId: settings?.vapi?.assistantId || undefined,
    publicKey: settings?.vapi?.publicKey || undefined,
    onError: (err) => console.error("[Vapi] call error:", err),
  });

  const handleToggle = useCallback(async () => {
    if (status === "connecting" || status === "connected") {
      endCall();
      return;
    }
    setStartError(null);
    try {
      // NOTE: systemPrompt is intentionally not sent — Vapi's
      // `AssistantOverrides` has no such field; the prompt lives on the
      // Vapi assistant itself.
      await startCall({
        firstMessage: settings?.vapi?.firstMessage || undefined,
      });
    } catch (err) {
      // Surface the failure in the UI — never fail silently to the console.
      const message = extractVapiErrorMessage(err, "Failed to start the Vapi voice call.");
      console.error("[Vapi] failed to start call:", err);
      setStartError(message);
    }
  }, [status, endCall, startCall, settings]);

  if (!loaded || !settings || settings.provider !== "vapi" || !settings.enabled) return null;

  const isLive = status === "connected";
  const position = settings.position || "bottom-left";
  const positionClasses = position === "bottom-left" ? "left-6" : "right-6";

  // Selected but unconfigured → required diagnostic (no Dograh fallback).
  if (!configured) {
    const missing = !settings.vapi?.publicKeyConfigured
      ? "The Vapi Public API Key is missing."
      : "The Vapi Assistant ID is missing.";
    return (
      <div
        className={cn(
          "fixed bottom-24 z-50 w-[320px] max-w-[calc(100vw-3rem)] rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-xs shadow-lg",
          positionClasses
        )}
        role="alert"
      >
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
          <div>
            <p className="font-medium text-destructive">{VAPI_NOT_CONFIGURED_MESSAGE}</p>
            <p className="mt-1 text-muted-foreground">{missing}</p>
          </div>
        </div>
      </div>
    );
  }

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const shownError = error || startError;

  return (
    <>
      <button
        onClick={handleToggle}
        className={cn(
          "fixed bottom-6 z-50 flex items-center gap-2 rounded-full px-5 py-3.5 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105",
          positionClasses,
          isLive ? "bg-green-500 hover:bg-green-600" : "hover:opacity-90"
        )}
        style={!isLive ? { backgroundColor: settings.buttonColor } : undefined}
        disabled={status === "connecting"}
        aria-label={isLive ? "End voice call" : "Start voice call"}
      >
        {status === "connecting" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isLive ? (
          <PhoneOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
        <span>{isLive ? "End Call" : settings.buttonText || "Talk to AI"}</span>
        {isLive && <span className="ml-1 text-xs opacity-80">{formatDuration(duration)}</span>}
      </button>

      {shownError && !isLive && (
        <div
          className={cn(
            "fixed bottom-24 z-50 w-[300px] max-w-[calc(100vw-3rem)] rounded-xl border bg-white p-4 text-xs text-destructive shadow-lg",
            positionClasses
          )}
          role="status"
        >
          {shownError}
        </div>
      )}
    </>
  );
}
