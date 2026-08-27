"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Loader2, MessageSquare, Clock, User, Bot, ArrowRight,
  Filter, TrendingUp, Eye, Calendar, Phone, PhoneOff,
  Search, FolderKanban, Globe
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  channel?: string;
  messages: Message[];
  voiceAgent?: {
    dograhAgentId?: string;
    workflowRunId?: string;
    durationSeconds?: number;
    callStatus?: string;
    transcript?: string;
    summary?: string;
  };
  projectBrief?: {
    projectType?: string;
    features?: string[];
    budget?: string;
    timeline?: string;
    clientName?: string;
    clientEmail?: string;
    clientPhone?: string;
  };
  outcome: "none" | "inquiry-created" | "project-created" | "payment-completed";
  projectId?: string;
  projectName?: string;
  projectQuote?: { min: number; max: number; currency: string };
  inquiryId?: string;
  leadId?: string;
  startedAt: string;
  endedAt?: string;
  messageCount: number;
  createdAt: string;
}

const OUTCOME_LABELS: Record<string, { label: string; color: string }> = {
  none: { label: "No conversion", color: "bg-gray-100 text-gray-600" },
  "inquiry-created": { label: "Inquiry Created", color: "bg-blue-100 text-blue-700" },
  "project-created": { label: "Project Created", color: "bg-green-100 text-green-700" },
  "payment-completed": { label: "Payment Done", color: "bg-purple-100 text-purple-700" },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  completed: { label: "Completed", color: "bg-green-100 text-green-700" },
  failed: { label: "Failed", color: "bg-red-100 text-red-700" },
  "no-answer": { label: "No Answer", color: "bg-gray-100 text-gray-600" },
};

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type ChannelFilter = "all" | "chat" | "voice";

export default function AIConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [outcomeFilter, setOutcomeFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

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

  const isVoice = (c: Conversation) => c.channel === "voice" || c.agentType === "voice-agent";

  const filtered = conversations.filter((c) => {
    if (channelFilter === "voice" && !isVoice(c)) return false;
    if (channelFilter === "chat" && isVoice(c)) return false;
    if (outcomeFilter !== "all" && c.outcome !== outcomeFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        c.sessionId.toLowerCase().includes(term) ||
        c.projectBrief?.clientName?.toLowerCase().includes(term) ||
        c.projectBrief?.clientEmail?.toLowerCase().includes(term) ||
        c.projectName?.toLowerCase().includes(term) ||
        c.voiceAgent?.transcript?.toLowerCase().includes(term) ||
        c.voiceAgent?.summary?.toLowerCase().includes(term) ||
        (Array.isArray(c.messages) && c.messages.some((m) => m.content.toLowerCase().includes(term)))
      );
    }
    return true;
  });

  const chatConvs = conversations.filter((c) => !isVoice(c));
  const voiceConvs = conversations.filter((c) => isVoice(c));

  const stats = {
    total: conversations.length,
    chat: chatConvs.length,
    voice: voiceConvs.length,
    converted: conversations.filter((c) => c.outcome !== "none").length,
    projectsCreated: conversations.filter((c) => c.outcome === "project-created").length,
    totalDuration: voiceConvs.reduce((sum, c) => sum + (c.voiceAgent?.durationSeconds || 0), 0),
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
        <h1 className="text-3xl font-bold">AI Conversations</h1>
        <p className="text-muted-foreground mt-1">Chat and voice agent interactions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Conversations</p>
          <p className="text-2xl font-bold">{stats.total}</p>
          <div className="flex gap-2 mt-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {stats.chat}</span>
            <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> {stats.voice}</span>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-muted-foreground mb-1">Converted</p>
          <p className="text-2xl font-bold text-green-600">{stats.converted}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-muted-foreground mb-1">Projects Created</p>
          <p className="text-2xl font-bold text-blue-600">{stats.projectsCreated}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Conversion Rate</p>
          </div>
          <p className="text-2xl font-bold text-primary">{stats.conversionRate}%</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg"
          />
        </div>
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          {(["all", "chat", "voice"] as ChannelFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setChannelFilter(f)}
              className={cn("px-3 py-1.5 text-sm rounded-md transition-colors capitalize",
                channelFilter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {f === "all" ? "All Channels" : f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {["all", "none", "inquiry-created", "project-created", "payment-completed"].map((f) => (
            <button
              key={f}
              onClick={() => setOutcomeFilter(f)}
              className={cn("px-3 py-1.5 text-sm rounded-md transition-colors",
                outcomeFilter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {f === "all" ? "All Outcomes" : OUTCOME_LABELS[f]?.label || f}
            </button>
          ))}
        </div>
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
            const voice = isVoice(conv);
            const outcomeCfg = OUTCOME_LABELS[conv.outcome] || OUTCOME_LABELS.none;
            const statusCfg = voice ? (STATUS_LABELS[conv.voiceAgent?.callStatus || ""] || null) : null;
            const isExpanded = expandedId === conv._id;
            const duration = conv.voiceAgent?.durationSeconds || 0;
            const hasMessages = Array.isArray(conv.messages) && conv.messages.length > 0;

            return (
              <div key={conv._id} className="bg-white rounded-xl border overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : conv._id)}
                  className="w-full text-left p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors"
                >
                  <div className={cn("h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                    voice ? (conv.voiceAgent?.callStatus === "completed" ? "bg-green-100" : "bg-gray-100") : "bg-primary/10"
                  )}>
                    {voice ? (
                      conv.voiceAgent?.callStatus === "completed" ? <Phone className="h-5 w-5 text-green-600" /> : <PhoneOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <MessageSquare className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {conv.projectBrief?.clientName || conv.projectBrief?.clientEmail || conv.sessionId.slice(0, 16)}
                      </p>
                      <span className={cn("text-xs px-2 py-0.5 rounded font-medium", outcomeCfg.color)}>
                        {outcomeCfg.label}
                      </span>
                      {statusCfg && (
                        <span className={cn("text-xs px-2 py-0.5 rounded font-medium", statusCfg.color)}>
                          {statusCfg.label}
                        </span>
                      )}
                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded capitalize">{voice ? "Voice" : "Chat"}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {voice && (
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDuration(duration)}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(conv.createdAt).toLocaleDateString()}
                      </span>
                      <span>{hasMessages ? Math.max(conv.messageCount, conv.messages.length) : conv.messageCount} messages</span>
                      {conv.projectBrief?.projectType && (
                        <span className="bg-muted px-1.5 py-0.5 rounded">{conv.projectBrief.projectType}</span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className={cn("h-4 w-4 text-muted-foreground transition-transform", isExpanded && "rotate-90")} />
                </button>

                {isExpanded && (
                  <div className="border-t p-4 space-y-4">
                    {/* Voice Agent Summary */}
                    {voice && conv.voiceAgent?.summary && (
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-xs font-medium text-blue-700 mb-1">SUMMARY</p>
                        <p className="text-sm text-blue-900">{conv.voiceAgent.summary}</p>
                      </div>
                    )}

                    {/* Project Brief */}
                    {conv.projectBrief && (conv.projectBrief.clientName || conv.projectBrief.clientEmail) && (
                      <div className="bg-muted/30 rounded-lg p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2">CLIENT INFO</p>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {conv.projectBrief.clientName && <div><span className="text-muted-foreground">Name:</span> {conv.projectBrief.clientName}</div>}
                          {conv.projectBrief.clientEmail && <div><span className="text-muted-foreground">Email:</span> {conv.projectBrief.clientEmail}</div>}
                          {conv.projectBrief.clientPhone && <div><span className="text-muted-foreground">Phone:</span> {conv.projectBrief.clientPhone}</div>}
                          {conv.projectBrief.budget && <div><span className="text-muted-foreground">Budget:</span> {conv.projectBrief.budget}</div>}
                          {conv.projectBrief.timeline && <div><span className="text-muted-foreground">Timeline:</span> {conv.projectBrief.timeline}</div>}
                        </div>
                        {conv.projectBrief.features && conv.projectBrief.features.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {conv.projectBrief.features.map((f, i) => (
                              <span key={i} className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">{f}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Voice Transcript — only when no structured messages exist */}
                    {voice && !hasMessages && conv.voiceAgent?.transcript && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">TRANSCRIPT</p>
                        <div className="bg-muted/20 rounded-lg p-3 max-h-[300px] overflow-y-auto">
                          <pre className="text-sm whitespace-pre-wrap font-sans">{conv.voiceAgent.transcript}</pre>
                        </div>
                      </div>
                    )}

                    {/* Messages — rendered for both chat AND voice conversations */}
                    {hasMessages && (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {conv.messages.map((msg, i) => (
                          <div key={i} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
                            <div className={cn("max-w-[70%] rounded-lg px-3 py-2 text-sm",
                              msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                            )}>
                              <div className="flex items-center gap-1 mb-1">
                                {msg.role === "user" ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                                <span className="text-xs opacity-70">
                                  {msg.role === "user" ? "Caller" : "Agent"}
                                  {" · "}
                                  {new Date(msg.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Explicit empty-content diagnostic (only when truly nothing was captured) */}
                    {!hasMessages && (!conv.voiceAgent?.transcript) && (
                      <div className="bg-muted/30 rounded-lg p-4 text-center">
                        <p className="text-sm text-muted-foreground">No transcript captured for this call.</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          The voice provider may not have returned a transcript{conv.voiceAgent?.callStatus && conv.voiceAgent.callStatus !== "completed" ? ` (call status: ${conv.voiceAgent.callStatus})` : ""}.
                        </p>
                      </div>
                    )}

                    {/* Links */}
                    <div className="flex items-center gap-3 text-sm pt-2 border-t">
                      {conv.projectId && (
                        <Link href={`/dashboard/projects/${conv.projectId}/edit`} className="flex items-center gap-1 text-green-700 hover:underline font-medium">
                          <FolderKanban className="h-3 w-3" /> View Project
                        </Link>
                      )}
                      {conv.inquiryId && (
                        <Link href="/dashboard/crm/inquiries" className="flex items-center gap-1 text-primary hover:underline">
                          <Eye className="h-3 w-3" /> View Inquiry
                        </Link>
                      )}
                      <span className="text-muted-foreground text-xs ml-auto">Session: {conv.sessionId.slice(0, 20)}...</span>
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
