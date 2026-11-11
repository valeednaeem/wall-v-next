import type { Metadata } from "next";
import { generateSEO } from "@/lib/seo";
import { ProductListContent } from "./product-list-content";

export const metadata: Metadata = generateSEO({
  title: "Shop",
  description: "Explore our diverse range of digital products, templates, and AI-powered tools. Premium quality, instant delivery.",
  url: "/products",
  keywords: ["digital products", "templates", "AI tools", "software products", "buy online", "shop"],
});

export default function ProductsPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold tracking-tight">Shop</h1>
        <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
          Explore our diverse range of digital products, templates, and AI-powered tools.
        </p>
      </div>
      <ProductListContent />
    </div>
  );
}
