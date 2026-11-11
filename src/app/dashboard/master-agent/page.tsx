"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, User, Loader2, RefreshCw, Trash2, Copy, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const QUICK_ACTIONS = [
  { label: "Workforce overview", message: "Give me a workforce overview" },
  { label: "System health", message: "Check system health" },
  { label: "Project status", message: "Show me the project overview" },
  { label: "Pending approvals", message: "Show pending approvals" },
  { label: "Create a task", message: "Create a new internal task" },
  { label: "Generate report", message: "Generate a weekly operations report" },
];

export default function MasterAgentPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => `admin-master-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: text.trim(), timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/agents/admin-master-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim(), sessionId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");

      const assistantMsg: Message = { role: "assistant", content: data.response, timestamp: new Date() };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errMsg: Message = { role: "assistant", content: `Error: ${err instanceof Error ? err.message : "Something went wrong"}`, timestamp: new Date() };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, sessionId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const copyMessage = (content: string, idx: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Master Agent</h1>
            <p className="text-xs text-muted-foreground">AI Operations Assistant — workforce, projects, tasks, health</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Online</Badge>
          <Button variant="ghost" size="sm" onClick={() => setMessages([])} className="text-muted-foreground">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Admin Master Agent</h2>
                <p className="text-sm text-muted-foreground max-w-md mt-1">
                  Your AI operations assistant. Ask about workforce status, projects, tasks, system health, or request reports.
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-lg">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => sendMessage(action.message)}
                    className="px-3 py-2 text-xs font-medium rounded-lg border bg-background hover:bg-accent transition-colors text-left"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
              {msg.role === "assistant" && (
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div className={cn("max-w-[75%] rounded-xl px-4 py-3 text-sm", msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted")}>
                <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                <div className={cn("text-[10px] mt-1.5 flex items-center gap-2", msg.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground")}>
                  {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {msg.role === "assistant" && (
                    <button onClick={() => copyMessage(msg.content, idx)} className="hover:opacity-70">
                      {copiedIdx === idx ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </button>
                  )}
                </div>
              </div>
              {msg.role === "user" && (
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-muted rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking...
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </CardContent>

        {/* Input */}
        <div className="border-t p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about workforce, projects, tasks..."
              rows={1}
              className="flex-1 resize-none rounded-lg border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[42px] max-h-[120px]"
            />
            <Button type="submit" size="icon" disabled={!input.trim() || isLoading} className="h-[42px] w-[42px] flex-shrink-0">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
