"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ProductForm from "@/components/forms/product/product-form";

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/products/${params.slug}?allStatuses=true`)
      .then((r) => { if (!r.ok) throw new Error("Not found"); return r.json(); })
      .then((d) => { if (d.success) setProduct(d.data); else setError("Product not found"); })
      .catch(() => setError("Product not found"))
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

  if (error || !product) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold mb-2">{error || "Product Not Found"}</h2>
        <Link href="/dashboard/ecommerce/products" className="text-primary hover:underline">Back to Products</Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Link href="/dashboard/ecommerce/products" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Products
      </Link>
      <h1 className="text-2xl font-bold">Edit Product</h1>
      <ProductForm
        product={product}
        onSave={(updated) => {
          router.push("/dashboard/ecommerce/products");
        }}
      />
    </div>
  );
}
