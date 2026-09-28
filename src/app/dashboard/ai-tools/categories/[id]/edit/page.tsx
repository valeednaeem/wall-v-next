"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import CategoryForm, { CategoryFormData } from "@/components/ai-tools/category-form";

export default function EditCategoryPage() {
  const params = useParams<{ id: string }>();
  const [category, setCategory] = useState<CategoryFormData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/ai-tools/categories/${params.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setCategory(d.data as CategoryFormData);
        else setError(d.error || "Failed to load category");
      })
      .catch(() => setError("Failed to load category"));
  }, [params.id]);

  if (error) {
    return <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>;
  }

  if (!category) {
    return <div className="space-y-4"><div className="h-8 bg-muted rounded w-48 animate-pulse" /><div className="h-64 bg-muted rounded-xl animate-pulse" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Edit Category</h2>
        <p className="text-sm text-muted-foreground">/{category.slug}</p>
      </div>
      <CategoryForm category={category} />
    </div>
  );
}
