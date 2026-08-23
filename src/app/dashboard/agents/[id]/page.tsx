"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Bot, ArrowLeft, Settings, MessageSquare, Activity, BarChart3,
  Play, Pause, Trash2, Copy, Globe, Mail, Phone, Headphones,
  Zap, Shield, Clock, Users, TrendingUp, AlertTriangle,
} from "lucide-react";

interface AgentDetail {
  _id: string;
  name: string;
  slug: string;
  description: string;
  type: string;
  role: string;
  status: string;
  avatar?: string;
  personality?: { tone: string; language: string; maxResponseLength?: number };
  systemPrompt: string;
  instructions: string[];
  aiModel: string;
  temperature: number;
  maxTokens: number;
  skills: { _id: string; name: string; category: string }[];
  tools: { _id: string; name: string; type: string }[];
  hooks: { _id: string; name: string; type: string }[];
  memory: { type: string; maxItems?: number };
  guardrails: {
    blockedTopics: string[];
    maxConversationLength: number;
    requireApproval: boolean;
    contentFilter: boolean;
    fallbackMessage?: string;
  };
  channels: Record<string, boolean>;
  integrations: Record<string, boolean>;
  isClientFacing: boolean;
  isMasterAgent: boolean;
  stats: {
    totalConversations: number;
    totalMessages: number;
    satisfactionScore: number;
    conversionRate: number;
    lastActive?: string;
    avgResponseTime: number;
    resolutionRate: number;
  };
  createdAt: string;
}

export default function AgentDetailPage() {
  const params = useParams();
  const agentId = params.id as string;
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchAgent();
  }, [agentId]);

  const fetchAgent = async () => {
    try {
      const res = await fetch(`/api/agents/${agentId}`);
      const data = await res.json();
      setAgent(data.agent);
    } catch {
      console.error("Failed to fetch agent");
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async () => {
    if (!agent) return;
    const newStatus = agent.status === "active" ? "inactive" : "active";
    try {
      await fetch(`/api/agents/${agent._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      setAgent({ ...agent, status: newStatus });
    } catch {
      console.error("Failed to toggle status");
    }
  };

  const deleteAgent = async () => {
    if (!agent || !confirm("Delete this agent? This cannot be undone.")) return;
    try {
      await fetch(`/api/agents/${agent._id}`, { method: "DELETE" });
      window.location.href = "/dashboard/agents";
    } catch {
      console.error("Failed to delete agent");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Agent not found</p>
        <Link href="/dashboard/agents" className="text-violet-600 hover:underline mt-2 inline-block">
          Back to agents
        </Link>
      </div>
    );
  }

  const tabs = [
    { id: "overview", label: "Overview", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "config", label: "Configuration", icon: <Settings className="w-4 h-4" /> },
    { id: "channels", label: "Channels", icon: <Globe className="w-4 h-4" /> },
    { id: "guardrails", label: "Guardrails", icon: <Shield className="w-4 h-4" /> },
    { id: "stats", label: "Statistics", icon: <TrendingUp className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/agents" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{agent.name}</h1>
            <p className="text-sm text-gray-500">{agent.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/agents/${agent._id}/test`}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            Test Agent
          </Link>
          <button
            onClick={toggleStatus}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {agent.status === "active" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {agent.status === "active" ? "Pause" : "Activate"}
          </button>
          <button
            onClick={deleteAgent}
            className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-violet-600 text-violet-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-100 rounded-lg">
                <MessageSquare className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Conversations</p>
                <p className="text-2xl font-bold">{agent.stats?.totalConversations || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Messages</p>
                <p className="text-2xl font-bold">{agent.stats?.totalMessages || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Satisfaction</p>
                <p className="text-2xl font-bold">{agent.stats?.satisfactionScore || 0}%</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Zap className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Conversion Rate</p>
                <p className="text-2xl font-bold">{agent.stats?.conversionRate || 0}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "config" && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">System Prompt</h3>
            <pre className="text-sm text-gray-700 bg-gray-50 rounded-lg p-4 whitespace-pre-wrap font-mono">
              {agent.systemPrompt}
            </pre>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500 mb-1">Model</p>
              <p className="font-medium">{agent.aiModel}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500 mb-1">Temperature</p>
              <p className="font-medium">{agent.temperature}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500 mb-1">Max Tokens</p>
              <p className="font-medium">{agent.maxTokens}</p>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500 mb-2">Skills ({agent.skills?.length || 0})</p>
            <div className="flex flex-wrap gap-2">
              {agent.skills?.map((s) => (
                <span key={s._id} className="px-2 py-1 bg-violet-100 text-violet-700 text-xs rounded-full">
                  {s.name}
                </span>
              ))}
              {(!agent.skills || agent.skills.length === 0) && (
                <span className="text-sm text-gray-400">No skills assigned</span>
              )}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500 mb-2">Tools ({agent.tools?.length || 0})</p>
            <div className="flex flex-wrap gap-2">
              {agent.tools?.map((t) => (
                <span key={t._id} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                  {t.name}
                </span>
              ))}
              {(!agent.tools || agent.tools.length === 0) && (
                <span className="text-sm text-gray-400">No tools assigned</span>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "channels" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(agent.channels || {}).map(([channel, enabled]) => (
            <div
              key={channel}
              className={`bg-white rounded-lg border p-4 ${enabled ? "border-emerald-200" : "border-gray-200 opacity-50"}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {channel === "website" && <Globe className="w-5 h-5 text-violet-600" />}
                  {channel === "whatsapp" && <Phone className="w-5 h-5 text-emerald-600" />}
                  {channel === "email" && <Mail className="w-5 h-5 text-blue-600" />}
                  {channel === "api" && <Zap className="w-5 h-5 text-amber-600" />}
                  {channel === "dashboard" && <Settings className="w-5 h-5 text-gray-600" />}
                  {channel === "voice" && <Headphones className="w-5 h-5 text-rose-600" />}
                  <span className="capitalize font-medium">{channel}</span>
                </div>
                <span className={`w-3 h-3 rounded-full ${enabled ? "bg-emerald-500" : "bg-gray-300"}`} />
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "guardrails" && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Guardrails Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Max Conversation Length</p>
                <p className="font-medium">{agent.guardrails?.maxConversationLength || 100} messages</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Require Approval</p>
                <p className="font-medium">{agent.guardrails?.requireApproval ? "Yes" : "No"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Content Filter</p>
                <p className="font-medium">{agent.guardrails?.contentFilter ? "Enabled" : "Disabled"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Blocked Topics</p>
                <p className="font-medium">{agent.guardrails?.blockedTopics?.length || 0} topics</p>
              </div>
            </div>
            {agent.guardrails?.fallbackMessage && (
              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-1">Fallback Message</p>
                <p className="text-sm bg-gray-50 rounded-lg p-3">{agent.guardrails.fallbackMessage}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "stats" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Performance</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Avg Response Time</span>
                <span className="font-medium">{agent.stats?.avgResponseTime || 0}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Resolution Rate</span>
                <span className="font-medium">{agent.stats?.resolutionRate || 0}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Last Active</span>
                <span className="font-medium">
                  {agent.stats?.lastActive
                    ? new Date(agent.stats.lastActive).toLocaleDateString()
                    : "Never"}
                </span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Memory</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Memory Type</span>
                <span className="font-medium capitalize">{agent.memory?.type || "none"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Max Items</span>
                <span className="font-medium">{agent.memory?.maxItems || 0}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
