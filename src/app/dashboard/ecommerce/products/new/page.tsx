"use client";

import ProductForm from "@/components/forms/product/product-form";

export default function NewProductPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Create New Product</h2>
      <ProductForm />
    </div>
  );
}
