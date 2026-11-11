"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText, RefreshCw, Play, Loader2, Calendar, BarChart3,
  TrendingUp, TrendingDown, Minus, Eye, ChevronDown, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

interface ReportTemplate {
  type: string;
  title: string;
  description: string;
  sections: string[];
}

interface Report {
  _id: string;
  title: string;
  type: string;
  period: string;
  date: string;
  status: string;
  summary: string;
  sections: { title: string; content: string; data: any }[];
  metrics: { name: string; value: number | string; unit: string; trend: string; previousValue: number | string }[];
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  "daily-ops": "Daily Ops",
  "weekly-mgmt": "Weekly Mgmt",
  "app-health": "App Health",
  "project-status": "Project Status",
  "capacity": "Capacity",
  "risk-summary": "Risk Summary",
  "agent-performance": "Agent Performance",
  "custom": "Custom",
};

const TYPE_COLORS: Record<string, string> = {
  "daily-ops": "bg-blue-100 text-blue-700",
  "weekly-mgmt": "bg-purple-100 text-purple-700",
  "app-health": "bg-emerald-100 text-emerald-700",
  "project-status": "bg-amber-100 text-amber-700",
  "capacity": "bg-orange-100 text-orange-700",
  "risk-summary": "bg-red-100 text-red-700",
  "agent-performance": "bg-cyan-100 text-cyan-700",
};

const TREND_ICONS: Record<string, React.ReactNode> = {
  up: <TrendingUp className="h-3 w-3 text-emerald-600" />,
  down: <TrendingDown className="h-3 w-3 text-red-600" />,
  stable: <Minus className="h-3 w-3 text-gray-600" />,
};

export default function ReportsPage() {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState("templates");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [templatesRes, reportsRes] = await Promise.all([
        fetch("/api/pm/reports?action=templates", { credentials: "include" }),
        fetch("/api/pm/reports?action=list", { credentials: "include" }),
      ]);
      const [templatesData, reportsData] = await Promise.all([templatesRes.json(), reportsRes.json()]);
      if (templatesData.templates) setTemplates(templatesData.templates);
      if (reportsData.reports) setReports(reportsData.reports);
    } catch (err) {
      console.error("Failed to fetch reports data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const generateReport = async (type: string) => {
    setGenerating(true);
    try {
      const res = await fetch("/api/pm/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
        credentials: "include",
      });
      const data = await res.json();
      if (data.report) {
        setReports((prev) => [data.report, ...prev]);
        setSelectedReport(data.report);
        setActiveTab("view");
      }
    } finally {
      setGenerating(false);
    }
  };

  const viewReport = async (id: string) => {
    try {
      const res = await fetch(`/api/pm/reports?action=get&id=${id}`, { credentials: "include" });
      const data = await res.json();
      if (data.report) {
        setSelectedReport(data.report);
        setActiveTab("view");
      }
    } catch (err) {
      console.error("Failed to fetch report:", err);
    }
  };

  const toggleSection = (title: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            Reports
          </h1>
          <p className="text-sm text-muted-foreground">Automated report generation and viewing</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="templates">Templates ({templates.length})</TabsTrigger>
          <TabsTrigger value="history">History ({reports.length})</TabsTrigger>
          {selectedReport && <TabsTrigger value="view">View Report</TabsTrigger>}
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <Card key={i}><CardContent className="p-3"><Skeleton className="h-16 w-full" /></CardContent></Card>)
          ) : (
            templates.map((template) => (
              <Card key={template.type}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{template.title}</p>
                        <Badge className={cn("text-[10px]", TYPE_COLORS[template.type])}>{TYPE_LABELS[template.type]}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {template.sections.map((s) => (
                          <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
                        ))}
                      </div>
                    </div>
                    <Button size="sm" onClick={() => generateReport(template.type)} disabled={generating}>
                      {generating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
                      Generate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <Card key={i}><CardContent className="p-3"><Skeleton className="h-10 w-full" /></CardContent></Card>)
          ) : reports.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-muted-foreground">No reports generated yet</CardContent></Card>
          ) : (
            reports.map((report) => (
              <Card key={report._id}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{report.title}</p>
                          <Badge className={cn("text-[10px]", TYPE_COLORS[report.type])}>{TYPE_LABELS[report.type]}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{new Date(report.createdAt).toLocaleString()} — {report.period}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => viewReport(report._id)}>
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* View Report Tab */}
        <TabsContent value="view">
          {selectedReport ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{selectedReport.title}</span>
                  <Badge className={cn("text-[10px]", TYPE_COLORS[selectedReport.type])}>{TYPE_LABELS[selectedReport.type]}</Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Generated: {new Date(selectedReport.createdAt).toLocaleString()} — Period: {selectedReport.period}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Metrics */}
                {selectedReport.metrics.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {selectedReport.metrics.map((m) => (
                      <div key={m.name} className="p-2 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">{m.name}</p>
                        <div className="flex items-center gap-1">
                          <p className="text-lg font-bold">{m.value}</p>
                          <span className="text-xs text-muted-foreground">{m.unit}</span>
                          {TREND_ICONS[m.trend]}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Sections */}
                {selectedReport.sections.map((section) => (
                  <div key={section.title} className="border rounded-lg">
                    <button
                      className="w-full flex items-center justify-between p-3 text-left"
                      onClick={() => toggleSection(section.title)}
                    >
                      <span className="font-medium text-sm">{section.title}</span>
                      {expandedSections.has(section.title) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {expandedSections.has(section.title) && (
                      <div className="px-3 pb-3">
                        <p className="text-sm text-muted-foreground">{section.content}</p>
                        {section.data && Object.keys(section.data).length > 0 && (
                          <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                            {JSON.stringify(section.data, null, 2)}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* Summary */}
                {selectedReport.summary && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Summary</p>
                    <p className="text-sm whitespace-pre-wrap">{selectedReport.summary}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent className="p-6 text-center text-muted-foreground">Select a report to view</CardContent></Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
