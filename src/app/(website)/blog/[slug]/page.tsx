import type { Metadata } from "next";
import { connectToDatabase } from "@/lib/mongodb";
import BlogPost from "@/models/blog-post";
import { generateSEO, generateArticleSchema, resolveSocialImage } from "@/lib/seo";
import { JsonLd } from "@/components/seo";
import { BlogPostContent } from "./blog-post-content";

interface PageParams {
  params: Promise<{ slug: string }>;
}

async function getBlogPost(slug: string) {
  try {
    await connectToDatabase();
    const post = await BlogPost.findOne({ slug, status: "published" })
      .populate("author", "name avatar")
      .populate("category", "name slug")
      .lean();
    return post;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) {
    return { title: "Post Not Found", robots: { index: false } };
  }
  return generateSEO({
    title: post.seo?.metaTitle || post.title,
    description: post.seo?.metaDescription || post.excerpt || post.content?.substring(0, 160) || post.title,
    url: `/blog/${post.slug}`,
    image: resolveSocialImage(post.social?.ogImage, post.featuredImage),
    type: "article",
    keywords: post.seo?.keywords?.length ? post.seo.keywords : [post.title, post.category?.name, "blog", "Wall-V"].filter(Boolean),
    updatedAt: post.updatedAt || post.publishedAt,
  });
}

export default async function BlogPostPage({ params }: PageParams) {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  const jsonLd = post
    ? generateArticleSchema({
        title: post.title,
        description: post.excerpt || post.content?.substring(0, 160) || post.title,
        image: resolveSocialImage(post.social?.ogImage, post.featuredImage),
        author: post.author?.name || "Wall-V",
        publishedAt: post.publishedAt?.toISOString() || post.createdAt?.toISOString() || new Date().toISOString(),
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
