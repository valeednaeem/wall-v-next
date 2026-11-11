import { z } from "zod";

export const productFileSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  originalName: z.string().min(1),
  url: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().min(0),
  description: z.string().optional(),
  sortOrder: z.number().default(0),
  createdAt: z.string().optional(),
});

export const productSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  type: z.enum(["product", "service", "digital", "hosting", "domain", "saas", "ai-service"]),
  description: z.string().min(10, "Description must be at least 10 characters"),
  shortDescription: z.string().optional(),
  content: z.string().optional(),
  price: z.number().min(0, "Price must be at least 0"),
  salePrice: z.number().min(0).optional(),
  currency: z.string().default("USD"),
  category: z.string().min(1, "Category is required"),
  subcategory: z.string().optional(),
  badges: z.array(z.string()).default([]),
  features: z.array(z.string()).default([]),
  files: z.array(productFileSchema).default([]),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  isFeatured: z.boolean().default(false),
  isPromotional: z.boolean().default(false),
  sku: z.string().optional(),
  seo: z.object({
    metaTitle: z.string().optional(),
    metaDescription: z.string().optional(),
    keywords: z.array(z.string()).optional(),
  }).optional(),
});

export const productCategorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  parent: z.string().optional(),
  sortOrder: z.number().default(0),
  isActive: z.boolean().default(true),
  seo: z.object({
    metaTitle: z.string().optional(),
    metaDescription: z.string().optional(),
    keywords: z.array(z.string()).optional(),
  }).optional(),
});

export type ProductInput = z.infer<typeof productSchema>;
export type ProductFileInput = z.infer<typeof productFileSchema>;
export type ProductCategoryInput = z.infer<typeof productCategorySchema>;
