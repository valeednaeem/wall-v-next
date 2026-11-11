"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  sortOrder: number;
  isActive: boolean;
}

export default function EditBlogCategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [category, setCategory] = useState<Category | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    sortOrder: 0,
    isActive: true,
  });

  useEffect(() => {
    fetch(`/api/blog/categories/${slug}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          setCategory(d.data);
          setForm({
            name: d.data.name || "",
            description: d.data.description || "",
            sortOrder: d.data.sortOrder || 0,
            isActive: d.data.isActive ?? true,
          });
        } else {
          setError("Category not found");
        }
      })
      .catch(() => setError("Failed to load category"))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/blog/categories/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        router.push("/dashboard/blog/categories");
      } else {
        setError(data.error || "Failed to update category");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error && !category) {
    return (
      <div className="max-w-2xl space-y-6">
        <Link href="/dashboard/blog/categories" className="text-sm text-muted-foreground hover:text-primary">← Back</Link>
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/blog/categories" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h2 className="text-2xl font-bold">Edit Blog Category</h2>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border p-6 space-y-4">
          <h3 className="font-semibold">General Information</h3>
          <div>
            <label className="text-sm font-medium">Name *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" required />
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm min-h-[80px]" placeholder="Optional description" />
          </div>
        </div>

        <div className="rounded-xl border p-6 space-y-4">
          <h3 className="font-semibold">Settings</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Sort Order</label>
              <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input type="checkbox" id="active" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
              <label htmlFor="active" className="text-sm font-medium">Active</label>
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving || !form.name} className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
          {saving ? "Saving..." : "Update Category"}
        </button>
      </form>
    </div>
  );
}
