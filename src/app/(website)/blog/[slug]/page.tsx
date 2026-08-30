import type { Metadata } from "next";
import { generateSEO } from "@/lib/seo";
import { BlogPostContent } from "./blog-post-content";

interface PageParams {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { slug } = await params;
  // Metadata is generated server-side, but content is fetched client-side
  return generateSEO({
    title: slug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    description: `Read this blog post on Wall-V.`,
    url: `/blog/${slug}`,
  });
}

export default function BlogPostPage() {
  return <BlogPostContent />;
}
