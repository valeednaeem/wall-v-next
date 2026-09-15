import type { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.wall-v.com";
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-default.png`;

interface SEOProps {
  title: string;
  description: string;
  url?: string;
  image?: string;
  type?: string;
  keywords?: string[];
  noindex?: boolean;
  updatedAt?: string | Date;
}

function isAbsoluteUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

function resolveToAbsoluteUrl(url: string): string {
  if (isAbsoluteUrl(url)) return url;
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${BASE_URL}${path}`;
}

/**
 * Centralized social image resolution.
 *
 * Priority:
 *   1. Explicit ogImage override (from social.ogImage)
 *   2. Content's primary image (featuredImage / image)
 *   3. Global default OG image
 *   4. Wall-V logo
 *
 * Always returns an absolute URL suitable for social crawlers.
 */
export function resolveSocialImage(
  explicitOgImage?: string | null,
  contentImage?: string | null,
): string {
  const candidates = [explicitOgImage, contentImage];
  for (const candidate of candidates) {
    if (candidate && typeof candidate === "string" && candidate.trim() !== "") {
      return resolveToAbsoluteUrl(candidate.trim());
    }
  }
  return DEFAULT_OG_IMAGE;
}

export function generateSEO({
  title,
  description,
  url,
  image,
  type = "website",
  keywords = [],
  noindex = false,
  updatedAt,
}: SEOProps): Metadata {
  const fullUrl = url ? `${BASE_URL}${url}` : BASE_URL;
  const ogImage = image && image.trim() !== "" ? resolveToAbsoluteUrl(image.trim()) : DEFAULT_OG_IMAGE;
  const ogUpdatedTime = updatedAt
    ? new Date(updatedAt).toISOString()
    : undefined;

  return {
    title,
    description,
    keywords: keywords.length > 0 ? keywords : undefined,
    openGraph: {
      title,
      description,
      url: fullUrl,
      siteName: "Wall-V",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: "en_US",
      type: type as "website",
      ...(ogUpdatedTime && { modifiedTime: ogUpdatedTime }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
    alternates: {
      canonical: fullUrl,
    },
    robots: noindex
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };
}

export function generateProductSchema(product: {
  name: string;
  description: string;
  image: string;
  price: number;
  currency?: string;
  slug: string;
  rating?: number;
  reviewCount?: number;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.image,
    url: `${BASE_URL}/products/${product.slug}`,
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: product.currency || "USD",
      availability: "https://schema.org/InStock",
    },
    ...(product.rating && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: product.rating,
        reviewCount: product.reviewCount || 1,
      },
    }),
  };
}

export function generateArticleSchema(article: {
  title: string;
  description: string;
  image: string;
  author: string;
  publishedAt: string;
  slug: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    image: article.image,
    url: `${BASE_URL}/blog/${article.slug}`,
    author: {
      "@type": "Person",
      name: article.author,
    },
    datePublished: article.publishedAt,
  };
}

export function generateOrganizationSchema(logoUrl?: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Wall-V",
    url: BASE_URL,
    ...(logoUrl && { logo: logoUrl }),
    sameAs: [],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
    },
  };
}

export function generateFAQSchema(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}
