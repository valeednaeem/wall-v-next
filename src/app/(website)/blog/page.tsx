import type { Metadata } from "next";
import { generateSEO } from "@/lib/seo";
import { BlogListContent } from "./blog-list-content";

export const metadata: Metadata = generateSEO({
  title: "Blog",
  description: "Stay updated with the latest insights, tutorials, and news from the Wall-V team on software development, AI automation, and digital transformation.",
  url: "/blog",
  keywords: ["blog", "tech blog", "software development", "AI automation", "tutorials", "digital transformation"],
});

export default function BlogPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold">Blog</h1>
        <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
          Stay updated with the latest insights, tutorials, and news from our team.
        </p>
      </div>
      <BlogListContent />
    </div>
  );
}
