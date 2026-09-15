import type { Metadata } from "next";
import { connectToDatabase } from "@/lib/mongodb";
import Product from "@/models/product";
import { generateSEO, generateProductSchema, resolveSocialImage } from "@/lib/seo";
import { JsonLd } from "@/components/seo";
import { ProductDetailContent } from "./product-detail-content";

interface PageParams {
  params: Promise<{ slug: string }>;
}

async function getProduct(slug: string) {
  try {
    await connectToDatabase();
    const product = await Product.findOne({ slug, status: "published" })
      .populate("category", "name slug")
      .lean();
    return product;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) {
    return { title: "Product Not Found", robots: { index: false } };
  }
  return generateSEO({
    title: product.seo?.metaTitle || product.name,
    description: product.seo?.metaDescription || product.shortDescription || product.description?.substring(0, 160) || product.name,
    url: `/products/${product.slug}`,
    image: resolveSocialImage(product.social?.ogImage, product.featuredImage),
    keywords: product.seo?.keywords?.length ? product.seo.keywords : [product.name, product.category?.name, product.type, "digital product", "buy online"].filter(Boolean),
    updatedAt: product.updatedAt || product.createdAt,
  });
}

export default async function ProductDetailPage({ params }: PageParams) {
  const { slug } = await params;
  const product = await getProduct(slug);

  const jsonLd = product
    ? generateProductSchema({
        name: product.name,
        description: product.shortDescription || product.description,
        image: resolveSocialImage(product.social?.ogImage, product.featuredImage),
        price: product.salePrice || product.price,
        currency: product.currency || "USD",
        slug: product.slug,
        rating: product.rating,
        reviewCount: product.reviewCount,
      })
    : null;

  return (
    <>
      {jsonLd && <JsonLd data={jsonLd} />}
      <ProductDetailContent />
    </>
  );
}
