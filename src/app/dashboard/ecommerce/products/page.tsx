"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

interface Product {
  _id: string;
  name: string;
  slug: string;
  type: string;
  price: number;
  status: string;
  featuredImage?: string;
  category?: { name: string };
}

export default function ProductsDashboardPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/products?limit=100")
      .then((r) => r.json())
      .then((d) => { if (d.success) setProducts(d.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const deleteProduct = async (slug: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    const res = await fetch(`/api/products/${slug}`, { method: "DELETE" });
    if (res.ok) setProducts(products.filter((p) => p.slug !== slug));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Products</h2>
        <Link href="/dashboard/ecommerce/products/new" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          + Add Product
        </Link>
      </div>

      <div className="rounded-lg border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left text-sm font-medium">Product</th>
              <th className="p-3 text-left text-sm font-medium">Type</th>
              <th className="p-3 text-left text-sm font-medium">Category</th>
              <th className="p-3 text-left text-sm font-medium">Price</th>
              <th className="p-3 text-left text-sm font-medium">Status</th>
              <th className="p-3 text-left text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">Loading...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">No products yet.</td></tr>
            ) : (
              products.map((product) => (
                <tr key={product._id} className="border-b last:border-0">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {product.featuredImage && (
                        <div className="h-10 w-10 rounded-lg overflow-hidden bg-muted">
                          <Image src={product.featuredImage} alt="" width={40} height={40} className="object-cover" />
                        </div>
                      )}
                      <span className="font-medium text-sm">{product.name}</span>
                    </div>
                  </td>
                  <td className="p-3 text-sm capitalize">{product.type}</td>
                  <td className="p-3 text-sm">{product.category?.name || "-"}</td>
                  <td className="p-3 text-sm">${product.price}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${product.status === "published" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                      {product.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Link href={`/dashboard/ecommerce/products/${product.slug}`} className="text-sm text-primary hover:underline">Edit</Link>
                      <button onClick={() => deleteProduct(product.slug)} className="text-sm text-destructive hover:underline">Delete</button>
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
