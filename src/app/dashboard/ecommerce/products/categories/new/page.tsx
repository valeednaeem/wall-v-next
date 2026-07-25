"use client";

import CategoryForm from "@/components/forms/product/category-form";

export default function NewCategoryPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Create New Category</h2>
      <CategoryForm />
    </div>
  );
}
