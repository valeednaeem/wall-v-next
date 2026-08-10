"use client";

import { useState, useEffect } from "react";
import {
  Loader2, Eye, Clock, Shield, CheckCircle, XCircle,
  ExternalLink, RefreshCw, Ban, DollarSign, Search,
  ChevronDown, ChevronUp, AlertTriangle
} from "lucide-react";

interface Preview {
  _id: string;
  projectId: { _id: string; name: string; slug: string } | null;
  token: string;
  status: "active" | "expired" | "revoked" | "paid";
  expiresAt: string;
  accessCount: number;
  maxAccesses: number;
  paymentRequired: boolean;
  paymentStatus: "unpaid" | "paid";
  createdAt: string;
  lastAccessedAt?: string;
  accessLog: {
    timestamp: string;
    event: string;
    ip?: string;
    userAgent?: string;
    details?: string;
  }[];
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  expired: "bg-amber-100 text-amber-800",
  revoked: "bg-red-100 text-red-800",
  paid: "bg-blue-100 text-blue-800",
};

export default function PreviewsPage() {
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchPreviews();
  }, [statusFilter]);

  const fetchPreviews = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/admin/previews?${params}`);
      const data = await res.json();
      if (data.success) setPreviews(data.data);
    } catch (err) {
      console.error("Failed to fetch previews:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (previewId: string, action: string, extra?: Record<string, unknown>) => {
    setActionLoading(previewId);
    try {
      await fetch("/api/admin/previews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ previewId, action, ...extra }),
      });
      await fetchPreviews();
    } catch (err) {
      console.error(`Failed to ${action} preview:`, err);
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = previews.filter((p) => {
    if (search) {
      const q = search.toLowerCase();
      const projectName = p.projectId?.name?.toLowerCase() || "";
      const token = p.token.toLowerCase();
      if (!projectName.includes(q) && !token.includes(q)) return false;
    }
    return true;
  });

  const formatDate = (d: string) => new Date(d).toLocaleString();
  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

  return (
    <div className="min-h-screen bg-background">
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Preview Management</h1>
            <p className="text-sm text-muted-foreground">Manage secure preview tokens, access, and expiration</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {previews.filter((p) => p.status === "active").length} active
            </span>
            <span className="text-sm text-muted-foreground">
              {previews.filter((p) => p.status === "expired").length} expired
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <input
            type="text"
            placeholder="Search by project name or token..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm w-full max-w-sm"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="revoked">Revoked</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        {/* Previews Table */}
        <div className="rounded-lg border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left text-sm font-medium">Project</th>
                <th className="p-3 text-left text-sm font-medium">Status</th>
                <th className="p-3 text-left text-sm font-medium">Expires</th>
                <th className="p-3 text-left text-sm font-medium">Access</th>
                <th className="p-3 text-left text-sm font-medium">Payment</th>
                <th className="p-3 text-left text-sm font-medium">Created</th>
                <th className="p-3 text-left text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Loading previews...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">
                    No previews found.
                  </td>
                </tr>
              ) : (
                filtered.map((preview) => (
                  <>
                    <tr key={preview._id} className="border-b last:border-0">
                      <td className="p-3">
                        <p className="font-medium text-sm">
                          {preview.projectId?.name || "Unknown Project"}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {preview.token.slice(0, 16)}...
                        </p>
                      </td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[preview.status] || ""}`}>
                          {preview.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <p className={`text-sm ${isExpired(preview.expiresAt) ? "text-red-600 font-medium" : ""}`}>
                          {formatDate(preview.expiresAt)}
                        </p>
                        {isExpired(preview.expiresAt) && (
                          <p className="text-xs text-red-500">Expired</p>
                        )}
                      </td>
                      <td className="p-3">
                        <p className="text-sm">
                          {preview.accessCount}/{preview.maxAccesses}
                        </p>
                      </td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          preview.paymentStatus === "paid" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"
                        }`}>
                          {preview.paymentStatus}
                        </span>
                      </td>
                      <td className="p-3 text-sm">{formatDate(preview.createdAt)}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setExpandedId(expandedId === preview._id ? null : preview._id)}
                            className="p-1 hover:bg-muted rounded"
                            title="View access logs"
                          >
                            {expandedId === preview._id ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                          {preview.status === "active" && (
                            <>
                              <button
                                onClick={() => handleAction(preview._id, "revoke")}
                                disabled={actionLoading === preview._id}
                                className="p-1 hover:bg-red-100 rounded text-red-600"
                                title="Revoke"
                              >
                                <Ban className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleAction(preview._id, "extend", { expiresInMinutes: 5 })}
                                disabled={actionLoading === preview._id}
                                className="p-1 hover:bg-green-100 rounded text-green-600"
                                title="Extend 5 min"
                              >
                                <Clock className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          {preview.status === "expired" && (
                            <button
                              onClick={() => handleAction(preview._id, "regenerate")}
                              disabled={actionLoading === preview._id}
                              className="p-1 hover:bg-blue-100 rounded text-blue-600"
                              title="Regenerate token"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleAction(preview._id, "mark-paid")}
                            disabled={actionLoading === preview._id || preview.paymentStatus === "paid"}
                            className="p-1 hover:bg-blue-100 rounded text-blue-600"
                            title="Mark as paid"
                          >
                            <DollarSign className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedId === preview._id && (
                      <tr key={`${preview._id}-logs`}>
                        <td colSpan={7} className="p-4 bg-muted/30">
                          <h4 className="text-sm font-semibold mb-2">Access Log</h4>
                          {preview.accessLog && preview.accessLog.length > 0 ? (
                            <div className="space-y-1">
                              {preview.accessLog
                                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                                .slice(0, 10)
                                .map((log, i) => (
                                  <div key={i} className="flex items-center gap-4 text-xs">
                                    <span className="text-muted-foreground w-40">{formatDate(log.timestamp)}</span>
                                    <span className={`font-medium ${
                                      log.event.includes("INVALID") || log.event.includes("REVOKED")
                                        ? "text-red-600"
                                        : log.event.includes("ACCESSED")
                                          ? "text-green-600"
                                          : "text-blue-600"
                                    }`}>
                                      {log.event}
                                    </span>
                                    {log.ip && <span className="text-muted-foreground">{log.ip}</span>}
                                    {log.details && <span className="text-muted-foreground">{log.details}</span>}
                                  </div>
                                ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">No access logs yet.</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
