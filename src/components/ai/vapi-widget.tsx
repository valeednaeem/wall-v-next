"use client";

/**
 * Vapi floating voice widget.
 *
 * Renders only when the site's active voice provider is "vapi" and voice is
 * enabled. Uses the `useVapi` hook (Vapi Web SDK) with the DB-managed
 * assistant ID, system prompt, and first message from public settings.
 * Dograh is never imported or initialized here.
 */
import { useCallback, useEffect, useState } from "react";
import { Mic, PhoneOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVapi } from "@/hooks/useVapi";

interface VapiWidgetSettings {
  enabled: boolean;
  provider: "dograh" | "vapi";
  position: "bottom-left" | "bottom-right";
  buttonColor: string;
  buttonText: string;
  systemPrompt: string;
  vapi?: {
    assistantId: string;
    publicKeyConfigured: boolean;
    firstMessage: string;
  };
}

export function VapiWidget() {
  const [settings, setSettings] = useState<VapiWidgetSettings | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/settings/public")
      .then((r) => r.json())
      .then((d) => {
        if (d?.data?.voice) setSettings(d.data.voice);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const isActive = Boolean(
    loaded && settings?.enabled && settings?.provider === "vapi"
  );

  const { status, duration, error, startCall, endCall } = useVapi({
    enabled: isActive,
    assistantId: settings?.vapi?.assistantId || undefined,
    onError: (err) => console.error("[Vapi] call error:", err),
  });

  const handleToggle = useCallback(async () => {
    if (status === "connecting" || status === "connected") {
      endCall();
      return;
    }
    try {
      await startCall({
        systemPrompt: settings?.systemPrompt || undefined,
        firstMessage: settings?.vapi?.firstMessage || undefined,
      });
    } catch (err) {
      console.error("[Vapi] failed to start call:", err);
    }
  }, [status, endCall, startCall, settings]);

  if (!loaded || !settings || settings.provider !== "vapi" || !settings.enabled) return null;
  if (!settings.vapi?.publicKeyConfigured) return null;

  const isLive = status === "connected";
  const position = settings.position || "bottom-left";
  const positionClasses = position === "bottom-left" ? "left-6" : "right-6";

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

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

      {error && !isLive && (
        <div
          className={cn(
            "fixed bottom-24 z-50 w-[300px] max-w-[calc(100vw-3rem)] rounded-xl border bg-white p-4 text-xs text-destructive shadow-lg",
            positionClasses
          )}
          role="status"
        >
          {error}
        </div>
      )}
    </>
  );
}
