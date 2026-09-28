import { z } from "zod";

export const toolStatusEnum = z.enum(["draft", "testing", "published", "unpublished", "archived"]);
export const accessModelEnum = z.enum(["free", "freemium", "subscription"]);

export const usagePolicySchema = z.object({
  dailyLimit: z.number().min(0).default(0),
  monthlyLimit: z.number().min(0).default(0),
  lifetimeFreeExecutions: z.number().min(0).default(0),
  creditsPerExecution: z.number().min(0).default(1),
  rateLimitPerMinute: z.number().min(0).default(5),
  maxInputLength: z.number().min(0).default(0),
  maxOutputLength: z.number().min(0).default(0),
});

export const aiToolSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z.string().min(2).optional(),
  shortDescription: z.string().max(300).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  featuredImage: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  tags: z.array(z.string()).default([]),
  accessModel: accessModelEnum.default("free"),
  status: toolStatusEnum.default("draft"),
  features: z.array(z.string()).default([]),
  flags: z
    .object({
      isFeatured: z.boolean().default(false),
      isNew: z.boolean().default(false),
      isPopular: z.boolean().default(false),
      isRecommended: z.boolean().default(false),
      isComingSoon: z.boolean().default(false),
    })
    .default({
      isFeatured: false,
      isNew: false,
      isPopular: false,
      isRecommended: false,
      isComingSoon: false,
    }),
  displayOrder: z.number().default(0),
  visibility: z
    .object({
      homepage: z.boolean().default(true),
      toolsPage: z.boolean().default(true),
      categoryPage: z.boolean().default(true),
    })
    .default({ homepage: true, toolsPage: true, categoryPage: true }),
  usagePolicy: usagePolicySchema.default({
    dailyLimit: 0,
    monthlyLimit: 0,
    lifetimeFreeExecutions: 0,
    creditsPerExecution: 1,
    rateLimitPerMinute: 5,
    maxInputLength: 0,
    maxOutputLength: 0,
  }),
  aiConfig: z
    .object({
      provider: z.string().optional(),
      model: z.string().optional(),
      routing: z.enum(["provider", "global-default"]).default("global-default"),
      fallbackModel: z.string().optional(),
    })
    .default({ routing: "global-default" }),
  requiredPlan: z.string().optional(),
  seo: z
    .object({
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
      keywords: z.array(z.string()).optional(),
      canonicalUrl: z.string().optional(),
    })
    .optional(),
  social: z
    .object({ ogImage: z.string().optional(), twitterHandle: z.string().optional() })
    .optional(),
});

export type AIToolInput = z.infer<typeof aiToolSchema>;

export const aiToolCategorySchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  image: z.string().optional(),
  seo: z
    .object({ metaTitle: z.string().optional(), metaDescription: z.string().optional() })
    .optional(),
  sortOrder: z.number().default(0),
  isActive: z.boolean().default(true),
});
export type AIToolCategoryInput = z.infer<typeof aiToolCategorySchema>;

export const aiToolTagSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
});
export type AIToolTagInput = z.infer<typeof aiToolTagSchema>;

export const aiToolProviderSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).optional(),
  type: z.enum(["openai", "anthropic", "google", "elevenlabs", "omnirouter", "custom"]),
  status: z.enum(["active", "inactive"]).default("active"),
  isDefault: z.boolean().default(false),
  envKeyName: z.string().optional(),
  models: z
    .array(
      z.object({
        name: z.string().min(1),
        label: z.string().optional(),
        enabled: z.boolean().default(true),
        inputCostPer1k: z.number().min(0).optional(),
        outputCostPer1k: z.number().min(0).optional(),
        maxTokens: z.number().min(0).optional(),
      })
    )
    .default([]),
  rateLimit: z.object({ requestsPerMinute: z.number().min(0).optional() }).optional(),
  notes: z.string().optional(),
});
export type AIToolProviderInput = z.infer<typeof aiToolProviderSchema>;

export const aiToolPlanSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).optional(),
  description: z.string().optional(),
  monthlyPrice: z.number().min(0),
  yearlyPrice: z.number().min(0),
  includedCredits: z.number().min(0).default(0),
  includedExecutions: z.number().min(0).default(0),
  features: z.array(z.string()).default([]),
  status: z.enum(["active", "inactive"]).default("active"),
  sortOrder: z.number().default(0),
});
export type AIToolPlanInput = z.infer<typeof aiToolPlanSchema>;

export const marketResearchSchema = z.object({
  competitor: z.string().min(1),
  product: z.string().min(1),
  category: z.string().optional(),
  url: z.string().optional(),
  pricing: z.string().optional(),
  features: z.array(z.string()).default([]),
  targetAudience: z.string().optional(),
  positioning: z.string().optional(),
  notes: z.string().optional(),
  researchedAt: z.string().optional(),
});
export type MarketResearchInput = z.infer<typeof marketResearchSchema>;
