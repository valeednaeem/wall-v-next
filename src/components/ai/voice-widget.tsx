"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useDograh } from "./voice-agent";
import { Mic, PhoneOff, Loader2, X, Volume2, User, Mail, Phone, ExternalLink, CreditCard, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloatingVoiceWidgetProps {
  position?: "bottom-left" | "bottom-right";
}

interface ClientDetails {
  name: string;
  email: string;
  phone: string;
}

const SUGGESTIONS = [
  "I want to build a website for my business",
  "I need help with a project idea",
  "What services do you offer?",
  "I need hosting for my website",
];

export function FloatingVoiceWidget({ position = "bottom-left" }: FloatingVoiceWidgetProps) {
  const [showWelcome, setShowWelcome] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [clientDetails, setClientDetails] = useState<ClientDetails>({ name: "", email: "", phone: "" });
  const [selectedSuggestion, setSelectedSuggestion] = useState<string>("");
  const [callData, setCallData] = useState<{ agentId: string; workflowRunId: string } | null>(null);
  const [demoResult, setDemoResult] = useState<{ previewUrl: string; checkoutUrl: string; projectId: string } | null>(null);

  const clientDetailsRef = useRef(clientDetails);
  clientDetailsRef.current = clientDetails;

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
        clientName: clientDetailsRef.current.name,
        clientEmail: clientDetailsRef.current.email,
        clientPhone: clientDetailsRef.current.phone,
      }),
    })
      .then((r) => r.json())
      .then((result) => {
        if (result.previewUrl) {
          setDemoResult({
            previewUrl: result.previewUrl,
            checkoutUrl: result.checkoutUrl,
            projectId: result.projectId,
          });
        }
      })
      .catch((err) => console.error("[Voice Widget] Failed to save call:", err));
    setCallData(null);
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
    onCallConnected: (data) => setCallData(data),
    onCallDisconnected: handleCallEnd,
  });

  useEffect(() => {
    if (!dismissed) {
      const timer = setTimeout(() => setShowWelcome(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [dismissed]);

  useEffect(() => {
    if (isLive) {
      setShowWelcome(false);
      setShowForm(false);
      setDemoResult(null);
    }
  }, [isLive]);

  const handleDismiss = useCallback(() => {
    setShowWelcome(false);
    setShowForm(false);
    setDismissed(true);
  }, []);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setSelectedSuggestion(suggestion);
    setShowWelcome(false);
    setShowForm(true);
  }, []);

  const handleShowForm = useCallback(() => {
    setShowWelcome(false);
    setShowForm(true);
  }, []);

  const handleSubmitDetails = useCallback(() => {
    if (window.DograhWidget) {
      window.DograhWidget.setContext({
        client_name: clientDetails.name,
        client_email: clientDetails.email,
        client_phone: clientDetails.phone,
        selected_option: selectedSuggestion,
      });
      console.log("[Voice Widget] Context set via setContext()");
    }
    setShowForm(false);
    startCall();
  }, [startCall, clientDetails, selectedSuggestion]);

  const positionClasses = position === "bottom-left" ? "left-6" : "right-6";

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <>
      <div ref={containerRef} className="hidden" />

      {/* Demo Result Popup */}
      {demoResult && !isLive && (
        <div
          className={cn(
            "fixed bottom-24 z-50 w-[360px] max-w-[calc(100vw-3rem)] animate-slide-up",
            positionClasses
          )}
        >
          <div className="rounded-2xl bg-white shadow-2xl border p-5 relative">
            <button
              onClick={() => setDemoResult(null)}
              className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted transition-colors"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>

            <div className="flex items-start gap-3 mb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <h4 className="font-semibold text-sm">Your Demo is Ready!</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  We&apos;ve generated a custom preview based on our conversation. Take a look!
                </p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <Link
                href={demoResult.previewUrl}
                target="_blank"
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                View Your Demo
              </Link>
              <Link
                href={demoResult.checkoutUrl}
                className="w-full flex items-center justify-center gap-2 bg-green-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-600 transition-colors"
              >
                <CreditCard className="h-4 w-4" />
                Proceed to Checkout
              </Link>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              A preview link has also been sent to your email.
            </p>
          </div>
        </div>
      )}

      {/* Welcome Popup */}
      {showWelcome && !isLive && !demoResult && (
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
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  &quot;{suggestion}&quot;
                </button>
              ))}
            </div>

            <button
              onClick={handleShowForm}
              className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
            >
              <Mic className="h-4 w-4" />
              {scriptLoaded ? "Start Voice Chat" : "Loading..."}
            </button>
          </div>
        </div>
      )}

      {/* Client Details Form */}
      {showForm && !isLive && (
        <div
          className={cn(
            "fixed bottom-24 z-50 w-[340px] max-w-[calc(100vw-3rem)] animate-slide-up",
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
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-sm">Before we connect...</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Share your details so our team can follow up with you.
                </p>
              </div>
            </div>

            {selectedSuggestion && (
              <div className="mb-3 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
                <p className="text-xs text-muted-foreground">Your inquiry:</p>
                <p className="text-xs font-medium text-foreground mt-0.5">&quot;{selectedSuggestion}&quot;</p>
              </div>
            )}

            <div className="space-y-3 mb-4">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Your name"
                  value={clientDetails.name}
                  onChange={(e) => setClientDetails((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="Email address"
                  value={clientDetails.email}
                  onChange={(e) => setClientDetails((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="tel"
                  placeholder="Phone number"
                  value={clientDetails.phone}
                  onChange={(e) => setClientDetails((prev) => ({ ...prev, phone: e.target.value }))}
                  className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>

            <button
              onClick={handleSubmitDetails}
              disabled={!scriptLoaded}
              className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Mic className="h-4 w-4" />
              Start Call
            </button>
          </div>
        </div>
      )}

      {/* Floating Mic Button */}
      <button
        onClick={() => {
          if (isLive) endCall();
          else if (demoResult) setDemoResult(null);
          else if (showWelcome) handleShowForm();
          else if (showForm) handleSubmitDetails();
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
