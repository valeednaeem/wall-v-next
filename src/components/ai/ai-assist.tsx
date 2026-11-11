"use client";

import { useState } from "react";
import { Bot, Send, X, Loader2, Copy, Check } from "lucide-react";

interface AIAssistProps {
  context: string;
  resourceType?: string;
  resourceId?: string;
  currentContent?: string;
  onApplySuggestion?: (suggestion: string) => void;
}

interface AssistResult {
  agent: { name: string; role: string };
  response: string;
  suggestions?: string[];
  skills: string[];
}

export default function AIAssist({
  context,
  resourceType,
  resourceId,
  currentContent,
  onApplySuggestion,
}: AIAssistProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AssistResult | null>(null);
  const [action, setAction] = useState<"generate" | "analyze" | "suggest" | "review" | "summarize">("suggest");
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const ACTIONS = [
    { value: "suggest" as const, label: "Suggest", desc: "Get improvement suggestions" },
    { value: "generate" as const, label: "Generate", desc: "Generate new content" },
    { value: "analyze" as const, label: "Analyze", desc: "Analyze for insights" },
    { value: "review" as const, label: "Review", desc: "Review for quality" },
    { value: "summarize" as const, label: "Summarize", desc: "Summarize content" },
  ];

  const handleAssist = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context,
          action,
          resourceType,
          resourceId,
          input: input || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error || "AI assist failed");
      }
    } catch {
      setError("Failed to connect to AI service");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
        title="AI Assist"
      >
        <Bot className="h-5 w-5" />
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-20 right-6 z-50 w-96 max-h-[500px] rounded-xl border bg-background shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">AI Assist</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Action selector */}
          <div className="flex gap-1 px-4 py-2 border-b overflow-x-auto">
            {ACTIONS.map((a) => (
              <button
                key={a.value}
                onClick={() => setAction(a.value)}
                className={`rounded-full px-3 py-1 text-xs whitespace-nowrap transition-colors ${
                  action === a.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
                title={a.desc}
              >
                {a.label}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="px-4 py-2 border-b">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={action === "generate" ? "Describe what to generate..." : "Optional: provide additional context..."}
              className="w-full resize-none rounded-lg border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              rows={2}
            />
            {currentContent && action !== "generate" && (
              <p className="mt-1 text-xs text-muted-foreground truncate">
                Using current content ({currentContent.length} chars)
              </p>
            )}
          </div>

          {/* Send */}
          <div className="px-4 py-2">
            <button
              onClick={handleAssist}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {loading ? "Thinking..." : "Ask AI"}
            </button>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}

            {result && (
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground">
                  Agent: {result.agent.name} ({result.agent.role})
                </div>

                <div className="rounded-lg bg-muted/50 p-3 text-sm whitespace-pre-wrap">
                  {result.response}
                </div>

                {result.suggestions && result.suggestions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium">Suggestions:</p>
                    {result.suggestions.map((s, i) => (
                      <div key={i} className="flex items-start gap-2 rounded-lg border p-2 text-xs">
                        <span className="flex-1">{s}</span>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => handleCopy(s)}
                            className="text-muted-foreground hover:text-foreground"
                            title="Copy"
                          >
                            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </button>
                          {onApplySuggestion && (
                            <button
                              onClick={() => onApplySuggestion(s)}
                              className="text-primary hover:text-primary/80"
                              title="Apply"
                            >
                              Apply
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-1">
                  {result.skills.map((s) => (
                    <span key={s} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
