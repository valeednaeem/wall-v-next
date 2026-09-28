"use client";

import { useState } from "react";
import { AlertTriangle, Check, Copy } from "lucide-react";

interface ToolOutputProps {
  result?: string;
  error?: string;
  busy: boolean;
}

export function ToolOutput({ result, error, busy }: ToolOutputProps) {
  const [copied, setCopied] = useState(false);

  if (busy) {
    return (
      <div className="space-y-2" aria-busy="true" aria-live="polite">
        <div className="h-4 bg-muted rounded w-1/3 animate-pulse" />
        <div className="h-24 bg-muted rounded-lg animate-pulse" />
        <span className="sr-only">Generating output...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
        Your output will appear here after you run the tool.
      </div>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Output</span>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="whitespace-pre-wrap rounded-lg border bg-muted/30 px-4 py-3 text-sm font-sans">
        {result}
      </pre>
    </div>
  );
}
