import type { Metadata } from "next";
import { connectToDatabase } from "@/lib/mongodb";
import Post from "@/models/blog-post";
import { generateSEO, generateArticleSchema } from "@/lib/seo";
import { JsonLd } from "@/components/seo";
import { BlogPostContent } from "./blog-post-content";

interface PageParams {
  params: Promise<{ slug: string }>;
}

async function getPost(slug: string) {
  try {
    await connectToDatabase();
    const post = await Post.findOne({ slug, status: "published" })
      .populate("author", "name avatar")
      .populate("category", "name slug")
      .populate("tags", "name slug")
      .lean();
    return post;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) {
    return { title: "Post Not Found", robots: { index: false } };
  }
  return generateSEO({
    title: post.title,
    description: post.excerpt || post.title,
    url: `/blog/${post.slug}`,
    image: post.featuredImage,
    keywords: post.tags?.map((t: { name: string }) => t.name) || [],
  });
}

export default async function BlogPostPage({ params }: PageParams) {
  const { slug } = await params;
  const post = await getPost(slug);

  const jsonLd = post
    ? generateArticleSchema({
        title: post.title,
        description: post.excerpt || post.title,
        image: post.featuredImage || `${process.env.NEXT_PUBLIC_APP_URL || "https://www.wall-v.com"}/og-default.png`,
        author: post.author?.name || "Wall-V",
        publishedAt: post.publishedAt ? new Date(post.publishedAt).toISOString() : new Date().toISOString(),
        slug: post.slug,
      })
    : null;

  return (
    <>
      {jsonLd && <JsonLd data={jsonLd} />}
      <BlogPostContent />
    </>
  );
}
