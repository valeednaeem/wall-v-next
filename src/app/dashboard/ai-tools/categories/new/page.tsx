"use client";

import CategoryForm from "@/components/ai-tools/category-form";

export default function NewCategoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">New Category</h2>
        <p className="text-sm text-muted-foreground">Group tools into browsable categories</p>
      </div>
      <CategoryForm />
    </div>
  );
}
