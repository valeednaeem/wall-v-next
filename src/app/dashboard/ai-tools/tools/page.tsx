"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, Plus, FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn, formatPrice, formatDate } from "@/lib/utils";
import { StatusBadge, AccessBadge } from "@/components/ai-tools/status-badge";

interface Tool {
  _id: string;
  name: string;
  slug: string;
  status: string;
  accessModel: string;
  category?: { name: string; slug: string };
  stats?: {
    uniqueUsers: number;
    executions: number;
    credits: number;
    revenue: number;
    conversionRate: number;
  };
  createdAt: string;
}

const STATUS_FILTERS = ["all", "draft", "testing", "published", "unpublished", "archived"];
const ACCESS_FILTERS = ["all", "free", "freemium", "subscription"];
const BULK_ACTIONS = ["publish", "unpublish", "archive", "delete"] as const;

export default function AiToolsListPage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [accessFilter, setAccessFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const fetchTools = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ allStatuses: "true", limit: "20", page: String(page) });
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (accessFilter !== "all") params.set("accessModel", accessFilter);
    if (search) params.set("search", search);

    fetch(`/api/ai-tools?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setTools(d.data);
          setTotalPages(d.pagination?.totalPages || 1);
          setTotal(d.pagination?.total || 0);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, statusFilter, accessFilter, search]);

  useEffect(() => { fetchTools(); }, [fetchTools]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTools();
  };

  const toggleSelect = (id: string) => {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const toggleAll = () => {
    setSelected((s) => (s.length === tools.length ? [] : tools.map((t) => t._id)));
  };

  const bulkAction = async (action: (typeof BULK_ACTIONS)[number]) => {
    if (action === "delete" && !confirm(`Delete ${selected.length} tool(s)? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/ai-tools/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selected, action }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Bulk action failed");
      toast.success(`${selected.length} tool(s) ${action}d`);
      setSelected([]);
      fetchTools();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk action failed");
    } finally {
      setBusy(false);
    }
  };

  const deleteTool = async (id: string) => {
    if (!confirm("Delete this tool? This cannot be undone.")) return;
    const res = await fetch(`/api/ai-tools/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Tool deleted");
      fetchTools();
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error || "Delete failed");
    }
  };

  const exportCsv = () => {
    const params = new URLSearchParams({ type: "usage", format: "csv" });
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (accessFilter !== "all") params.set("accessModel", accessFilter);
    window.open(`/api/ai-tools/reports?${params}`, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Tools</h2>
          <p className="text-sm text-muted-foreground">{total} total tools</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">
            <FileDown className="h-4 w-4" /> Export CSV
          </button>
          <Link href="/dashboard/ai-tools/tools/create" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Add Tool
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tools..."
            className="w-full rounded-lg border bg-white pl-9 pr-4 py-2 text-sm" />
        </form>
        <div className="flex gap-1 overflow-x-auto">
          {STATUS_FILTERS.map((s) => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
              className={cn("px-3 py-1.5 text-xs rounded-full border whitespace-nowrap",
                statusFilter === s ? "bg-primary text-primary-foreground" : "bg-white hover:bg-muted")}>
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {ACCESS_FILTERS.map((a) => (
            <button key={a} onClick={() => { setAccessFilter(a); setPage(1); }}
              className={cn("px-3 py-1.5 text-xs rounded-full border whitespace-nowrap",
                accessFilter === a ? "bg-primary text-primary-foreground" : "bg-white hover:bg-muted")}>
              {a === "all" ? "Any access" : a.charAt(0).toUpperCase() + a.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk bar */}
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/50 px-4 py-3">
          <span className="text-sm font-medium">{selected.length} selected</span>
          <div className="flex gap-2 ml-auto">
            {BULK_ACTIONS.map((action) => (
              <button key={action} onClick={() => bulkAction(action)} disabled={busy}
                className={cn("px-3 py-1.5 text-xs rounded-lg border disabled:opacity-50",
                  action === "delete" ? "text-destructive hover:bg-destructive/10" : "hover:bg-background")}>
                {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : action.charAt(0).toUpperCase() + action.slice(1)}
              </button>
            ))}
            <button onClick={() => setSelected([])} className="px-3 py-1.5 text-xs rounded-lg text-muted-foreground hover:underline">
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 w-10">
                <input type="checkbox" checked={selected.length > 0 && selected.length === tools.length} onChange={toggleAll} />
              </th>
              <th className="p-3 text-left text-sm font-medium">Tool</th>
              <th className="p-3 text-left text-sm font-medium">Category</th>
              <th className="p-3 text-left text-sm font-medium">Access</th>
              <th className="p-3 text-left text-sm font-medium">Status</th>
              <th className="p-3 text-right text-sm font-medium">Users</th>
              <th className="p-3 text-right text-sm font-medium">Executions</th>
              <th className="p-3 text-right text-sm font-medium">Credits</th>
              <th className="p-3 text-right text-sm font-medium">Revenue</th>
              <th className="p-3 text-right text-sm font-medium">Conv.</th>
              <th className="p-3 text-left text-sm font-medium">Created</th>
              <th className="p-3 text-left text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={12} className="p-8 text-center text-sm text-muted-foreground">Loading...</td></tr>
            ) : tools.length === 0 ? (
              <tr><td colSpan={12} className="p-8 text-center text-sm text-muted-foreground">No tools found.</td></tr>
            ) : (
              tools.map((tool) => (
                <tr key={tool._id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="p-3">
                    <input type="checkbox" checked={selected.includes(tool._id)} onChange={() => toggleSelect(tool._id)} />
                  </td>
                  <td className="p-3">
                    <div className="font-medium text-sm">{tool.name}</div>
                    <div className="text-xs text-muted-foreground">/{tool.slug}</div>
                  </td>
                  <td className="p-3 text-sm">{tool.category?.name || "-"}</td>
                  <td className="p-3"><AccessBadge accessModel={tool.accessModel} /></td>
                  <td className="p-3"><StatusBadge status={tool.status} /></td>
                  <td className="p-3 text-sm text-right">{tool.stats?.uniqueUsers ?? 0}</td>
                  <td className="p-3 text-sm text-right">{(tool.stats?.executions ?? 0).toLocaleString()}</td>
                  <td className="p-3 text-sm text-right">{(tool.stats?.credits ?? 0).toLocaleString()}</td>
                  <td className="p-3 text-sm text-right">{formatPrice(tool.stats?.revenue ?? 0)}</td>
                  <td className="p-3 text-sm text-right">{(tool.stats?.conversionRate ?? 0).toFixed(1)}%</td>
                  <td className="p-3 text-sm whitespace-nowrap">{formatDate(tool.createdAt)}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Link href={`/dashboard/ai-tools/tools/${tool._id}/edit`} className="text-sm text-primary hover:underline">Edit</Link>
                      <button onClick={() => deleteTool(tool._id)} className="text-sm text-destructive hover:underline">Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
              className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50">Previous</button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
