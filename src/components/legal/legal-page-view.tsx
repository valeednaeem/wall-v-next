import { Metadata } from "next";
import { connectToDatabase } from "@/lib/mongodb";
import LegalPage from "@/models/legal-page";

interface LegalPageProps {
  slug: string;
  fallbackTitle: string;
  fallbackContent: string;
}

async function getLegalPage(slug: string) {
  try {
    await connectToDatabase();
    const page = await LegalPage.findOne({ slug, isActive: true, status: "published" }).lean();
    return page;
  } catch {
    return null;
  }
}

export async function generateLegalMetadata(slug: string, fallbackTitle: string): Promise<Metadata> {
  const page = await getLegalPage(slug);
  const title = page?.seo?.metaTitle || page?.title || fallbackTitle;
  const description = page?.seo?.metaDescription || "";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://wall-v-next-six.vercel.app";

  return {
    title: `${title} | Wall-V`,
    description,
    robots: page?.seo?.robots || "index, follow",
    openGraph: {
      title: page?.seo?.ogTitle || title,
      description: page?.seo?.ogDescription || description,
      url: page?.seo?.canonicalUrl || `${baseUrl}/${slug}`,
      type: "website",
      ...(page?.seo?.ogImage && { images: [{ url: page.seo.ogImage }] }),
    },
    twitter: {
      card: (page?.seo?.twitterCard as "summary_large_image" | "summary") || "summary_large_image",
      title: page?.seo?.twitterTitle || title,
      description: page?.seo?.twitterDescription || description,
    },
    alternates: {
      canonical: page?.seo?.canonicalUrl || `${baseUrl}/${slug}`,
    },
  };
}

export default async function LegalPageView({ slug, fallbackTitle, fallbackContent }: LegalPageProps) {
  const page = await getLegalPage(slug);

  const title = page?.title || fallbackTitle;
  const content = page?.content || fallbackContent;
  const lastUpdated = page?.updatedAt ? new Date(page.updatedAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  }) : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="prose prose-lg max-w-none">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-8">{title}</h1>
          {lastUpdated && (
            <p className="text-sm text-muted-foreground mb-8">
              Last updated: {lastUpdated}
              {page?.version && ` (v${page.version})`}
            </p>
          )}
          <div dangerouslySetInnerHTML={{ __html: content }} />
        </div>
      </div>
    </div>
  );
}
