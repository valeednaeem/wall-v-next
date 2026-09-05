"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Calendar, Clock, User, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { AdSenseBlogAds } from "@/components/adsense/AdSenseBlogAds";

interface BlogPost {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string;
  featuredImage?: string;
  author?: { name: string; avatar?: string };
  category?: { name: string; slug: string };
  tags?: { name: string; slug: string }[];
  publishedAt?: string;
  readTime?: number;
  isFeatured?: boolean;
}

interface BlogCategory {
  _id: string;
  name: string;
  slug: string;
}

export function BlogListContent() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCategory) params.set("category", selectedCategory);
    if (search) params.set("search", search);
    Promise.all([
      fetch(`/api/blog?${params}`).then((r) => r.json()),
      fetch("/api/blog/categories").then((r) => r.json()),
    ])
      .then(([postsRes, catsRes]) => {
        if (postsRes.success) setPosts(postsRes.data);
        if (catsRes.success) setCategories(catsRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedCategory, search]);

  const featuredPost = posts.find((p) => p.isFeatured) || posts[0];
  const regularPosts = posts.filter((p) => p._id !== featuredPost?._id);

  return (
    <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-12">
      <div className="flex-1">
        {loading ? (
          <div className="space-y-8">
            <Card className="overflow-hidden">
              <Skeleton className="h-64" />
              <CardContent className="p-6 space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <div className="flex">
                  <Skeleton className="h-48 w-48 shrink-0" />
                  <CardContent className="p-6 flex-1 space-y-3">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
            <p className="text-muted-foreground">Check back soon for new content!</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Featured Post */}
            {featuredPost && (
              <Link href={`/blog/${featuredPost.slug}`} className="group block">
                <Card className="overflow-hidden transition-shadow hover:shadow-lg">
                  {featuredPost.featuredImage && (
                    <div className="relative h-64 overflow-hidden">
                      <Image
                        src={featuredPost.featuredImage}
                        alt={featuredPost.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 100vw, 66vw"
                        priority
                      />
                      <Badge className="absolute top-4 left-4">Featured</Badge>
                    </div>
                  )}
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      {featuredPost.category && (
                        <Badge variant="secondary">{featuredPost.category.name}</Badge>
                      )}
                      {featuredPost.readTime && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {featuredPost.readTime} min read
                        </span>
                      )}
                    </div>
                    <h2 className="text-2xl font-bold mb-2 group-hover:text-primary transition-colors">
                      {featuredPost.title}
                    </h2>
                    <p className="text-muted-foreground mb-4 line-clamp-2">{featuredPost.excerpt}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {featuredPost.author && (
                        <span className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5" />
                          {featuredPost.author.name}
                        </span>
                      )}
                      {featuredPost.publishedAt && (
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(featuredPost.publishedAt).toLocaleDateString("en-US", {
                            year: "numeric", month: "long", day: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )}

            {/* Regular Posts */}
            {regularPosts.map((post) => (
              <Link key={post._id} href={`/blog/${post.slug}`} className="group block">
                <Card className="overflow-hidden transition-shadow hover:shadow-lg">
                  <div className="flex flex-col sm:flex-row">
                    {post.featuredImage && (
                      <div className="relative h-48 sm:h-auto sm:w-48 overflow-hidden shrink-0">
                        <Image
                          src={post.featuredImage}
                          alt={post.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 640px) 100vw, 192px"
                        />
                      </div>
                    )}
                    <CardContent className="p-6 flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        {post.category && (
                          <Badge variant="secondary" className="text-xs">{post.category.name}</Badge>
                        )}
                        {post.readTime && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {post.readTime} min read
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-1">
                        {post.title}
                      </h2>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{post.excerpt}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {post.author && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {post.author.name}
                          </span>
                        )}
                        {post.publishedAt && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(post.publishedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <aside className="lg:w-72 shrink-0">
        <div className="sticky top-24 space-y-8">
          {/* Search */}
          <div>
            <h3 className="font-semibold mb-3">Search</h3>
            <div className="relative">
              <Input
                type="search"
                placeholder="Search posts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-semibold mb-3">Categories</h3>
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No categories yet.</p>
            ) : (
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedCategory("")}
                  className={`block w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${
                    !selectedCategory ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                  }`}
                >
                  All Posts
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat._id}
                    onClick={() => setSelectedCategory(cat.slug)}
                    className={`block w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${
                      selectedCategory === cat.slug ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Subscribe */}
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold mb-2">Subscribe</h3>
              <p className="text-sm text-muted-foreground mb-4">Get the latest posts delivered to your inbox.</p>
              <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
                <Input type="email" placeholder="your@email.com" />
                <Button className="w-full" size="sm">Subscribe</Button>
              </form>
            </CardContent>
          </Card>

          {/* Sidebar Ad */}
          <AdSenseBlogAds position="sidebar" />
        </div>
      </aside>
    </div>
  );
}
