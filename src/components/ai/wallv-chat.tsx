"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Sparkles, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  agent?: { name: string; role: string; avatar: string };
  capability?: { name: string; category: string };
}

interface ChatState {
  conversationId: string | null;
  isProcessing: boolean;
  projectCreated: boolean;
  projectId: string | null;
}

export function WallVChat({ channel = "chat", className }: { channel?: string; className?: string }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I'm Wall-V AI. I can help you with websites, apps, design, marketing, and more. What would you like to create?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [state, setState] = useState<ChatState>({
    conversationId: null,
    isProcessing: false,
    projectCreated: false,
    projectId: null,
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || state.isProcessing) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setState((prev) => ({ ...prev, isProcessing: true }));

    try {
      const res = await fetch("/api/ai/unified-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: text,
          conversationId: state.conversationId,
          channel,
          page: window.location.href,
        }),
      });
      const data = await res.json();

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.response || "I'm not sure how to help with that. Could you tell me more?",
        timestamp: new Date(),
        agent: data.agent,
        capability: data.capability,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      if (data.conversationId) {
        setState((prev) => ({ ...prev, conversationId: data.conversationId }));
      }
      if (data.projectCreated) {
        setState((prev) => ({ ...prev, projectCreated: true, projectId: data.projectId }));
      }
    } catch {
      setMessages((prev) => [...prev, {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      }]);
    } finally {
      setState((prev) => ({ ...prev, isProcessing: false }));
    }
  };

  return (
    <div className={cn("flex flex-col h-full bg-white rounded-2xl border shadow-sm overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="p-2 bg-primary/10 rounded-xl">
          <Bot className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">Wall-V AI Assistant</h3>
          <p className="text-xs text-muted-foreground">Powered by our AI workforce</p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-emerald-600">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex gap-3", msg.role === "user" && "flex-row-reverse")}>
            <div className={cn("shrink-0 h-8 w-8 rounded-full flex items-center justify-center",
              msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted")}>
              {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>
            <div className={cn("max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
              msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted")}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.agent && (
                <div className="mt-2 pt-2 border-t border-border/50 flex items-center gap-2 text-xs opacity-70">
                  <Sparkles className="h-3 w-3" />
                  <span>{msg.agent.name}</span>
                  {msg.capability && <span>• {msg.capability.name}</span>}
                </div>
              )}
            </div>
          </div>
        ))}
        {state.isProcessing && (
          <div className="flex gap-3">
            <div className="shrink-0 h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <Bot className="h-4 w-4" />
            </div>
            <div className="bg-muted rounded-2xl px-4 py-3 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Project Created Banner */}
      {state.projectCreated && (
        <div className="mx-4 mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
          <FolderOpen className="h-5 w-5 text-emerald-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-emerald-700">Project Created!</p>
            <p className="text-xs text-emerald-600">Track progress in your dashboard</p>
          </div>
          <a href={`/dashboard/projects/${state.projectId}`} className="text-xs text-emerald-700 underline">View</a>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Describe what you need..."
            className="flex-1 rounded-xl border bg-muted/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            disabled={state.isProcessing}
          />
          <button onClick={sendMessage} disabled={!input.trim() || state.isProcessing}
            className="shrink-0 p-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50">
            {state.isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
