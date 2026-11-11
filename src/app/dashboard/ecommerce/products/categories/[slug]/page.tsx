"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import CategoryForm from "@/components/forms/product/category-form";

export default function EditCategoryPage() {
  const params = useParams();
  const router = useRouter();
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/products/categories/${params.slug}`)
      .then((r) => { if (!r.ok) throw new Error("Not found"); return r.json(); })
      .then((d) => { if (d.success) setCategory(d.data); else setError("Category not found"); })
      .catch(() => setError("Category not found"))
      .finally(() => setLoading(false));
  }, [params.slug]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error || !category) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold mb-2">{error || "Category Not Found"}</h2>
        <Link href="/dashboard/ecommerce/products/categories" className="text-primary hover:underline">Back to Categories</Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Link href="/dashboard/ecommerce/products/categories" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Categories
      </Link>
      <h1 className="text-2xl font-bold">Edit Category</h1>
      <CategoryForm category={category} />
    </div>
  );
}
