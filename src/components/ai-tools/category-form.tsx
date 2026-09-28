"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { slugify } from "@/lib/utils";

export interface CategoryFormData {
  _id?: string;
  name: string;
  slug?: string;
  description?: string;
  icon?: string;
  image?: string;
  sortOrder: number;
  isActive: boolean;
  seo?: { metaTitle?: string; metaDescription?: string };
}

const inputCls = "w-full rounded-lg border bg-background px-3 py-2 text-sm";

export default function CategoryForm({ category }: { category?: CategoryFormData }) {
  const router = useRouter();
  const [name, setName] = useState(category?.name || "");
  const [slug, setSlug] = useState(category?.slug || "");
  const [description, setDescription] = useState(category?.description || "");
  const [icon, setIcon] = useState(category?.icon || "");
  const [image, setImage] = useState(category?.image || "");
  const [sortOrder, setSortOrder] = useState(category?.sortOrder ?? 0);
  const [isActive, setIsActive] = useState(category?.isActive ?? true);
  const [metaTitle, setMetaTitle] = useState(category?.seo?.metaTitle || "");
  const [metaDescription, setMetaDescription] = useState(category?.seo?.metaDescription || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!category && name) setSlug(slugify(name));
  }, [name, category]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = {
        name,
        slug: slug || slugify(name),
        description,
        icon,
        image,
        sortOrder,
        isActive,
        seo: { metaTitle, metaDescription },
      };
      const isEdit = Boolean(category?._id);
      const res = await fetch(isEdit ? `/api/ai-tools/categories/${category?._id}` : "/api/ai-tools/categories", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to save category");
      toast.success(isEdit ? "Category updated" : "Category created");
      router.push("/dashboard/ai-tools/categories");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save category");
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6 max-w-2xl">
      {error && <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

      <div className="rounded-lg border bg-background p-4 space-y-4">
        <div className="grid gap-1.5">
          <label className="text-sm font-medium">Name *</label>
          <input className={inputCls} value={name} required onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <label className="text-sm font-medium">Slug</label>
          <input className={inputCls} value={slug} onChange={(e) => setSlug(slugify(e.target.value))} />
        </div>
        <div className="grid gap-1.5">
          <label className="text-sm font-medium">Description</label>
          <textarea className={inputCls} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <label className="text-sm font-medium">Icon (lucide name)</label>
          <input className={inputCls} placeholder="e.g. ImageIcon" value={icon} onChange={(e) => setIcon(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <label className="text-sm font-medium">Image URL</label>
          <input className={inputCls} value={image} onChange={(e) => setImage(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <label className="text-sm font-medium">Sort order</label>
          <input type="number" className={inputCls} value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active (visible in catalogue)
        </label>
      </div>

      <div className="rounded-lg border bg-background p-4 space-y-4">
        <h3 className="text-sm font-semibold">SEO</h3>
        <div className="grid gap-1.5">
          <label className="text-sm font-medium">Meta title</label>
          <input className={inputCls} value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <label className="text-sm font-medium">Meta description</label>
          <textarea className={inputCls} rows={2} value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} />
        </div>
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {category?._id ? "Save changes" : "Create category"}
        </button>
        <button type="button" onClick={() => router.push("/dashboard/ai-tools/categories")}
          className="rounded-lg border px-5 py-2.5 text-sm font-medium hover:bg-muted">
          Cancel
        </button>
      </div>
    </form>
  );
}
