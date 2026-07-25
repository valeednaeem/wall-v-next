"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface BlogPost {
  _id: string;
  title: string;
  slug: string;
  status: string;
  viewCount: number;
  publishedAt?: string;
  author?: { name: string };
  category?: { name: string };
}

export default function BlogDashboardPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/blog/posts?limit=100")
      .then((r) => r.json())
      .then((d) => { if (d.success) setPosts(d.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const deletePost = async (slug: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    const res = await fetch(`/api/blog/posts/${slug}`, { method: "DELETE" });
    if (res.ok) setPosts(posts.filter((p) => p.slug !== slug));
  };

  const filtered = posts.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Blog Posts</h2>
        <Link href="/dashboard/blog/new" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          + New Post
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <input type="text" placeholder="Search posts..." value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-lg border px-3 py-2 text-sm w-full max-w-sm" />
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
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">No posts found.</td></tr>
            ) : (
              filtered.map((post) => (
                <tr key={post._id} className="border-b last:border-0">
                  <td className="p-3 font-medium text-sm">{post.title}</td>
                  <td className="p-3 text-sm">{post.category?.name || "-"}</td>
                  <td className="p-3 text-sm">{post.author?.name || "-"}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${post.status === "published" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                      {post.status}
                    </span>
                  </td>
                  <td className="p-3 text-sm">{post.viewCount}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Link href={`/blog/${post.slug}`} target="_blank" className="text-sm text-primary hover:underline">View</Link>
                      <button onClick={() => deletePost(post.slug)} className="text-sm text-destructive hover:underline">Delete</button>
                    </div>
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
