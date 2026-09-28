import type { Metadata } from "next";
import { connectToDatabase } from "@/lib/mongodb";
import AITool from "@/models/ai-tool";
import AIToolCategory from "@/models/ai-tool-category";
import { generateSEO } from "@/lib/seo";
import { ToolListContent } from "./tool-list-content";

export const revalidate = 300;

export const metadata: Metadata = generateSEO({
  title: "AI Tools",
  description:
    "Explore Wall-V's catalogue of AI tools — free, freemium, and pro AI utilities for writing, images, audio, research, and more.",
  url: "/tools",
  keywords: ["AI tools", "AI tools online", "free AI tools", "AI utilities", "Wall-V AI"],
});

async function getData() {
  try {
    await connectToDatabase();
    const [tools, categories] = await Promise.all([
      AITool.find({ status: "published", "visibility.toolsPage": true })
        .select(
          "name slug shortDescription description icon featuredImage category accessModel status flags displayOrder"
        )
        .populate("category", "name slug")
        .sort({ displayOrder: 1, createdAt: -1 })
        .limit(100)
        .lean(),
      AIToolCategory.find({ isActive: true }).select("name slug").sort({ sortOrder: 1, name: 1 }).lean(),
    ]);
    return {
      tools: JSON.parse(JSON.stringify(tools)),
      categories: JSON.parse(JSON.stringify(categories)),
    };
  } catch {
    return { tools: [], categories: [] };
  }
}

export default async function ToolsPage() {
  const { tools, categories } = await getData();

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold tracking-tight">AI Tools</h1>
        <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
          Free, freemium, and pro AI utilities built by Wall-V. Pick a tool and start creating.
        </p>
      </div>
      <ToolListContent initialTools={tools} initialCategories={categories} />
    </div>
  );
}
