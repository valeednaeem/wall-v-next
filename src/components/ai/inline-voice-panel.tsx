"use client";

import { useId, useCallback, useEffect, useRef, useState } from "react";
import { useDograh } from "./voice-agent";
import { Mic, PhoneOff, Loader2, Phone, Volume2, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface InlineVoicePanelProps {
  title?: string;
  subtitle?: string;
  greeting?: string;
  showTranscript?: boolean;
  className?: string;
}

export function InlineVoicePanel({
  title = "Talk to Wall-V AI",
  subtitle = "Tell me what you want to build and I'll help you figure out the best solution — no technical jargon needed.",
  className,
}: InlineVoicePanelProps) {
  const containerId = useId();
  const [systemPrompt, setSystemPrompt] = useState("");
  const systemPromptRef = useRef("");
  systemPromptRef.current = systemPrompt;

  // Fetch system prompt from DB
  useEffect(() => {
    fetch("/api/settings/public")
      .then((r) => r.json())
      .then((d) => {
        if (d?.data?.voice?.systemPrompt) {
          setSystemPrompt(d.data.voice.systemPrompt);
        }
      })
      .catch(() => {});
  }, []);

  const handleCallDisconnected = useCallback(
    (data: { agentId: string; workflowRunId: string; durationSeconds: number }) => {
      console.log("[Inline Voice] VOICE_CONVERSATION_COMPLETED:", data.workflowRunId);
      fetch("/api/voice-agent/call-ended", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: data.agentId,
          workflowRunId: data.workflowRunId,
          durationSeconds: data.durationSeconds,
          status: "completed",
        }),
      }).catch((err) => console.error("[Inline Voice] VOICE_PERSISTENCE_ERROR:", err));
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
    getStatusLabel,
    getStatusColor,
    duration,
  } = useDograh({
    mode: "inline",
    inlineContainerId: containerId,
    onCallDisconnected: handleCallDisconnected,
  });

  // Pass system prompt when call starts
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

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

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
              getStatusColor()
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
