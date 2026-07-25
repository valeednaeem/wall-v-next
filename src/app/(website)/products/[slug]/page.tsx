"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Product {
  _id: string;
  name: string;
  slug: string;
  type: string;
  description: string;
  shortDescription?: string;
  content?: string;
  featuredImage?: string;
  gallery: string[];
  price: number;
  salePrice?: number;
  currency: string;
  category: { name: string; slug: string };
  badges: string[];
  features: string[];
  specifications?: Record<string, string>;
  rating?: number;
  reviewCount: number;
  variants?: { name: string; price: number; description?: string }[];
}

export default function ProductDetailPage() {
  const params = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!params.slug) return;
    fetch(`/api/products/${params.slug}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setProduct(d.data);
        else setError(d.error || "Product not found");
      })
      .catch(() => setError("Failed to load product"))
      .finally(() => setLoading(false));
  }, [params.slug]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="animate-pulse max-w-6xl mx-auto">
          <div className="h-8 bg-muted rounded w-1/3 mb-4" />
          <div className="grid md:grid-cols-2 gap-12">
            <div className="h-96 bg-muted rounded-xl" />
            <div className="space-y-4">
              <div className="h-4 bg-muted rounded w-1/4" />
              <div className="h-6 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Link href="/products" className="text-primary hover:underline">Back to Products</Link>
      </div>
    );
  }

  const currentPrice = product.variants?.[selectedVariant]?.price ?? product.salePrice ?? product.price;

  return (
    <div className="container mx-auto px-4 py-16">
      <nav className="text-sm text-muted-foreground mb-8">
        <Link href="/" className="hover:text-primary">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/products" className="hover:text-primary">Products</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12">
        <div>
          {product.featuredImage ? (
            <div className="rounded-xl overflow-hidden border">
              <img src={product.featuredImage} alt={product.name} className="w-full h-auto object-cover" />
            </div>
          ) : (
            <div className="rounded-xl border bg-muted flex items-center justify-center h-96 text-muted-foreground">No image</div>
          )}
          {product.gallery.length > 0 && (
            <div className="flex gap-3 mt-4 overflow-x-auto pb-2">
              {product.gallery.map((img, i) => (
                <img key={i} src={img} alt={`${product.name} ${i + 1}`} className="h-20 w-20 rounded-lg object-cover border hover:border-primary cursor-pointer shrink-0" />
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            {product.category && (
              <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">{product.category.name}</span>
            )}
            {product.badges.map((badge) => (
              <span key={badge} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">{badge}</span>
            ))}
            <span className="text-xs bg-muted px-2 py-1 rounded-full capitalize">{product.type}</span>
          </div>

          <h1 className="text-3xl font-bold mb-3">{product.name}</h1>

          {product.rating && (
            <div className="flex items-center gap-2 mb-4">
              <div className="flex text-yellow-500">
                {[1, 2, 3, 4, 5].map((s) => (
                  <span key={s}>{s <= Math.round(product.rating!) ? "★" : "☆"}</span>
                ))}
              </div>
              <span className="text-sm text-muted-foreground">{product.rating.toFixed(1)} ({product.reviewCount} reviews)</span>
            </div>
          )}

          <p className="text-muted-foreground mb-6">{product.shortDescription || product.description}</p>

          <div className="border rounded-xl p-6 mb-6">
            <div className="flex items-baseline gap-3 mb-4">
              {product.salePrice && (
                <span className="text-lg text-muted-foreground line-through">${product.price.toLocaleString()}</span>
              )}
              <span className="text-3xl font-bold text-primary">${currentPrice.toLocaleString()}</span>
            </div>

            {product.variants && product.variants.length > 0 && (
              <div className="mb-4">
                <label className="text-sm font-medium mb-2 block">Select Variant</label>
                <div className="flex gap-2 flex-wrap">
                  {product.variants.map((v, i) => (
                    <button key={i} onClick={() => setSelectedVariant(i)} className={`px-4 py-2 rounded-lg border text-sm ${selectedVariant === i ? "border-primary bg-primary/10 text-primary" : "border"}`}>
                      {v.name} - ${v.price.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-4 mb-4">
              <label className="text-sm font-medium">Qty:</label>
              <div className="flex items-center border rounded-lg">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-3 py-1 hover:bg-muted">-</button>
                <span className="px-4 py-1 text-sm">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="px-3 py-1 hover:bg-muted">+</button>
              </div>
            </div>

            <button className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors">
              Add to Cart
            </button>
          </div>

          {product.features.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Features</h3>
              <ul className="space-y-2">
                {product.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-green-500 mt-0.5">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {product.specifications && Object.keys(product.specifications).length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Specifications</h3>
              <dl className="border rounded-xl divide-y">
                {Object.entries(product.specifications).map(([key, val]) => (
                  <div key={key} className="flex">
                    <dt className="w-1/3 px-4 py-3 text-sm font-medium bg-muted/50">{key}</dt>
                    <dd className="w-2/3 px-4 py-3 text-sm">{val}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>

      {product.content && (
        <div className="max-w-4xl mx-auto mt-16">
          <h2 className="text-2xl font-bold mb-6">Description</h2>
          <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: product.content }} />
        </div>
      )}
    </div>
  );
}
