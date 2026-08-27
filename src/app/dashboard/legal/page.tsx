"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  FileText, Plus, Search, Loader2, Edit, Eye, Trash2, Clock,
  CheckCircle2, XCircle, Globe
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LegalPage {
  _id: string;
  title: string;
  slug: string;
  content: string;
  type: string;
  version: string;
  status: "draft" | "published" | "scheduled";
  isActive: boolean;
  language: string;
  lastPublishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  privacy: { label: "Privacy Policy", color: "bg-blue-100 text-blue-700" },
  terms: { label: "Terms of Service", color: "bg-purple-100 text-purple-700" },
  refund: { label: "Refund Policy", color: "bg-green-100 text-green-700" },
  cookie: { label: "Cookie Policy", color: "bg-amber-100 text-amber-700" },
  disclaimer: { label: "Disclaimer", color: "bg-gray-100 text-gray-700" },
  accessibility: { label: "Accessibility", color: "bg-cyan-100 text-cyan-700" },
  "acceptable-use": { label: "Acceptable Use", color: "bg-orange-100 text-orange-700" },
  "ai-usage": { label: "AI Usage Policy", color: "bg-indigo-100 text-indigo-700" },
  "data-processing": { label: "Data Processing", color: "bg-rose-100 text-rose-700" },
  copyright: { label: "Copyright", color: "bg-teal-100 text-teal-700" },
  other: { label: "Other", color: "bg-gray-100 text-gray-600" },
};

const STATUS_ICONS: Record<string, typeof CheckCircle2> = {
  published: CheckCircle2,
  draft: XCircle,
  scheduled: Clock,
};

export default function LegalDashboardPage() {
  const { status } = useSession();
  const [pages, setPages] = useState<LegalPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedPage, setSelectedPage] = useState<LegalPage | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [formData, setFormData] = useState<Partial<LegalPage>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      window.location.href = "/login?callbackUrl=/dashboard/legal";
      return;
    }
    fetchPages();
  }, [status]);

  const fetchPages = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/legal");
      const data = await res.json();
      setPages(data.pages || data.data || []);
    } catch {
      console.error("Failed to fetch legal pages");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({ title: "", slug: "", content: "", type: "privacy", version: "1.0", status: "draft", isActive: true, language: "en" });
    setSelectedPage(null);
    setShowEditor(true);
  };

  const handleEdit = (page: LegalPage) => {
    setFormData({ ...page });
    setSelectedPage(page);
    setShowEditor(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const method = selectedPage ? "PUT" : "POST";
      const url = selectedPage ? `/api/legal/${selectedPage._id}` : "/api/legal";
      await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) });
      setShowEditor(false);
      fetchPages();
    } catch {
      console.error("Failed to save legal page");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this legal page?")) return;
    await fetch(`/api/legal/${id}`, { method: "DELETE" });
    fetchPages();
  };

  const filtered = pages.filter((p) => {
    if (search && !p.title.toLowerCase().includes(search.toLowerCase()) && !p.slug.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType !== "all" && p.type !== filterType) return false;
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    return true;
  });

  const publishedCount = pages.filter((p) => p.status === "published").length;
  const draftCount = pages.filter((p) => p.status === "draft").length;

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Legal Pages</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage privacy policy, terms of service, and other legal documents</p>
        </div>
        <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm">
          <Plus className="h-4 w-4" />New Page
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Pages</p>
          <p className="text-2xl font-bold">{pages.length}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-muted-foreground mb-1">Published</p>
          <p className="text-2xl font-bold text-green-600">{publishedCount}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-muted-foreground mb-1">Drafts</p>
          <p className="text-2xl font-bold text-amber-600">{draftCount}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-muted-foreground mb-1">Types</p>
          <p className="text-2xl font-bold">{new Set(pages.map((p) => p.type)).size}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Search pages..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-muted/50 pl-9 pr-4 py-2 text-sm" />
        </div>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="rounded-lg border bg-background px-3 py-2 text-sm">
          <option value="all">All Types</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-lg border bg-background px-3 py-2 text-sm">
          <option value="all">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
        </select>
      </div>

      {/* Pages List */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No legal pages found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Title</th>
                <th className="text-left p-3 font-medium">Type</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Version</th>
                <th className="text-left p-3 font-medium">Language</th>
                <th className="text-left p-3 font-medium">Updated</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((page) => {
                const StatusIcon = STATUS_ICONS[page.status] || XCircle;
                const typeInfo = TYPE_LABELS[page.type] || TYPE_LABELS.other;
                return (
                  <tr key={page._id} className="border-t hover:bg-muted/30">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{page.title}</p>
                          <p className="text-xs text-muted-foreground">/{page.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3"><span className={cn("text-xs px-2 py-0.5 rounded", typeInfo.color)}>{typeInfo.label}</span></td>
                    <td className="p-3">
                      <span className={cn("flex items-center gap-1 text-xs px-2 py-0.5 rounded",
                        page.status === "published" ? "bg-green-100 text-green-700" :
                        page.status === "scheduled" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                      )}>
                        <StatusIcon className="h-3 w-3" />{page.status}
                      </span>
                    </td>
                    <td className="p-3 text-xs">v{page.version}</td>
                    <td className="p-3"><span className="text-xs bg-muted px-2 py-0.5 rounded flex items-center gap-1"><Globe className="h-3 w-3" />{page.language}</span></td>
                    <td className="p-3 text-xs text-muted-foreground">{new Date(page.updatedAt).toLocaleDateString()}</td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => window.open(`/${page.slug}`, "_blank")} className="p-1.5 hover:bg-muted rounded" title="Preview"><Eye className="h-4 w-4" /></button>
                        <button onClick={() => handleEdit(page)} className="p-1.5 hover:bg-muted rounded" title="Edit"><Edit className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(page._id)} className="p-1.5 hover:bg-destructive/10 text-destructive rounded" title="Delete"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">{selectedPage ? "Edit Legal Page" : "New Legal Page"}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Title</label>
                  <input type="text" value={formData.title || ""} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="Privacy Policy" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Slug</label>
                  <input type="text" value={formData.slug || ""} onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="privacy-policy" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Type</label>
                  <select value={formData.type || "privacy"} onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm">
                    {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Status</label>
                  <select value={formData.status || "draft"} onChange={(e) => setFormData({ ...formData, status: e.target.value as LegalPage["status"] })}
                    className="w-full rounded-lg border px-3 py-2 text-sm">
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="scheduled">Scheduled</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Version</label>
                  <input type="text" value={formData.version || "1.0"} onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Content (HTML)</label>
                <textarea value={formData.content || ""} onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm font-mono min-h-[300px]" placeholder="<h1>Privacy Policy</h1>..." />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={() => setShowEditor(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-muted">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> : null}
                {selectedPage ? "Save Changes" : "Create Page"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
