"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bot, Plus, Search, Filter, MoreHorizontal, Play, Pause, Trash2,
  MessageSquare, Zap, Settings, ChevronRight, Activity, Users, BarChart3,
  Star, Globe, Mail, Phone, Headphones,
} from "lucide-react";

interface Agent {
  _id: string;
  name: string;
  slug: string;
  description: string;
  type: string;
  role: string;
  status: string;
  isClientFacing: boolean;
  isMasterAgent: boolean;
  channels: Record<string, boolean>;
  stats: {
    totalConversations: number;
    totalMessages: number;
    satisfactionScore: number;
    conversionRate: number;
    lastActive?: string;
  };
  aiModel: string;
  createdAt: string;
}

const roleIcons: Record<string, React.ReactNode> = {
  sales: <Star className="w-4 h-4" />,
  support: <Headphones className="w-4 h-4" />,
  technical: <Settings className="w-4 h-4" />,
  marketing: <BarChart3 className="w-4 h-4" />,
  operations: <Zap className="w-4 h-4" />,
  custom: <Bot className="w-4 h-4" />,
};

const statusColors: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  inactive: "bg-gray-100 text-gray-600 border-gray-200",
  draft: "bg-amber-100 text-amber-700 border-amber-200",
  testing: "bg-blue-100 text-blue-700 border-blue-200",
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRole, setFilterRole] = useState("all");

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const res = await fetch("/api/agents", { credentials: "include" });
      if (!res.ok) {
        console.error("Agents API error:", res.status, await res.text());
        setAgents([]);
        return;
      }
      const data = await res.json();
      setAgents(data.agents || []);
    } catch (e) {
      console.error("Failed to fetch agents", e);
    } finally {
      setLoading(false);
    }
  };

  const filteredAgents = agents.filter((agent) => {
    const matchesSearch = agent.name.toLowerCase().includes(search.toLowerCase()) ||
      agent.description.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "all" || agent.status === filterStatus;
    const matchesRole = filterRole === "all" || agent.role === filterRole;
    return matchesSearch && matchesStatus && matchesRole;
  });

  const toggleStatus = async (agent: Agent) => {
    const newStatus = agent.status === "active" ? "inactive" : "active";
    try {
      await fetch(`/api/agents/${agent._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      setAgents(agents.map((a) => a._id === agent._id ? { ...a, status: newStatus } : a));
    } catch {
      console.error("Failed to toggle agent status");
    }
  };

  const deleteAgent = async (id: string) => {
    if (!confirm("Are you sure you want to delete this agent?")) return;
    try {
      await fetch(`/api/agents/${id}`, { method: "DELETE" });
      setAgents(agents.filter((a) => a._id !== id));
    } catch {
      console.error("Failed to delete agent");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Agents</h1>
          <p className="text-sm text-gray-500">Manage your AI agents, tools, and automations</p>
        </div>
        <Link
          href="/dashboard/agents/new"
          className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Agent
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 rounded-lg">
              <Bot className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Agents</p>
              <p className="text-2xl font-bold">{agents.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Activity className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active</p>
              <p className="text-2xl font-bold">{agents.filter((a) => a.status === "active").length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Conversations</p>
              <p className="text-2xl font-bold">{agents.reduce((sum, a) => sum + (a.stats?.totalConversations || 0), 0)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Users className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Client Facing</p>
              <p className="text-2xl font-bold">{agents.filter((a) => a.isClientFacing).length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search agents..."
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
            <option value="inactive">Inactive</option>
            <option value="draft">Draft</option>
            <option value="testing">Testing</option>
          </select>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="all">All Roles</option>
            <option value="sales">Sales</option>
            <option value="support">Support</option>
            <option value="technical">Technical</option>
            <option value="marketing">Marketing</option>
            <option value="operations">Operations</option>
            <option value="custom">Custom</option>
          </select>
        </div>
      </div>

      {/* Agent List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Bot className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No agents found</p>
          <Link
            href="/dashboard/agents/new"
            className="mt-4 inline-flex items-center gap-2 text-violet-600 hover:text-violet-700"
          >
            <Plus className="w-4 h-4" />
            Create your first agent
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAgents.map((agent) => (
            <div
              key={agent._id}
              className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center text-violet-600">
                    {roleIcons[agent.role] || <Bot className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                    <p className="text-xs text-gray-500 capitalize">{agent.role} Agent</p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full border ${statusColors[agent.status] || ""}`}>
                  {agent.status}
                </span>
              </div>

              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{agent.description || "No description"}</p>

              <div className="flex items-center gap-2 mb-4">
                {agent.isMasterAgent && (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">Master</span>
                )}
                {agent.isClientFacing && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">Client-facing</span>
                )}
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{agent.aiModel}</span>
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                <div className="flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5" />
                  {agent.stats?.totalConversations || 0} convos
                </div>
                <div className="flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5" />
                  {Object.entries(agent.channels || {}).filter(([, v]) => v).length} channels
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/dashboard/agents/${agent._id}`}
                  className="flex-1 text-center px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Details
                </Link>
                <Link
                  href={`/dashboard/agents/${agent._id}/test`}
                  className="flex-1 text-center px-3 py-1.5 text-sm bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200 transition-colors"
                >
                  Test
                </Link>
                <button
                  onClick={() => toggleStatus(agent)}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {agent.status === "active" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => deleteAgent(agent._id)}
                  className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
