"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, Check, Minus, Plus, Package, Star, ArrowLeft } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { isProductAvailable, isPhysicalProduct } from "@/lib/product-availability";
import DOMPurify from "isomorphic-dompurify";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ShareButtons } from "@/components/share-buttons";

interface Product {
  _id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
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
  stock?: number;
  variants?: { name: string; price: number; description?: string }[];
}

interface RelatedProduct {
  _id: string;
  name: string;
  slug: string;
  featuredImage?: string;
  price: number;
  salePrice?: number;
  category: { name: string; slug: string };
}

export function ProductDetailContent() {
  const params = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();
  const router = useRouter();

  useEffect(() => {
    if (!params.slug) return;
    fetch(`/api/products/${params.slug}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setProduct(d.data);
          // Fetch related products
          if (d.data.category?.slug) {
            fetch(`/api/products?category=${d.data.category.slug}&limit=4`)
              .then((r) => r.json())
              .then((rd) => {
                if (rd.success) {
                  setRelatedProducts(
                    rd.data.filter((p: RelatedProduct) => p._id !== d.data._id).slice(0, 3)
                  );
                }
              })
              .catch(console.error);
          }
        } else {
          setError(d.error || "Product not found");
        }
      })
      .catch(() => setError("Failed to load product"))
      .finally(() => setLoading(false));
  }, [params.slug]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="animate-pulse max-w-6xl mx-auto">
          <Skeleton className="h-4 w-48 mb-8" />
          <div className="grid md:grid-cols-2 gap-12">
            <Skeleton className="h-[400px] rounded-xl" />
            <div className="space-y-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-12 w-48 mt-6" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Package className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button asChild>
          <Link href="/products">Back to Products</Link>
        </Button>
      </div>
    );
  }

  const currentPrice = product.variants?.[selectedVariant]?.price ?? product.salePrice ?? product.price;
  const isInStock = isProductAvailable(product.status, product.type, product.stock);

  return (
    <div className="container mx-auto px-4 py-8">
      <nav className="text-sm text-muted-foreground mb-8">
        <Link href="/" className="hover:text-primary transition-colors">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/products" className="hover:text-primary transition-colors">Products</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12">
        {/* Product Images */}
        <div>
          <div className="relative rounded-xl overflow-hidden border bg-muted aspect-square">
            {product.featuredImage ? (
              <Image
                src={product.featuredImage}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <Package className="h-24 w-24" />
              </div>
            )}
          </div>
          {product.gallery.length > 0 && (
            <div className="flex gap-3 mt-4 overflow-x-auto pb-2">
              {product.gallery.map((img, i) => (
                <div key={i} className="relative h-20 w-20 rounded-lg overflow-hidden border shrink-0">
                  <Image src={img} alt={`${product.name} ${i + 1}`} fill className="object-cover" sizes="80px" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            {product.category && (
              <Badge variant="secondary">{product.category.name}</Badge>
            )}
            {product.badges.map((badge) => (
              <Badge key={badge} className="bg-green-100 text-green-800 hover:bg-green-100">{badge}</Badge>
            ))}
            <Badge variant="outline" className="capitalize">{product.type}</Badge>
          </div>

          <h1 className="text-3xl font-bold tracking-tight mb-3">{product.name}</h1>

          {product.rating && (
            <div className="flex items-center gap-2 mb-4">
              <div className="flex text-yellow-500">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className={`h-4 w-4 ${s <= Math.round(product.rating!) ? "fill-current" : ""}`} />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {product.rating.toFixed(1)} ({product.reviewCount} reviews)
              </span>
            </div>
          )}

          <p className="text-muted-foreground mb-6">{product.shortDescription || product.description}</p>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-baseline gap-3 mb-4">
                {product.salePrice && (
                  <span className="text-lg text-muted-foreground line-through">
                    ${product.price.toLocaleString()}
                  </span>
                )}
                <span className="text-3xl font-bold text-primary">
                  ${currentPrice.toLocaleString()}
                </span>
              </div>

              {!isInStock && (
                <Badge variant="destructive" className="mb-4">Out of Stock</Badge>
              )}

              {product.variants && product.variants.length > 0 && (
                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">Select Variant</label>
                  <div className="flex gap-2 flex-wrap">
                    {product.variants.map((v, i) => (
                      <Button
                        key={i}
                        variant={selectedVariant === i ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedVariant(i)}
                      >
                        {v.name} - ${v.price.toLocaleString()}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4 mb-6">
                <label className="text-sm font-medium">Quantity</label>
                <div className="flex items-center border rounded-lg">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-10 text-center text-sm font-medium">{quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  size="lg"
                  disabled={!isInStock}
                  onClick={() => {
                    addItem(
                      {
                        productId: product._id,
                        name: product.name,
                        slug: product.slug,
                        price: product.price,
                        salePrice: product.salePrice,
                        image: product.featuredImage,
                        variant: product.variants?.[selectedVariant]?.name,
                        stock: isPhysicalProduct(product.type) ? product.stock : undefined,
                      },
                      quantity
                    );
                    setAdded(true);
                    setTimeout(() => setAdded(false), 2000);
                  }}
                >
                  {added ? (
                    <><Check className="h-5 w-5 mr-2" /> Added to Cart</>
                  ) : (
                    <><ShoppingCart className="h-5 w-5 mr-2" /> Add to Cart</>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  disabled={!isInStock}
                  onClick={() => {
                    addItem(
                      {
                        productId: product._id,
                        name: product.name,
                        slug: product.slug,
                        price: product.price,
                        salePrice: product.salePrice,
                        image: product.featuredImage,
                        variant: product.variants?.[selectedVariant]?.name,
                        stock: isPhysicalProduct(product.type) ? product.stock : undefined,
                      },
                      quantity
                    );
                    router.push("/checkout");
                  }}
                >
                  Buy Now
                </Button>
              </div>
            </CardContent>
          </Card>

          {product.features.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold mb-3">Features</h3>
              <ul className="space-y-2">
                {product.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {product.specifications && Object.keys(product.specifications).length > 0 && (
            <div className="mt-6">
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

      {/* Full Description */}
      <div className="max-w-4xl mx-auto mt-16">
        <Separator className="mb-8" />
        <h2 className="text-2xl font-bold mb-6">Description</h2>
        {product.content ? (
          <div
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(product.content) }}
          />
        ) : (
          <div className="prose prose-lg max-w-none whitespace-pre-wrap text-muted-foreground">
            {product.description}
          </div>
        )}
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="max-w-6xl mx-auto mt-16">
          <Separator className="mb-8" />
          <h2 className="text-2xl font-bold mb-6">Related Products</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {relatedProducts.map((rp) => (
              <Link key={rp._id} href={`/products/${rp.slug}`} className="group">
                <Card className="overflow-hidden h-full transition-shadow hover:shadow-lg">
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    {rp.featuredImage ? (
                      <Image
                        src={rp.featuredImage}
                        alt={rp.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 100vw, 33vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        <Package className="h-10 w-10" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold group-hover:text-primary transition-colors line-clamp-1">{rp.name}</h3>
                    <div className="mt-2">
                      {rp.salePrice ? (
                        <span className="text-lg font-bold text-primary">${rp.salePrice.toLocaleString()}</span>
                      ) : (
                        <span className="text-lg font-bold">${rp.price.toLocaleString()}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Share */}
      <div className="max-w-6xl mx-auto mt-12">
        <ShareButtons
          url={`${typeof window !== "undefined" ? window.location.origin : ""}/products/${product.slug}`}
          title={product.name}
          text={product.shortDescription || product.description}
        />
      </div>

      {/* Back to Products */}
      <div className="max-w-6xl mx-auto mt-8">
        <Button variant="ghost" asChild>
          <Link href="/products">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </Link>
        </Button>
      </div>
    </div>
  );
}
