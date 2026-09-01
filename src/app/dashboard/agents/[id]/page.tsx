"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Bot, ArrowLeft, Settings, MessageSquare, Activity, BarChart3,
  Play, Pause, Trash2, Globe, Mail, Phone, Headphones,
  Zap, Shield, Users, TrendingUp, AlertTriangle, Wrench,
  CheckCircle2, XCircle, Workflow, History, Loader2, Search, Plus, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

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
  tools: { _id: string; name: string; type: string; category: string; isWriteOperation: boolean; riskLevel: string; status: string }[];
  hooks: { _id: string; name: string; type: string }[];
  workflows: { _id: string; name: string; status: string; description?: string }[];
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

  const fetchAgent = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/${agentId}`);
      const data = await res.json();
      setAgent(data.agent);
    } catch { console.error("Failed to fetch agent"); } finally { setLoading(false); }
  }, [agentId]);

  useEffect(() => { fetchAgent(); }, [fetchAgent]);

  useEffect(() => {
    if (activeTab === "conversations") fetchConversations();
    if (activeTab === "executions") fetchExecutions();
    if (activeTab === "approvals") fetchApprovals();
  }, [activeTab]);

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
      isClientFacing: agent.isClientFacing,
      isMasterAgent: agent.isMasterAgent,
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

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-[200px]" />
      <Skeleton className="h-10 w-full" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <Skeleton className="h-[400px] w-full" />
    </div>
  );

  if (!agent) return (
    <div className="text-center py-12">
      <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
      <p className="text-muted-foreground">Agent not found</p>
      <Button variant="link" asChild className="mt-2">
        <Link href="/dashboard/agents">Back to agents</Link>
      </Button>
    </div>
  );

  return (
    <div className="space-y-6 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/agents"><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold truncate">{agent.name}</h1>
              <Badge variant={agent.status === "active" ? "default" : "secondary"}>{agent.status}</Badge>
              <span className="text-xs text-muted-foreground">v{agent.version}</span>
            </div>
            <p className="text-sm text-muted-foreground truncate">{agent.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <Button asChild size="sm">
            <Link href={`/dashboard/agents/${agent._id}/test`}>
              <MessageSquare className="w-4 h-4 mr-1" />Test
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={editing ? cancelEdit : startEdit}>
            <Settings className="w-4 h-4 mr-1" />
            {editing ? "Cancel Edit" : "Edit"}
          </Button>
          <Button variant="outline" size="sm" onClick={toggleStatus}>
            {agent.status === "active" ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
            {agent.status === "active" ? "Deactivate" : "Activate"}
          </Button>
          <Button variant="outline" size="sm" onClick={deleteAgent} className="text-destructive border-destructive/20 hover:bg-destructive/10">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start overflow-x-auto h-auto flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="tools">Tools</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="contexts">Contexts</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="conversations">Conversations</TabsTrigger>
          <TabsTrigger value="executions">Executions</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="versions">Versions</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Conversations", value: agent.stats?.totalConversations || 0, icon: MessageSquare, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Messages", value: agent.stats?.totalMessages || 0, icon: Activity, color: "text-green-600", bg: "bg-green-50" },
              { label: "Executions", value: agent.stats?.totalExecutions || 0, icon: Zap, color: "text-purple-600", bg: "bg-purple-50" },
              { label: "Satisfaction", value: `${agent.stats?.satisfactionScore || 0}%`, icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50" },
            ].map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", stat.bg)}><stat.icon className={cn("w-5 h-5", stat.color)} /></div>
                    <div><p className="text-xs text-muted-foreground">{stat.label}</p><p className="text-2xl font-bold">{stat.value}</p></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">System Prompt</CardTitle></CardHeader>
              <CardContent>
                {editing ? (
                  <div className="space-y-3">
                    <textarea value={editForm.systemPrompt || ""} onChange={(e) => setEditForm({ ...editForm, systemPrompt: e.target.value })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono min-h-[200px]" />
                  </div>
                ) : (
                  <pre className="text-xs bg-muted rounded-lg p-3 whitespace-pre-wrap font-mono max-h-48 overflow-y-auto break-words">{agent.systemPrompt}</pre>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Configuration</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  ["Name", agent.name, "name"],
                  ["Description", agent.description, "description"],
                  ["Model", agent.aiModel, "aiModel"],
                  ["Temperature", agent.temperature, "temperature"],
                  ["Max Tokens", agent.maxTokens, "maxTokens"],
                  ["Type", agent.type, "type"],
                  ["Role", agent.role, "role"],
                ].map(([label, value, field]) => (
                  <div key={label} className="flex justify-between text-sm gap-2">
                    <span className="text-muted-foreground shrink-0">{label}</span>
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
                          className="w-full rounded border bg-background px-2 py-0.5 text-xs min-w-0" />
                      )
                    ) : (
                      <span className="font-medium text-right break-words">{String(value)}</span>
                    )}
                  </div>
                ))}
                {/* Client Facing Toggle */}
                <div className="flex justify-between text-sm items-center gap-2">
                  <span className="text-muted-foreground shrink-0">Client Facing</span>
                  {editing ? (
                    <Switch
                      checked={editForm.isClientFacing ?? agent.isClientFacing}
                      onCheckedChange={(checked) => setEditForm({ ...editForm, isClientFacing: checked })}
                    />
                  ) : (
                    <Badge variant={agent.isClientFacing ? "default" : "secondary"}>
                      {agent.isClientFacing ? "Yes" : "No"}
                    </Badge>
                  )}
                </div>
                {/* Master Agent Toggle */}
                <div className="flex justify-between text-sm items-center gap-2">
                  <span className="text-muted-foreground shrink-0">Master Agent</span>
                  {editing ? (
                    <Switch
                      checked={editForm.isMasterAgent ?? agent.isMasterAgent}
                      onCheckedChange={(checked) => setEditForm({ ...editForm, isMasterAgent: checked })}
                    />
                  ) : (
                    <Badge variant={agent.isMasterAgent ? "default" : "secondary"}>
                      {agent.isMasterAgent ? "Yes" : "No"}
                    </Badge>
                  )}
                </div>
                {editing && (
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" onClick={saveEdit} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                      Save Changes
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Skills Tab */}
        <TabsContent value="skills">
          <SkillAssignmentTab agentId={agent._id} agentSkills={agent.skills || []} onUpdate={fetchAgent} />
        </TabsContent>

        {/* Tools Tab */}
        <TabsContent value="tools">
          <ToolAssignmentTab agentId={agent._id} agentTools={agent.tools || []} onUpdate={fetchAgent} />
        </TabsContent>

        {/* Workflows Tab */}
        <TabsContent value="workflows">
          <WorkflowAssignmentTab agentId={agent._id} agentWorkflows={agent.workflows || []} onUpdate={fetchAgent} />
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions">
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Required Permissions</h3>
              {agent.permissions?.length ? (
                <div className="flex flex-wrap gap-2">
                  {agent.permissions.map((p, i) => (
                    <Badge key={i} variant="outline"><Shield className="h-3 w-3 mr-1" />{p}</Badge>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground">No special permissions required</p>}
              {agent.guardrails?.requireApproval && (
                <div className="mt-4 p-3 bg-amber-50 rounded-lg"><p className="text-sm text-amber-700">This agent requires approval for sensitive actions</p></div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contexts Tab */}
        <TabsContent value="contexts">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(agent.contexts || {}).map(([ctx, enabled]) => (
              <Card key={ctx} className={!enabled ? "opacity-50" : ""}>
                <CardContent className="p-4 text-center">
                  <div className={cn("h-10 w-10 rounded-full mx-auto mb-2 flex items-center justify-center", enabled ? "bg-green-100" : "bg-gray-100")}>
                    {enabled ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-gray-400" />}
                  </div>
                  <p className="text-sm font-medium capitalize">{ctx}</p>
                  <p className="text-xs text-muted-foreground">{enabled ? "Enabled" : "Disabled"}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Channels Tab */}
        <TabsContent value="channels">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(agent.channels || {}).map(([ch, enabled]) => (
              <Card key={ch} className={!enabled ? "opacity-50" : ""}>
                <CardContent className="p-4">
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
                    <Badge variant={enabled ? "default" : "secondary"}>{enabled ? "On" : "Off"}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Conversations Tab */}
        <TabsContent value="conversations">
          <Card>
            <CardContent className="p-0">
              {conversations.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No conversations yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
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
                          <td className="p-3"><Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge></td>
                          <td className="p-3">{c.messageCount}</td>
                          <td className="p-3">{c.outcome || "—"}</td>
                          <td className="p-3">{new Date(c.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Executions Tab */}
        <TabsContent value="executions">
          <Card>
            <CardContent className="p-0">
              {executions.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No executions logged</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
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
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Approvals Tab */}
        <TabsContent value="approvals">
          <Card>
            <CardContent className="p-0">
              {approvals.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No pending approvals</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
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
                          <td className="p-3"><Badge variant={
                            a.status === "approved" ? "default" :
                            a.status === "rejected" ? "destructive" : "secondary"
                          }>{a.status}</Badge></td>
                          <td className="p-3">{a.action?.risk || "—"}</td>
                          <td className="p-3">{new Date(a.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Versions Tab */}
        <TabsContent value="versions">
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Version History</h3>
              {agent.versionHistory?.length ? (
                <div className="space-y-3">
                  {agent.versionHistory.map((v, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">{v.version}</div>
                      <div className="min-w-0">
                        <p className="text-sm break-words">{v.changes}</p>
                        <p className="text-xs text-muted-foreground">{v.changedBy?.name || "System"} - {new Date(v.changedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground">No version history (v{agent.version})</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Memory</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><span className="text-muted-foreground">Type:</span> <span className="font-medium capitalize">{agent.memory?.type || "none"}</span></div>
                <div><span className="text-muted-foreground">Max Items:</span> <span className="font-medium">{agent.memory?.maxItems || 0}</span></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Guardrails</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Max Conversation:</span> <span className="font-medium">{agent.guardrails?.maxConversationLength || 100}</span></div>
                <div><span className="text-muted-foreground">Approval Required:</span> <span className="font-medium">{agent.guardrails?.requireApproval ? "Yes" : "No"}</span></div>
                <div><span className="text-muted-foreground">Content Filter:</span> <span className="font-medium">{agent.guardrails?.contentFilter ? "On" : "Off"}</span></div>
                <div><span className="text-muted-foreground">Blocked Topics:</span> <span className="font-medium">{agent.guardrails?.blockedTopics?.length || 0}</span></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Integrations</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {Object.entries(agent.integrations || {}).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2">
                    {v ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-gray-400" />}
                    <span className="capitalize">{k}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── Skill Assignment Tab ─────────────────────────────────────────── */
function SkillAssignmentTab({ agentId, agentSkills, onUpdate }: { agentId: string; agentSkills: { _id: string; name: string; category: string; status?: string }[]; onUpdate: () => void }) {
  const [allSkills, setAllSkills] = useState<{ _id: string; name: string; category: string; status: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [assigning, setAssigning] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/agents/skills", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setAllSkills(d.skills || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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

  const filtered = allSkills.filter((s) => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.category.toLowerCase().includes(search.toLowerCase()));
  const assigned = filtered.filter((s) => assignedIds.has(s._id));
  const available = filtered.filter((s) => !assignedIds.has(s._id));

  if (loading) return <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search skills..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>
      {assigned.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Assigned ({assigned.length})</h3>
          <div className="space-y-2">
            {assigned.map((skill) => (
              <Card key={skill._id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Zap className="h-5 w-5 text-primary" /></div>
                  <div className="flex-1 min-w-0"><p className="font-medium text-sm">{skill.name}</p><p className="text-xs text-muted-foreground">{skill.category}</p></div>
                  <Button variant="outline" size="sm" disabled={assigning === skill._id} onClick={() => handleRemove(skill._id)} className="text-destructive shrink-0">
                    {assigning === skill._id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Remove"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
      {available.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Available ({available.length})</h3>
          <div className="space-y-2">
            {available.map((skill) => (
              <Card key={skill._id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0"><Zap className="h-5 w-5 text-muted-foreground" /></div>
                  <div className="flex-1 min-w-0"><p className="font-medium text-sm">{skill.name}</p><p className="text-xs text-muted-foreground">{skill.category}</p></div>
                  <Button variant="default" size="sm" disabled={assigning === skill._id} onClick={() => handleAssign(skill._id)} className="shrink-0">
                    {assigning === skill._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Plus className="h-3 w-3 mr-1" />Assign</>}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
      {assigned.length === 0 && available.length === 0 && (
        <div className="text-center py-8 text-muted-foreground"><Zap className="h-12 w-12 mx-auto mb-3 opacity-50" /><p>No skills found</p></div>
      )}
    </div>
  );
}

/* ─── Tool Assignment Tab ──────────────────────────────────────────── */
function ToolAssignmentTab({ agentId, agentTools, onUpdate }: { agentId: string; agentTools: { _id: string; name: string; type: string; category: string; isWriteOperation: boolean; riskLevel: string; status: string }[]; onUpdate: () => void }) {
  const [allTools, setAllTools] = useState<{ _id: string; name: string; type: string; category: string; isWriteOperation: boolean; riskLevel: string; status: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [assigning, setAssigning] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/agents/tools", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setAllTools(d.tools || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const assignedIds = new Set(agentTools.map((t) => t._id));

  const handleAssign = async (toolId: string) => {
    setAssigning(toolId);
    try {
      await fetch("/api/agents/assign-tools", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, toolIds: [toolId], action: "add" }),
      });
      onUpdate();
    } catch { console.error("Failed to assign tool"); } finally { setAssigning(null); }
  };

  const handleRemove = async (toolId: string) => {
    setAssigning(toolId);
    try {
      await fetch("/api/agents/assign-tools", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, toolIds: [toolId], action: "remove" }),
      });
      onUpdate();
    } catch { console.error("Failed to remove tool"); } finally { setAssigning(null); }
  };

  const filtered = allTools.filter((t) => !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase()));
  const assigned = filtered.filter((t) => assignedIds.has(t._id));
  const available = filtered.filter((t) => !assignedIds.has(t._id));

  if (loading) return <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search tools..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>
      {assigned.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Assigned ({assigned.length})</h3>
          <div className="space-y-2">
            {assigned.map((tool) => (
              <Card key={tool._id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", tool.isWriteOperation ? "bg-orange-100" : "bg-blue-100")}>
                    {tool.isWriteOperation ? <AlertTriangle className="h-5 w-5 text-orange-600" /> : <Wrench className="h-5 w-5 text-blue-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{tool.name}</p>
                    <p className="text-xs text-muted-foreground">{tool.category} - {tool.type}</p>
                  </div>
                  <Badge variant={(tool.riskLevel === "high" || tool.riskLevel === "critical") ? "destructive" : "secondary"} className="shrink-0">{tool.riskLevel}</Badge>
                  <Button variant="outline" size="sm" disabled={assigning === tool._id} onClick={() => handleRemove(tool._id)} className="text-destructive shrink-0">
                    {assigning === tool._id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Remove"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
      {available.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Available ({available.length})</h3>
          <div className="space-y-2">
            {available.map((tool) => (
              <Card key={tool._id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", tool.isWriteOperation ? "bg-orange-100" : "bg-blue-100")}>
                    {tool.isWriteOperation ? <AlertTriangle className="h-5 w-5 text-orange-600" /> : <Wrench className="h-5 w-5 text-blue-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{tool.name}</p>
                    <p className="text-xs text-muted-foreground">{tool.category} - {tool.type}</p>
                  </div>
                  <Badge variant={(tool.riskLevel === "high" || tool.riskLevel === "critical") ? "destructive" : "secondary"} className="shrink-0">{tool.riskLevel}</Badge>
                  <Button variant="default" size="sm" disabled={assigning === tool._id} onClick={() => handleAssign(tool._id)} className="shrink-0">
                    {assigning === tool._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Plus className="h-3 w-3 mr-1" />Assign</>}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
      {assigned.length === 0 && available.length === 0 && (
        <div className="text-center py-8 text-muted-foreground"><Wrench className="h-12 w-12 mx-auto mb-3 opacity-50" /><p>No tools found</p></div>
      )}
    </div>
  );
}

/* ─── Workflow Assignment Tab ──────────────────────────────────────── */
function WorkflowAssignmentTab({ agentId, agentWorkflows, onUpdate }: { agentId: string; agentWorkflows: { _id: string; name: string; status: string; description?: string }[]; onUpdate: () => void }) {
  const [allWorkflows, setAllWorkflows] = useState<{ _id: string; name: string; status: string; description?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [assigning, setAssigning] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/agents/workflows", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setAllWorkflows(d.workflows || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const assignedIds = new Set(agentWorkflows.map((w) => w._id));

  const handleAssign = async (workflowId: string) => {
    setAssigning(workflowId);
    try {
      await fetch("/api/agents/assign-workflows", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, workflowIds: [workflowId], action: "add" }),
      });
      onUpdate();
    } catch { console.error("Failed to assign workflow"); } finally { setAssigning(null); }
  };

  const handleRemove = async (workflowId: string) => {
    setAssigning(workflowId);
    try {
      await fetch("/api/agents/assign-workflows", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, workflowIds: [workflowId], action: "remove" }),
      });
      onUpdate();
    } catch { console.error("Failed to remove workflow"); } finally { setAssigning(null); }
  };

  const filtered = allWorkflows.filter((w) => !search || w.name.toLowerCase().includes(search.toLowerCase()));
  const assigned = filtered.filter((w) => assignedIds.has(w._id));
  const available = filtered.filter((w) => !assignedIds.has(w._id));

  if (loading) return <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search workflows..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>
      {assigned.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Assigned ({assigned.length})</h3>
          <div className="space-y-2">
            {assigned.map((wf) => (
              <Card key={wf._id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center shrink-0"><Workflow className="h-5 w-5 text-purple-600" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{wf.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{wf.description || "No description"}</p>
                  </div>
                  <Badge variant={wf.status === "active" ? "default" : "secondary"} className="shrink-0">{wf.status}</Badge>
                  <Button variant="outline" size="sm" disabled={assigning === wf._id} onClick={() => handleRemove(wf._id)} className="text-destructive shrink-0">
                    {assigning === wf._id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Remove"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
      {available.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Available ({available.length})</h3>
          <div className="space-y-2">
            {available.map((wf) => (
              <Card key={wf._id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0"><Workflow className="h-5 w-5 text-muted-foreground" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{wf.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{wf.description || "No description"}</p>
                  </div>
                  <Badge variant={wf.status === "active" ? "default" : "secondary"} className="shrink-0">{wf.status}</Badge>
                  <Button variant="default" size="sm" disabled={assigning === wf._id} onClick={() => handleAssign(wf._id)} className="shrink-0">
                    {assigning === wf._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Plus className="h-3 w-3 mr-1" />Assign</>}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
      {assigned.length === 0 && available.length === 0 && (
        <div className="text-center py-8 text-muted-foreground"><Workflow className="h-12 w-12 mx-auto mb-3 opacity-50" /><p>No workflows found</p></div>
      )}
    </div>
  );
}
