"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Pause,
  XCircle,
  CalendarDays,
  FileText,
  Share2,
  Target,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Campaign {
  _id: string;
  name: string;
  description?: string;
  status: string;
  dateRange: { start: string; end: string };
  businessObjectives: string[];
  targetAudience: string[];
  contentPillars: Array<{
    name: string;
    description: string;
    keywords: string[];
  }>;
  progress: number;
  stats: {
    topics: number;
    articles: number;
    published: number;
    socialPosts: number;
  };
  plans: Array<{
    _id: string;
    weekNumber: number;
    startDate: string;
    endDate: string;
    status: string;
    version: number;
  }>;
  topics: Array<{
    _id: string;
    title: string;
    slug: string;
    overallScore: number;
    status: string;
    primaryKeyword?: string;
  }>;
  items: Array<{
    _id: string;
    title: string;
    type: string;
    status: string;
    platform?: string;
  }>;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  running: "bg-green-100 text-green-800",
  paused: "bg-yellow-100 text-yellow-800",
  completed: "bg-blue-100 text-blue-800",
  draft: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  discovered: "bg-blue-100 text-blue-800",
  "in-progress": "bg-purple-100 text-purple-800",
};

const PLAN_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  executing: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
};

export default function CampaignDetailPage() {
  const params = useParams();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  const fetchCampaign = useCallback(async () => {
    try {
      const res = await fetch(`/api/content/campaigns/${campaignId}`);
      const data = await res.json();
      if (data.success) setCampaign(data.data);
    } catch (error) {
      console.error("Failed to fetch campaign:", error);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchCampaign();
  }, [fetchCampaign]);

  const handleAction = async (action: string, endpoint?: string, method = "POST") => {
    setActionLoading(action);
    try {
      const url = endpoint || `/api/content/campaigns/${campaignId}`;
      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: action === "pause" || action === "cancel"
          ? JSON.stringify({ action })
          : undefined,
      });
      fetchCampaign();
    } catch (error) {
      console.error(`Action ${action} failed:`, error);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePlanAction = async (planId: string, action: string) => {
    setActionLoading(`plan-${planId}-${action}`);
    try {
      await fetch(`/api/content/plans/${planId}/${action}`, { method: "POST" });
      fetchCampaign();
    } catch (error) {
      console.error(`Plan ${action} failed:`, error);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded w-64 animate-pulse" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border p-6 animate-pulse">
              <div className="h-4 bg-muted rounded w-20 mb-2" />
              <div className="h-8 bg-muted rounded w-12" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-lg font-semibold">Campaign not found</h2>
        <Link
          href="/dashboard/content/campaigns"
          className="text-sm text-primary hover:underline mt-2 inline-block"
        >
          Back to campaigns
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Link
            href="/dashboard/content/campaigns"
            className="p-2 rounded-lg hover:bg-muted transition-colors mt-0.5"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold">{campaign.name}</h2>
              <span
                className={cn(
                  "text-xs px-2.5 py-1 rounded-full font-medium",
                  STATUS_COLORS[campaign.status] || "bg-gray-100 text-gray-800"
                )}
              >
                {campaign.status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {new Date(campaign.dateRange.start).toLocaleDateString()} –{" "}
              {new Date(campaign.dateRange.end).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {campaign.status === "active" && (
            <button
              onClick={() => handleAction("pause")}
              disabled={actionLoading === "pause"}
              className="inline-flex items-center gap-2 border rounded-lg px-3 py-2 text-sm hover:bg-muted transition-colors disabled:opacity-50"
            >
              {actionLoading === "pause" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Pause className="h-4 w-4" />
              )}
              Pause
            </button>
          )}
          {campaign.status !== "cancelled" && campaign.status !== "completed" && (
            <button
              onClick={() => handleAction("cancel")}
              disabled={actionLoading === "cancel"}
              className="inline-flex items-center gap-2 border border-red-200 text-red-600 rounded-lg px-3 py-2 text-sm hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {actionLoading === "cancel" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="rounded-xl border p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Campaign Progress</span>
          <span className="text-sm text-muted-foreground">{campaign.progress || 0}%</span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${campaign.progress || 0}%` }}
          />
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Topics Discovered", value: campaign.stats?.topics ?? 0, icon: Target, bg: "bg-blue-50", color: "text-blue-500" },
          { label: "Articles Written", value: campaign.stats?.articles ?? 0, icon: FileText, bg: "bg-purple-50", color: "text-purple-500" },
          { label: "Published", value: campaign.stats?.published ?? 0, icon: CheckCircle2, bg: "bg-green-50", color: "text-green-500" },
          { label: "Social Posts", value: campaign.stats?.socialPosts ?? 0, icon: Share2, bg: "bg-orange-50", color: "text-orange-500" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center", stat.bg)}>
                <stat.icon className={cn("h-4 w-4", stat.color)} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Weekly Plans */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4" /> Weekly Plans
          </CardTitle>
        </CardHeader>
        <CardContent>
          {campaign.plans && campaign.plans.length > 0 ? (
            <div className="space-y-3">
              {campaign.plans
                .sort((a, b) => a.weekNumber - b.weekNumber)
                .map((plan) => (
                  <div key={plan._id} className="border rounded-lg">
                    <div
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() =>
                        setExpandedPlan(expandedPlan === plan._id ? null : plan._id)
                      }
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">
                          Week {plan.weekNumber}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          v{plan.version}
                        </span>
                        <span
                          className={cn(
                            "text-xs px-2 py-0.5 rounded-full font-medium",
                            PLAN_STATUS_COLORS[plan.status] || "bg-gray-100 text-gray-800"
                          )}
                        >
                          {plan.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {plan.status === "pending" && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePlanAction(plan._id, "approve");
                              }}
                              disabled={
                                actionLoading === `plan-${plan._id}-approve`
                              }
                              className="text-xs bg-green-600 text-white rounded px-2.5 py-1 hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                              {actionLoading === `plan-${plan._id}-approve` ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                "Approve"
                              )}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePlanAction(plan._id, "reject");
                              }}
                              disabled={
                                actionLoading === `plan-${plan._id}-reject`
                              }
                              className="text-xs border border-red-200 text-red-600 rounded px-2.5 py-1 hover:bg-red-50 transition-colors disabled:opacity-50"
                            >
                              {actionLoading === `plan-${plan._id}-reject` ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                "Reject"
                              )}
                            </button>
                          </>
                        )}
                        {expandedPlan === plan._id ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    {expandedPlan === plan._id && (
                      <div className="border-t p-3 bg-muted/20">
                        <div className="text-sm space-y-2">
                          <p>
                            <span className="font-medium">Period:</span>{" "}
                            {new Date(plan.startDate).toLocaleDateString()} –{" "}
                            {new Date(plan.endDate).toLocaleDateString()}
                          </p>
                          <p>
                            <span className="font-medium">Status:</span>{" "}
                            {plan.status}
                          </p>
                          <Link
                            href={`/dashboard/content/plans/${plan._id}`}
                            className="inline-flex items-center gap-1 text-primary text-sm hover:underline"
                          >
                            <Eye className="h-3.5 w-3.5" /> View Full Plan
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No plans generated yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* Topics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4" /> Discovered Topics
          </CardTitle>
        </CardHeader>
        <CardContent>
          {campaign.topics && campaign.topics.length > 0 ? (
            <div className="rounded-lg border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left text-sm font-medium">Topic</th>
                    <th className="p-3 text-left text-sm font-medium">Score</th>
                    <th className="p-3 text-left text-sm font-medium">Keyword</th>
                    <th className="p-3 text-left text-sm font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {campaign.topics.map((topic) => (
                    <tr key={topic._id} className="border-b last:border-0">
                      <td className="p-3 text-sm font-medium">{topic.title}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${topic.overallScore * 10}%` }}
                            />
                          </div>
                          <span className="text-xs">{topic.overallScore}</span>
                        </div>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {topic.primaryKeyword || "-"}
                      </td>
                      <td className="p-3">
                        <span
                          className={cn(
                            "text-xs px-2 py-0.5 rounded-full font-medium",
                            STATUS_COLORS[topic.status] || "bg-gray-100 text-gray-800"
                          )}
                        >
                          {topic.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No topics discovered yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* Content Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" /> Content Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          {campaign.items && campaign.items.length > 0 ? (
            <div className="space-y-2">
              {campaign.items.map((item) => (
                <Link
                  key={item._id}
                  href={`/dashboard/content/articles/${item._id}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {item.type} {item.platform ? `• ${item.platform}` : ""}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap",
                      STATUS_COLORS[item.status] || "bg-gray-100 text-gray-800"
                    )}
                  >
                    {item.status}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No content items yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
