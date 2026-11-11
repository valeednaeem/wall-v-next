"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { DOGRAH_WIDGET_READY_EVENT, validateDograhWidgetUrl } from "@/lib/dograh-widget";

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
      getState: () => { isInitialized: boolean; config: { contextVariables: Record<string, string> } };
      setContext: (vars: Record<string, string>) => void;
      getContext: () => Record<string, string>;
      onStatusChange: (cb: (status: CallStatus, text?: string, subtext?: string) => void) => void;
      onCallStart: (cb: () => void) => void;
      onCallConnected: (cb: (data: { agentId: string; workflowRunId: string }) => void) => void;
      onCallDisconnected: (cb: (data: { agentId: string; workflowRunId: string; durationSeconds: number }) => void) => void;
      onCallEnd: (cb: () => void) => void;
      onError: (cb: (err: Error) => void) => void;
    };
  }
}

export type CallStatus = "idle" | "connecting" | "connected" | "failed";

interface VoiceAgentConfig {
  enabled?: boolean;
  mode?: "floating" | "inline" | "headless";
  inlineContainerId?: string;
  widgetScriptUrl?: string;
  onStatusChange?: (status: CallStatus, text?: string, subtext?: string) => void;
  onCallConnected?: (data: { agentId: string; workflowRunId: string }) => void;
  onCallDisconnected?: (data: { agentId: string; workflowRunId: string; durationSeconds: number }) => void;
  onError?: (err: Error) => void;
}

function waitForDograhWidget(maxWaitMs = 8000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.DograhWidget) {
      resolve();
      return;
    }
    const start = Date.now();
    const interval = setInterval(() => {
      if (window.DograhWidget || Date.now() - start > maxWaitMs) {
        clearInterval(interval);
        if (window.DograhWidget) resolve();
        else reject(new Error("Dograh widget did not initialize"));
      }
    }, 50);
  });
}

function loadDograhScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.DograhWidget) {
      resolve();
      return;
    }
    const existing = document.getElementById("dograh-widget");
    if (existing) {
      const expectedUrl = new URL(url, window.location.href).href;
      const existingUrl = existing instanceof HTMLScriptElement ? existing.src : "";
      if (existingUrl && existingUrl !== expectedUrl) {
        reject(new Error("A different Dograh widget script is already loaded"));
        return;
      }
      waitForDograhWidget().then(resolve, reject);
      return;
    }
    const script = document.createElement("script");
    script.id = "dograh-widget";
    script.src = url;
    script.setAttribute("data-dograh-context", JSON.stringify({
      page_url: window.location.href,
      today: new Date().toISOString().slice(0, 10),
    }));
    script.async = true;
    script.onload = () => waitForDograhWidget().then(resolve, reject);
    script.onerror = () => reject(new Error("Failed to load Dograh widget script"));
    document.head.appendChild(script);
  });
}

export function useDograh(config: VoiceAgentConfig) {
  const { enabled = true, mode = "floating", widgetScriptUrl, onStatusChange, onCallConnected, onCallDisconnected, onError } = config;
  const [status, setStatus] = useState<CallStatus>("idle");
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;
  const onCallConnectedRef = useRef(onCallConnected);
  onCallConnectedRef.current = onCallConnected;
  const onCallDisconnectedRef = useRef(onCallDisconnected);
  onCallDisconnectedRef.current = onCallDisconnected;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  // Load the Dograh widget script
  useEffect(() => {
    if (!enabled) {
      setScriptLoaded(false);
      setScriptError(null);
      return;
    }

    const handleWidgetReady = () => {
      if (window.DograhWidget) {
        setScriptLoaded(true);
        setScriptError(null);
      }
    };
    window.addEventListener(DOGRAH_WIDGET_READY_EVENT, handleWidgetReady);

    // The shared preloader may have initialized the global before this hook's
    // own script-loading effect runs. Treat that as ready immediately.
    handleWidgetReady();

    const url = widgetScriptUrl || process.env.NEXT_PUBLIC_DOGRAH_WIDGET_URL;
    if (!url) {
      console.warn("[Dograh] No widget URL configured");
      setScriptError("Voice agent not configured");
      return () => window.removeEventListener(DOGRAH_WIDGET_READY_EVENT, handleWidgetReady);
    }

    const isProduction = window.location.protocol === "https:" && !["localhost", "127.0.0.1"].includes(window.location.hostname);
    const validation = validateDograhWidgetUrl(url, { production: isProduction });
    if (!validation.valid) {
      console.warn("[Dograh] Widget configuration unavailable:", validation.reason);
      setScriptError(validation.reason || "Voice agent not configured");
      return () => window.removeEventListener(DOGRAH_WIDGET_READY_EVENT, handleWidgetReady);
    }

    loadDograhScript(url.trim())
      .then(() => {
        console.log("[Dograh] Script loaded successfully");
        setScriptLoaded(true);
        setScriptError(null);
      })
      .catch((err) => {
        console.error("[Dograh] Script load failed:", err);
        setScriptError("Voice agent unavailable — failed to load");
      });

    return () => window.removeEventListener(DOGRAH_WIDGET_READY_EVENT, handleWidgetReady);
  }, [enabled, widgetScriptUrl]);

  // Subscribe to Dograh widget events
  useEffect(() => {
    if (!enabled || !scriptLoaded || !window.DograhWidget) {
      console.log("[Dograh] Not subscribing yet — scriptLoaded:", scriptLoaded, "DograhWidget:", !!window.DograhWidget);
      return;
    }

    console.log("[Dograh] Subscribing to widget events");
    let active = true;

    const statusHandler = (s: CallStatus, text?: string, subtext?: string) => {
      if (!active) return;
      console.log("[Dograh] Status changed:", s, text, subtext);
      setStatus(s);
      onStatusChangeRef.current?.(s, text, subtext);
    };

    const callStartHandler = () => {
      if (!active) return;
      setDuration(0);
    };

    const callConnectedHandler = (data: { agentId: string; workflowRunId: string }) => {
      if (!active) return;
      console.log("[Dograh] Call connected:", data);
      onCallConnectedRef.current?.(data);
    };

    const callDisconnectedHandler = (data: { agentId: string; workflowRunId: string; durationSeconds: number }) => {
      if (!active) return;
      console.log("[Dograh] Call disconnected:", data);
      setDuration(data.durationSeconds);
      onCallDisconnectedRef.current?.(data);
    };

    const errorHandler = (err: Error) => {
      if (!active) return;
      console.error("[Dograh] Error:", err);
      onErrorRef.current?.(err);
    };

    window.DograhWidget.onStatusChange(statusHandler);
    window.DograhWidget.onCallStart(callStartHandler);
    window.DograhWidget.onCallConnected(callConnectedHandler);
    window.DograhWidget.onCallDisconnected(callDisconnectedHandler);
    window.DograhWidget.onCallEnd(() => {});
    window.DograhWidget.onError(errorHandler);

    return () => {
      // Dograh widget doesn't support unsubscribe; deactivate this instance's closures.
      active = false;
    };
  }, [enabled, scriptLoaded]);

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
    if (!enabled || !scriptLoaded || mode !== "inline" || !containerRef.current || !window.DograhWidget) return;

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
  }, [enabled, scriptLoaded, mode]);

  // start() MUST run inside a user-gesture handler (click) for microphone access.
  // The calling component (voice-widget.tsx, inline-voice-panel.tsx) ensures this
  // is called from an onClick handler. We do NOT call start() automatically.
  const startCall = useCallback(() => {
    if (!enabled) return;
    console.log("[Dograh] startCall called — DograhWidget exists:", !!window.DograhWidget);
    if (!window.DograhWidget) {
      console.error("[Dograh] Cannot start — widget not loaded. Check NEXT_PUBLIC_DOGRAH_WIDGET_URL env var.");
      return;
    }
    window.DograhWidget.start();
  }, [enabled]);

  const endCall = useCallback(() => {
    if (!enabled) return;
    if (!window.DograhWidget) return;
    window.DograhWidget.end();
  }, [enabled]);

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
