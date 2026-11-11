"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Settings, RefreshCw, Save, Loader2, Bot, Zap, Bell, Shield,
  AlertTriangle, CheckCircle2, Plus, Copy, ChevronDown, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

interface PmConfig {
  projectManagement: Record<string, any>;
  notifications: Record<string, any>;
  thresholds: Record<string, any>;
  automation: Record<string, any>;
}

interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  role: string;
  type: string;
  division: string;
  personality: { tone: string; language: string; responseStyle: string };
  channels: Record<string, boolean>;
  suggestedSkills: string[];
  suggestedTools: string[];
  systemPrompt: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  sales: "Sales",
  support: "Support",
  "project-management": "Project Management",
  marketing: "Marketing",
  technical: "Technical",
  finance: "Finance",
};

export default function ConfigPage() {
  const [config, setConfig] = useState<PmConfig | null>(null);
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("pm");
  const [deployingTemplate, setDeployingTemplate] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [configRes, templatesRes] = await Promise.all([
        fetch("/api/pm/config?action=pm", { credentials: "include" }),
        fetch("/api/pm/config?action=templates", { credentials: "include" }),
      ]);
      const [configData, templatesData] = await Promise.all([configRes.json(), templatesRes.json()]);
      if (configData.config) setConfig(configData.config);
      if (templatesData.templates) setTemplates(templatesData.templates);
    } catch (err) {
      console.error("Failed to fetch config data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await fetch("/api/pm/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-pm-config", ...config }),
        credentials: "include",
      });
    } finally {
      setSaving(false);
    }
  };

  const deployTemplate = async (templateId: string) => {
    setDeployingTemplate(templateId);
    try {
      await fetch("/api/pm/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deploy-template", templateId }),
        credentials: "include",
      });
    } finally {
      setDeployingTemplate(null);
    }
  };

  const updateConfig = (category: string, key: string, value: any) => {
    if (!config) return;
    setConfig({
      ...config,
      [category]: { ...config[category as keyof PmConfig], [key]: value },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6 text-blue-600" />
            Configuration
          </h1>
          <p className="text-sm text-muted-foreground">System settings and agent templates</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button size="sm" onClick={saveConfig} disabled={saving || !config}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Save
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pm">PM Settings</TabsTrigger>
          <TabsTrigger value="templates">Agent Templates ({templates.length})</TabsTrigger>
        </TabsList>

        {/* PM Settings Tab */}
        <TabsContent value="pm" className="space-y-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-24 w-full" /></CardContent></Card>)
          ) : config && (
            <>
              {/* Project Management */}
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Bot className="h-4 w-4" /> Project Management</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(config.projectManagement).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <label className="text-sm text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1")}</label>
                      {typeof value === "boolean" ? (
                        <Switch checked={value} onCheckedChange={(v) => updateConfig("projectManagement", key, v)} />
                      ) : typeof value === "number" ? (
                        <Input type="number" value={value} onChange={(e) => updateConfig("projectManagement", key, parseInt(e.target.value) || 0)} className="w-24" />
                      ) : (
                        <Input value={String(value)} onChange={(e) => updateConfig("projectManagement", key, e.target.value)} className="w-32" />
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Notifications */}
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4" /> Notifications</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(config.notifications).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <label className="text-sm text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1")}</label>
                      {typeof value === "boolean" ? (
                        <Switch checked={value} onCheckedChange={(v) => updateConfig("notifications", key, v)} />
                      ) : (
                        <Input value={String(value)} onChange={(e) => updateConfig("notifications", key, e.target.value)} className="w-32" />
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Thresholds */}
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Thresholds</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(config.thresholds).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <label className="text-sm text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1")}</label>
                      <Input type="number" value={value} onChange={(e) => updateConfig("thresholds", key, parseInt(e.target.value) || 0)} className="w-24" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Automation */}
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4" /> Automation</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(config.automation).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <label className="text-sm text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1")}</label>
                      {typeof value === "boolean" ? (
                        <Switch checked={value} onCheckedChange={(v) => updateConfig("automation", key, v)} />
                      ) : (
                        <Input value={String(value)} onChange={(e) => updateConfig("automation", key, e.target.value)} className="w-32" />
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent></Card>)
          ) : (
            templates.map((template) => (
              <Card key={template.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{template.name}</p>
                        <Badge variant="outline" className="text-[10px]">{CATEGORY_LABELS[template.category] || template.category}</Badge>
                        <Badge variant="outline" className="text-[10px]">{template.type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {template.suggestedSkills.map((s) => (
                          <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {template.suggestedTools.map((t) => (
                          <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                        ))}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deployTemplate(template.id)}
                      disabled={deployingTemplate === template.id}
                    >
                      {deployingTemplate === template.id ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Copy className="h-4 w-4 mr-1" />
                      )}
                      Deploy
                    </Button>
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
