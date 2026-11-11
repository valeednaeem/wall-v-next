"use client";

import { useState, useEffect, useRef } from "react";
import {
  Globe, Smartphone, PenTool, Palette, Image, Video, FileText, Search,
  Share2, Mail, Target, Sparkles, Layout, Cloud, Server, Shield,
  BarChart, Brain, Workflow, MessageSquare, CheckCircle, BookOpen,
  DollarSign, LifeBuoy, Send, Loader2, Bot, ArrowRight, Zap, Users,
  Clock, ChevronRight, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, typeof Globe> = {
  Globe, Smartphone, PenTool, Palette, Image, Video, FileText, Search,
  Share2, Mail, Target, Sparkles, Layout, Cloud, Server, Shield,
  BarChart, Brain, Workflow, MessageSquare, CheckCircle, BookOpen,
  DollarSign, LifeBuoy,
};

interface Capability {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  estimatedDuration: string;
  requiresAuth: boolean;
  requiresProject: boolean;
  requestTypes: string[];
}

interface RequestResponse {
  success: boolean;
  classified: {
    requestType: string;
    confidence: number;
    complexity: string;
    requiresProject: boolean;
    keywords: string[];
  };
  capabilities: { id: string; name: string; description: string; category: string; icon: string; estimatedDuration: string }[];
  resolution: {
    primaryAgent: { id: string; name: string; description: string; role: string; division: string; avatar: string; score: number; reasons: string[] } | null;
    supportingAgents: { id: string; name: string; role: string; score: number }[];
    totalQualified: number;
  } | null;
  conversation: { id: string; sessionId: string } | null;
  meta: { requiresAuth: boolean; requiresProject: boolean; estimatedDuration: string; isAuthenticated: boolean; userRole: string };
  message?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  development: "bg-blue-100 text-blue-700",
  design: "bg-purple-100 text-purple-700",
  marketing: "bg-pink-100 text-pink-700",
  content: "bg-amber-100 text-amber-700",
  generation: "bg-emerald-100 text-emerald-700",
  creative: "bg-rose-100 text-rose-700",
  operations: "bg-teal-100 text-teal-700",
  security: "bg-red-100 text-red-700",
  analysis: "bg-indigo-100 text-indigo-700",
  consulting: "bg-violet-100 text-violet-700",
  testing: "bg-orange-100 text-orange-700",
  sales: "bg-green-100 text-green-700",
  support: "bg-lime-100 text-lime-700",
};

export default function AICapabilitiesPage() {
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<RequestResponse | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchCapabilities();
  }, []);

  const fetchCapabilities = async () => {
    try {
      const res = await fetch("/api/ai/request");
      const data = await res.json();
      setCapabilities(data.capabilities || []);
    } catch { console.error("Failed to fetch capabilities"); } finally { setLoading(false); }
  };

  const handleSubmit = async (message?: string) => {
    const msg = message || input.trim();
    if (!msg || processing) return;

    setProcessing(true);
    setResult(null);
    setShowResult(true);

    try {
      const res = await fetch("/api/ai/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: msg,
          context: { page: window.location.href, referrer: document.referrer },
          channel: "website",
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({
        success: false,
        classified: { requestType: "error", confidence: 0, complexity: "simple", requiresProject: false, keywords: [] },
        capabilities: [],
        resolution: null,
        conversation: null,
        meta: { requiresAuth: false, requiresProject: false, estimatedDuration: "", isAuthenticated: false, userRole: "visitor" },
        message: "Failed to process your request. Please try again.",
      });
    } finally { setProcessing(false); }
  };

  const categories = [...new Set(capabilities.map((c) => c.category))];
  const filtered = selectedCategory ? capabilities.filter((c) => c.category === selectedCategory) : capabilities;

  const SUGGESTIONS = [
    "I need a website for my business",
    "Create a logo for my brand",
    "I want to build a mobile app",
    "Help me with SEO",
    "Create a social media campaign",
    "I need a promotional video",
    "Build an e-commerce store",
    "I have a SaaS idea",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <Bot className="h-4 w-4" />AI-Powered Platform
          </div>
          <h1 className="text-4xl font-bold mb-4">What do you want to create?</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Describe your project or need in plain language. Our AI workforce will understand your request, find the right experts, and get to work.
          </p>
        </div>

        {/* Request Input */}
        <div className="bg-white rounded-2xl border shadow-sm p-6 mb-8">
          <div className="relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              placeholder="Describe what you need... (e.g., 'I need a modern website for my restaurant')"
              className="w-full min-h-[100px] rounded-xl border bg-muted/30 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              disabled={processing}
            />
            <button
              onClick={() => handleSubmit()}
              disabled={!input.trim() || processing}
              className="absolute bottom-3 right-3 p-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>

          {/* Quick Suggestions */}
          <div className="flex flex-wrap gap-2 mt-3">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => { setInput(s); handleSubmit(s); }}
                className="text-xs px-3 py-1.5 rounded-full border hover:bg-muted transition-colors text-muted-foreground">
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Result Panel */}
        {showResult && (
          <div className="bg-white rounded-2xl border shadow-sm p-6 mb-8">
            {processing ? (
              <div className="flex flex-col items-center py-8">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                <p className="text-sm text-muted-foreground">Analyzing your request and finding the right experts...</p>
              </div>
            ) : result ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">Request Analysis</h2>
                  <button onClick={() => setShowResult(false)} className="p-1 hover:bg-muted rounded-lg"><X className="h-4 w-4" /></button>
                </div>

                {/* Classification */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-muted/50 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground">Request Type</p>
                    <p className="text-sm font-semibold capitalize">{result.classified.requestType.replace(/-/g, " ")}</p>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground">Confidence</p>
                    <p className="text-sm font-semibold">{Math.round(result.classified.confidence * 100)}%</p>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground">Complexity</p>
                    <p className="text-sm font-semibold capitalize">{result.classified.complexity}</p>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground">Est. Duration</p>
                    <p className="text-sm font-semibold">{result.meta.estimatedDuration}</p>
                  </div>
                </div>

                {/* Matched Capabilities */}
                {result.capabilities.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Matched Services</h3>
                    <div className="space-y-2">
                      {result.capabilities.map((c) => {
                        const Icon = ICON_MAP[c.icon] || Bot;
                        return (
                          <div key={c.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
                            <div className="p-2 bg-primary/10 rounded-lg"><Icon className="h-4 w-4 text-primary" /></div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{c.name}</p>
                              <p className="text-xs text-muted-foreground">{c.description}</p>
                            </div>
                            <span className={cn("text-xs px-2 py-0.5 rounded", CATEGORY_COLORS[c.category] || "bg-gray-100 text-gray-600")}>{c.category}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Assigned Agent */}
                {result.resolution?.primaryAgent && (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{result.resolution.primaryAgent.avatar}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold">{result.resolution.primaryAgent.name}</p>
                          <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">{result.resolution.primaryAgent.role}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{result.resolution.primaryAgent.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Match Score</p>
                        <p className="text-lg font-bold text-primary">{result.resolution.primaryAgent.score}</p>
                      </div>
                    </div>
                    {result.resolution.primaryAgent.reasons.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {result.resolution.primaryAgent.reasons.map((r, i) => (
                          <span key={i} className="text-xs bg-background border rounded-full px-2 py-0.5">{r}</span>
                        ))}
                      </div>
                    )}
                    {result.resolution.supportingAgents.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground mb-2">Supporting agents available:</p>
                        <div className="flex flex-wrap gap-2">
                          {result.resolution.supportingAgents.map((a) => (
                            <span key={a.id} className="text-xs bg-background border rounded-full px-2 py-0.5">
                              {a.name} ({a.role})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Auth Notice */}
                {result.meta.requiresAuth && !result.meta.isAuthenticated && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-sm text-amber-700">
                      This service requires an account. <a href="/login" className="underline font-medium">Sign in</a> or <a href="/signup" className="underline font-medium">create an account</a> to proceed.
                    </p>
                  </div>
                )}

                {/* Project Notice */}
                {result.classified.requiresProject && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-sm text-blue-700">
                      This request will create a project with milestones, deliverables, and a dedicated workflow.
                    </p>
                  </div>
                )}

                {/* No match */}
                {!result.success && result.message && (
                  <div className="bg-muted/50 rounded-xl p-4 text-center">
                    <p className="text-sm text-muted-foreground">{result.message}</p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* Capabilities Grid */}
        {!showResult && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">What We Can Build</h2>
              <p className="text-sm text-muted-foreground">{capabilities.length} services available</p>
            </div>

            {/* Category Filters */}
            <div className="flex flex-wrap gap-2 mb-6">
              <button onClick={() => setSelectedCategory(null)}
                className={cn("px-3 py-1.5 text-xs rounded-full border transition-colors",
                  !selectedCategory ? "bg-primary text-primary-foreground" : "bg-white hover:bg-muted")}>
                All
              </button>
              {categories.map((cat) => (
                <button key={cat} onClick={() => setSelectedCategory(cat)}
                  className={cn("px-3 py-1.5 text-xs rounded-full border transition-colors capitalize",
                    selectedCategory === cat ? "bg-primary text-primary-foreground" : "bg-white hover:bg-muted")}>
                  {cat}
                </button>
              ))}
            </div>

            {/* Grid */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((cap) => {
                  const Icon = ICON_MAP[cap.icon] || Bot;
                  return (
                    <button key={cap.id} onClick={() => { setInput(`I need ${cap.name.toLowerCase()}`); handleSubmit(`I need ${cap.name.toLowerCase()}`); }}
                      className="bg-white rounded-xl border p-5 text-left hover:shadow-md transition-all group">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="p-2.5 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">{cap.name}</h3>
                          <span className={cn("text-xs px-2 py-0.5 rounded", CATEGORY_COLORS[cap.category] || "bg-gray-100 text-gray-600")}>{cap.category}</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{cap.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />{cap.estimatedDuration}
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      {cap.requiresProject && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-blue-600">
                          <Zap className="h-3 w-3" />Creates project
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
