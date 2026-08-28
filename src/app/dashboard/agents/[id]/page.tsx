"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Bot, ArrowLeft, Settings, MessageSquare, Activity, BarChart3,
  Play, Pause, Trash2, Globe, Mail, Phone, Headphones,
  Zap, Shield, Users, TrendingUp, AlertTriangle, Wrench,
  CheckCircle2, XCircle, Workflow, History, Loader2, Search
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AgentDetail {
  _id: string;
  name: string;
  slug: string;
  description: string;
  type: string;
  role: string;
  status: string;
  version: number;
  avatar?: string;
  personality?: { tone: string; language: string; maxResponseLength?: number };
  systemPrompt: string;
  instructions: string[];
  aiModel: string;
  temperature: number;
  maxTokens: number;
  skills: { _id: string; name: string; category: string; status: string }[];
  tools: { _id: string; name: string; type: string; category: string; isWriteOperation: boolean; riskLevel: string }[];
  hooks: { _id: string; name: string; type: string }[];
  workflows: { _id: string; name: string; status: string }[];
  memory: { type: string; maxItems?: number };
  guardrails: {
    blockedTopics: string[];
    maxConversationLength: number;
    requireApproval: boolean;
    contentFilter: boolean;
    fallbackMessage?: string;
  };
  channels: Record<string, boolean>;
  contexts: Record<string, boolean>;
  permissions: string[];
  integrations: Record<string, boolean>;
  isClientFacing: boolean;
  isMasterAgent: boolean;
  masterConfig?: { orchestrates: { _id: string; name: string }[] };
  triggerTypes: string[];
  versionHistory: { version: number; changedBy?: { name: string }; changedAt: string; changes: string }[];
  stats: {
    totalConversations: number;
    totalMessages: number;
    satisfactionScore: number;
    conversionRate: number;
    lastActive?: string;
    avgResponseTime: number;
    resolutionRate: number;
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
  };
  createdAt: string;
}

const tabs = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "skills", label: "Skills", icon: Zap },
  { id: "tools", label: "Tools", icon: Wrench },
  { id: "permissions", label: "Permissions", icon: Shield },
  { id: "contexts", label: "Contexts", icon: Users },
  { id: "channels", label: "Channels", icon: Globe },
  { id: "workflows", label: "Workflows", icon: Workflow },
  { id: "conversations", label: "Conversations", icon: MessageSquare },
  { id: "executions", label: "Executions", icon: Activity },
  { id: "approvals", label: "Approvals", icon: CheckCircle2 },
  { id: "versions", label: "Versions", icon: History },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function AgentDetailPage() {
  const params = useParams();
  const agentId = params.id as string;
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<AgentDetail>>({});
  const [saving, setSaving] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [executions, setExecutions] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);

  useEffect(() => { fetchAgent(); }, [agentId]);

  useEffect(() => {
    if (activeTab === "conversations") fetchConversations();
    if (activeTab === "executions") fetchExecutions();
    if (activeTab === "approvals") fetchApprovals();
  }, [activeTab]);

  const fetchAgent = async () => {
    try {
      const res = await fetch(`/api/agents/${agentId}`);
      const data = await res.json();
      setAgent(data.agent);
    } catch { console.error("Failed to fetch agent"); } finally { setLoading(false); }
  };

  const fetchConversations = async () => {
    try {
      const res = await fetch(`/api/agents/conversations?agentId=${agentId}&limit=20`);
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch { console.error("Failed to fetch conversations"); }
  };

  const fetchExecutions = async () => {
    try {
      const res = await fetch(`/api/agents/audit-logs?agentId=${agentId}&limit=20`);
      const data = await res.json();
      setExecutions(data.logs || []);
    } catch { console.error("Failed to fetch executions"); }
  };

  const fetchApprovals = async () => {
    try {
      const res = await fetch(`/api/agents/approvals?agentId=${agentId}&limit=20`);
      const data = await res.json();
      setApprovals(data.approvals || []);
    } catch { console.error("Failed to fetch approvals"); }
  };

  const toggleStatus = async () => {
    if (!agent) return;
    const newStatus = agent.status === "active" ? "inactive" : "active";
    await fetch(`/api/agents/${agent._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
    setAgent({ ...agent, status: newStatus });
  };

  const deleteAgent = async () => {
    if (!agent || !confirm("Delete this agent?")) return;
    await fetch(`/api/agents/${agent._id}`, { method: "DELETE" });
    window.location.href = "/dashboard/agents";
  };

  const startEdit = () => {
    if (!agent) return;
    setEditForm({
      name: agent.name,
      description: agent.description,
      systemPrompt: agent.systemPrompt,
      aiModel: agent.aiModel,
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
      type: agent.type,
      role: agent.role,
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!agent) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/agents/${agent._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        const data = await res.json();
        setAgent(data.agent || { ...agent, ...editForm });
        setEditing(false);
      }
    } catch { console.error("Failed to save"); } finally { setSaving(false); }
  };

  const cancelEdit = () => { setEditing(false); setEditForm({}); };

  if (loading) return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!agent) return <div className="text-center py-12"><AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-4" /><p>Agent not found</p><Link href="/dashboard/agents" className="text-primary hover:underline">Back to agents</Link></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/agents" className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{agent.name}</h1>
              <span className={cn("text-xs px-2 py-0.5 rounded", agent.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600")}>{agent.status}</span>
              <span className="text-xs text-muted-foreground">v{agent.version}</span>
            </div>
            <p className="text-sm text-muted-foreground">{agent.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/agents/${agent._id}/test`} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm">
            <MessageSquare className="w-4 h-4" />Test
          </Link>
          <button onClick={editing ? cancelEdit : startEdit} className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-accent text-sm">
            <Settings className="w-4 h-4" />
            {editing ? "Cancel Edit" : "Edit"}
          </button>
          <button onClick={toggleStatus} className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-accent text-sm">
            {agent.status === "active" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {agent.status === "active" ? "Deactivate" : "Activate"}
          </button>
          <button onClick={deleteAgent} className="flex items-center gap-2 px-4 py-2 text-destructive border border-destructive/20 rounded-lg hover:bg-destructive/10 text-sm">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn("flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors",
              activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Conversations", value: agent.stats?.totalConversations || 0, icon: MessageSquare, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Messages", value: agent.stats?.totalMessages || 0, icon: Activity, color: "text-green-600", bg: "bg-green-50" },
              { label: "Executions", value: agent.stats?.totalExecutions || 0, icon: Zap, color: "text-purple-600", bg: "bg-purple-50" },
              { label: "Satisfaction", value: `${agent.stats?.satisfactionScore || 0}%`, icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-xl border p-4">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", stat.bg)}><stat.icon className={cn("w-5 h-5", stat.color)} /></div>
                  <div><p className="text-xs text-muted-foreground">{stat.label}</p><p className="text-2xl font-bold">{stat.value}</p></div>
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border p-4">
              <h3 className="font-semibold mb-3">System Prompt</h3>
              {editing ? (
                <div className="space-y-3">
                  <textarea value={editForm.systemPrompt || ""} onChange={(e) => setEditForm({ ...editForm, systemPrompt: e.target.value })}
                    className="w-full rounded-lg border bg-muted/50 p-3 text-xs font-mono min-h-[200px]" />
                  <div className="flex gap-2">
                    <button onClick={saveEdit} disabled={saving}
                      className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50">
                      {saving ? <Loader2 className="h-3 w-3 animate-spin inline" /> : "Save"}
                    </button>
                    <button onClick={cancelEdit} className="px-3 py-1.5 text-xs border rounded-lg hover:bg-muted">Cancel</button>
                  </div>
                </div>
              ) : (
                <pre className="text-xs bg-muted rounded-lg p-3 whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">{agent.systemPrompt}</pre>
              )}
            </div>
            <div className="bg-white rounded-xl border p-4 space-y-3">
              <h3 className="font-semibold mb-3">Configuration</h3>
              {[
                ["Name", agent.name, "name"],
                ["Description", agent.description, "description"],
                ["Model", agent.aiModel, "aiModel"],
                ["Temperature", agent.temperature, "temperature"],
                ["Max Tokens", agent.maxTokens, "maxTokens"],
                ["Type", agent.type, "type"],
                ["Role", agent.role, "role"],
                ["Client Facing", agent.isClientFacing ? "Yes" : "No", null],
                ["Master Agent", agent.isMasterAgent ? "Yes" : "No", null],
              ].map(([label, value, field]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  {editing && field ? (
                    field === "temperature" || field === "maxTokens" ? (
                      <input type="number" value={String(editForm[field as keyof AgentDetail] ?? value)}
                        onChange={(e) => setEditForm({ ...editForm, [field]: Number(e.target.value) })}
                        className="w-24 rounded border bg-background px-2 py-0.5 text-xs text-right" />
                    ) : field === "type" ? (
                      <select value={String(editForm[field] ?? value)}
                        onChange={(e) => setEditForm({ ...editForm, [field]: e.target.value })}
                        className="rounded border bg-background px-2 py-0.5 text-xs">
                        <option value="conversational">Conversational</option>
                        <option value="task">Task</option>
                        <option value="hybrid">Hybrid</option>
                      </select>
                    ) : field === "role" ? (
                      <select value={String(editForm[field] ?? value)}
                        onChange={(e) => setEditForm({ ...editForm, [field]: e.target.value })}
                        className="rounded border bg-background px-2 py-0.5 text-xs">
                        <option value="sales">Sales</option>
                        <option value="support">Support</option>
                        <option value="technical">Technical</option>
                        <option value="marketing">Marketing</option>
                        <option value="operations">Operations</option>
                        <option value="custom">Custom</option>
                      </select>
                    ) : (
                      <input type="text" value={String(editForm[field as keyof AgentDetail] ?? value)}
                        onChange={(e) => setEditForm({ ...editForm, [field]: e.target.value })}
                        className="w-48 rounded border bg-background px-2 py-0.5 text-xs" />
                    )
                  ) : (
                    <span className="font-medium">{String(value)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Skills Tab */}
      {activeTab === "skills" && (
        <SkillAssignmentTab agentId={agent._id} agentSkills={agent.skills || []} onUpdate={fetchAgent} />
      )}

      {/* Tools Tab */}
      {activeTab === "tools" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{agent.tools?.length || 0} tools assigned</p>
          {agent.tools?.length ? (
            <div className="space-y-2">
              {agent.tools.map((tool) => (
                <div key={tool._id} className="bg-white rounded-xl border p-4 flex items-center gap-4">
                  <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", tool.isWriteOperation ? "bg-orange-100" : "bg-blue-100")}>
                    {tool.isWriteOperation ? <AlertTriangle className="h-5 w-5 text-orange-600" /> : <Wrench className="h-5 w-5 text-blue-600" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{tool.name}</p>
                    <p className="text-xs text-muted-foreground">{tool.category} - {tool.type}</p>
                  </div>
                  <span className={cn("text-xs px-2 py-0.5 rounded", tool.riskLevel === "high" || tool.riskLevel === "critical" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600")}>{tool.riskLevel}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-muted-foreground text-sm">No tools assigned</p>}
        </div>
      )}

      {/* Permissions Tab */}
      {activeTab === "permissions" && (
        <div className="bg-white rounded-xl border p-4">
          <h3 className="font-semibold mb-3">Required Permissions</h3>
          {agent.permissions?.length ? (
            <div className="flex flex-wrap gap-2">
              {agent.permissions.map((p, i) => (
                <span key={i} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded flex items-center gap-1"><Shield className="h-3 w-3" />{p}</span>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground">No special permissions required</p>}
          {agent.guardrails?.requireApproval && (
            <div className="mt-4 p-3 bg-amber-50 rounded-lg"><p className="text-sm text-amber-700">This agent requires approval for sensitive actions</p></div>
          )}
        </div>
      )}

      {/* Contexts Tab */}
      {activeTab === "contexts" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(agent.contexts || {}).map(([ctx, enabled]) => (
            <div key={ctx} className={cn("bg-white rounded-xl border p-4 text-center", !enabled && "opacity-50")}>
              <div className={cn("h-10 w-10 rounded-full mx-auto mb-2 flex items-center justify-center", enabled ? "bg-green-100" : "bg-gray-100")}>
                {enabled ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-gray-400" />}
              </div>
              <p className="text-sm font-medium capitalize">{ctx}</p>
              <p className="text-xs text-muted-foreground">{enabled ? "Enabled" : "Disabled"}</p>
            </div>
          ))}
        </div>
      )}

      {/* Channels Tab */}
      {activeTab === "channels" && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(agent.channels || {}).map(([ch, enabled]) => (
            <div key={ch} className={cn("bg-white rounded-xl border p-4", !enabled && "opacity-50")}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {ch === "website" && <Globe className="w-5 h-5 text-violet-600" />}
                  {ch === "whatsapp" && <Phone className="w-5 h-5 text-green-600" />}
                  {ch === "email" && <Mail className="w-5 h-5 text-blue-600" />}
                  {ch === "api" && <Zap className="w-5 h-5 text-amber-600" />}
                  {ch === "dashboard" && <Settings className="w-5 h-5 text-gray-600" />}
                  {ch === "voice" && <Headphones className="w-5 h-5 text-rose-600" />}
                  <span className="capitalize font-medium text-sm">{ch}</span>
                </div>
                <span className={cn("w-3 h-3 rounded-full", enabled ? "bg-green-500" : "bg-gray-300")} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Workflows Tab */}
      {activeTab === "workflows" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{agent.workflows?.length || 0} workflows</p>
          {agent.masterConfig?.orchestrates?.length ? (
            <div className="bg-white rounded-xl border p-4">
              <h3 className="font-semibold mb-3">Orchestrated Agents</h3>
              <div className="space-y-2">
                {agent.masterConfig.orchestrates.map((a) => (
                  <div key={a._id} className="flex items-center gap-2 text-sm">
                    <Bot className="h-4 w-4 text-primary" /><span>{a.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="text-muted-foreground text-sm">No workflows configured</p>}
        </div>
      )}

      {/* Conversations Tab */}
      {activeTab === "conversations" && (
        <div className="bg-white rounded-xl border overflow-hidden">
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground"><MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" /><p>No conversations yet</p></div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr>
                <th className="text-left p-3 font-medium">Visitor</th>
                <th className="text-left p-3 font-medium">Channel</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Messages</th>
                <th className="text-left p-3 font-medium">Outcome</th>
                <th className="text-left p-3 font-medium">Date</th>
              </tr></thead>
              <tbody>
                {conversations.map((c) => (
                  <tr key={c._id} className="border-t hover:bg-muted/30">
                    <td className="p-3">{c.visitor?.name || c.visitor?.email || "Anonymous"}</td>
                    <td className="p-3 capitalize">{c.channel}</td>
                    <td className="p-3"><span className={cn("text-xs px-2 py-0.5 rounded", c.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600")}>{c.status}</span></td>
                    <td className="p-3">{c.messageCount}</td>
                    <td className="p-3">{c.outcome || "—"}</td>
                    <td className="p-3">{new Date(c.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Executions Tab */}
      {activeTab === "executions" && (
        <div className="bg-white rounded-xl border overflow-hidden">
          {executions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground"><Activity className="h-12 w-12 mx-auto mb-3 opacity-50" /><p>No executions logged</p></div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr>
                <th className="text-left p-3 font-medium">Action</th>
                <th className="text-left p-3 font-medium">Category</th>
                <th className="text-left p-3 font-medium">By</th>
                <th className="text-left p-3 font-medium">Date</th>
              </tr></thead>
              <tbody>
                {executions.map((e) => (
                  <tr key={e._id} className="border-t hover:bg-muted/30">
                    <td className="p-3 font-medium">{e.action}</td>
                    <td className="p-3">{e.category}</td>
                    <td className="p-3">{e.performedBy?.name || "System"}</td>
                    <td className="p-3">{new Date(e.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Approvals Tab */}
      {activeTab === "approvals" && (
        <div className="bg-white rounded-xl border overflow-hidden">
          {approvals.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground"><CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" /><p>No pending approvals</p></div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr>
                <th className="text-left p-3 font-medium">Type</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Risk</th>
                <th className="text-left p-3 font-medium">Date</th>
              </tr></thead>
              <tbody>
                {approvals.map((a) => (
                  <tr key={a._id} className="border-t hover:bg-muted/30">
                    <td className="p-3">{a.type}</td>
                    <td className="p-3"><span className={cn("text-xs px-2 py-0.5 rounded",
                      a.status === "approved" ? "bg-green-100 text-green-700" : a.status === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                    )}>{a.status}</span></td>
                    <td className="p-3">{a.action?.risk || "—"}</td>
                    <td className="p-3">{new Date(a.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Versions Tab */}
      {activeTab === "versions" && (
        <div className="bg-white rounded-xl border p-4">
          <h3 className="font-semibold mb-3">Version History</h3>
          {agent.versionHistory?.length ? (
            <div className="space-y-3">
              {agent.versionHistory.map((v, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{v.version}</div>
                  <div>
                    <p className="text-sm">{v.changes}</p>
                    <p className="text-xs text-muted-foreground">{v.changedBy?.name || "System"} - {new Date(v.changedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground">No version history (v{agent.version})</p>}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-semibold mb-3">Memory</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div><span className="text-muted-foreground">Type:</span> <span className="font-medium capitalize">{agent.memory?.type || "none"}</span></div>
              <div><span className="text-muted-foreground">Max Items:</span> <span className="font-medium">{agent.memory?.maxItems || 0}</span></div>
            </div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-semibold mb-3">Guardrails</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Max Conversation:</span> <span className="font-medium">{agent.guardrails?.maxConversationLength || 100}</span></div>
              <div><span className="text-muted-foreground">Approval Required:</span> <span className="font-medium">{agent.guardrails?.requireApproval ? "Yes" : "No"}</span></div>
              <div><span className="text-muted-foreground">Content Filter:</span> <span className="font-medium">{agent.guardrails?.contentFilter ? "On" : "Off"}</span></div>
              <div><span className="text-muted-foreground">Blocked Topics:</span> <span className="font-medium">{agent.guardrails?.blockedTopics?.length || 0}</span></div>
            </div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-semibold mb-3">Integrations</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {Object.entries(agent.integrations || {}).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2">
                  {v ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-gray-400" />}
                   <span className="capitalize">{k}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SkillAssignmentTab({ agentId, agentSkills, onUpdate }: { agentId: string; agentSkills: { _id: string; name: string; category: string; status?: string }[]; onUpdate: () => void }) {
  const [allSkills, setAllSkills] = useState<{ _id: string; name: string; category: string; status: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [assigning, setAssigning] = useState<string | null>(null);

  useEffect(() => { fetchSkills(); }, []);

  const fetchSkills = async () => {
    try {
      const res = await fetch("/api/agents/skills", { credentials: "include" });
      const data = await res.json();
      setAllSkills(data.skills || []);
    } catch { console.error("Failed to fetch skills"); } finally { setLoading(false); }
  };

  const assignedIds = new Set(agentSkills.map((s) => s._id));

  const handleAssign = async (skillId: string) => {
    setAssigning(skillId);
    try {
      await fetch("/api/agents/assign-skills", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, skillIds: [skillId], action: "add" }),
      });
      onUpdate();
    } catch { console.error("Failed to assign skill"); } finally { setAssigning(null); }
  };

  const handleRemove = async (skillId: string) => {
    setAssigning(skillId);
    try {
      await fetch("/api/agents/assign-skills", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, skillIds: [skillId], action: "remove" }),
      });
      onUpdate();
    } catch { console.error("Failed to remove skill"); } finally { setAssigning(null); }
  };

  const filtered = allSkills.filter((s) => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.category.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const assigned = filtered.filter((s) => assignedIds.has(s._id));
  const available = filtered.filter((s) => !assignedIds.has(s._id));

  if (loading) return <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input type="text" placeholder="Search skills..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border bg-muted/50 pl-9 pr-4 py-2 text-sm" />
      </div>

      {assigned.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Assigned ({assigned.length})</h3>
          <div className="space-y-2">
            {assigned.map((skill) => (
              <div key={skill._id} className="bg-white rounded-xl border p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Zap className="h-5 w-5 text-primary" /></div>
                <div className="flex-1"><p className="font-medium text-sm">{skill.name}</p><p className="text-xs text-muted-foreground">{skill.category}</p></div>
                <button disabled={assigning === skill._id} onClick={() => handleRemove(skill._id)}
                  className="px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50">
                  {assigning === skill._id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Remove"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {available.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Available ({available.length})</h3>
          <div className="space-y-2">
            {available.map((skill) => (
              <div key={skill._id} className="bg-white rounded-xl border p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center"><Zap className="h-5 w-5 text-muted-foreground" /></div>
                <div className="flex-1"><p className="font-medium text-sm">{skill.name}</p><p className="text-xs text-muted-foreground">{skill.category}</p></div>
                <button disabled={assigning === skill._id} onClick={() => handleAssign(skill._id)}
                  className="px-3 py-1.5 text-xs bg-primary/10 text-primary rounded-lg hover:bg-primary/20 disabled:opacity-50">
                  {assigning === skill._id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Assign"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
