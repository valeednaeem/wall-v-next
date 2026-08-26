"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import DOMPurify from "isomorphic-dompurify";

interface BlogPost {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  featuredImage?: string;
  author?: { name: string; avatar?: string };
  category?: { name: string; slug: string };
  tags?: { name: string; slug: string }[];
  publishedAt?: string;
  readTime?: number;
  viewCount: number;
}

export function BlogPostContent() {
  const params = useParams();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!params.slug) return;
    fetch(`/api/blog/${params.slug}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setPost(d.data);
        else setError(d.error || "Post not found");
      })
      .catch(() => setError("Failed to load post"))
      .finally(() => setLoading(false));
  }, [params.slug]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/4" />
          <div className="h-10 bg-muted rounded w-3/4" />
          <div className="h-64 bg-muted rounded-xl" />
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-5/6" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Post Not Found</h1>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Link href="/blog" className="text-primary hover:underline">Back to Blog</Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <nav className="text-sm text-muted-foreground mb-8">
        <Link href="/" className="hover:text-primary">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/blog" className="hover:text-primary">Blog</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{post.title}</span>
      </nav>

      <article>
        <header className="mb-8">
          {post.category && (
            <Link href={`/blog?category=${post.category.slug}`} className="text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full hover:bg-primary/20">
              {post.category.name}
            </Link>
          )}
          <h1 className="text-4xl font-bold mt-4 mb-4">{post.title}</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {post.author && (
              <div className="flex items-center gap-2">
                {post.author.avatar ? (
                  <img src={post.author.avatar} alt={post.author.name} className="h-8 w-8 rounded-full" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                    {post.author.name.charAt(0)}
                  </div>
                )}
                <span>{post.author.name}</span>
              </div>
            )}
            {post.publishedAt && <span>{new Date(post.publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>}
            {post.readTime && <span>{post.readTime} min read</span>}
            <span>{post.viewCount} views</span>
          </div>
        </header>

        {post.featuredImage && (
          <div className="rounded-xl overflow-hidden mb-8">
            <img src={post.featuredImage} alt={post.title} className="w-full h-auto object-cover" />
          </div>
        )}

        <div className="prose prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }} />

        {post.tags && post.tags.length > 0 && (
          <div className="mt-8 pt-8 border-t">
            <span className="text-sm font-medium mr-3">Tags:</span>
            {post.tags.map((tag) => (
              <Link key={tag.slug} href={`/blog?tag=${tag.slug}`} className="text-xs bg-muted px-3 py-1 rounded-full hover:bg-muted/80 mr-2">
                {tag.name}
              </Link>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}
