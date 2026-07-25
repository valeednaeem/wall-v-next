"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ImageUpload from "@/components/media/image-upload";
import GalleryUpload from "@/components/media/gallery-upload";

interface Category {
  _id: string;
  name: string;
  slug: string;
}

interface ProductFormProps {
  product?: any;
}

export default function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: product?.name || "",
    slug: product?.slug || "",
    type: product?.type || "product",
    description: product?.description || "",
    shortDescription: product?.shortDescription || "",
    price: product?.price || 0,
    salePrice: product?.salePrice || 0,
    currency: product?.currency || "USD",
    category: product?.category?._id || "",
    featuredImage: product?.featuredImage || "",
    gallery: product?.gallery || [],
    badges: product?.badges?.join(", ") || "",
    features: product?.features?.join("\n") || "",
    status: product?.status || "draft",
    isFeatured: product?.isFeatured || false,
    sku: product?.sku || "",
    seo: {
      metaTitle: product?.seo?.metaTitle || "",
      metaDescription: product?.seo?.metaDescription || "",
    },
  });

  useEffect(() => {
    fetch("/api/products/categories")
      .then((r) => r.json())
      .then((d) => { if (d.success) setCategories(d.data); })
      .catch(console.error);
  }, []);

  const generateSlug = (name: string) => name.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/--+/g, "-").trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const body = {
      ...form,
      slug: form.slug || generateSlug(form.name),
      badges: form.badges.split(",").map((b: string) => b.trim()).filter(Boolean),
      features: form.features.split("\n").map((f: string) => f.trim()).filter(Boolean),
      price: Number(form.price),
      salePrice: Number(form.salePrice) || undefined,
    };

    try {
      const url = product ? `/api/products/${product.slug}` : "/api/products";
      const method = product ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) router.push("/dashboard/ecommerce/products");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Type *</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm">
              <option value="product">Product</option>
              <option value="service">Service</option>
              <option value="digital">Digital Download</option>
              <option value="hosting">Hosting</option>
              <option value="saas">SaaS</option>
              <option value="ai-service">AI Service</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Category *</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" required>
              <option value="">Select category</option>
              {categories.map((cat) => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">Short Description</label>
          <textarea value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm min-h-[80px]" />
        </div>
        <div>
          <label className="text-sm font-medium">Description *</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm min-h-[200px]" required />
        </div>
      </div>

      <div className="rounded-xl border p-6 space-y-4">
        <h3 className="font-semibold">Media</h3>
        <ImageUpload value={form.featuredImage} onChange={(url) => setForm({ ...form, featuredImage: url })} />
        <GalleryUpload value={form.gallery} onChange={(gallery) => setForm({ ...form, gallery })} />
      </div>

      <div className="rounded-xl border p-6 space-y-4">
        <h3 className="font-semibold">Pricing</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Price *</label>
            <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" required />
          </div>
          <div>
            <label className="text-sm font-medium">Sale Price</label>
            <input type="number" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: Number(e.target.value) })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium">SKU</label>
            <input type="text" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium">Badges (comma separated)</label>
            <input type="text" value={form.badges} onChange={(e) => setForm({ ...form, badges: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder="New, Sale, Popular" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">Features (one per line)</label>
          <textarea value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm min-h-[120px]" placeholder="Feature 1&#10;Feature 2&#10;Feature 3" />
        </div>
      </div>

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

      <div className="rounded-xl border p-6 space-y-4">
        <h3 className="font-semibold">Publishing</h3>
        <div className="grid grid-cols-2 gap-4">
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
            <label htmlFor="featured" className="text-sm font-medium">Featured Product</label>
          </div>
        </div>
      </div>

      <button type="submit" disabled={loading} className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
        {loading ? "Saving..." : product ? "Update Product" : "Create Product"}
      </button>
    </form>
  );
}
