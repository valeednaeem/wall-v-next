import type { Metadata } from "next";

interface SEOProps {
  title: string;
  description: string;
  url?: string;
  image?: string;
  type?: string;
  keywords?: string[];
  noindex?: boolean;
}

export function generateSEO({
  title,
  description,
  url,
  image,
  type = "website",
  keywords = [],
  noindex = false,
}: SEOProps): Metadata {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://wall-v.com";
  const fullUrl = url ? `${baseUrl}${url}` : baseUrl;
  const ogImage = image || `${baseUrl}/og-default.png`;

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
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://wall-v.com";

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.image,
    url: `${baseUrl}/products/${product.slug}`,
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
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://wall-v.com";

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    image: article.image,
    url: `${baseUrl}/blog/${article.slug}`,
    author: {
      "@type": "Person",
      name: article.author,
    },
    datePublished: article.publishedAt,
  };
}

export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Wall-V",
    url: process.env.NEXT_PUBLIC_APP_URL || "https://wall-v.com",
    logo: `${process.env.NEXT_PUBLIC_APP_URL || "https://wall-v.com"}/wall-v-logo.png`,
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
