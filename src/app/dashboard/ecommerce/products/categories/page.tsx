"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Trash2, Edit } from "lucide-react";

interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
  productCount?: number;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/products/categories")
      .then((r) => r.json())
      .then((d) => { if (d.success) setCategories(d.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (slug: string) => {
    if (!confirm("Delete this category?")) return;
    await fetch(`/api/products/categories/${slug}`, { method: "DELETE" });
    setCategories((prev) => prev.filter((c) => c.slug !== slug));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Categories</h2>
        <Link href="/dashboard/ecommerce/products/categories/new" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Add Category
        </Link>
      </div>

      <div className="rounded-lg border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left text-sm font-medium">Name</th>
              <th className="p-3 text-left text-sm font-medium">Slug</th>
              <th className="p-3 text-left text-sm font-medium">Icon</th>
              <th className="p-3 text-left text-sm font-medium">Order</th>
              <th className="p-3 text-left text-sm font-medium">Status</th>
              <th className="p-3 text-right text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">Loading...</td></tr>
            ) : categories.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">No categories yet. Create your first one.</td></tr>
            ) : (
              categories.map((cat) => (
                <tr key={cat._id} className="border-b last:border-0">
                  <td className="p-3 font-medium text-sm">{cat.name}</td>
                  <td className="p-3 text-sm text-muted-foreground">{cat.slug}</td>
                  <td className="p-3 text-sm">{cat.icon || "-"}</td>
                  <td className="p-3 text-sm">{cat.sortOrder}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${cat.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                      {cat.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/dashboard/ecommerce/products/categories/${cat.slug}`} className="p-1 hover:bg-muted rounded">
                        <Edit className="h-4 w-4" />
                      </Link>
                      <button onClick={() => handleDelete(cat.slug)} className="p-1 hover:bg-muted rounded text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
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
