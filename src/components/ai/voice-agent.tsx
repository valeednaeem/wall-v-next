"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ─── Dograh Widget Global Types ──────────────────────────────────────────────
// Based on official Dograh integration docs:
// - The widget renders no UI — we render our own buttons
// - Call window.DograhWidget.start() inside a user-gesture handler (click)
// - Call window.DograhWidget.end() to end the call
// - Subscribe to onCallStart, onCallEnd, onStatusChange, onError

declare global {
  interface Window {
    DograhWidget?: {
      initInline: (options: { container: HTMLElement }) => void;
      refresh: () => void;
      start: () => void;
      end: () => void;
      getState: () => { isInitialized: boolean };
      onStatusChange: (cb: (status: CallStatus, text?: string, subtext?: string) => void) => void;
      onCallStart: (cb: (data: { agentId: string; workflowRunId: string }) => void) => void;
      onCallEnd: (cb: (data: { agentId: string; workflowRunId: string; durationSeconds: number }) => void) => void;
      onError: (cb: (err: Error) => void) => void;
    };
  }
}

export type CallStatus = "idle" | "connecting" | "connected" | "failed";

interface VoiceAgentConfig {
  mode?: "floating" | "inline" | "headless";
  inlineContainerId?: string;
  widgetScriptUrl?: string;
  onStatusChange?: (status: CallStatus, text?: string, subtext?: string) => void;
  onCallConnected?: (data: { agentId: string; workflowRunId: string }) => void;
  onCallDisconnected?: (data: { agentId: string; workflowRunId: string; durationSeconds: number }) => void;
  onError?: (err: Error) => void;
}

function loadDograhScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${url}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = url;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Dograh widget script"));
    document.head.appendChild(script);
  });
}

export function useDograh(config: VoiceAgentConfig) {
  const { mode = "floating", widgetScriptUrl, onStatusChange, onCallConnected, onCallDisconnected, onError } = config;
  const [status, setStatus] = useState<CallStatus>("idle");
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load the Dograh widget script
  useEffect(() => {
    const url = widgetScriptUrl || process.env.NEXT_PUBLIC_DOGRAH_WIDGET_URL;
    if (!url) return;

    loadDograhScript(url)
      .then(() => {
        setScriptLoaded(true);
        setScriptError(null);
      })
      .catch(() => {
        setScriptError("Voice agent unavailable — Dograh not deployed");
      });
  }, [widgetScriptUrl]);

  // Subscribe to Dograh widget events
  // Event names per official docs: onStatusChange, onCallStart, onCallEnd, onError
  useEffect(() => {
    if (!scriptLoaded || !window.DograhWidget) return;

    window.DograhWidget.onStatusChange((s, text, subtext) => {
      setStatus(s);
      onStatusChange?.(s, text, subtext);
    });

    if (onCallConnected) {
      window.DograhWidget.onCallStart((data) => {
        setDuration(0);
        onCallConnected(data);
      });
    }

    if (onCallDisconnected) {
      window.DograhWidget.onCallEnd((data) => {
        setDuration(data.durationSeconds);
        onCallDisconnected(data);
      });
    }

    if (onError) {
      window.DograhWidget.onError(onError);
    }
  }, [scriptLoaded, onStatusChange, onCallConnected, onCallDisconnected, onError]);

  // Live duration timer — counts up every second during active calls
  useEffect(() => {
    if (status !== "connected") return;
    const interval = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  // Inline mode: initialize widget inside a container element
  useEffect(() => {
    if (!scriptLoaded || mode !== "inline" || !containerRef.current || !window.DograhWidget) return;

    let retries = 0;
    const tryInit = () => {
      const container = containerRef.current;
      if (!container) return;
      if (window.DograhWidget) {
        const { isInitialized } = window.DograhWidget.getState();
        if (isInitialized) window.DograhWidget.refresh();
        else window.DograhWidget.initInline({ container });
      } else if (retries++ < 50) {
        setTimeout(tryInit, 100);
      }
    };
    tryInit();
  }, [scriptLoaded, mode]);

  // start() MUST run inside a user-gesture handler (click) for microphone access.
  // The calling component (voice-widget.tsx, inline-voice-panel.tsx) ensures this
  // is called from an onClick handler. We do NOT call start() automatically.
  const startCall = useCallback(() => {
    if (!window.DograhWidget) return;
    window.DograhWidget.start();
  }, []);

  const endCall = useCallback(() => {
    if (!window.DograhWidget) return;
    window.DograhWidget.end();
  }, []);

  const isLive = status === "connected" || status === "connecting";

  const getStatusLabel = useCallback(() => {
    switch (status) {
      case "connecting": return "Connecting…";
      case "connected": return "End Call";
      case "failed": return "Retry";
      default: return "Talk to AI";
    }
  }, [status]);

  const getStatusColor = useCallback(() => {
    switch (status) {
      case "connected": return "bg-green-500 hover:bg-green-600";
      case "connecting": return "bg-yellow-500 cursor-wait";
      case "failed": return "bg-red-500 hover:bg-red-600";
      default: return "bg-primary hover:bg-primary/90";
    }
  }, [status]);

  return {
    status,
    scriptLoaded,
    scriptError,
    duration,
    containerRef,
    startCall,
    endCall,
    isLive,
    getStatusLabel,
    getStatusColor,
  };
}
