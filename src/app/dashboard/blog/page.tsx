"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface BlogPost {
  _id: string;
  title: string;
  slug: string;
  status: string;
  viewCount: number;
  publishedAt?: string;
  createdAt: string;
  author?: { name: string };
  category?: { name: string };
  featuredImage?: string;
}

const STATUS_FILTERS = ["all", "draft", "published", "archived"];

export default function BlogDashboardPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchPosts = () => {
    setLoading(true);
    const params = new URLSearchParams({ allStatuses: "true", limit: "20", page: String(page) });
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (search) params.set("search", search);

    fetch(`/api/blog/posts?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setPosts(d.data);
          setTotalPages(d.pagination?.totalPages || 1);
          setTotal(d.pagination?.total || 0);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPosts(); }, [page, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPosts();
  };

  const deletePost = async (slug: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    const res = await fetch(`/api/blog/posts/${slug}`, { method: "DELETE" });
    if (res.ok) setPosts(posts.filter((p) => p.slug !== slug));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Blog Posts</h2>
          <p className="text-sm text-muted-foreground">{total} total posts</p>
        </div>
        <Link href="/dashboard/blog/new" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> New Post
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search posts..."
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
      </div>

      <div className="rounded-lg border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left text-sm font-medium">Title</th>
              <th className="p-3 text-left text-sm font-medium">Category</th>
              <th className="p-3 text-left text-sm font-medium">Author</th>
              <th className="p-3 text-left text-sm font-medium">Status</th>
              <th className="p-3 text-left text-sm font-medium">Views</th>
              <th className="p-3 text-left text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">Loading...</td></tr>
            ) : posts.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">No posts found.</td></tr>
            ) : (
              posts.map((post) => (
                <tr key={post._id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {post.featuredImage ? (
                        <div className="h-10 w-10 rounded-lg overflow-hidden bg-muted shrink-0">
                          <img src={post.featuredImage} alt="" className="h-full w-full object-cover" />
                        </div>
                      ) : null}
                      <span className="font-medium text-sm">{post.title}</span>
                    </div>
                  </td>
                  <td className="p-3 text-sm">{post.category?.name || "-"}</td>
                  <td className="p-3 text-sm">{post.author?.name || "-"}</td>
                  <td className="p-3">
                    <span className={cn("text-xs px-2 py-1 rounded-full",
                      post.status === "published" ? "bg-green-100 text-green-800" :
                      post.status === "draft" ? "bg-yellow-100 text-yellow-800" :
                      "bg-gray-100 text-gray-800"
                    )}>
                      {post.status}
                    </span>
                  </td>
                  <td className="p-3 text-sm">{post.viewCount}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Link href={`/dashboard/blog/edit/${post.slug}`} className="text-sm text-primary hover:underline">Edit</Link>
                      <Link href={`/blog/${post.slug}`} target="_blank" className="text-sm text-muted-foreground hover:underline">View</Link>
                      <button onClick={() => deletePost(post.slug)} className="text-sm text-destructive hover:underline">Delete</button>
                    </div>
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
