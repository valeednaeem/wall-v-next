"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  Loader2,
  ChevronRight,
  Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Campaign {
  _id: string;
  name: string;
  status: string;
  dateRange: { start: string; end: string };
  contentPillars: Array<{ name: string }>;
  stats?: {
    topics: number;
    articles: number;
    published: number;
  };
  progress: number;
  createdAt: string;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
  { value: "draft", label: "Draft" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  running: "bg-green-100 text-green-800",
  paused: "bg-yellow-100 text-yellow-800",
  completed: "bg-blue-100 text-blue-800",
  draft: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/content/campaigns?${params}`);
      const data = await res.json();
      if (data.success) setCampaigns(data.data);
    } catch (error) {
      console.error("Failed to fetch campaigns:", error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" /> Campaigns
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {campaigns.length} total campaigns
          </p>
        </div>
        <Link
          href="/dashboard/content/campaigns/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> New Campaign
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left text-sm font-medium">Name</th>
              <th className="p-3 text-left text-sm font-medium">Status</th>
              <th className="p-3 text-left text-sm font-medium">Date Range</th>
              <th className="p-3 text-left text-sm font-medium">Topics</th>
              <th className="p-3 text-left text-sm font-medium">Articles</th>
              <th className="p-3 text-left text-sm font-medium">Published</th>
              <th className="p-3 text-left text-sm font-medium">Progress</th>
              <th className="p-3 text-left text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={8}
                  className="p-8 text-center text-sm text-muted-foreground"
                >
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                  Loading campaigns...
                </td>
              </tr>
            ) : campaigns.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="p-8 text-center text-sm text-muted-foreground"
                >
                  No campaigns found.{" "}
                  <Link
                    href="/dashboard/content/campaigns/new"
                    className="text-primary hover:underline"
                  >
                    Create your first campaign
                  </Link>
                </td>
              </tr>
            ) : (
              campaigns.map((campaign) => (
                <tr
                  key={campaign._id}
                  className="border-b last:border-0 hover:bg-gray-50"
                >
                  <td className="p-3">
                    <span className="font-medium text-sm">{campaign.name}</span>
                  </td>
                  <td className="p-3">
                    <span
                      className={cn(
                        "text-xs px-2 py-1 rounded-full font-medium",
                        STATUS_COLORS[campaign.status] || "bg-gray-100 text-gray-800"
                      )}
                    >
                      {campaign.status}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">
                    {new Date(campaign.dateRange.start).toLocaleDateString()} –{" "}
                    {new Date(campaign.dateRange.end).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-sm">{campaign.stats?.topics ?? 0}</td>
                  <td className="p-3 text-sm">{campaign.stats?.articles ?? 0}</td>
                  <td className="p-3 text-sm">{campaign.stats?.published ?? 0}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${campaign.progress || 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {campaign.progress || 0}%
                      </span>
                    </div>
                  </td>
                  <td className="p-3">
                    <Link
                      href={`/dashboard/content/campaigns/${campaign._id}`}
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      View <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
