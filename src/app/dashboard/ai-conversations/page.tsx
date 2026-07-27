"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2, MessageSquare, Clock, User, Bot, ArrowRight,
  Filter, TrendingUp, Eye, DollarSign, Calendar
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface Conversation {
  _id: string;
  sessionId: string;
  visitorId?: string;
  language: string;
  agentType: string;
  messages: Message[];
  projectBrief?: {
    projectType?: string;
    features?: string[];
    budget?: string;
    timeline?: string;
    clientName?: string;
    clientEmail?: string;
  };
  outcome: "none" | "inquiry-created" | "project-created" | "payment-completed";
  projectId?: string;
  inquiryId?: string;
  startedAt: string;
  endedAt?: string;
  messageCount: number;
  createdAt: string;
}

const OUTCOME_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  none: { label: "No conversion", color: "bg-gray-100 text-gray-600", icon: "—" },
  "inquiry-created": { label: "Inquiry Created", color: "bg-blue-100 text-blue-700", icon: "📩" },
  "project-created": { label: "Project Created", color: "bg-green-100 text-green-700", icon: "🚀" },
  "payment-completed": { label: "Payment Done", color: "bg-purple-100 text-purple-700", icon: "💰" },
};

export default function AIConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/conversations");
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  const filtered = filter === "all" ? conversations : conversations.filter((c) => c.outcome === filter);

  const stats = {
    total: conversations.length,
    converted: conversations.filter((c) => c.outcome !== "none").length,
    projectCreated: conversations.filter((c) => c.outcome === "project-created").length,
    paymentCompleted: conversations.filter((c) => c.outcome === "payment-completed").length,
    conversionRate: conversations.length > 0
      ? Math.round((conversations.filter((c) => c.outcome !== "none").length / conversations.length) * 100)
      : 0,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Agent Conversations</h1>
        <p className="text-muted-foreground mt-1">Track chatbot interactions and conversions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Conversations</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-muted-foreground mb-1">Converted</p>
          <p className="text-2xl font-bold text-green-600">{stats.converted}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-muted-foreground mb-1">Projects Created</p>
          <p className="text-2xl font-bold text-blue-600">{stats.projectCreated}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Conversion Rate</p>
          </div>
          <p className="text-2xl font-bold text-primary">{stats.conversionRate}%</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {["all", "none", "inquiry-created", "project-created", "payment-completed"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f === "all" ? "All" : OUTCOME_LABELS[f]?.label || f}
          </button>
        ))}
      </div>

      {/* Conversations List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No conversations found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((conv) => {
            const outcomeCfg = OUTCOME_LABELS[conv.outcome] || OUTCOME_LABELS.none;
            const isExpanded = expandedId === conv._id;

            return (
              <div key={conv._id} className="bg-white rounded-xl border overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : conv._id)}
                  className="w-full text-left p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {conv.projectBrief?.clientName || conv.projectBrief?.clientEmail || conv.sessionId.slice(0, 12)}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${outcomeCfg.color}`}>
                        {outcomeCfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {conv.messageCount} messages
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(conv.createdAt).toLocaleDateString()}
                      </span>
                      {conv.projectBrief?.projectType && (
                        <span className="bg-muted px-1.5 py-0.5 rounded">{conv.projectBrief.projectType}</span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                </button>

                {isExpanded && (
                  <div className="border-t p-4 space-y-4">
                    {/* Project Brief */}
                    {conv.projectBrief && (
                      <div className="bg-muted/30 rounded-lg p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2">PROJECT BRIEF</p>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {conv.projectBrief.clientName && (
                            <div><span className="text-muted-foreground">Name:</span> {conv.projectBrief.clientName}</div>
                          )}
                          {conv.projectBrief.clientEmail && (
                            <div><span className="text-muted-foreground">Email:</span> {conv.projectBrief.clientEmail}</div>
                          )}
                          {conv.projectBrief.budget && (
                            <div><span className="text-muted-foreground">Budget:</span> {conv.projectBrief.budget}</div>
                          )}
                          {conv.projectBrief.timeline && (
                            <div><span className="text-muted-foreground">Timeline:</span> {conv.projectBrief.timeline}</div>
                          )}
                        </div>
                        {conv.projectBrief.features && conv.projectBrief.features.length > 0 && (
                          <div className="mt-2">
                            <span className="text-xs text-muted-foreground">Features: </span>
                            {conv.projectBrief.features.map((f, i) => (
                              <span key={i} className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded mr-1">{f}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Messages */}
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {conv.messages.map((msg, i) => (
                        <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}>
                            <div className="flex items-center gap-1 mb-1">
                              {msg.role === "user" ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                              <span className="text-xs opacity-70">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Links */}
                    <div className="flex items-center gap-3 text-sm">
                      {conv.projectId && (
                        <a
                          href={`/dashboard/projects/${conv.projectId}/edit`}
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <Eye className="h-3 w-3" /> View Project
                        </a>
                      )}
                      {conv.inquiryId && (
                        <a
                          href={`/dashboard/inquiries/${conv.inquiryId}`}
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <Eye className="h-3 w-3" /> View Inquiry
                        </a>
                      )}
                      <span className="text-muted-foreground text-xs ml-auto">
                        Session: {conv.sessionId.slice(0, 12)}...
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
