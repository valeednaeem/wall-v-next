"use client";

/**
 * Inline voice panel (/voice-agent page — "Talk to Wall-V AI").
 *
 * Provider-routed: the selected provider comes from public settings and the
 * panel initialises ONLY that provider's runtime.
 *   - provider "dograh" → existing Dograh inline widget (unchanged behaviour)
 *   - provider "vapi"   → Vapi Web SDK via `useVapi`; Dograh is never loaded
 *   - provider "vapi" but unconfigured → required error message, no fallback
 */
import { useId, useCallback, useEffect, useRef, useState } from "react";
import { useDograh } from "./voice-agent";
import { useVapi } from "@/hooks/useVapi";
import { VAPI_NOT_CONFIGURED_MESSAGE } from "@/lib/vapi-config";
import { Mic, PhoneOff, Loader2, Phone, Volume2, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface InlineVoicePanelProps {
  title?: string;
  subtitle?: string;
  greeting?: string;
  showTranscript?: boolean;
  className?: string;
}

interface PublicVoiceSettings {
  enabled: boolean;
  provider: "dograh" | "vapi";
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

// Fetch failure fallback: keep the historical Dograh behaviour.
const DEFAULT_VOICE_SETTINGS: PublicVoiceSettings = {
  enabled: true,
  provider: "dograh",
  systemPrompt: "",
};

export function InlineVoicePanel({
  title = "Talk to Wall-V AI",
  subtitle = "Tell me what you want to build and I'll help you figure out the best solution — no technical jargon needed.",
  className,
}: InlineVoicePanelProps) {
  const containerId = useId();
  const [voice, setVoice] = useState<PublicVoiceSettings | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  // Fetch provider + system prompt + Vapi config from public settings
  useEffect(() => {
    fetch("/api/settings/public")
      .then((r) => r.json())
      .then((d) => {
        if (d?.data?.voice) {
          const v = d.data.voice as Partial<PublicVoiceSettings> & { vapi?: PublicVoiceSettings["vapi"] };
          setVoice({
            enabled: v.enabled ?? true,
            provider: v.provider === "vapi" ? "vapi" : "dograh",
            systemPrompt: v.systemPrompt || "",
            vapi: v.vapi,
          });
        }
        setSettingsLoaded(true);
      })
      .catch(() => setSettingsLoaded(true));
  }, []);

  const effective = voice ?? DEFAULT_VOICE_SETTINGS;
  const dograhActive =
    settingsLoaded && effective.provider === "dograh" && effective.enabled;
  const vapiActive = settingsLoaded && effective.provider === "vapi" && effective.enabled;
  const vapiConfigured = Boolean(
    vapiActive &&
      (effective.vapi?.configured ??
        (effective.vapi?.publicKeyConfigured && effective.vapi?.assistantId))
  );

  const handleCallDisconnected = useCallback(
    () => {
      console.log("[Inline Voice] Dograh call ended; authenticated Dograh webhook will persist the conversation.");
    },
    []
  );

  const {
    status,
    scriptLoaded,
    scriptError,
    containerRef,
    startCall,
    endCall,
    isLive,
    duration,
  } = useDograh({
    // Dograh runtime only initialises when Dograh is the active provider —
    // selecting Vapi must never touch Dograh scripts.
    enabled: dograhActive,
    mode: "inline",
    inlineContainerId: containerId,
    onCallDisconnected: handleCallDisconnected,
  });

  const {
    status: vapiStatus,
    duration: vapiDuration,
    error: vapiError,
    startCall: vapiStartCall,
    endCall: vapiEndCall,
  } = useVapi({
    enabled: vapiConfigured,
    assistantId: effective.vapi?.assistantId || undefined,
    publicKey: effective.vapi?.publicKey || undefined,
  });

  const systemPrompt = effective.systemPrompt;
  const systemPromptRef = useRef(systemPrompt);
  systemPromptRef.current = systemPrompt;

  // Pass system prompt when a Dograh call starts
  const handleStartCall = useCallback(() => {
    if (window.DograhWidget && systemPromptRef.current) {
      window.DograhWidget.setContext({
        system_prompt: systemPromptRef.current,
        instructions: systemPromptRef.current,
      });
      console.log("[Inline Voice] System prompt set via setContext()");
    }
    startCall();
  }, [startCall]);

  const handleVapiStart = useCallback(async () => {
    setStartError(null);
    try {
      await vapiStartCall({
        systemPrompt: systemPromptRef.current || undefined,
        firstMessage: effective.vapi?.firstMessage || undefined,
      });
    } catch (err) {
      // Surface mic/browser/SDK failures in the UI instead of the console.
      const message = err instanceof Error ? err.message : "Failed to start the Vapi voice call.";
      console.error("[Inline Voice] Vapi start failed:", err);
      setStartError(message);
    }
  }, [vapiStartCall, effective.vapi?.firstMessage]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (!settingsLoaded) {
    return (
      <div className={cn("rounded-2xl border bg-gradient-to-br from-violet-50 via-white to-indigo-50 p-8", className)}>
        <div className="flex flex-col items-center justify-center min-h-[200px] gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading voice agent…</p>
        </div>
      </div>
    );
  }

  if (!effective.enabled) {
    return (
      <div className={cn("rounded-2xl border p-8 text-center", className)}>
        <Volume2 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm font-medium">Voice assistant is currently unavailable.</p>
        <p className="text-xs text-muted-foreground mt-1">Please use the contact form instead.</p>
      </div>
    );
  }

  // ── Vapi path ─────────────────────────────────────────────────────────────
  if (effective.provider === "vapi") {
    // Selected but unconfigured → required error. Dograh is NOT initialised.
    if (!vapiConfigured) {
      const missing = !effective.vapi?.publicKeyConfigured
        ? "The Vapi Public API Key is missing."
        : "The Vapi Assistant ID is missing.";
      return (
        <div className={cn("rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center", className)} role="alert">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
          <p className="text-sm font-medium text-destructive">{VAPI_NOT_CONFIGURED_MESSAGE}</p>
          <p className="text-xs text-muted-foreground mt-1">{missing}</p>
        </div>
      );
    }

    const vapiLive = vapiStatus === "connected";
    const vapiConnecting = vapiStatus === "connecting";
    const vapiShownError = vapiError || startError;

    return (
      <div className={cn("rounded-2xl border bg-gradient-to-br from-violet-50 via-white to-indigo-50 p-8", className)}>
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Volume2 className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold">{title}</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">{subtitle}</p>
        </div>

        <div className="flex flex-col items-center gap-4">
          <button
            onClick={() => {
              if (vapiLive) vapiEndCall();
              else if (vapiConnecting) return;
              else void handleVapiStart();
            }}
            className={cn(
              "relative flex items-center gap-3 rounded-full px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:scale-105",
              vapiLive ? "bg-green-500 hover:bg-green-600" : "bg-primary hover:opacity-90"
            )}
            disabled={vapiConnecting}
          >
            {vapiConnecting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Connecting…</span>
              </>
            ) : vapiLive ? (
              <>
                <PhoneOff className="h-5 w-5" />
                <span>End Call</span>
              </>
            ) : (
              <>
                <Phone className="h-5 w-5" />
                <span>Start Voice Call</span>
              </>
            )}
            {vapiLive && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
              </span>
            )}
          </button>

          {vapiLive && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{formatDuration(vapiDuration)}</span>
            </div>
          )}

          {vapiShownError && !vapiLive && (
            <p className="text-xs text-destructive text-center max-w-xs" role="status">
              {vapiShownError}
            </p>
          )}

          {vapiStatus === "failed" && !vapiShownError && (
            <p className="text-xs text-destructive text-center max-w-xs">
              Connection failed. Please check your microphone permissions and try again.
            </p>
          )}

          <p className="text-xs text-muted-foreground text-center max-w-xs">
            Your browser will ask for microphone permission. Speak clearly for best results.
          </p>
        </div>
      </div>
    );
  }

  // ── Dograh path (unchanged) ──────────────────────────────────────────────
  if (scriptError) {
    return (
      <div className={cn("rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center", className)}>
        <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
        <p className="text-sm font-medium text-destructive">Voice agent unavailable</p>
        <p className="text-xs text-muted-foreground mt-1">{scriptError}</p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-2xl border bg-gradient-to-br from-violet-50 via-white to-indigo-50 p-8", className)}>
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <Volume2 className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-xl font-bold">{title}</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">{subtitle}</p>
      </div>

      <div
        ref={containerRef}
        id={containerId}
        className="min-h-[200px] flex flex-col items-center justify-center"
      />

      {!scriptLoaded && !scriptError && (
        <div className="flex flex-col items-center justify-center min-h-[200px] gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading voice agent…</p>
        </div>
      )}

      {scriptLoaded && (
        <div className="flex flex-col items-center gap-4 mt-4">
          <button
            onClick={() => {
              if (isLive) endCall();
              else handleStartCall();
            }}
            className={cn(
              "relative flex items-center gap-3 rounded-full px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:scale-105",
              getStatusColorClass(status, isLive)
            )}
            disabled={status === "connecting"}
          >
            {status === "connecting" ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Connecting…</span>
              </>
            ) : isLive ? (
              <>
                <PhoneOff className="h-5 w-5" />
                <span>End Call</span>
              </>
            ) : (
              <>
                <Phone className="h-5 w-5" />
                <span>Start Voice Call</span>
              </>
            )}
            {isLive && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
              </span>
            )}
          </button>

          {isLive && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{formatDuration(duration)}</span>
            </div>
          )}

          {status === "failed" && (
            <p className="text-xs text-destructive text-center max-w-xs">
              Connection failed. Please check your microphone permissions and try again.
            </p>
          )}

          <p className="text-xs text-muted-foreground text-center max-w-xs">
            Your browser will ask for microphone permission. Speak clearly for best results.
          </p>
        </div>
      )}
    </div>
  );
}

/** Mirrors the original inline panel's button colouring. */
function getStatusColorClass(status: string, isLive: boolean): string {
  if (isLive) return "bg-green-500 hover:bg-green-600";
  if (status === "failed") return "bg-destructive hover:opacity-90";
  return "bg-primary hover:opacity-90";
}
