"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MessageSquare, Search, Filter, Bot, Clock, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

interface Conversation {
  _id: string;
  agent: { name: string; slug: string; role: string };
  sessionId: string;
  channel: string;
  status: string;
  outcome: string;
  sentiment?: string;
  messageCount: number;
  startedAt: string;
  endedAt?: string;
}

const statusIcons: Record<string, React.ReactNode> = {
  active: <Clock className="w-4 h-4 text-blue-500" />,
  ended: <CheckCircle className="w-4 h-4 text-emerald-500" />,
  escalated: <AlertTriangle className="w-4 h-4 text-amber-500" />,
  archived: <XCircle className="w-4 h-4 text-gray-400" />,
};

const channelColors: Record<string, string> = {
  website: "bg-violet-100 text-violet-700",
  whatsapp: "bg-emerald-100 text-emerald-700",
  email: "bg-blue-100 text-blue-700",
  api: "bg-amber-100 text-amber-700",
  dashboard: "bg-gray-100 text-gray-700",
  voice: "bg-rose-100 text-rose-700",
};

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterChannel, setFilterChannel] = useState("all");

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/agents/conversations");
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch {
      console.error("Failed to fetch conversations");
    } finally {
      setLoading(false);
    }
  };

  const filtered = conversations.filter((c) => {
    const matchesSearch = c.agent?.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.sessionId.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "all" || c.status === filterStatus;
    const matchesChannel = filterChannel === "all" || c.channel === filterChannel;
    return matchesSearch && matchesStatus && matchesChannel;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Agent Conversations</h1>
        <p className="text-sm text-gray-500">View all agent conversations across channels</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="ended">Ended</option>
            <option value="escalated">Escalated</option>
            <option value="archived">Archived</option>
          </select>
          <select
            value={filterChannel}
            onChange={(e) => setFilterChannel(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="all">All Channels</option>
            <option value="website">Website</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
            <option value="api">API</option>
            <option value="dashboard">Dashboard</option>
            <option value="voice">Voice</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No conversations found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Channel</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Outcome</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Messages</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Started</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((conv) => (
                <tr key={conv._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-violet-500" />
                      <span className="text-sm font-medium">{conv.agent?.name || "Unknown"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${channelColors[conv.channel] || ""}`}>
                      {conv.channel}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {statusIcons[conv.status]}
                      <span className="text-sm capitalize">{conv.status}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 capitalize">{conv.outcome?.replace(/-/g, " ") || "none"}</td>
                  <td className="px-4 py-3 text-sm">{conv.messageCount}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(conv.startedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
