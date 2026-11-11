"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Send, Loader2, ClipboardList, Bot, User,
  RefreshCw, AlertTriangle, CheckCircle2, Shield, Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function PMChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pmAgentId, setPmAgentId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  // Load PM agent ID
  useEffect(() => {
    fetch("/api/agents?search=project-manager&limit=5", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        const pm = data.agents?.find((a: any) => a.slug === "project-manager");
        if (pm) setPmAgentId(pm._id);
      })
      .catch(() => {});
  }, []);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading || !pmAgentId) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/agents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: userMessage.content,
          agentId: pmAgentId,
          sessionId: conversationId || undefined,
          visitor: { role: "admin" },
          context: { page: "pm-chat" },
        }),
      });

      const data = await res.json();

      if (data.response) {
        const assistantMessage: Message = {
          role: "assistant",
          content: data.response,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }

      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Failed to get response. Please try again.", timestamp: new Date() },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, pmAgentId, conversationId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/project-manager" className="p-2 hover:bg-muted rounded-lg">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-teal-600" />
              Project Manager
            </h1>
            <p className="text-xs text-muted-foreground">AI Workforce Orchestrator</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            <Bot className="h-3 w-3 mr-1" />
            {pmAgentId ? "Connected" : "Loading..."}
          </Badge>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <ClipboardList className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Project Manager</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              Your AI Workforce Orchestrator. Ask about projects, capacity, risks, issues, or request reports.
            </p>
            <div className="grid grid-cols-2 gap-2 max-w-sm">
              {[
                { icon: Layers, label: "What projects are active?" },
                { icon: AlertTriangle, label: "Show me current risks" },
                { icon: CheckCircle2, label: "What needs my attention?" },
                { icon: Shield, label: "Capacity status today?" },
              ].map((suggestion) => (
                <button
                  key={suggestion.label}
                  onClick={() => setInput(suggestion.label)}
                  className="flex items-center gap-2 p-2 text-xs text-left border rounded-lg hover:bg-muted transition-colors"
                >
                  <suggestion.icon className="h-3 w-3 text-muted-foreground shrink-0" />
                  {suggestion.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
            {msg.role === "assistant" && (
              <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                <ClipboardList className="h-4 w-4 text-teal-600" />
              </div>
            )}
            <Card className={cn("max-w-[80%]", msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/50")}>
              <CardContent className="p-3">
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <p className={cn("text-[10px] mt-1", msg.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  {msg.timestamp.toLocaleTimeString()}
                </p>
              </CardContent>
            </Card>
            {msg.role === "user" && (
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-primary" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
              <ClipboardList className="h-4 w-4 text-teal-600" />
            </div>
            <Card className="bg-muted/50">
              <CardContent className="p-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask the Project Manager..."
          disabled={loading || !pmAgentId}
          className="flex-1"
        />
        <Button onClick={sendMessage} disabled={loading || !input.trim() || !pmAgentId} size="icon">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
