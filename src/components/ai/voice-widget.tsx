"use client";

import { useState, useEffect, useCallback } from "react";
import { useDograh } from "./voice-agent";
import { Mic, PhoneOff, Loader2, X, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloatingVoiceWidgetProps {
  position?: "bottom-left" | "bottom-right";
}

export function FloatingVoiceWidget({ position = "bottom-left" }: FloatingVoiceWidgetProps) {
  const [showWelcome, setShowWelcome] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const handleCallEnd = useCallback((data: { agentId: string; workflowRunId: string; durationSeconds: number }) => {
    console.log("[Voice Widget] Call ended, saving:", data);
    fetch("/api/voice-agent/call-ended", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentId: data.agentId,
        workflowRunId: data.workflowRunId,
        durationSeconds: data.durationSeconds,
        status: "completed",
      }),
    }).catch((err) => console.error("[Voice Widget] Failed to save call:", err));
  }, []);

  const {
    status,
    scriptLoaded,
    containerRef,
    startCall,
    endCall,
    isLive,
    getStatusLabel,
    duration,
  } = useDograh({
    mode: "headless",
    onCallDisconnected: handleCallEnd,
  });

  useEffect(() => {
    if (!dismissed) {
      const timer = setTimeout(() => setShowWelcome(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [dismissed]);

  useEffect(() => {
    if (isLive) setShowWelcome(false);
  }, [isLive]);

  const handleDismiss = useCallback(() => {
    setShowWelcome(false);
    setDismissed(true);
  }, []);

  const handleStart = useCallback(() => {
    setShowWelcome(false);
    startCall();
  }, [startCall]);

  const positionClasses = position === "bottom-left" ? "left-6" : "right-6";

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <>
      <div ref={containerRef} className="hidden" />

      {/* Welcome Popup */}
      {showWelcome && !isLive && (
        <div
          className={cn(
            "fixed bottom-24 z-50 w-[320px] max-w-[calc(100vw-3rem)] animate-slide-up",
            positionClasses
          )}
        >
          <div className="rounded-2xl bg-white shadow-2xl border p-5 relative">
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted transition-colors"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>

            <div className="flex items-start gap-3 mb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Volume2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-sm">Welcome to Wall-V!</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  I&apos;m your AI project consultant. Tell me what you want to build and I&apos;ll help you figure out the best solution.
                </p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {[
                "I want to build a website for my business",
                "I need help with a project idea",
                "What services do you offer?",
                "I need hosting for my website",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={handleStart}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  &quot;{suggestion}&quot;
                </button>
              ))}
            </div>

            <button
              onClick={handleStart}
              className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
            >
              <Mic className="h-4 w-4" />
              {scriptLoaded ? "Start Voice Chat" : "Connecting..."}
            </button>
          </div>
        </div>
      )}

      {/* Floating Mic Button */}
      <button
        onClick={() => {
          if (isLive) endCall();
          else if (showWelcome) handleStart();
          else setShowWelcome(true);
        }}
        className={cn(
          "fixed bottom-6 z-50 flex items-center gap-2 rounded-full px-5 py-3.5 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105",
          positionClasses,
          isLive ? "bg-green-500 hover:bg-green-600" : "bg-primary hover:bg-primary/90"
        )}
        disabled={status === "connecting"}
      >
        {status === "connecting" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isLive ? (
          <PhoneOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
        <span>{getStatusLabel()}</span>
        {isLive && (
          <span className="ml-1 text-xs opacity-80">{formatDuration(duration)}</span>
        )}
        {isLive && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-green-300" />
          </span>
        )}
      </button>
    </>
  );
}
