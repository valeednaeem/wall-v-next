"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Loader2,
  FileText,
  Share2,
  Image,
  Zap,
  Eye,
  Pause,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Execution {
  _id: string;
  campaign: { _id: string; name: string } | string;
  plan: { _id: string; weekNumber: number } | string;
  planVersion: number;
  contentItem?: { _id: string; title: string } | string;
  topic?: { _id: string; title: string } | string;
  blogPost?: { _id: string; slug: string } | string;
  type: string;
  status: string;
  stage: string;
  agent: string;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  metadata: {
    model?: string;
    tokens?: { prompt: number; completion: number; total: number };
    qualityScore?: number;
    publicationUrl?: string;
    platformPostId?: string;
    platform?: string;
  };
  auditTrail: Array<{
    stage: string;
    status: string;
    timestamp: string;
    message?: string;
    duration?: number;
  }>;
}

interface ExecutionSummary {
  total: number;
  running: number;
  completed: number;
  failed: number;
  queued: number;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  plan_execution: <Zap className="w-4 h-4" />,
  article_generation: <FileText className="w-4 h-4" />,
  quality_check: <Eye className="w-4 h-4" />,
  blog_creation: <FileText className="w-4 h-4" />,
  social_generation: <Share2 className="w-4 h-4" />,
  social_publish: <Share2 className="w-4 h-4" />,
  image_generation: <Image className="w-4 h-4" />,
};

const STATUS_COLORS: Record<string, string> = {
  queued: "bg-yellow-100 text-yellow-800",
  running: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  skipped: "bg-gray-100 text-gray-800",
};

const TYPE_LABELS: Record<string, string> = {
  plan_execution: "Plan Execution",
  article_generation: "Article Generation",
  quality_check: "Quality Check",
  blog_creation: "Blog Creation",
  social_generation: "Social Generation",
  social_publish: "Social Publish",
  image_generation: "Image Generation",
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

function getTimelineColor(status: string): string {
  switch (status) {
    case "completed": return "bg-green-500";
    case "failed": return "bg-red-500";
    case "running": return "bg-blue-500";
    default: return "bg-gray-300";
  }
}

export default function ContentOperationsPage() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [summary, setSummary] = useState<ExecutionSummary>({ total: 0, running: 0, completed: 0, failed: 0, queued: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedExecution, setSelectedExecution] = useState<Execution | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);

  const fetchExecutions = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      const params = new URLSearchParams();
      if (filter !== "all") params.set("status", filter);
      params.set("limit", "50");

      const res = await fetch(`/api/content/executions?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch executions");
      const data = await res.json();

      setExecutions(data.executions || []);

      const s = { total: data.total || 0, running: 0, completed: 0, failed: 0, queued: 0 };
      for (const ex of data.executions || []) {
        if (ex.status in s) s[ex.status as keyof Omit<ExecutionSummary, "total">]++;
      }
      setSummary(s);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchExecutions();
  }, [fetchExecutions]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => fetchExecutions(), 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchExecutions]);

  const getExecutionName = (ex: Execution): string => {
    if (ex.contentItem && typeof ex.contentItem === "object") return ex.contentItem.title;
    if (ex.topic && typeof ex.topic === "object") return ex.topic.title;
    if (ex.blogPost && typeof ex.blogPost === "object") return `Blog: ${ex.blogPost.slug}`;
    return TYPE_LABELS[ex.type] || ex.type;
  };

  const getCampaignName = (ex: Execution): string => {
    if (ex.campaign && typeof ex.campaign === "object") return ex.campaign.name;
    return "Campaign";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/content/overview"
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Content Operations</h1>
              <p className="text-sm text-gray-500">Real-time execution tracking for your content pipeline</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                autoRefresh ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
              )}
            >
              <Activity className="w-4 h-4" />
              {autoRefresh ? "Live" : "Paused"}
            </button>
            <button
              onClick={() => fetchExecutions(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-2 bg-white border rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
              Refresh
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Total", value: summary.total, icon: <Activity className="w-5 h-5" />, color: "text-gray-600" },
            { label: "Running", value: summary.running, icon: <Loader2 className="w-5 h-5 animate-spin" />, color: "text-blue-600" },
            { label: "Completed", value: summary.completed, icon: <CheckCircle2 className="w-5 h-5" />, color: "text-green-600" },
            { label: "Failed", value: summary.failed, icon: <AlertCircle className="w-5 h-5" />, color: "text-red-600" },
            { label: "Queued", value: summary.queued, icon: <Clock className="w-5 h-5" />, color: "text-yellow-600" },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                    <p className={cn("text-2xl font-bold", stat.color)}>{stat.value}</p>
                  </div>
                  <div className={stat.color}>{stat.icon}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {["all", "running", "completed", "failed", "queued"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                filter === f ? "bg-gray-900 text-white" : "bg-white text-gray-600 hover:bg-gray-100"
              )}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Execution List */}
        {executions.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No executions yet</h3>
              <p className="text-gray-500 mb-4">
                Execute a content plan to see real-time execution tracking here.
              </p>
              <Link
                href="/dashboard/content/overview"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
              >
                Go to Overview
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {executions.map((ex) => (
              <Card
                key={ex._id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  selectedExecution?._id === ex._id && "ring-2 ring-gray-900"
                )}
                onClick={() => setSelectedExecution(selectedExecution?._id === ex._id ? null : ex)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-gray-400">{TYPE_ICONS[ex.type] || <Activity className="w-4 h-4" />}</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{getExecutionName(ex)}</span>
                          <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", STATUS_COLORS[ex.status])}>
                            {ex.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span>{getCampaignName(ex)}</span>
                          <span>&middot;</span>
                          <span>{TYPE_LABELS[ex.type]}</span>
                          <span>&middot;</span>
                          <span>{new Date(ex.startedAt).toLocaleString()}</span>
                          {ex.duration && (
                            <>
                              <span>&middot;</span>
                              <span>{formatDuration(ex.duration)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {ex.status === "running" && (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                      )}
                      {ex.status === "completed" && (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      )}
                      {ex.status === "failed" && (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  {selectedExecution?._id === ex._id && (
                    <div className="mt-4 pt-4 border-t" onClick={(e) => e.stopPropagation()}>
                      {/* Audit Trail Timeline */}
                      {ex.auditTrail.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-3">Execution Timeline</h4>
                          <div className="relative pl-6">
                            <div className="absolute left-2 top-1 bottom-1 w-0.5 bg-gray-200" />
                            {ex.auditTrail.map((step, i) => (
                              <div key={i} className="relative mb-3 last:mb-0">
                                <div className={cn(
                                  "absolute -left-4 top-1 w-3 h-3 rounded-full border-2 border-white",
                                  getTimelineColor(step.status)
                                )} />
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-gray-900">{step.stage}</span>
                                  <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", STATUS_COLORS[step.status] || "bg-gray-100 text-gray-600")}>
                                    {step.status}
                                  </span>
                                  {step.duration && (
                                    <span className="text-[10px] text-gray-400">{formatDuration(step.duration)}</span>
                                  )}
                                </div>
                                {step.message && (
                                  <p className="text-xs text-gray-500 mt-0.5">{step.message}</p>
                                )}
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                  {new Date(step.timestamp).toLocaleString()}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Execution Details */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-gray-500">Agent</span>
                          <p className="font-medium text-gray-900">{ex.agent}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Stage</span>
                          <p className="font-medium text-gray-900">{ex.stage}</p>
                        </div>
                        {ex.metadata?.qualityScore && (
                          <div>
                            <span className="text-gray-500">Quality Score</span>
                            <p className="font-medium text-gray-900">{ex.metadata.qualityScore}/10</p>
                          </div>
                        )}
                        {ex.metadata?.tokens && (
                          <div>
                            <span className="text-gray-500">Tokens</span>
                            <p className="font-medium text-gray-900">{ex.metadata.tokens.total.toLocaleString()}</p>
                          </div>
                        )}
                      </div>

                      {ex.error && (
                        <div className="mt-3 p-3 bg-red-50 rounded-lg text-xs text-red-700">
                          <strong>Error:</strong> {ex.error}
                        </div>
                      )}

                      {/* Links */}
                      <div className="flex gap-3 mt-3">
                        {ex.campaign && typeof ex.campaign === "object" && (
                          <Link
                            href={`/dashboard/content/campaigns/${ex.campaign._id}`}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            View Campaign
                          </Link>
                        )}
                        {ex.blogPost && typeof ex.blogPost === "object" && (
                          <Link
                            href={`/blog/${ex.blogPost.slug}`}
                            target="_blank"
                            className="text-xs text-blue-600 hover:underline"
                          >
                            View Blog Post
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
