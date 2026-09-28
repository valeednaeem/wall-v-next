"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ToolInputProps {
  maxLength?: number;
  onSubmit: (text: string) => void;
  busy: boolean;
  disabledReason?: string;
  placeholder?: string;
}

export function ToolInput({ maxLength = 0, onSubmit, busy, disabledReason, placeholder }: ToolInputProps) {
  const [text, setText] = useState("");
  const overLimit = maxLength > 0 && text.length > maxLength;
  const disabled = busy || Boolean(disabledReason) || text.trim().length === 0 || overLimit;

  return (
    <div className="space-y-2">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder || "Type your input here..."}
        rows={5}
        disabled={busy || Boolean(disabledReason)}
        aria-label="Tool input"
      />
      <div className="flex items-center justify-between">
        <span className={`text-xs ${overLimit ? "text-destructive" : "text-muted-foreground"}`}>
          {maxLength > 0 ? `${text.length} / ${maxLength}` : `${text.length} characters`}
        </span>
        <Button size="sm" onClick={() => onSubmit(text.trim())} disabled={disabled}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
          {busy ? "Running..." : "Run tool"}
        </Button>
      </div>
      {disabledReason && (
        <p className="text-sm text-muted-foreground">{disabledReason}</p>
      )}
    </div>
  );
}
