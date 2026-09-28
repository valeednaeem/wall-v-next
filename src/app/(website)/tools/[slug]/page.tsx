import type { Metadata } from "next";
import Link from "next/link";
import { connectToDatabase } from "@/lib/mongodb";
import AITool from "@/models/ai-tool";
import { generateSEO, resolveSocialImage } from "@/lib/seo";
import { JsonLd } from "@/components/seo";
import { ToolDetailContent, type ToolDetailData } from "./tool-detail-content";

export const revalidate = 60;

interface PageParams {
  params: Promise<{ slug: string }>;
}

async function getTool(slug: string) {
  try {
    await connectToDatabase();
    const tool = await AITool.findOne({ slug, status: "published" })
      .populate("category", "name slug")
      .populate("tags", "name slug")
      .lean();
    return tool;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { slug } = await params;
  const tool = await getTool(slug);
  if (!tool) {
    return { title: "Tool Not Found", robots: { index: false } };
  }
  return generateSEO({
    title: tool.seo?.metaTitle || `${tool.name} — AI Tool`,
    description:
      tool.seo?.metaDescription ||
      tool.shortDescription ||
      tool.description?.substring(0, 160) ||
      tool.name,
    url: `/tools/${tool.slug}`,
    image: resolveSocialImage(tool.social?.ogImage, tool.featuredImage),
    keywords: tool.seo?.keywords?.length
      ? tool.seo.keywords
      : [tool.name, "AI tool", tool.category?.name, "free AI tool"].filter(Boolean) as string[],
    updatedAt: tool.updatedAt || tool.createdAt,
  });
}

export default async function ToolDetailPage({ params }: PageParams) {
  const { slug } = await params;
  const tool = await getTool(slug);

  if (!tool) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Tool Not Found</h1>
        <p className="text-muted-foreground mb-6">
          This tool does not exist or is no longer available.
        </p>
        <Link href="/tools" className="text-primary underline">
          Back to AI Tools
        </Link>
      </div>
    );
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: tool.name,
    description: tool.shortDescription || tool.description || tool.name,
    url: `/tools/${tool.slug}`,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    image: resolveSocialImage(tool.social?.ogImage, tool.featuredImage),
    offers: {
      "@type": "Offer",
      price: tool.accessModel === "free" ? 0 : undefined,
      priceCurrency: "USD",
    },
    ...(tool.seo?.keywords?.length ? { keywords: tool.seo.keywords.join(", ") } : {}),
  };

  // Strip internal AI config before sending the tool to the client
  const serializedTool = JSON.parse(JSON.stringify(tool)) as Record<string, unknown>;
  delete serializedTool.aiConfig;

  return (
    <>
      <JsonLd data={jsonLd} />
      <ToolDetailContent initialTool={serializedTool as unknown as ToolDetailData} />
    </>
  );
}
