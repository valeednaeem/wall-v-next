"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Save, Loader2, Search, Eye, EyeOff, MoreVertical, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageSEO {
  _id: string;
  slug: string;
  title: string;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    canonicalUrl?: string;
    robots?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    twitterTitle?: string;
    twitterDescription?: string;
    twitterImage?: string;
  };
  status: string;
}

export default function PagesSEOPage() {
  const { data: session, status } = useSession();
  const [pages, setPages] = useState<PageSEO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<PageSEO["seo"]>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      window.location.href = "/login?callbackUrl=/dashboard/marketing/seo/pages";
      return;
    }
    fetchPages();
  }, [status]);

  const fetchPages = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/marketing/seo/pages");
      const data = await res.json();
      if (data.success) {
        setPages(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch pages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (page: PageSEO) => {
    setEditingId(page._id);
    setEditData(page.seo || {});
    setSaveMessage(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleSave = async (pageId: string) => {
    setSaving(pageId);
    try {
      const res = await fetch(`/api/marketing/seo/pages/${pageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });
      if (res.status === 401) { window.location.href = "/login?callbackUrl=/dashboard/marketing/seo/pages"; return; }
      const data = await res.json();
      if (res.ok && data.success) {
        setSaveMessage({ type: "success", text: "SEO settings saved" });
        fetchPages();
        setEditingId(null);
        setEditData({});
      } else {
        setSaveMessage({ type: "error", text: data.error || "Failed to save" });
      }
    } catch {
      setSaveMessage({ type: "error", text: "Network error" });
    } finally {
      setSaving(null);
    }
  };

  const handleFieldChange = (field: string, value: unknown) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
  };

  const getSEOStatus = (page: PageSEO) => {
    const seo = page.seo || {};
    const issues = [];
    if (!seo.metaTitle) issues.push("Missing title");
    if (!seo.metaDescription) issues.push("Missing description");
    if (!seo.canonicalUrl) issues.push("No canonical");
    if (!seo.ogImage) issues.push("No OG image");
    return issues;
  };

  const filteredPages = pages.filter((page) =>
    page.title.toLowerCase().includes(search.toLowerCase()) ||
    page.slug.toLowerCase().includes(search.toLowerCase())
  );

  if (status === "loading") {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Pages SEO Management</h2>
        <div className="rounded-lg border p-6 animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/4" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (!session) return null;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://wall-v.com";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Pages SEO Management</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage SEO metadata for all public pages</p>
        </div>
      </div>

      {saveMessage && (
        <div className={`p-3 rounded-lg text-sm ${saveMessage.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {saveMessage.text}
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search pages..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border pl-9 pr-3 py-2 text-sm"
        />
      </div>

      {/* Pages Table */}
      <div className="rounded-lg border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
        ) : filteredPages.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No pages found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Page</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">SEO Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Title</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Description</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredPages.map((page) => {
                  const issues = getSEOStatus(page);
                  const isEditing = editingId === page._id;
                  return (
                    <tr key={page._id} className={cn("hover:bg-accent/50", isEditing && "bg-primary/5")}>
                      <td className="px-4 py-3">
                        <div className="font-mono text-sm">{page.slug || "/"}</div>
                        <div className="text-xs text-muted-foreground">{page.title}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                          page.status === "published" ? "bg-green-100 text-green-700" :
                          page.status === "draft" ? "bg-gray-100 text-gray-700" :
                          "bg-amber-100 text-amber-700"
                        )}>
                          {page.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {issues.length === 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-700">
                            <CheckCircle2 className="h-3 w-3" /> All good
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                            <AlertCircle className="h-3 w-3" /> {issues.length} issue{issues.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editData.metaTitle || ""}
                            onChange={(e) => handleFieldChange("metaTitle", e.target.value)}
                            className="w-full rounded border px-2 py-1 text-sm"
                            placeholder="SEO title"
                          />
                        ) : (
                          page.seo?.metaTitle || <span className="text-muted-italic">Not set</span>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editData.metaDescription || ""}
                            onChange={(e) => handleFieldChange("metaDescription", e.target.value)}
                            className="w-full rounded border px-2 py-1 text-sm"
                            placeholder="SEO description"
                          />
                        ) : (
                          page.seo?.metaDescription || <span className="text-muted-italic">Not set</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSave(page._id)}
                              disabled={saving === page._id}
                              className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                            >
                              {saving === page._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                            </button>
                            <button onClick={handleCancel} className="inline-flex items-center gap-1 text-xs px-2 py-1 border rounded hover:bg-accent">
                              <MoreVertical className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEdit(page)}
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 border rounded hover:bg-accent"
                          >
                            <MoreVertical className="h-3 w-3" /> Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}