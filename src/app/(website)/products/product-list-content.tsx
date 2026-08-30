"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight, Package, X, ShoppingCart, Zap, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useCart } from "@/lib/cart-context";
import { isProductAvailable } from "@/lib/product-availability";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface Product {
  _id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  description: string;
  shortDescription?: string;
  featuredImage?: string;
  price: number;
  salePrice?: number;
  currency: string;
  category: { name: string; slug: string };
  badges: string[];
  isFeatured: boolean;
  rating?: number;
  reviewCount: number;
}

interface Category {
  _id: string;
  name: string;
  slug: string;
  productCount?: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name-asc", label: "Name: A-Z" },
  { value: "name-desc", label: "Name: Z-A" },
  { value: "popular", label: "Most Popular" },
];

export function ProductListContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 12, total: 0, pages: 0 });
  const [showFilters, setShowFilters] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const { addItem } = useCart();
  const router = useRouter();

  const fetchProducts = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "12");
      if (search) params.set("search", search);
      if (selectedCategory && selectedCategory !== "all") params.set("category", selectedCategory);

      let sortField = "createdAt";
      let sortOrder = "desc";
      switch (sortBy) {
        case "price-asc": sortField = "price"; sortOrder = "asc"; break;
        case "price-desc": sortField = "price"; sortOrder = "desc"; break;
        case "name-asc": sortField = "name"; sortOrder = "asc"; break;
        case "name-desc": sortField = "name"; sortOrder = "desc"; break;
        case "popular": sortField = "viewCount"; sortOrder = "desc"; break;
      }
      params.set("sort", sortField);
      params.set("order", sortOrder);

      const res = await fetch(`/api/products?${params}`);
      const data = await res.json();
      if (data.success) {
        setProducts(data.data);
        setPagination(data.pagination || { page, limit: 12, total: data.data.length, pages: 1 });
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory, sortBy]);

  useEffect(() => {
    fetch("/api/products/categories?includeCount=true")
      .then((r) => r.json())
      .then((d) => { if (d.success) setCategories(d.data); })
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetchProducts(1);
  }, [fetchProducts]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts(1);
  };

  const hasActiveFilters = search || (selectedCategory && selectedCategory !== "all");

  return (
    <div className="space-y-8">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <form onSubmit={handleSearch} className="flex-1 w-full sm:max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4"
            />
          </div>
        </form>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="sm:hidden"
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <div className="flex items-center gap-2 flex-1 sm:flex-initial">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Category Filters (desktop) */}
      <div className={`flex flex-wrap gap-2 ${showFilters ? "" : "hidden sm:flex"}`}>
        <Button
          variant={selectedCategory === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedCategory("all")}
        >
          All
        </Button>
        {categories.map((cat) => (
          <Button
            key={cat._id}
            variant={selectedCategory === cat.slug ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(cat.slug)}
          >
            {cat.name}
            {cat.productCount !== undefined && (
              <Badge variant="secondary" className="ml-1.5 text-xs">{cat.productCount}</Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {search && (
            <Badge variant="secondary" className="gap-1">
              Search: {search}
              <button onClick={() => { setSearch(""); fetchProducts(1); }} className="ml-1 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {selectedCategory && selectedCategory !== "all" && (
            <Badge variant="secondary" className="gap-1">
              {categories.find(c => c.slug === selectedCategory)?.name || selectedCategory}
              <button onClick={() => { setSelectedCategory("all"); fetchProducts(1); }} className="ml-1 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setSelectedCategory("all"); fetchProducts(1); }}>
            Clear all
          </Button>
        </div>
      )}

      {/* Product Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-48 rounded-none" />
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-6 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20">
          <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No products found</h3>
          <p className="text-muted-foreground mb-4">
            {hasActiveFilters ? "Try adjusting your search or filters." : "No products available yet. Check back soon!"}
          </p>
          {hasActiveFilters && (
            <Button variant="outline" onClick={() => { setSearch(""); setSelectedCategory("all"); fetchProducts(1); }}>
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => {
            const available = isProductAvailable(product.status);
            const justAdded = addedIds.has(product._id);

            return (
              <Card key={product._id} className="overflow-hidden h-full flex flex-col transition-shadow hover:shadow-lg">
                <Link href={`/products/${product.slug}`} className="block">
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    {product.featuredImage ? (
                      <Image
                        src={product.featuredImage}
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        <Package className="h-12 w-12" />
                      </div>
                    )}
                    {product.salePrice && (
                      <Badge className="absolute top-3 left-3 bg-red-500 hover:bg-red-600">
                        Sale
                      </Badge>
                    )}
                    {product.isFeatured && (
                      <Badge className="absolute top-3 right-3 bg-amber-500 hover:bg-amber-600">
                        Featured
                      </Badge>
                    )}
                  </div>
                </Link>
                <CardContent className="p-5 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {product.category && (
                      <Badge variant="secondary" className="text-xs">
                        {product.category.name}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground capitalize">{product.type}</span>
                    {!available && (
                      <Badge variant="destructive" className="text-xs">Out of Stock</Badge>
                    )}
                  </div>
                  <Link href={`/products/${product.slug}`} className="block group">
                    <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors line-clamp-1">
                      {product.name}
                    </h3>
                  </Link>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {product.shortDescription || product.description}
                  </p>
                  <div className="flex items-baseline gap-2 mb-4">
                    {product.salePrice ? (
                      <>
                        <span className="text-lg font-bold text-primary">
                          ${product.salePrice.toLocaleString()}
                        </span>
                        <span className="text-sm text-muted-foreground line-through">
                          ${product.price.toLocaleString()}
                        </span>
                      </>
                    ) : (
                      <span className="text-lg font-bold">
                        ${product.price.toLocaleString()}
                      </span>
                    )}
                    {product.rating && (
                      <span className="text-sm text-muted-foreground ml-auto flex items-center gap-1">
                        <span className="text-yellow-500">★</span>
                        {product.rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <div className="mt-auto flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      disabled={!available}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        addItem({
                          productId: product._id,
                          name: product.name,
                          slug: product.slug,
                          price: product.price,
                          salePrice: product.salePrice,
                          image: product.featuredImage,
                        });
                        setAddedIds((prev) => new Set(prev).add(product._id));
                        setTimeout(() => setAddedIds((prev) => { const n = new Set(prev); n.delete(product._id); return n; }), 2000);
                      }}
                    >
                      {justAdded ? (
                        <><Check className="h-4 w-4 mr-1" /> Added</>
                      ) : (
                        <><ShoppingCart className="h-4 w-4 mr-1" /> Cart</>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      disabled={!available}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        addItem({
                          productId: product._id,
                          name: product.name,
                          slug: product.slug,
                          price: product.price,
                          salePrice: product.salePrice,
                          image: product.featuredImage,
                        });
                        router.push("/checkout");
                      }}
                    >
                      <Zap className="h-4 w-4 mr-1" />
                      Buy Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() => fetchProducts(pagination.page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(pagination.pages, 5) }).map((_, i) => {
              const pageNum = i + 1;
              return (
                <Button
                  key={pageNum}
                  variant={pagination.page === pageNum ? "default" : "outline"}
                  size="sm"
                  className="w-9"
                  onClick={() => fetchProducts(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
            {pagination.pages > 5 && (
              <>
                <span className="text-muted-foreground px-1">...</span>
                <Button
                  variant={pagination.page === pagination.pages ? "default" : "outline"}
                  size="sm"
                  className="w-9"
                  onClick={() => fetchProducts(pagination.pages)}
                >
                  {pagination.pages}
                </Button>
              </>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.pages}
            onClick={() => fetchProducts(pagination.page + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
