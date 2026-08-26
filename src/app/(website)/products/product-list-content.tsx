"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Product {
  _id: string;
  name: string;
  slug: string;
  type: string;
  description: string;
  shortDescription?: string;
  featuredImage?: string;
  price: number;
  salePrice?: number;
  category: { name: string; slug: string };
  badges: string[];
}

export function ProductListContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setProducts(d.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border p-6 animate-pulse">
            <div className="h-48 bg-muted rounded-lg mb-4" />
            <div className="h-4 bg-muted rounded w-3/4 mb-2" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">No products available yet. Check back soon!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
      {products.map((product) => (
        <Link key={product._id} href={`/products/${product.slug}`} className="group">
          <div className="rounded-xl border overflow-hidden hover:shadow-lg transition-shadow bg-white">
            {product.featuredImage && (
              <div className="relative h-48 overflow-hidden">
                <img src={product.featuredImage} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              </div>
            )}
            <div className="p-6">
              <div className="flex items-center gap-2 mb-3">
                {product.category && (
                  <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                    {product.category.name}
                  </span>
                )}
                {product.badges?.map((badge) => (
                  <span key={badge} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">{badge}</span>
                ))}
              </div>
              <h2 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">{product.name}</h2>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{product.shortDescription || product.description}</p>
              <div className="flex items-center justify-between">
                <div>
                  {product.salePrice ? (
                    <span className="text-lg font-bold text-primary">${product.salePrice.toLocaleString()}</span>
                  ) : (
                    <span className="text-lg font-bold">${product.price.toLocaleString()}</span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground capitalize">{product.type}</span>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
