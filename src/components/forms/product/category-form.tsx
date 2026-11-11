"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ImageUpload from "@/components/media/image-upload";
import HtmlEditor from "@/components/editor/html-editor";

interface CategoryFormProps {
  category?: any;
}

export default function CategoryForm({ category }: CategoryFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: category?.name || "",
    slug: category?.slug || "",
    description: category?.description || "",
    image: category?.image || "",
    icon: category?.icon || "",
    sortOrder: category?.sortOrder || 0,
    isActive: category?.isActive ?? true,
  });

  const generateSlug = (name: string) => name.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/--+/g, "-").trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = category ? `/api/products/categories/${category.slug}` : "/api/products/categories";
      const method = category ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, slug: form.slug || generateSlug(form.name) }) });
      if (res.ok) router.push("/dashboard/ecommerce/products/categories");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="rounded-xl border p-6 space-y-4">
        <h3 className="font-semibold">General Information</h3>
        <div>
          <label className="text-sm font-medium">Name *</label>
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: generateSlug(e.target.value) })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" required />
        </div>
        <div>
          <label className="text-sm font-medium">Slug</label>
          <input type="text" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium">Description</label>
          <div className="mt-1">
            <HtmlEditor value={form.description} onChange={(html) => setForm({ ...form, description: html })} placeholder="Category description..." minHeight="100px" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border p-6 space-y-4">
        <h3 className="font-semibold">Media</h3>
        <ImageUpload value={form.image} onChange={(url) => setForm({ ...form, image: url })} />
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

      <button type="submit" disabled={loading} className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
        {loading ? "Saving..." : category ? "Update Category" : "Create Category"}
      </button>
    </form>
  );
}
