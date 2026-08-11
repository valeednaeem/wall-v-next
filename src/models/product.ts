import mongoose, { Schema, Document } from "mongoose";

export interface IProduct extends Document {
  name: string;
  slug: string;
  type: "product" | "service" | "digital" | "hosting" | "domain" | "saas" | "ai-service";
  description: string;
  shortDescription?: string;
  content?: string;
  featuredImage?: string;
  gallery: string[];
  price: number;
  salePrice?: number;
  currency: string;
  category: mongoose.Types.ObjectId;
  subcategory?: mongoose.Types.ObjectId;
  badges: string[];
  features: string[];
  specifications?: Record<string, string>;
  status: "draft" | "published" | "archived";
  isFeatured: boolean;
  isPromotional: boolean;
  stock?: number;
  sku?: string;
  rating?: number;
  reviewCount: number;
  downloadCount: number;
  viewCount: number;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    canonicalUrl?: string;
  };
  social?: {
    ogImage?: string;
    twitterHandle?: string;
  };
  variants?: {
    name: string;
    price: number;
    description?: string;
  }[];
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    type: {
      type: String,
      enum: ["product", "service", "digital", "hosting", "domain", "saas", "ai-service"],
      required: true,
    },
    description: { type: String, required: true },
    shortDescription: String,
    content: String,
    featuredImage: String,
    gallery: [String],
    price: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, min: 0 },
    currency: { type: String, default: "USD" },
    category: { type: Schema.Types.ObjectId, ref: "ProductCategory", required: true },
    subcategory: { type: Schema.Types.ObjectId, ref: "ProductCategory" },
    badges: [String],
    features: [String],
    specifications: { type: Map, of: String },
    status: { type: String, enum: ["draft", "published", "archived"], default: "draft" },
    isFeatured: { type: Boolean, default: false },
    isPromotional: { type: Boolean, default: false },
    stock: { type: Number, default: 0 },
    sku: String,
    rating: { type: Number, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    downloadCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    seo: {
      metaTitle: String,
      metaDescription: String,
      keywords: [String],
      canonicalUrl: String,
    },
    social: {
      ogImage: String,
      twitterHandle: String,
    },
    variants: [
      {
        name: String,
        price: Number,
        description: String,
      },
    ],
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

ProductSchema.index({ type: 1 });
ProductSchema.index({ category: 1 });
ProductSchema.index({ status: 1 });
ProductSchema.index({ isFeatured: 1 });

export default mongoose.models.Product ||
  mongoose.model<IProduct>("Product", ProductSchema);
