"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Puzzle, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Loader2,
  Globe, Webhook, Key, Plus, Trash2, TestTube, Settings, Eye,
  CreditCard, Mail, Database, Cloud, GitBranch, Bell, Brain, Map,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  type: string;
  status: string;
  icon: string;
  config: Record<string, any>;
  stats?: { totalCalls: number; successRate: number; lastUsed: string };
}

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  method: string;
  active: boolean;
  lastTriggered?: string;
  successCount: number;
  failureCount: number;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  configured: "bg-blue-100 text-blue-700",
  inactive: "bg-gray-100 text-gray-700",
  error: "bg-red-100 text-red-700",
  "not-configured": "bg-gray-100 text-gray-600",
};

const ICON_MAP: Record<string, React.ReactNode> = {
  mail: <Mail className="h-4 w-4" />,
  "credit-card": <CreditCard className="h-4 w-4" />,
  map: <Map className="h-4 w-4" />,
  database: <Database className="h-4 w-4" />,
  cloud: <Cloud className="h-4 w-4" />,
  "git-branch": <GitBranch className="h-4 w-4" />,
  bell: <Bell className="h-4 w-4" />,
  brain: <Brain className="h-4 w-4" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  communication: "bg-blue-100 text-blue-700",
  payment: "bg-emerald-100 text-emerald-700",
  location: "bg-amber-100 text-amber-700",
  database: "bg-purple-100 text-purple-700",
  deployment: "bg-green-100 text-green-700",
  development: "bg-cyan-100 text-cyan-700",
  notification: "bg-orange-100 text-orange-700",
  ai: "bg-pink-100 text-pink-700",
};

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("integrations");
  const [showAddWebhook, setShowAddWebhook] = useState(false);
  const [newWebhook, setNewWebhook] = useState({ name: "", url: "", events: "", method: "POST" });
  const [testingWebhook, setTestingWebhook] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [intRes, whRes, sumRes] = await Promise.all([
        fetch("/api/pm/integrations?action=list", { credentials: "include" }),
        fetch("/api/pm/integrations?action=webhooks", { credentials: "include" }),
        fetch("/api/pm/integrations?action=summary", { credentials: "include" }),
      ]);
      const [intData, whData, sumData] = await Promise.all([intRes.json(), whRes.json(), sumRes.json()]);
      if (intData.integrations) setIntegrations(intData.integrations);
      if (whData.webhooks) setWebhooks(whData.webhooks);
      if (sumData.summary) setSummary(sumData.summary);
    } catch (err) {
      console.error("Failed to fetch integrations:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleIntegration = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    await fetch("/api/pm/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update-status", integrationId: id, status: newStatus }),
      credentials: "include",
    });
    await fetchData();
  };

  const addWebhook = async () => {
    await fetch("/api/pm/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create-webhook",
        name: newWebhook.name,
        url: newWebhook.url,
        events: newWebhook.events.split(",").map((e) => e.trim()),
        method: newWebhook.method,
        headers: {},
        active: true,
      }),
      credentials: "include",
    });
    setShowAddWebhook(false);
    setNewWebhook({ name: "", url: "", events: "", method: "POST" });
    await fetchData();
  };

  const testWh = async (id: string) => {
    setTestingWebhook(id);
    try {
      await fetch("/api/pm/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test-webhook", webhookId: id }),
        credentials: "include",
      });
      await fetchData();
    } finally {
      setTestingWebhook(null);
    }
  };

  const deleteWh = async (id: string) => {
    await fetch(`/api/pm/integrations?action=delete-webhook&webhookId=${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    await fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Puzzle className="h-6 w-6 text-blue-600" />
            Integrations
          </h1>
          <p className="text-sm text-muted-foreground">Connectors, webhooks, and API management</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      {!loading && summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total", value: summary.total, color: "text-blue-600" },
            { label: "Active", value: summary.active, color: "text-emerald-600" },
            { label: "Configured", value: summary.configured, color: "text-amber-600" },
            { label: "Inactive", value: summary.inactive, color: "text-gray-600" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-3 text-center">
                <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="integrations">Integrations ({integrations.length})</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks ({webhooks.length})</TabsTrigger>
        </TabsList>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <Card key={i}><CardContent className="p-3"><Skeleton className="h-16 w-full" /></CardContent></Card>)
          ) : (
            integrations.map((int) => (
              <Card key={int.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">{ICON_MAP[int.icon] || <Globe className="h-4 w-4" />}</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{int.name}</p>
                          <Badge className={cn("text-[10px]", STATUS_COLORS[int.status])}>{int.status}</Badge>
                          <Badge className={cn("text-[10px]", CATEGORY_COLORS[int.category])}>{int.category}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{int.description}</p>
                        {int.stats && (
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>Calls: {int.stats.totalCalls}</span>
                            <span>Success: {int.stats.successRate}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Switch
                      checked={int.status === "active"}
                      onCheckedChange={() => toggleIntegration(int.id, int.status)}
                    />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks" className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowAddWebhook(!showAddWebhook)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Webhook
            </Button>
          </div>

          {showAddWebhook && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <Input placeholder="Webhook name" value={newWebhook.name} onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })} />
                <Input placeholder="URL" value={newWebhook.url} onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })} />
                <Input placeholder="Events (comma-separated)" value={newWebhook.events} onChange={(e) => setNewWebhook({ ...newWebhook, events: e.target.value })} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={addWebhook}>Save</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowAddWebhook(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {loading ? (
            <Card><CardContent className="p-3"><Skeleton className="h-10 w-full" /></CardContent></Card>
          ) : webhooks.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-muted-foreground">No webhooks configured</CardContent></Card>
          ) : (
            webhooks.map((wh) => (
              <Card key={wh.id}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{wh.name}</p>
                        <Badge variant={wh.active ? "default" : "secondary"} className="text-[10px]">{wh.active ? "active" : "inactive"}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono truncate max-w-md">{wh.url}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>Events: {wh.events.join(", ")}</span>
                        <span>Success: {wh.successCount}</span>
                        <span>Failed: {wh.failureCount}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => testWh(wh.id)} disabled={testingWebhook === wh.id}>
                        {testingWebhook === wh.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <TestTube className="h-3 w-3" />}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => deleteWh(wh.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
