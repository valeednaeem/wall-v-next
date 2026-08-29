"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import HtmlEditor from "@/components/editor/html-editor";
import ImageUpload from "@/components/media/image-upload";
import AIAssist from "@/components/ai/ai-assist";

interface Category {
  _id: string;
  name: string;
}

interface BlogPost {
  _id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featuredImage?: string;
  category?: { _id: string; name: string };
  tags?: { _id: string; name: string }[];
  status: string;
  isFeatured: boolean;
  seo?: { metaTitle?: string; metaDescription?: string; keywords?: string[] };
}

export default function EditBlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [post, setPost] = useState<BlogPost | null>(null);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    featuredImage: "",
    category: "",
    tags: "",
    status: "draft",
    isFeatured: false,
    seo: {
      metaTitle: "",
      metaDescription: "",
    },
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/blog/posts/${slug}?allStatuses=true`).then((r) => r.json()),
      fetch("/api/blog/categories").then((r) => r.json()),
    ]).then(([postData, catData]) => {
      if (postData.success && postData.data) {
        const p = postData.data;
        setPost(p);
        setForm({
          title: p.title || "",
          slug: p.slug || "",
          excerpt: p.excerpt || "",
          content: p.content || "",
          featuredImage: p.featuredImage || "",
          category: p.category?._id || "",
          tags: p.tags?.map((t: { name: string }) => t.name).join(", ") || "",
          status: p.status || "draft",
          isFeatured: p.isFeatured || false,
          seo: {
            metaTitle: p.seo?.metaTitle || "",
            metaDescription: p.seo?.metaDescription || "",
          },
        });
      } else {
        setError("Post not found");
      }
      if (catData.success) setCategories(catData.data);
    }).catch(() => setError("Failed to load post"))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleSubmit = async (status?: string) => {
    setSaving(true);
    setError("");
    try {
      const body = {
        ...form,
        status: status || form.status,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      };
      const res = await fetch(`/api/blog/posts/${slug}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok) {
        router.push("/dashboard/blog");
      } else {
        setError(data.error || "Failed to save post");
      }
    } catch (err) {
      setError("Network error. Please try again.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error && !post) {
    return (
      <div className="max-w-3xl space-y-6">
        <Link href="/dashboard/blog" className="text-sm text-muted-foreground hover:text-primary">← Back</Link>
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/blog" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h2 className="text-2xl font-bold">Edit Blog Post</h2>
        <span className={`text-xs px-2 py-1 rounded-full ${form.status === "published" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
          {form.status}
        </span>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Title *</label>
          <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" required />
        </div>
        <div>
          <label className="text-sm font-medium">Slug</label>
          <input type="text" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium">Excerpt</label>
          <textarea value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm min-h-[80px]" />
        </div>
        <div>
          <label className="text-sm font-medium">Featured Image</label>
          <div className="mt-1">
            <ImageUpload value={form.featuredImage} onChange={(url) => setForm({ ...form, featuredImage: url })} />
          </div>
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
            <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
          </div>
        </div>
      </div>

      {/* SEO */}
      <div className="rounded-xl border p-6 space-y-4">
        <h3 className="font-semibold">SEO</h3>
        <div>
          <label className="text-sm font-medium">Meta Title</label>
          <input type="text" value={form.seo.metaTitle} onChange={(e) => setForm({ ...form, seo: { ...form.seo, metaTitle: e.target.value } })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium">Meta Description</label>
          <textarea value={form.seo.metaDescription} onChange={(e) => setForm({ ...form, seo: { ...form.seo, metaDescription: e.target.value } })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm min-h-[80px]" />
        </div>
      </div>

      {/* Publishing */}
      <div className="rounded-xl border p-6 space-y-4">
        <h3 className="font-semibold">Publishing</h3>
        <div className="flex items-center gap-4">
          <div>
            <label className="text-sm font-medium">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm">
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div className="flex items-center gap-2 pt-6">
            <input type="checkbox" id="featured" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} className="rounded" />
            <label htmlFor="featured" className="text-sm font-medium">Featured Post</label>
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button onClick={() => handleSubmit()} disabled={saving || !form.title} className="rounded-lg border px-6 py-2.5 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50">
          {saving ? "Saving..." : "Save Changes"}
        </button>
        {form.status !== "published" && (
          <button onClick={() => handleSubmit("published")} disabled={saving || !form.title} className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
            {saving ? "Publishing..." : "Publish"}
          </button>
        )}
        {form.status === "published" && (
          <button onClick={() => handleSubmit("draft")} disabled={saving} className="rounded-lg border px-6 py-2.5 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50">
            {saving ? "Saving..." : "Unpublish"}
          </button>
        )}
      </div>

      <AIAssist
        context="blog-editor"
        resourceType="blog-post"
        currentContent={form.content}
        onApplySuggestion={(s) => setForm({ ...form, content: form.content + "\n\n" + s })}
      />
    </div>
  );
}
