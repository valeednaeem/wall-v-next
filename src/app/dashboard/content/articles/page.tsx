"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  Search,
  Loader2,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ContentItem {
  _id: string;
  title: string;
  type: string;
  platform?: string;
  status: string;
  qualityScore?: number;
  campaign?: { name: string; _id: string };
  scheduledAt?: string;
  publishedAt?: string;
  createdAt: string;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "review", label: "Review" },
  { value: "approved", label: "Approved" },
  { value: "scheduled", label: "Scheduled" },
  { value: "published", label: "Published" },
];

const TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "article", label: "Article" },
  { value: "social", label: "Social" },
  { value: "video", label: "Video" },
];

const PLATFORM_OPTIONS = [
  { value: "all", label: "All Platforms" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "facebook", label: "Facebook" },
  { value: "x", label: "X / Twitter" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
];

const STATUS_COLORS: Record<string, string> = {
  published: "bg-green-100 text-green-800",
  scheduled: "bg-blue-100 text-blue-800",
  approved: "bg-purple-100 text-purple-800",
  review: "bg-yellow-100 text-yellow-800",
  draft: "bg-gray-100 text-gray-800",
  pending: "bg-yellow-100 text-yellow-800",
};

export default function ArticlesPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (platformFilter !== "all") params.set("platform", platformFilter);
      if (search) params.set("search", search);

      const res = await fetch(`/api/content/items?${params}`);
      const data = await res.json();
      if (data.success) {
        setItems(data.data);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotal(data.pagination?.total || 0);
      }
    } catch (error) {
      console.error("Failed to fetch items:", error);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, typeFilter, platformFilter, search]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchItems();
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((i) => i._id)));
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} items?`)) return;
    for (const id of selected) {
      await fetch(`/api/content/items/${id}`, { method: "DELETE" });
    }
    setSelected(new Set());
    fetchItems();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> Content Items
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total} total items
          </p>
        </div>
        <Link
          href="/dashboard/content/articles/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> New Item
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title..."
            className="w-full rounded-lg border bg-white pl-9 pr-4 py-2 text-sm"
          />
        </form>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={platformFilter} onValueChange={(v) => { setPlatformFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            {PLATFORM_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <span className="text-sm">{selected.size} selected</span>
          <button
            onClick={handleBulkDelete}
            className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left text-sm font-medium w-8">
                <input
                  type="checkbox"
                  checked={selected.size === items.length && items.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded"
                />
              </th>
              <th className="p-3 text-left text-sm font-medium">Title</th>
              <th className="p-3 text-left text-sm font-medium">Type</th>
              <th className="p-3 text-left text-sm font-medium">Platform</th>
              <th className="p-3 text-left text-sm font-medium">Status</th>
              <th className="p-3 text-left text-sm font-medium">Quality</th>
              <th className="p-3 text-left text-sm font-medium">Campaign</th>
              <th className="p-3 text-left text-sm font-medium">Date</th>
              <th className="p-3 text-left text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-sm text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                  Loading content...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-sm text-muted-foreground">
                  No content items found.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item._id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selected.has(item._id)}
                      onChange={() => toggleSelect(item._id)}
                      className="rounded"
                    />
                  </td>
                  <td className="p-3">
                    <span className="font-medium text-sm">{item.title}</span>
                  </td>
                  <td className="p-3 text-sm capitalize">{item.type}</td>
                  <td className="p-3 text-sm capitalize">{item.platform || "-"}</td>
                  <td className="p-3">
                    <span
                      className={cn(
                        "text-xs px-2 py-1 rounded-full font-medium",
                        STATUS_COLORS[item.status] || "bg-gray-100 text-gray-800"
                      )}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="p-3 text-sm">
                    {item.qualityScore != null ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-10 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${item.qualityScore * 10}%` }}
                          />
                        </div>
                        <span className="text-xs">{item.qualityScore}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </td>
                  <td className="p-3 text-sm truncate max-w-[150px]">
                    {item.campaign?.name || "-"}
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">
                    {new Date(item.scheduledAt || item.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-3">
                    <Link
                      href={`/dashboard/content/articles/${item._id}`}
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      Edit <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
