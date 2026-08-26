import type { Metadata } from "next";
import { generateSEO } from "@/lib/seo";
import { ProductListContent } from "./product-list-content";

export const metadata: Metadata = generateSEO({
  title: "Products",
  description: "Explore our diverse range of digital products, templates, and AI-powered tools. Premium quality, instant delivery.",
  url: "/products",
  keywords: ["digital products", "templates", "AI tools", "software products", "buy online"],
});

export default function ProductsPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold">Products</h1>
        <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
          Explore our diverse range of digital products, templates, and AI-powered tools.
        </p>
      </div>
      <ProductListContent />
    </div>
  );
}
