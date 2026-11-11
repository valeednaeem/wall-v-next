"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ListChecks,
  Loader2,
  RefreshCw,
  RotateCcw,
  XCircle,
  Send,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PublicationJob {
  _id: string;
  contentType: "blog" | "content-item";
  contentId: string;
  platform: string;
  state: string;
  attempt: number;
  maxAttempts: number;
  error?: string;
  errorCode?: string;
  platformUrl?: string;
  publishedAt?: string;
  generatedBy?: string;
  nextAttemptAt?: string;
  createdAt: string;
  updatedAt: string;
  payload?: { title?: string; link?: string };
}

interface JobsResponse {
  success: boolean;
  data: PublicationJob[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  summary: Record<string, number>;
}

const STATES = [
  "pending",
  "processing",
  "published",
  "retrying",
  "failed",
  "cancelled",
  "needs_review",
] as const;

const PLATFORMS = [
  { id: "linkedin", label: "LinkedIn" },
  { id: "facebook", label: "Facebook" },
  { id: "x", label: "X / Twitter" },
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "youtube", label: "YouTube" },
];

const STATE_BADGES: Record<string, { label: string; className: string }> = {
  published: { label: "Published", className: "bg-green-100 text-green-800" },
  pending: { label: "Pending", className: "bg-gray-100 text-gray-700" },
  processing: { label: "Processing", className: "bg-blue-100 text-blue-800" },
  retrying: { label: "Retrying", className: "bg-yellow-100 text-yellow-800" },
  failed: { label: "Failed", className: "bg-red-100 text-red-800" },
  cancelled: { label: "Cancelled", className: "bg-gray-200 text-gray-600" },
  needs_review: { label: "Needs Review", className: "bg-orange-100 text-orange-800" },
};

const RETRYABLE = ["failed", "needs_review", "cancelled", "retrying"];
const CANCELLABLE = ["pending", "retrying", "needs_review"];

export default function PublishQueuePage() {
  const [jobs, setJobs] = useState<PublicationJob[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchJobs = useCallback(
    async (page: number) => {
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: "20",
        });
        if (stateFilter !== "all") params.set("state", stateFilter);
        if (platformFilter !== "all") params.set("platform", platformFilter);

        const res = await fetch(`/api/social/jobs?${params.toString()}`);
        if (!res.ok) return;
        const data: JobsResponse = await res.json();
        setJobs(data.data || []);
        setSummary(data.summary || {});
        setPagination(data.pagination);
      } catch (error) {
        console.error("Failed to fetch publish queue:", error);
      } finally {
        setLoading(false);
      }
    },
    [stateFilter, platformFilter]
  );

  useEffect(() => {
    setLoading(true);
    fetchJobs(1);
  }, [fetchJobs]);

  useEffect(() => {
    const interval = setInterval(() => fetchJobs(pagination.page), 15000);
    return () => clearInterval(interval);
  }, [fetchJobs, pagination.page]);

  const runAction = async (job: PublicationJob, action: "retry" | "cancel" | "republish") => {
    setActioning(`${job._id}:${action}`);
    setActionError(null);
    try {
      const res = await fetch(`/api/social/jobs/${job._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(data.error || `Action "${action}" failed`);
      }
      await fetchJobs(pagination.page);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Action failed");
    } finally {
      setActioning(null);
    }
  };

  const stateChips = [
    { key: "all", label: "All", count: Object.values(summary).reduce((a, b) => a + b, 0) },
    ...STATES.map((s) => ({ key: s, label: STATE_BADGES[s].label, count: summary[s] || 0 })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" /> Publish Queue
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Durable event-driven publication jobs across all social platforms
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchJobs(pagination.page)}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-1.5" />
          )}
          Refresh
        </Button>
      </div>

      {/* State summary chips */}
      <div className="flex flex-wrap gap-2">
        {stateChips.map((chip) => (
          <button
            key={chip.key}
            onClick={() => setStateFilter(chip.key)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
              stateFilter === chip.key
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-muted/50"
            )}
          >
            {chip.label}
            <span className="ml-1.5 font-bold">{chip.count}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={platformFilter}
          onValueChange={(v) => {
            setPlatformFilter(v);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All platforms</SelectItem>
            {PLATFORMS.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {stateFilter !== "all" && (
          <Button variant="ghost" size="sm" onClick={() => setStateFilter("all")}>
            Clear state filter
          </Button>
        )}
      </div>

      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {actionError}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Jobs</span>
            <span className="text-sm font-normal text-muted-foreground">
              {pagination.total} total
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-10">
              <ListChecks className="h-8 w-8 text-muted-300 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No publication jobs match this filter.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {jobs.map((job) => {
                const badge = STATE_BADGES[job.state] || STATE_BADGES.pending;
                const busy = actioning?.startsWith(job._id);
                return (
                  <div
                    key={job._id}
                    className="rounded-lg border p-3 flex flex-col md:flex-row md:items-center gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate">
                          {job.payload?.title || "Untitled content"}
                        </p>
                        <span
                          className={cn(
                            "text-[11px] px-2 py-0.5 rounded-full font-medium",
                            badge.className
                          )}
                        >
                          {badge.label}
                        </span>
                        <Badge variant="outline" className="text-[11px] capitalize">
                          {job.platform}
                        </Badge>
                        <Badge variant="secondary" className="text-[11px]">
                          {job.contentType === "blog" ? "Blog" : "Content"}
                        </Badge>
                        {job.generatedBy && (
                          <Badge variant="outline" className="text-[11px] capitalize">
                            {job.generatedBy}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          Attempt {job.attempt}/{job.maxAttempts}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(job.updatedAt).toLocaleString()}
                        </span>
                        {job.state === "published" && job.platformUrl && (
                          <a
                            href={job.platformUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                          >
                            View post <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      {job.error && job.state !== "published" && (
                        <p className="text-xs text-red-600 mt-1 line-clamp-2">
                          {job.error}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {RETRYABLE.includes(job.state) && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => runAction(job, "retry")}
                        >
                          {busy && actioning === `${job._id}:retry` ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3.5 w-3.5" />
                          )}
                          Retry
                        </Button>
                      )}
                      {CANCELLABLE.includes(job.state) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => runAction(job, "cancel")}
                        >
                          {busy && actioning === `${job._id}:cancel` ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5" />
                          )}
                          Cancel
                        </Button>
                      )}
                      {job.state === "published" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => runAction(job, "republish")}
                        >
                          {busy && actioning === `${job._id}:republish` ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className="h-3.5 w-3.5" />
                          )}
                          Republish
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => fetchJobs(pagination.page - 1)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchJobs(pagination.page + 1)}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
