"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Save, Loader2, Search, Eye, EyeOff, MoreVertical, CheckCircle2, AlertCircle, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface BlogPostSEO {
  _id: string;
  slug: string;
  title: string;
  status: string;
  excerpt?: string;
  featuredImage?: string;
  author?: { name: string };
  category?: { name: string };
  publishedAt?: string;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
  };
  social?: {
    ogImage?: string;
    twitterHandle?: string;
  };
}

export default function BlogSEOPage() {
  const { data: session, status } = useSession();
  const [posts, setPosts] = useState<BlogPostSEO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ metaTitle?: string; metaDescription?: string; ogImage?: string }>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      window.location.href = "/login?callbackUrl=/dashboard/marketing/seo/blog";
      return;
    }
    fetchPosts();
  }, [status]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/marketing/seo/blog?${params}`);
      const data = await res.json();
      if (data.success) {
        setPosts(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch blog posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (post: BlogPostSEO) => {
    setEditingId(post._id);
    setEditData({ ...post.seo, ...post.social });
    setSaveMessage(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleSave = async (postId: string) => {
    setSaving(postId);
    try {
      const res = await fetch(`/api/marketing/seo/blog/${postId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });
      if (res.status === 401) { window.location.href = "/login?callbackUrl=/dashboard/marketing/seo/blog"; return; }
      const data = await res.json();
      if (res.ok && data.success) {
        setSaveMessage({ type: "success", text: "Blog post SEO saved" });
        fetchPosts();
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

  const getSEOStatus = (post: BlogPostSEO) => {
    const seo = post.seo || {};
    const social = post.social || {};
    const issues = [];
    if (!seo.metaTitle) issues.push("Missing title");
    if (!seo.metaDescription) issues.push("Missing description");
    if (!social.ogImage && !post.featuredImage) issues.push("No OG image");
    if (!post.author?.name) issues.push("No author");
    if (!post.publishedAt) issues.push("No publish date");
    return issues;
  };

  const filteredPosts = posts.filter((p) =>
    (p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase())) &&
    (!statusFilter || p.status === statusFilter)
  );

  if (status === "loading") {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Blog SEO Management</h2>
        <div className="rounded-lg border p-6 animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/4" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Blog Posts SEO Management
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Manage SEO for blog posts — titles, descriptions, Open Graph, Article schema fields</p>
        </div>
      </div>

      {saveMessage && (
        <div className={`p-3 rounded-lg text-sm ${saveMessage.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {saveMessage.text}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative max-w-md flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search blog posts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Posts Table */}
      <div className="rounded-lg border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
        ) : filteredPosts.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No blog posts found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Post</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Category</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Author</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Published</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">SEO Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Title</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Description</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">OG Image</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredPosts.map((post) => {
                  const issues = getSEOStatus(post);
                  const isEditing = editingId === post._id;
                  const ogImage = post.social?.ogImage || post.featuredImage;
                  return (
                    <tr key={post._id} className={cn("hover:bg-accent/50", isEditing && "bg-primary/5")}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-sm max-w-xs truncate">{post.title}</div>
                        <div className="text-xs text-muted-foreground font-mono">{post.slug}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">{post.category?.name || "—"}</td>
                      <td className="px-4 py-3 text-sm">{post.author?.name || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                          post.status === "published" ? "bg-green-100 text-green-700" :
                          post.status === "draft" ? "bg-gray-100 text-gray-700" :
                          post.status === "scheduled" ? "bg-blue-100 text-blue-700" :
                          "bg-amber-100 text-amber-700"
                        )}>
                          {post.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {issues.length === 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-700">
                            <CheckCircle2 className="h-3 w-3" /> OK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                            <AlertCircle className="h-3 w-3" /> {issues.length}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editData?.metaTitle ?? ""}
                            onChange={(e) => handleFieldChange("metaTitle", e.target.value)}
                            className="w-full rounded border px-2 py-1 text-sm"
                            placeholder="SEO title"
                          />
                        ) : (
                          post.seo?.metaTitle || <span className="text-muted-italic">Not set</span>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editData.metaDescription ?? ""}
                            onChange={(e) => handleFieldChange("metaDescription", e.target.value)}
                            className="w-full rounded border px-2 py-1 text-sm"
                            placeholder="SEO description"
                          />
                        ) : (
                          post.seo?.metaDescription || <span className="text-muted-italic">Not set</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            type="url"
                            value={editData.ogImage ?? ""}
                            onChange={(e) => handleFieldChange("ogImage", e.target.value)}
                            className="w-full rounded border px-2 py-1 text-sm"
                            placeholder="OG image URL"
                          />
                        ) : (
                          ogImage ? (
                            <img src={ogImage} alt="OG" className="h-10 w-10 rounded object-cover border" />
                          ) : (
                            <span className="text-muted-italic">Not set</span>
                          )
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSave(post._id)}
                              disabled={saving === post._id}
                              className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                            >
                              {saving === post._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                            </button>
                            <button onClick={handleCancel} className="inline-flex items-center gap-1 text-xs px-2 py-1 border rounded hover:bg-accent">
                              <MoreVertical className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEdit(post)}
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