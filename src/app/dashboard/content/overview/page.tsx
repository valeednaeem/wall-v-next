"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Megaphone,
  CalendarDays,
  FileText,
  Share2,
  Plus,
  TrendingUp,
  CheckCircle2,
  Clock,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Campaign {
  _id: string;
  name: string;
  status: string;
  dateRange: { start: string; end: string };
  progress: number;
}

interface ContentItem {
  _id: string;
  title: string;
  type: string;
  platform?: string;
  status: string;
  scheduledAt?: string;
  publishedAt?: string;
  createdAt: string;
}

interface ConnectionStatus {
  connected: boolean;
  lastPublish?: string;
  error?: string;
}

interface OverviewData {
  campaigns: Campaign[];
  todayItems: ContentItem[];
  upcomingItems: ContentItem[];
  recentPublished: ContentItem[];
  connections: Record<string, ConnectionStatus>;
  metrics: {
    totalArticles: number;
    published: number;
    pendingApproval: number;
    totalSocialPosts: number;
  };
}

const PLATFORM_ICONS: Record<string, string> = {
  linkedin: "Li",
  facebook: "Fb",
  x: "X",
  instagram: "Ig",
  tiktok: "Tk",
  youtube: "Yt",
};

const STATUS_COLORS: Record<string, string> = {
  published: "bg-green-100 text-green-800",
  scheduled: "bg-blue-100 text-blue-800",
  approved: "bg-purple-100 text-purple-800",
  review: "bg-yellow-100 text-yellow-800",
  draft: "bg-gray-100 text-gray-800",
};

export default function ContentOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const [campaignsRes, itemsRes, connectionsRes] = await Promise.allSettled([
        fetch("/api/content/campaigns"),
        fetch("/api/content/items?limit=50"),
        fetch("/api/content/connections"),
      ]);

      const campaigns =
        campaignsRes.status === "fulfilled" ? await campaignsRes.value.json() : { data: [] };
      const items =
        itemsRes.status === "fulfilled" ? await itemsRes.value.json() : { data: [] };
      const connections =
        connectionsRes.status === "fulfilled" ? await connectionsRes.value.json() : { connections: {} };

      const allItems: ContentItem[] = items.data || [];
      const now = new Date();
      const today = now.toISOString().split("T")[0];

      const todayItems = allItems.filter(
        (i) =>
          (i.scheduledAt && i.scheduledAt.startsWith(today)) ||
          (i.publishedAt && i.publishedAt.startsWith(today))
      );

      const upcomingItems = allItems
        .filter((i) => i.scheduledAt && new Date(i.scheduledAt) > now)
        .sort(
          (a, b) =>
            new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime()
        )
        .slice(0, 7);

      const recentPublished = allItems
        .filter((i) => i.status === "published")
        .sort(
          (a, b) =>
            new Date(b.publishedAt || b.createdAt).getTime() -
            new Date(a.publishedAt || a.createdAt).getTime()
        )
        .slice(0, 5);

      const metrics = {
        totalArticles: allItems.filter((i) => i.type === "article").length,
        published: allItems.filter((i) => i.status === "published").length,
        pendingApproval: allItems.filter(
          (i) => i.status === "review" || i.status === "pending"
        ).length,
        totalSocialPosts: allItems.filter(
          (i) => i.type === "social" || i.type === "post"
        ).length,
      };

      setData({
        campaigns: campaigns.data || [],
        todayItems,
        upcomingItems,
        recentPublished,
        connections: connections.connections || {},
        metrics,
      });
    } catch (error) {
      console.error("Failed to fetch overview:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border p-6 animate-pulse">
              <div className="h-4 bg-muted rounded w-24 mb-3" />
              <div className="h-8 bg-muted rounded w-16" />
            </div>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border p-6 animate-pulse">
              <div className="h-5 bg-muted rounded w-32 mb-4" />
              <div className="space-y-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-10 bg-muted rounded" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const activeCampaign = data.campaigns.find(
    (c) => c.status === "active" || c.status === "running"
  );

  const connectedPlatforms = Object.entries(data.connections).filter(
    ([, v]) => v.connected
  ).length;

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Total Articles",
            value: data.metrics.totalArticles,
            icon: FileText,
            bg: "bg-blue-50",
            color: "text-blue-500",
          },
          {
            label: "Published",
            value: data.metrics.published,
            icon: CheckCircle2,
            bg: "bg-green-50",
            color: "text-green-500",
          },
          {
            label: "Pending Approval",
            value: data.metrics.pendingApproval,
            icon: Clock,
            bg: "bg-yellow-50",
            color: "text-yellow-500",
          },
          {
            label: "Social Posts",
            value: data.metrics.totalSocialPosts,
            icon: Share2,
            bg: "bg-purple-50",
            color: "text-purple-500",
          },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="mt-1 text-3xl font-bold">{card.value}</p>
              </div>
              <div
                className={cn(
                  "h-10 w-10 rounded-lg flex items-center justify-center",
                  card.bg
                )}
              >
                <card.icon className={cn("h-5 w-5", card.color)} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Active Campaign */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Megaphone className="h-4 w-4" /> Active Campaign
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeCampaign ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{activeCampaign.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {new Date(activeCampaign.dateRange.start).toLocaleDateString()} –{" "}
                      {new Date(activeCampaign.dateRange.end).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-800 font-medium">
                    {activeCampaign.status}
                  </span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${activeCampaign.progress || 0}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span>{activeCampaign.progress || 0}%</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground mb-3">
                  No active campaign
                </p>
                <Link
                  href="/dashboard/content/campaigns/new"
                  className="inline-flex items-center gap-2 text-sm bg-primary text-primary-foreground rounded-lg px-4 py-2 hover:bg-primary/90 transition-colors"
                >
                  <Plus className="h-4 w-4" /> New Campaign
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Share2 className="h-4 w-4" /> Connections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {["linkedin", "facebook", "x", "instagram", "tiktok", "youtube"].map(
                (platform) => {
                  const conn = data.connections[platform];
                  const connected = conn?.connected || false;
                  return (
                    <Link
                      key={platform}
                      href="/dashboard/content/connections"
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Circle
                        className={cn(
                          "h-2.5 w-2.5 fill-current",
                          connected ? "text-green-500" : "text-red-400"
                        )}
                      />
                      <span className="text-xs font-medium capitalize">
                        {PLATFORM_ICONS[platform]} {platform}
                      </span>
                    </Link>
                  );
                }
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              {connectedPlatforms} of 6 connected
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Today + Upcoming + Recent */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today's Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4" /> Today&apos;s Content
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.todayItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nothing scheduled for today
              </p>
            ) : (
              <div className="space-y-2">
                {data.todayItems.slice(0, 5).map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {item.type} {item.platform ? `• ${item.platform}` : ""}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full whitespace-nowrap",
                        STATUS_COLORS[item.status] || "bg-gray-100 text-gray-800"
                      )}
                    >
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" /> Upcoming (7 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.upcomingItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No upcoming content
              </p>
            ) : (
              <div className="space-y-2">
                {data.upcomingItems.slice(0, 5).map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.scheduledAt!).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full whitespace-nowrap",
                        STATUS_COLORS[item.status] || "bg-gray-100 text-gray-800"
                      )}
                    >
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Publications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4" /> Recent Publications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentPublished.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No publications yet
              </p>
            ) : (
              <div className="space-y-2">
                {data.recentPublished.map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {item.platform || item.type}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(
                        item.publishedAt || item.createdAt
                      ).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/dashboard/content/campaigns/new"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> New Campaign
        </Link>
        <Link
          href="/dashboard/content/campaigns"
          className="inline-flex items-center gap-2 border rounded-lg px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          <Megaphone className="h-4 w-4" /> View Campaigns
        </Link>
        <Link
          href="/dashboard/content/calendar"
          className="inline-flex items-center gap-2 border rounded-lg px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          <CalendarDays className="h-4 w-4" /> View Calendar
        </Link>
      </div>
    </div>
  );
}
