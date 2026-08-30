"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import DOMPurify from "isomorphic-dompurify";
import { Calendar, Clock, ArrowLeft, BookOpen, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ShareButtons } from "@/components/share-buttons";

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
  relatedPosts?: { _id: string; title: string; slug: string; featuredImage?: string; excerpt?: string; publishedAt?: string }[];
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
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-64 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-4">Post Not Found</h1>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button asChild variant="outline">
          <Link href="/blog">Back to Blog</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <nav className="text-sm text-muted-foreground mb-8">
        <Link href="/" className="hover:text-primary transition-colors">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/blog" className="hover:text-primary transition-colors">Blog</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{post.title}</span>
      </nav>

      <article>
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            {post.category && (
              <Link href={`/blog?category=${post.category.slug}`}>
                <Badge variant="secondary" className="hover:bg-secondary/80 transition-colors">
                  {post.category.name}
                </Badge>
              </Link>
            )}
            {post.readTime && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {post.readTime} min read
              </span>
            )}
          </div>

          <h1 className="text-4xl font-bold tracking-tight mb-4">{post.title}</h1>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {post.author && (
              <div className="flex items-center gap-2">
                {post.author.avatar ? (
                  <Image
                    src={post.author.avatar}
                    alt={post.author.name}
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-full"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                    {post.author.name.charAt(0)}
                  </div>
                )}
                <span>{post.author.name}</span>
              </div>
            )}
            {post.publishedAt && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(post.publishedAt).toLocaleDateString("en-US", {
                  year: "numeric", month: "long", day: "numeric",
                })}
              </span>
            )}
            <span className="flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5" />
              {post.viewCount} views
            </span>
          </div>
        </header>

        {post.featuredImage && (
          <div className="rounded-xl overflow-hidden mb-8">
            <Image
              src={post.featuredImage}
              alt={post.title}
              width={800}
              height={400}
              className="w-full h-auto object-cover"
              priority
            />
          </div>
        )}

        <div className="prose prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }} />

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-8 pt-8 border-t">
            <div className="flex items-center gap-2 flex-wrap">
              <Tag className="h-4 w-4 text-muted-foreground" />
              {post.tags.map((tag) => (
                <Badge key={tag.slug} variant="outline">
                  {tag.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </article>

      {/* Related Posts */}
      {post.relatedPosts && post.relatedPosts.length > 0 && (
        <div className="mt-12">
          <Separator className="mb-8" />
          <h2 className="text-2xl font-bold mb-6">Related Posts</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {post.relatedPosts.map((rp) => (
              <Link key={rp._id} href={`/blog/${rp.slug}`} className="group">
                <Card className="overflow-hidden h-full transition-shadow hover:shadow-lg">
                  {rp.featuredImage && (
                    <div className="relative h-40 overflow-hidden">
                      <Image
                        src={rp.featuredImage}
                        alt={rp.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 100vw, 33vw"
                      />
                    </div>
                  )}
                  <CardContent className="p-4">
                    <h3 className="font-semibold group-hover:text-primary transition-colors line-clamp-1">
                      {rp.title}
                    </h3>
                    {rp.excerpt && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{rp.excerpt}</p>
                    )}
                    {rp.publishedAt && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(rp.publishedAt).toLocaleDateString()}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Share */}
      <ShareButtons
        url={`${typeof window !== "undefined" ? window.location.origin : ""}/blog/${post.slug}`}
        title={post.title}
        text={post.excerpt || post.title}
      />

      {/* Navigation */}
      <div className="mt-8 pt-8 border-t flex justify-between">
        <Button variant="ghost" asChild>
          <Link href="/blog">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Blog
          </Link>
        </Button>
      </div>
    </div>
  );
}
