import { Metadata } from "next";
import { connectToDatabase } from "@/lib/mongodb";
import LegalPage from "@/models/legal-page";
import LegalPageContent from "./legal-page-content";

interface LegalPageData {
  title: string;
  content: string;
  lastUpdated: string | null;
  version: string | null;
  seo: Record<string, unknown> | null;
}

interface LegalPageViewProps {
  data: LegalPageData;
}

function isPlaceholderContent(content: string): boolean {
  if (!content) return true;
  const trimmed = content.trim();
  if (trimmed.length < 100) return true;
  if (trimmed.includes("Content managed from dashboard")) return true;
  if (trimmed.includes("Edit this page at /dashboard")) return true;
  return false;
}

export async function getLegalPageData(slug: string, fallbackTitle: string, fallbackContent: string): Promise<LegalPageData> {
  try {
    await connectToDatabase();
    const page = await LegalPage.findOne({ slug, isActive: true, status: "published" }).lean();

    if (!page) {
      return {
        title: fallbackTitle,
        content: fallbackContent,
        lastUpdated: null,
        version: null,
        seo: null,
      };
    }

    const hasRealContent = !isPlaceholderContent(page.content);

    return {
      title: page.title || fallbackTitle,
      content: hasRealContent ? page.content : fallbackContent,
      lastUpdated: page.updatedAt
        ? new Date(page.updatedAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : null,
      version: hasRealContent ? (page.version || null) : null,
      seo: page.seo || null,
    };
  } catch {
    return {
      title: fallbackTitle,
      content: fallbackContent,
      lastUpdated: null,
      version: null,
      seo: null,
    };
  }
}

export async function generateLegalMetadata(slug: string, fallbackTitle: string): Promise<Metadata> {
  const data = await getLegalPageData(slug, fallbackTitle, "");
  const seo = data.seo as Record<string, string> | null;
  const title = seo?.metaTitle || data.title;
  const description = seo?.metaDescription || "";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://wall-v-next-six.vercel.app";

  return {
    title: `${title} | Wall-V`,
    description,
    robots: seo?.robots || "index, follow",
    openGraph: {
      title: seo?.ogTitle || title,
      description: seo?.ogDescription || description,
      url: seo?.canonicalUrl || `${baseUrl}/${slug}`,
      type: "website",
      ...(seo?.ogImage && { images: [{ url: seo.ogImage }] }),
    },
    twitter: {
      card: (seo?.twitterCard as "summary_large_image" | "summary") || "summary_large_image",
      title: seo?.twitterTitle || title,
      description: seo?.twitterDescription || description,
    },
    alternates: {
      canonical: seo?.canonicalUrl || `${baseUrl}/${slug}`,
    },
  };
}

export default function LegalPageView({ data }: LegalPageViewProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="prose prose-lg max-w-none">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-8">{data.title}</h1>
          {data.lastUpdated && (
            <p className="text-sm text-muted-foreground mb-8">
              Last updated: {data.lastUpdated}
              {data.version && ` (v${data.version})`}
            </p>
          )}
          <LegalPageContent html={data.content} />
        </div>
      </div>
    </div>
  );
}
