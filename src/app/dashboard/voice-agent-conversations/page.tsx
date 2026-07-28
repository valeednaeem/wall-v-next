"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2, Phone, Clock, User, Bot, ArrowRight,
  Filter, TrendingUp, Eye, Calendar, PhoneCall, PhoneOff,
  Search, Play
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface VoiceConversation {
  _id: string;
  sessionId: string;
  agentType: string;
  channel: string;
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

export default function VoiceAgentConversationsPage() {
  const [conversations, setConversations] = useState<VoiceConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/conversations");
      const data = await res.json();
      // Filter to only voice agent conversations
      const voiceConvs = (data.conversations || []).filter(
        (c: VoiceConversation) => c.channel === "voice" || c.agentType === "voice-agent"
      );
      setConversations(voiceConvs);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  const filtered = conversations.filter((c) => {
    if (filter !== "all" && c.outcome !== filter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        c.sessionId.toLowerCase().includes(term) ||
        c.voiceAgent?.transcript?.toLowerCase().includes(term) ||
        c.voiceAgent?.summary?.toLowerCase().includes(term) ||
        c.projectBrief?.clientName?.toLowerCase().includes(term) ||
        c.projectBrief?.clientEmail?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const stats = {
    total: conversations.length,
    completed: conversations.filter((c) => c.voiceAgent?.callStatus === "completed").length,
    totalDuration: conversations.reduce((sum, c) => sum + (c.voiceAgent?.durationSeconds || 0), 0),
    converted: conversations.filter((c) => c.outcome !== "none").length,
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
        <h1 className="text-3xl font-bold">Voice Agent Calls</h1>
        <p className="text-muted-foreground mt-1">Manage conversations from the Dograh voice agent</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2">
            <PhoneCall className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Total Calls</p>
          </div>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-green-600" />
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Total Talk Time</p>
          </div>
          <p className="text-2xl font-bold">{formatDuration(stats.totalDuration)}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Conversion Rate</p>
          </div>
          <p className="text-2xl font-bold text-primary">{stats.conversionRate}%</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search transcripts, names..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
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

      {/* Calls List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <PhoneCall className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No voice calls recorded yet</p>
          <p className="text-sm mt-1">Calls from the Dograh voice agent will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((conv) => {
            const outcomeCfg = OUTCOME_LABELS[conv.outcome] || OUTCOME_LABELS.none;
            const statusCfg = STATUS_LABELS[conv.voiceAgent?.callStatus || ""] || null;
            const isExpanded = expandedId === conv._id;
            const duration = conv.voiceAgent?.durationSeconds || 0;

            return (
              <div key={conv._id} className="bg-white rounded-xl border overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : conv._id)}
                  className="w-full text-left p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors"
                >
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                    conv.voiceAgent?.callStatus === "completed" ? "bg-green-100" : "bg-gray-100"
                  }`}>
                    {conv.voiceAgent?.callStatus === "completed" ? (
                      <Phone className="h-5 w-5 text-green-600" />
                    ) : (
                      <PhoneOff className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {conv.projectBrief?.clientName || conv.projectBrief?.clientEmail || conv.sessionId.slice(0, 16)}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${outcomeCfg.color}`}>
                        {outcomeCfg.label}
                      </span>
                      {statusCfg && (
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(duration)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(conv.createdAt).toLocaleDateString()} {new Date(conv.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {conv.messageCount > 0 && (
                        <span>{conv.messageCount} messages</span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                </button>

                {isExpanded && (
                  <div className="border-t p-4 space-y-4">
                    {/* Summary */}
                    {conv.voiceAgent?.summary && (
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-xs font-medium text-blue-700 mb-1">SUMMARY</p>
                        <p className="text-sm text-blue-900">{conv.voiceAgent.summary}</p>
                      </div>
                    )}

                    {/* Caller Info */}
                    {conv.projectBrief && (conv.projectBrief.clientName || conv.projectBrief.clientEmail) && (
                      <div className="bg-muted/30 rounded-lg p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2">CALLER INFO</p>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {conv.projectBrief.clientName && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3 text-muted-foreground" />
                              {conv.projectBrief.clientName}
                            </div>
                          )}
                          {conv.projectBrief.clientEmail && (
                            <div>{conv.projectBrief.clientEmail}</div>
                          )}
                          {conv.projectBrief.clientPhone && (
                            <div>{conv.projectBrief.clientPhone}</div>
                          )}
                          {conv.projectBrief.budget && (
                            <div>Budget: {conv.projectBrief.budget}</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Transcript */}
                    {conv.voiceAgent?.transcript && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">FULL TRANSCRIPT</p>
                        <div className="bg-muted/20 rounded-lg p-3 max-h-[300px] overflow-y-auto">
                          <pre className="text-sm whitespace-pre-wrap font-sans">{conv.voiceAgent.transcript}</pre>
                        </div>
                      </div>
                    )}

                    {/* Messages */}
                    {conv.messages.length > 0 && !conv.voiceAgent?.transcript && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">MESSAGES</p>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                          {conv.messages.map((msg, i) => (
                            <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                              <div className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                                msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
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
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-3 text-sm pt-2 border-t">
                      {conv.inquiryId && (
                        <a href={`/dashboard/crm/inquiries`} className="flex items-center gap-1 text-primary hover:underline">
                          <Eye className="h-3 w-3" /> View Inquiry
                        </a>
                      )}
                      <span className="text-muted-foreground text-xs ml-auto">
                        Session: {conv.sessionId.slice(0, 20)}...
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
