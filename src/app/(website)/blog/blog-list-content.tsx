"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface BlogPost {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string;
  featuredImage?: string;
  author?: { name: string };
  category?: { name: string; slug: string };
  publishedAt?: string;
  readTime?: number;
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

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCategory) params.set("category", selectedCategory);
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
  }, [selectedCategory]);

  return (
    <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-12">
      <div className="flex-1">
        {loading ? (
          <div className="space-y-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border p-6 animate-pulse">
                <div className="h-48 bg-muted rounded-lg mb-4" />
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No blog posts yet. Check back soon!</p>
          </div>
        ) : (
          <div className="space-y-8">
            {posts.map((post) => (
              <Link key={post._id} href={`/blog/${post.slug}`} className="group block">
                <div className="rounded-xl border overflow-hidden hover:shadow-lg transition-shadow bg-white">
                  {post.featuredImage && (
                    <div className="relative h-48 overflow-hidden">
                      <img src={post.featuredImage} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      {post.category && (
                        <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">{post.category.name}</span>
                      )}
                      {post.readTime && (
                        <span className="text-xs text-muted-foreground">{post.readTime} min read</span>
                      )}
                    </div>
                    <h2 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">{post.title}</h2>
                    <p className="text-sm text-muted-foreground mb-4">{post.excerpt}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {post.author && <span>By {post.author.name}</span>}
                      {post.publishedAt && <span>{new Date(post.publishedAt).toLocaleDateString()}</span>}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <aside className="lg:w-72 shrink-0">
        <div className="sticky top-24 space-y-8">
          <div>
            <h3 className="font-semibold mb-4">Categories</h3>
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No categories yet.</p>
            ) : (
              <div className="space-y-1">
                <button onClick={() => setSelectedCategory("")} className={`block w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${!selectedCategory ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"}`}>
                  All Posts
                </button>
                {categories.map((cat) => (
                  <button key={cat._id} onClick={() => setSelectedCategory(cat.slug)} className={`block w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${selectedCategory === cat.slug ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"}`}>
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-2xl border p-6">
            <h3 className="font-semibold mb-2">Subscribe</h3>
            <p className="text-sm text-muted-foreground mb-4">Get the latest posts delivered to your inbox.</p>
            <form className="space-y-3">
              <input type="email" placeholder="your@email.com" className="w-full px-3 py-2 border rounded-lg text-sm" />
              <button type="submit" className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </aside>
    </div>
  );
}
