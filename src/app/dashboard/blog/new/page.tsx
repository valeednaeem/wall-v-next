"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import HtmlEditor from "@/components/editor/html-editor";

interface Category {
  _id: string;
  name: string;
}

export default function NewBlogPostPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    category: "",
    tags: "",
    status: "draft",
  });

  useEffect(() => {
    fetch("/api/blog/categories")
      .then((r) => r.json())
      .then((d) => { if (d.success) setCategories(d.data); })
      .catch(console.error);
  }, []);

  const generateSlug = (title: string) => title.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/--+/g, "-").trim();

  const handleSubmit = async (status: string) => {
    setLoading(true);
    try {
      const body = {
        ...form,
        status,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      };
      const res = await fetch("/api/blog/posts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) router.push("/dashboard/blog");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/blog" className="text-sm text-muted-foreground hover:text-primary">← Back</Link>
        <h2 className="text-2xl font-bold">New Blog Post</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Title *</label>
          <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value, slug: generateSlug(e.target.value) })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder="Enter post title" required />
        </div>
        <div>
          <label className="text-sm font-medium">Slug</label>
          <input type="text" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium">Excerpt</label>
          <textarea value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm min-h-[80px]" placeholder="Brief description" />
        </div>
        <div>
          <label className="text-sm font-medium">Content *</label>
          <div className="mt-1">
            <HtmlEditor
              value={form.content}
              onChange={(html) => setForm({ ...form, content: html })}
              placeholder="Write your blog post content here..."
              minHeight="400px"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Category</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm">
              <option value="">Select category</option>
              {categories.map((cat) => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Tags (comma separated)</label>
            <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder="react, nextjs, ai" />
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button onClick={() => handleSubmit("draft")} disabled={loading || !form.title} className="rounded-lg border px-6 py-2.5 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50">
          {loading ? "Saving..." : "Save as Draft"}
        </button>
        <button onClick={() => handleSubmit("published")} disabled={loading || !form.title} className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
          {loading ? "Publishing..." : "Publish"}
        </button>
      </div>
    </div>
  );
}
