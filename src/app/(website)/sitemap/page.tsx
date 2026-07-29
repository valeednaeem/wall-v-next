import { Metadata } from "next";
import Link from "next/link";
import { connectToDatabase } from "@/lib/mongodb";
import LegalPage from "@/models/legal-page";
import Post from "@/models/blog-post";
import Product from "@/models/product";

export const metadata: Metadata = {
  title: "Sitemap | Wall-V",
  description: "Complete sitemap of Wall-V website. Find all pages, services, products, and resources.",
};

interface SitemapSection {
  title: string;
  links: { label: string; href: string }[];
}

async function getSitemapData(): Promise<SitemapSection[]> {
  const sections: SitemapSection[] = [
    {
      title: "Main",
      links: [
        { label: "Home", href: "/" },
        { label: "About", href: "/about" },
        { label: "Services", href: "/services" },
        { label: "Products", href: "/products" },
        { label: "Blog", href: "/blog" },
        { label: "Pricing", href: "/pricing" },
        { label: "Contact", href: "/contact" },
        { label: "Portfolio", href: "/portfolio" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Privacy Policy", href: "/privacy" },
        { label: "Terms & Conditions", href: "/terms" },
        { label: "Disclaimer", href: "/disclaimer" },
        { label: "Refund Policy", href: "/refund" },
        { label: "Cookie Policy", href: "/cookie-policy" },
        { label: "Accessibility", href: "/accessibility" },
        { label: "Acceptable Use", href: "/acceptable-use" },
        { label: "AI Usage & Limitations", href: "/ai-usage" },
        { label: "Data Processing & Security", href: "/data-processing" },
        { label: "Copyright & IP", href: "/copyright" },
        { label: "Legal Notices", href: "/legal-notices" },
      ],
    },
  ];

  try {
    await connectToDatabase();

    const [posts, products, legalPages] = await Promise.all([
      Post.find({ status: "published" }).select("title slug").limit(50).lean(),
      Product.find({ isActive: true }).select("name slug").limit(50).lean(),
      LegalPage.find({ isActive: true, status: "published" }).select("title slug type").lean(),
    ]);

    if (posts.length > 0) {
      sections.push({
        title: "Blog",
        links: posts.map((p) => ({ label: p.title, href: `/blog/${p.slug}` })),
      });
    }

    if (products.length > 0) {
      sections.push({
        title: "Products",
        links: products.map((p) => ({ label: p.name, href: `/products/${p.slug}` })),
      });
    }

    const dynamicLegal = legalPages
      .filter((lp) => !sections[1].links.some((l) => l.href === `/${lp.slug}`))
      .map((lp) => ({ label: lp.title, href: `/${lp.slug}` }));
    if (dynamicLegal.length > 0) {
      sections[1].links.push(...dynamicLegal);
    }
  } catch {
    // Use static fallback
  }

  return sections;
}

export default async function SitemapPage() {
  const sections = await getSitemapData();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">Sitemap</h1>
        <p className="text-muted-foreground mb-12">Find everything on our website, organized by category.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="text-lg font-semibold mb-4">{section.title}</h2>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-muted-foreground hover:text-primary transition-colors text-sm"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
