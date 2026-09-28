"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, Plus } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ai-tools/status-badge";

interface Category {
  _id: string;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  toolCount?: number;
  createdAt: string;
}

export default function AiToolCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchCategories = useCallback(() => {
    setLoading(true);
    fetch("/api/ai-tools/categories")
      .then((r) => r.json())
      .then((d) => { if (d.success) setCategories(d.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const deleteCategory = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    const res = await fetch(`/api/ai-tools/categories/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Category deleted");
      fetchCategories();
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error || "Delete failed");
    }
  };

  const filtered = categories.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Categories</h2>
          <p className="text-sm text-muted-foreground">{categories.length} categories</p>
        </div>
        <Link href="/dashboard/ai-tools/categories/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Add Category
        </Link>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search categories..."
          className="w-full rounded-lg border bg-white pl-9 pr-4 py-2 text-sm" />
      </div>

      <div className="rounded-lg border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left text-sm font-medium">Name</th>
              <th className="p-3 text-left text-sm font-medium">Slug</th>
              <th className="p-3 text-left text-sm font-medium">Order</th>
              <th className="p-3 text-left text-sm font-medium">Status</th>
              <th className="p-3 text-right text-sm font-medium">Tools</th>
              <th className="p-3 text-left text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">No categories found.</td></tr>
            ) : (
              filtered.map((cat) => (
                <tr key={cat._id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="p-3 font-medium text-sm">{cat.name}</td>
                  <td className="p-3 text-sm text-muted-foreground">{cat.slug}</td>
                  <td className="p-3 text-sm">{cat.sortOrder}</td>
                  <td className="p-3">
                    <StatusBadge status={cat.isActive ? "published" : "unpublished"} />
                  </td>
                  <td className="p-3 text-sm text-right">{cat.toolCount ?? 0}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Link href={`/dashboard/ai-tools/categories/${cat._id}/edit`} className="text-sm text-primary hover:underline">Edit</Link>
                      <button onClick={() => deleteCategory(cat._id)} className="text-sm text-destructive hover:underline">Delete</button>
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
