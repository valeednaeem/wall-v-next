# Wall-V AI Tools Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full Wall-V AI Tools ecosystem — admin management/intelligence module at `/dashboard/ai-tools`, public catalogue at `/tools`, usage-tracked tool execution engine, and rollup-based analytics.

**Architecture:** 8 new `AITool*` Mongoose models + new `ai-tools:*` permission namespace (isolated from existing `AgentTool`/`tools:*`). Raw execution log (`AIToolExecution`, TTL 180d) + daily rollups (`AIToolDailyStat`) power all analytics. Provider routing extends the existing `src/lib/ai-provider-adapter.ts`. Public pages use the products SSR pattern (ISR + `generateSEO`); admin pages follow the existing `"use client"` + fetch pattern.

**Tech Stack:** Next.js 15.3.4 App Router, React 19, TypeScript 5.8 strict, Mongoose 9.7.4, Tailwind v4, shadcn/ui, recharts 3.9.2, zod 4, lucide-react.

**Confirmed decisions:** new `ai-tools:*` permissions · `AIToolPlan` catalog now (billing = Phase 8, deferred) · adopt orphaned `ActivityLog` for audit · `AIToolExecution` TTL 180d · no PDF export (CSV) · plan saved here.

**Verification after every phase:** `npm run lint` && `npx tsc --noEmit` && `npm run build` (all must pass).

---

## Conventions (match existing code exactly)

- API route: `getAuthUser()` → `hasPermission(user.permissions, PERMISSIONS.AI_TOOLS_X)` → work → `handleApiError(error)`. Success shape: `NextResponse.json({ success: true, data })`.
- Dashboard page: `"use client"` + `useState`/`useEffect` + `fetch("/api/...")`. No `auth()` in pages (middleware handles `/dashboard/*`).
- List page: copy `src/app/dashboard/ecommerce/products/page.tsx` (search form, status chip filters, page/limit, inline Prev/Next).
- Form: plain `useState` object, grouped `<div className="rounded-xl border p-6 space-y-4">` sections, `generateSlug()` from name, create-vs-edit decided by presence of `tool` prop.
- Slug: `name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")`.
- Public SSR page: copy `src/app/(website)/products/[slug]/page.tsx` (`revalidate = 60`, async `params`, try/catch fetch helper returning null, `generateSEO` + `resolveSocialImage`, early-return not-found, `<JsonLd>`, `JSON.parse(JSON.stringify(doc))` into client component).
- Model idiom: `const XSchema = new Schema({...}, { timestamps: true }); XSchema.index({...}); export default (mongoose.models.X as Model<IX>) || mongoose.model<IX>("X", XSchema);`
- Zod: mirror Mongoose enums exactly, `z.string()` for ObjectIds, always `export type XInput = z.infer<typeof xSchema>`.
- Never import or expose env values — only `envKeyName` strings + `Boolean(process.env[name])`.

---

## File Structure Map

```
CREATE src/models/ai-tool.ts, ai-tool-category.ts, ai-tool-tag.ts, ai-tool-provider.ts,
      ai-tool-plan.ts, ai-tool-execution.ts, ai-tool-daily-stat.ts, market-research.ts
CREATE src/lib/validations/ai-tool.ts
CREATE src/lib/tools/access.ts, recorder.ts, rollup.ts, insights.ts, report-csv.ts
CREATE src/scripts/seed-ai-tools.ts

MODIFY src/lib/permissions.ts            (9 ai-tools:* perms + ROLE_HIERARCHY.admin)
MODIFY src/app/dashboard/users/roles/page.tsx  (PERMISSION_GROUPS entry)
MODIFY src/app/dashboard/layout.tsx      (AI Tools sidebar section)
MODIFY src/app/dashboard/layout.tsx      (mount sonner <Toaster/>)
MODIFY src/app/sitemap.ts, src/app/(website)/sitemap/page.tsx  (/tools entries)

CREATE src/app/api/ai-tools/route.ts, [id]/route.ts, bulk/route.ts, logs/route.ts,
      categories/route.ts, categories/[id]/route.ts, tags/route.ts,
      providers/route.ts, providers/[id]/route.ts, plans/route.ts, plans/[id]/route.ts,
      overview/route.ts, analytics/route.ts, usage/route.ts, insights/route.ts, reports/route.ts,
      market/route.ts, market/[id]/route.ts
CREATE src/app/api/tools/route.ts, [slug]/route.ts, [slug]/view/route.ts, [slug]/execute/route.ts

CREATE src/app/dashboard/ai-tools/layout.tsx + page.tsx
      tools/page.tsx, tools/create/page.tsx, tools/[id]/edit/page.tsx
      categories/page.tsx, categories/new/page.tsx, categories/[id]/edit/page.tsx
      plans/page.tsx, usage/page.tsx, analytics/page.tsx, reports/page.tsx,
      providers/page.tsx, settings/page.tsx

CREATE src/components/ai-tools/kpi-card.tsx, date-range-filter.tsx, status-badge.tsx,
      access-badge.tsx, tools-table.tsx, tool-form.tsx, insight-card.tsx,
      charts/usage-trend.tsx, charts/access-mix.tsx, charts/rank-bar.tsx, charts/funnel-chart.tsx
CREATE src/components/tools/ToolCard.tsx, ToolHeader.tsx, ToolInput.tsx, ToolOutput.tsx,
      UsageMeter.tsx, UpgradePrompt.tsx
CREATE src/app/(website)/tools/page.tsx + tool-list-content.tsx
CREATE src/app/(website)/tools/[slug]/page.tsx + tool-detail-content.tsx
```

---

## Phase 1: Foundation

### Task 1.1: AIToolCategory + AIToolTag models

- [ ] Create `src/models/ai-tool-category.ts`:

```typescript
import mongoose, { Schema, Model } from "mongoose";

export interface IAIToolCategory {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  image?: string;
  seo?: { metaTitle?: string; metaDescription?: string };
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AIToolCategorySchema = new Schema<IAIToolCategory>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, trim: true },
    icon: { type: String },
    image: { type: String },
    seo: {
      metaTitle: { type: String },
      metaDescription: { type: String },
    },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

AIToolCategorySchema.index({ isActive: 1, sortOrder: 1 });

export default (mongoose.models.AIToolCategory as Model<IAIToolCategory>) ||
  mongoose.model<IAIToolCategory>("AIToolCategory", AIToolCategorySchema);
```

- [ ] Create `src/models/ai-tool-tag.ts`:

```typescript
import mongoose, { Schema, Model } from "mongoose";

export interface IAIToolTag {
  name: string;
  slug: string;
  toolCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const AIToolTagSchema = new Schema<IAIToolTag>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    toolCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default (mongoose.models.AIToolTag as Model<IAIToolTag>) ||
  mongoose.model<IAIToolTag>("AIToolTag", AIToolTagSchema);
```

### Task 1.2: AIToolProvider + AIToolPlan models

- [ ] Create `src/models/ai-tool-provider.ts`:

```typescript
import mongoose, { Schema, Model } from "mongoose";

export interface IProviderModel {
  name: string;
  label?: string;
  enabled: boolean;
  inputCostPer1k?: number;
  outputCostPer1k?: number;
  maxTokens?: number;
}

export interface IAIToolProvider {
  name: string;
  slug: string;
  type: "openai" | "anthropic" | "google" | "elevenlabs" | "omnirouter" | "custom";
  status: "active" | "inactive";
  isDefault: boolean;
  envKeyName?: string;
  models: IProviderModel[];
  rateLimit?: { requestsPerMinute?: number };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AIToolProviderSchema = new Schema<IAIToolProvider>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    type: {
      type: String,
      required: true,
      enum: ["openai", "anthropic", "google", "elevenlabs", "omnirouter", "custom"],
    },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    isDefault: { type: Boolean, default: false },
    envKeyName: { type: String },
    models: [
      {
        name: { type: String, required: true },
        label: { type: String },
        enabled: { type: Boolean, default: true },
        inputCostPer1k: { type: Number, min: 0 },
        outputCostPer1k: { type: Number, min: 0 },
        maxTokens: { type: Number, min: 0 },
      },
    ],
    rateLimit: { requestsPerMinute: { type: Number, min: 0 } },
    notes: { type: String },
  },
  { timestamps: true }
);

AIToolProviderSchema.index({ status: 1 });

export default (mongoose.models.AIToolProvider as Model<IAIToolProvider>) ||
  mongoose.model<IAIToolProvider>("AIToolProvider", AIToolProviderSchema);
```

- [ ] Create `src/models/ai-tool-plan.ts`:

```typescript
import mongoose, { Schema, Model } from "mongoose";

export interface IAIToolPlan {
  name: string;
  slug: string;
  description?: string;
  monthlyPrice: number;
  yearlyPrice: number;
  includedCredits: number;
  includedExecutions: number;
  features: string[];
  status: "active" | "inactive";
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const AIToolPlanSchema = new Schema<IAIToolPlan>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String },
    monthlyPrice: { type: Number, required: true, min: 0 },
    yearlyPrice: { type: Number, required: true, min: 0 },
    includedCredits: { type: Number, default: 0, min: 0 },
    includedExecutions: { type: Number, default: 0, min: 0 },
    features: [{ type: String }],
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

AIToolPlanSchema.index({ status: 1 });

export default (mongoose.models.AIToolPlan as Model<IAIToolPlan>) ||
  mongoose.model<IAIToolPlan>("AIToolPlan", AIToolPlanSchema);
```

### Task 1.3: AITool model (core registry)

- [ ] Create `src/models/ai-tool.ts`:

```typescript
import mongoose, { Schema, Model } from "mongoose";

export type AccessModel = "free" | "freemium" | "subscription";
export type ToolStatus = "draft" | "testing" | "published" | "unpublished" | "archived";

export interface IAITool {
  name: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  icon?: string;
  featuredImage?: string;
  category: mongoose.Types.ObjectId;
  tags: mongoose.Types.ObjectId[];
  accessModel: AccessModel;
  status: ToolStatus;
  features: string[];
  flags: {
    isFeatured: boolean;
    isNew: boolean;
    isPopular: boolean;
    isRecommended: boolean;
    isComingSoon: boolean;
  };
  displayOrder: number;
  visibility: { homepage: boolean; toolsPage: boolean; categoryPage: boolean };
  usagePolicy: {
    dailyLimit: number;
    monthlyLimit: number;
    lifetimeFreeExecutions: number;
    creditsPerExecution: number;
    rateLimitPerMinute: number;
    maxInputLength: number;
    maxOutputLength: number;
  };
  aiConfig: {
    provider?: mongoose.Types.ObjectId;
    model?: string;
    routing: "provider" | "global-default";
    fallbackModel?: string;
  };
  requiredPlan?: mongoose.Types.ObjectId;
  seo?: { metaTitle?: string; metaDescription?: string; keywords?: string[]; canonicalUrl?: string };
  social?: { ogImage?: string; twitterHandle?: string };
  stats: {
    uniqueUsers: number;
    executions: number;
    successCount: number;
    failureCount: number;
    credits: number;
    estimatedCost: number;
    revenue: number;
    conversionRate: number;
    lastExecutedAt?: Date;
  };
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AIToolSchema = new Schema<IAITool>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    shortDescription: { type: String, trim: true },
    description: { type: String },
    icon: { type: String },
    featuredImage: { type: String },
    category: { type: Schema.Types.ObjectId, ref: "AIToolCategory", required: true },
    tags: [{ type: Schema.Types.ObjectId, ref: "AIToolTag" }],
    accessModel: { type: String, enum: ["free", "freemium", "subscription"], default: "free" },
    status: {
      type: String,
      enum: ["draft", "testing", "published", "unpublished", "archived"],
      default: "draft",
    },
    features: [{ type: String }],
    flags: {
      isFeatured: { type: Boolean, default: false },
      isNew: { type: Boolean, default: false },
      isPopular: { type: Boolean, default: false },
      isRecommended: { type: Boolean, default: false },
      isComingSoon: { type: Boolean, default: false },
    },
    displayOrder: { type: Number, default: 0 },
    visibility: {
      homepage: { type: Boolean, default: true },
      toolsPage: { type: Boolean, default: true },
      categoryPage: { type: Boolean, default: true },
    },
    usagePolicy: {
      dailyLimit: { type: Number, default: 0, min: 0 },
      monthlyLimit: { type: Number, default: 0, min: 0 },
      lifetimeFreeExecutions: { type: Number, default: 0, min: 0 },
      creditsPerExecution: { type: Number, default: 1, min: 0 },
      rateLimitPerMinute: { type: Number, default: 5, min: 0 },
      maxInputLength: { type: Number, default: 0, min: 0 },
      maxOutputLength: { type: Number, default: 0, min: 0 },
    },
    aiConfig: {
      provider: { type: Schema.Types.ObjectId, ref: "AIToolProvider" },
      model: { type: String },
      routing: { type: String, enum: ["provider", "global-default"], default: "global-default" },
      fallbackModel: { type: String },
    },
    requiredPlan: { type: Schema.Types.ObjectId, ref: "AIToolPlan" },
    seo: {
      metaTitle: { type: String },
      metaDescription: { type: String },
      keywords: [{ type: String }],
      canonicalUrl: { type: String },
    },
    social: {
      ogImage: { type: String },
      twitterHandle: { type: String },
    },
    stats: {
      uniqueUsers: { type: Number, default: 0 },
      executions: { type: Number, default: 0 },
      successCount: { type: Number, default: 0 },
      failureCount: { type: Number, default: 0 },
      credits: { type: Number, default: 0 },
      estimatedCost: { type: Number, default: 0 },
      revenue: { type: Number, default: 0 },
      conversionRate: { type: Number, default: 0 },
      lastExecutedAt: { type: Date },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

AIToolSchema.index({ status: 1 });
AIToolSchema.index({ category: 1 });
AIToolSchema.index({ accessModel: 1 });
AIToolSchema.index({ createdAt: -1 });
AIToolSchema.index({ displayOrder: 1 });

export default (mongoose.models.AITool as Model<IAITool>) ||
  mongoose.model<IAITool>("AITool", AIToolSchema);
```

### Task 1.4: AIToolExecution + AIToolDailyStat models

- [ ] Create `src/models/ai-tool-execution.ts`:

```typescript
import mongoose, { Schema, Model } from "mongoose";

export interface IAIToolExecution {
  tool: mongoose.Types.ObjectId;
  user?: mongoose.Types.ObjectId;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
  accessModel: string;
  status: "started" | "success" | "failed" | "timeout";
  creditsConsumed: number;
  provider?: mongoose.Types.ObjectId;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  durationMs?: number;
  errorType?: string;
  errorMessage?: string;
  estimatedCost?: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const AIToolExecutionSchema = new Schema<IAIToolExecution>(
  {
    tool: { type: Schema.Types.ObjectId, ref: "AITool", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User" },
    sessionId: { type: String },
    ip: { type: String },
    userAgent: { type: String },
    accessModel: { type: String, default: "free" },
    status: { type: String, enum: ["started", "success", "failed", "timeout"], required: true },
    creditsConsumed: { type: Number, default: 0, min: 0 },
    provider: { type: Schema.Types.ObjectId, ref: "AIToolProvider" },
    model: { type: String },
    inputTokens: { type: Number, min: 0 },
    outputTokens: { type: Number, min: 0 },
    durationMs: { type: Number, min: 0 },
    errorType: { type: String },
    errorMessage: { type: String },
    estimatedCost: { type: Number, min: 0 },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AIToolExecutionSchema.index({ tool: 1, createdAt: -1 });
AIToolExecutionSchema.index({ user: 1, createdAt: -1 });
AIToolExecutionSchema.index({ status: 1, createdAt: -1 });
AIToolExecutionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

export default (mongoose.models.AIToolExecution as Model<IAIToolExecution>) ||
  mongoose.model<IAIToolExecution>("AIToolExecution", AIToolExecutionSchema);
```

- [ ] Create `src/models/ai-tool-daily-stat.ts`:

```typescript
import mongoose, { Schema, Model } from "mongoose";

export interface IAIToolDailyStat {
  date: Date;
  tool: mongoose.Types.ObjectId;
  category?: mongoose.Types.ObjectId;
  accessModel: string;
  executions: number;
  successCount: number;
  failureCount: number;
  uniqueUsers: number;
  credits: number;
  estimatedCost: number;
  revenue: number;
  funnel: {
    views: number;
    started: number;
    attempted: number;
    succeeded: number;
    upgradePrompts: number;
    conversions: number;
  };
  updatedAt: Date;
}

const AIToolDailyStatSchema = new Schema<IAIToolDailyStat>(
  {
    date: { type: Date, required: true },
    tool: { type: Schema.Types.ObjectId, ref: "AITool", required: true },
    category: { type: Schema.Types.ObjectId, ref: "AIToolCategory" },
    accessModel: { type: String, default: "free" },
    executions: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
    failureCount: { type: Number, default: 0 },
    uniqueUsers: { type: Number, default: 0 },
    credits: { type: Number, default: 0 },
    estimatedCost: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    funnel: {
      views: { type: Number, default: 0 },
      started: { type: Number, default: 0 },
      attempted: { type: Number, default: 0 },
      succeeded: { type: Number, default: 0 },
      upgradePrompts: { type: Number, default: 0 },
      conversions: { type: Number, default: 0 },
    },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

AIToolDailyStatSchema.index({ date: -1 });
AIToolDailyStatSchema.index({ tool: 1, date: -1 });
AIToolDailyStatSchema.index({ date: 1, tool: 1 }, { unique: true });

export default (mongoose.models.AIToolDailyStat as Model<IAIToolDailyStat>) ||
  mongoose.model<IAIToolDailyStat>("AIToolDailyStat", AIToolDailyStatSchema);
```

### Task 1.5: MarketResearch model

- [ ] Create `src/models/market-research.ts`:

```typescript
import mongoose, { Schema, Model } from "mongoose";

export interface IMarketResearch {
  competitor: string;
  product: string;
  category?: string;
  url?: string;
  pricing?: string;
  features?: string[];
  targetAudience?: string;
  positioning?: string;
  notes?: string;
  researchedAt: Date;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MarketResearchSchema = new Schema<IMarketResearch>(
  {
    competitor: { type: String, required: true, trim: true },
    product: { type: String, required: true, trim: true },
    category: { type: String, trim: true },
    url: { type: String, trim: true },
    pricing: { type: String, trim: true },
    features: [{ type: String }],
    targetAudience: { type: String },
    positioning: { type: String },
    notes: { type: String },
    researchedAt: { type: Date, default: Date.now },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

MarketResearchSchema.index({ category: 1 });
MarketResearchSchema.index({ researchedAt: -1 });

export default (mongoose.models.MarketResearch as Model<IMarketResearch>) ||
  mongoose.model<IMarketResearch>("MarketResearch", MarketResearchSchema);
```

### Task 1.6: Permissions (3 registration points)

- [ ] Edit `src/lib/permissions.ts` — add to `PERMISSIONS` (next to existing `TOOLS_*` block):

```typescript
  // ─── AI Tools (public SaaS tools — distinct from agent tools:* above) ───
  AI_TOOLS_VIEW: "ai-tools:view",
  AI_TOOLS_CREATE: "ai-tools:create",
  AI_TOOLS_EDIT: "ai-tools:edit",
  AI_TOOLS_DELETE: "ai-tools:delete",
  AI_TOOLS_PUBLISH: "ai-tools:publish",
  AI_TOOLS_ANALYTICS: "ai-tools:analytics",
  AI_TOOLS_REPORTS: "ai-tools:reports",
  AI_TOOLS_PROVIDERS: "ai-tools:providers",
  AI_TOOLS_PRICING: "ai-tools:pricing",
```

- [ ] Edit `ROLE_HIERARCHY.admin` — add:

```typescript
    "ai-tools:view", "ai-tools:create", "ai-tools:edit", "ai-tools:delete", "ai-tools:publish",
    "ai-tools:analytics", "ai-tools:reports", "ai-tools:providers", "ai-tools:pricing",
```

- [ ] Edit `src/app/dashboard/users/roles/page.tsx` `PERMISSION_GROUPS` — add:

```typescript
  { label: "AI Tools", permissions: [
    PERMISSIONS.AI_TOOLS_VIEW, PERMISSIONS.AI_TOOLS_CREATE, PERMISSIONS.AI_TOOLS_EDIT,
    PERMISSIONS.AI_TOOLS_DELETE, PERMISSIONS.AI_TOOLS_PUBLISH, PERMISSIONS.AI_TOOLS_ANALYTICS,
    PERMISSIONS.AI_TOOLS_REPORTS, PERMISSIONS.AI_TOOLS_PROVIDERS, PERMISSIONS.AI_TOOLS_PRICING,
  ] },
```

- [ ] Run `npx tsc --noEmit` — expect exit 0.

### Task 1.7: Zod validation schemas

- [ ] Create `src/lib/validations/ai-tool.ts`:

```typescript
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
  flags: z.object({
    isFeatured: z.boolean().default(false),
    isNew: z.boolean().default(false),
    isPopular: z.boolean().default(false),
    isRecommended: z.boolean().default(false),
    isComingSoon: z.boolean().default(false),
  }).default({ isFeatured: false, isNew: false, isPopular: false, isRecommended: false, isComingSoon: false }),
  displayOrder: z.number().default(0),
  visibility: z.object({
    homepage: z.boolean().default(true),
    toolsPage: z.boolean().default(true),
    categoryPage: z.boolean().default(true),
  }).default({ homepage: true, toolsPage: true, categoryPage: true }),
  usagePolicy: usagePolicySchema.default({
    dailyLimit: 0, monthlyLimit: 0, lifetimeFreeExecutions: 0, creditsPerExecution: 1,
    rateLimitPerMinute: 5, maxInputLength: 0, maxOutputLength: 0,
  }),
  aiConfig: z.object({
    provider: z.string().optional(),
    model: z.string().optional(),
    routing: z.enum(["provider", "global-default"]).default("global-default"),
    fallbackModel: z.string().optional(),
  }).default({ routing: "global-default" }),
  requiredPlan: z.string().optional(),
  seo: z.object({
    metaTitle: z.string().optional(),
    metaDescription: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    canonicalUrl: z.string().optional(),
  }).optional(),
  social: z.object({ ogImage: z.string().optional(), twitterHandle: z.string().optional() }).optional(),
});

export type AIToolInput = z.infer<typeof aiToolSchema>;

export const aiToolCategorySchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  image: z.string().optional(),
  seo: z.object({ metaTitle: z.string().optional(), metaDescription: z.string().optional() }).optional(),
  sortOrder: z.number().default(0),
  isActive: z.boolean().default(true),
});
export type AIToolCategoryInput = z.infer<typeof aiToolCategorySchema>;

export const aiToolProviderSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).optional(),
  type: z.enum(["openai", "anthropic", "google", "elevenlabs", "omnirouter", "custom"]),
  status: z.enum(["active", "inactive"]).default("active"),
  isDefault: z.boolean().default(false),
  envKeyName: z.string().optional(),
  models: z.array(z.object({
    name: z.string().min(1),
    label: z.string().optional(),
    enabled: z.boolean().default(true),
    inputCostPer1k: z.number().min(0).optional(),
    outputCostPer1k: z.number().min(0).optional(),
    maxTokens: z.number().min(0).optional(),
  })).default([]),
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
```

- [ ] Run `npx tsc --noEmit` — expect exit 0.

### Task 1.8: Seed script

- [ ] Create `src/scripts/seed-ai-tools.ts` — seeds 23 categories, 12 tags, 4 providers, 4 plans (idempotent upsert by slug; `dotenv/config`, `dbName: "wallvnext"` like `seed-hosting-domains.ts`). Categories: Writing & Content, Image Generation, Image Editing, Video, Audio & Voice, Speech-to-Text, Text-to-Speech, SEO, Marketing, Productivity, Documents & PDF, Developer Tools, Coding, Data & Analytics, Business, Education, Research, Automation, AI Agents, Social Media, E-commerce, Design, Utilities. Tags: AI, GPT, Automation, SEO, Content, Image, Voice, Developer, PDF, Marketing, Productivity, Analytics. Providers: openai (`OPENAI_API_KEY`, models gpt-4o, gpt-4o-mini), anthropic (`AI_API_KEY`, claude-sonnet-4), google (custom), elevenlabs (custom). Plans: Free ($0), Starter ($19/$190), Professional ($49/$490), Business ($99/$990).
- [ ] Add script `"seed:ai-tools": "tsx src/scripts/seed-ai-tools.ts"` to `package.json`.
- [ ] Run `npm run seed:ai-tools` — expect seeded counts printed.
- [ ] Run `npm run lint` && `npx tsc --noEmit` — both exit 0.

### Task 1.9: Phase 1 commit

- [ ] Commit: `feat: AI Tools foundation — 8 models, ai-tools permissions, zod schemas, seed script`

---

## Phase 2: Admin CRUD

### Task 2.1: Shared API guard helper

- [ ] Create `src/lib/tools/api-guard.ts`:

```typescript
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { JWTPayload } from "@/lib/auth";

export async function requireAiToolsPermission(
  permission: string = PERMISSIONS.AI_TOOLS_VIEW
): Promise<{ user: JWTPayload; error?: NextResponse }> {
  const user = await getAuthUser();
  if (!user) {
    return { user: user as never, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!hasPermission(user.permissions || [], permission)) {
    return { user, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user };
}

export function makeSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function logAiToolAction(
  user: JWTPayload,
  action: string,
  entity: string,
  entityId: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    const { default: ActivityLog } = await import("@/models/activity-log");
    const { connectToDatabase } = await import("@/lib/mongodb");
    await connectToDatabase();
    await ActivityLog.create({ user: user.userId, action, entity, entityId, details });
  } catch (e) {
    console.error("[ai-tools] audit log failed:", e);
  }
}
```

### Task 2.2: Tools CRUD API

- [ ] Create `src/app/api/ai-tools/route.ts` — GET (query: `search, status, category, accessModel, sort, page, limit, allStatuses`; default limit 20; `.populate("category", "name slug")`, sort by `createdAt desc` or `displayOrder`; returns `{ success, data, pagination }`) + POST (`aiToolSchema` parse, `makeSlug` if no slug, duplicate-slug 400, `createdBy: user.userId`, `logAiToolAction(user, "ai_tool.created", "AITool", id)`). Guard: GET→`AI_TOOLS_VIEW`, POST→`AI_TOOLS_CREATE`.
- [ ] Create `src/app/api/ai-tools/[id]/route.ts` — GET single (populate category/tags/provider/plan name+slug), PUT (parse `aiToolSchema.partial()`, load existing, merge, save, log `ai_tool.updated` with before/after of changed keys), DELETE (log `ai_tool.deleted`, `deleteOne`). Guard: GET/PUT→`AI_TOOLS_EDIT`, DELETE→`AI_TOOLS_DELETE`.
- [ ] Create `src/app/api/ai-tools/bulk/route.ts` — POST `{ ids: string[], action: "publish"|"unpublish"|"archive"|"delete" }`. Guard `AI_TOOLS_PUBLISH` (delete requires `AI_TOOLS_DELETE`). `updateMany` / `deleteMany`; log `ai_tool.bulk_{action}` with ids.
- [ ] Create `src/app/api/ai-tools/logs/route.ts` — GET `ActivityLog.find({ entity: "AITool" })` paginated, newest first. Guard `AI_TOOLS_VIEW`.

### Task 2.3: Categories / Tags / Providers / Plans APIs

- [ ] Create `src/app/api/ai-tools/categories/route.ts` — GET (all, sorted `sortOrder`, include per-category published tool count via `$lookup` or `AITool.countDocuments`), POST (`aiToolCategorySchema`; guard `AI_TOOLS_CREATE`; log).
- [ ] Create `src/app/api/ai-tools/categories/[id]/route.ts` — GET/PUT/DELETE (guards `AI_TOOLS_EDIT`/`AI_TOOLS_DELETE`; log).
- [ ] Create `src/app/api/ai-tools/tags/route.ts` — GET all, POST `{name}` (auto slug, dedupe 400), DELETE `?id=`. Guard `AI_TOOLS_EDIT`.
- [ ] Create `src/app/api/ai-tools/providers/route.ts` — GET returns each provider with `configured: Boolean(process.env[p.envKeyName])` (never values), POST (`aiToolProviderSchema`; guard `AI_TOOLS_PROVIDERS`; if `isDefault` unset others; log).
- [ ] Create `src/app/api/ai-tools/providers/[id]/route.ts` — PUT/DELETE (guard `AI_TOOLS_PROVIDERS`; log).
- [ ] Create `src/app/api/ai-tools/plans/route.ts` — GET/POST (guards VIEW/`AI_TOOLS_PRICING`; log).
- [ ] Create `src/app/api/ai-tools/plans/[id]/route.ts` — PUT/DELETE (guard `AI_TOOLS_PRICING`; log).

### Task 2.4: Sidebar + dashboard layout

- [ ] Edit `src/app/dashboard/layout.tsx`:
  - Import `Wand2` (or `Blocks`) from lucide-react.
  - Add new top-level `SidebarItem` after "E-Commerce" (order by product logic — place after "AI"):

```typescript
  { label: "AI Tools", href: "/dashboard/ai-tools", icon: <Wand2 className="h-4 w-4" />,
    permission: "ai-tools:view",
    children: [
      { label: "Overview", href: "/dashboard/ai-tools", permission: "ai-tools:view" },
      { label: "Tools", href: "/dashboard/ai-tools/tools", permission: "ai-tools:view" },
      { label: "Categories", href: "/dashboard/ai-tools/categories", permission: "ai-tools:view" },
      { label: "Plans & Access", href: "/dashboard/ai-tools/plans", permission: "ai-tools:pricing" },
      { label: "Usage & Credits", href: "/dashboard/ai-tools/usage", permission: "ai-tools:analytics" },
      { label: "Analytics", href: "/dashboard/ai-tools/analytics", permission: "ai-tools:analytics" },
      { label: "Reports", href: "/dashboard/ai-tools/reports", permission: "ai-tools:reports" },
      { label: "Providers", href: "/dashboard/ai-tools/providers", permission: "ai-tools:providers" },
      { label: "Settings", href: "/dashboard/ai-tools/settings", permission: "ai-tools:view" },
    ],
  },
```

  - Mount `<Toaster />` from `sonner` (import + render once near layout root).
- [ ] Create `src/app/dashboard/ai-tools/layout.tsx` — `"use client"`; `TABS` array (same 9 entries with lucide icons) rendered as horizontal tab bar with `usePathname()` active state + `useSession()` unauthenticated redirect (copy `src/app/dashboard/content/layout.tsx`); wraps children with page header "AI Tools Management".

### Task 2.5: Tools list page

- [ ] Create `src/app/dashboard/ai-tools/tools/page.tsx` — copy structure of `ecommerce/products/page.tsx`:
  - State: `tools, loading, search, statusFilter, accessFilter, page, totalPages, total, selected: string[], busy`.
  - Fetch `/api/ai-tools?allStatuses=true&page=&limit=20&search=&status=&accessModel=`.
  - Reusable columns: Name (+slug), Category, Access (AccessBadge), Status (StatusBadge), Users, Executions, Credits, Revenue, Conv. %, Created, Actions (View→edit, Edit, Publish/Unpublish via PUT, Delete via confirm).
  - Bulk bar appears when `selected.length > 0`: Publish / Unpublish / Archive / Delete → `POST /api/ai-tools/bulk`.
  - Export button → `window.open("/api/ai-tools/reports?type=usage&format=csv&...filters")`.
  - Uses `src/components/ai-tools/tools-table.tsx` if extracted; otherwise inline table matching repo style.
- [ ] Extract `src/components/ai-tools/status-badge.tsx` (`draft|testing|published|unpublished|archived` color map) and `access-badge.tsx` (`free|freemium|subscription`).

### Task 2.6: Create/Edit tool pages + form

- [ ] Create `src/components/ai-tools/tool-form.tsx` — props `{ tool?: IAIToolJSON; onSaved?: () => void }`:
  - Section "General": name (auto-slug), shortDescription, description (textarea), icon, featuredImage, category `<select>` from `/api/ai-tools/categories`, tags (multi-select chips from `/api/ai-tools/tags` + add-new input), status select.
  - Section "Access & Usage Policy": accessModel radio (free/freemium/subscription); policy number inputs (dailyLimit, monthlyLimit, lifetimeFreeExecutions, creditsPerExecution, rateLimitPerMinute, maxInputLength, maxOutputLength) with help text; `requiredPlan` select (visible when accessModel=subscription, from `/api/ai-tools/plans`).
  - Section "AI Configuration": provider select (from `/api/ai-tools/providers`, labels show `configured` state), model select (models of chosen provider), routing select, fallbackModel.
  - Section "SEO": metaTitle, metaDescription, keywords (comma string → array), canonicalUrl.
  - Section "Social": ogImage, twitterHandle.
  - Section "Discovery": flags checkboxes (Featured/New/Popular/Recommended/Coming Soon), displayOrder, visibility checkboxes (homepage/toolsPage/categoryPage), features (dynamic list rows).
  - Footer: Save (POST `/api/ai-tools` or PUT `/api/ai-tools/[id]`), Cancel → back. Inline `error`/`message` state (repo pattern).
- [ ] Create `src/app/dashboard/ai-tools/tools/create/page.tsx` (renders `<ToolForm />`, redirect to `/dashboard/ai-tools/tools` on save).
- [ ] Create `src/app/dashboard/ai-tools/tools/[id]/edit/page.tsx` (fetch `/api/ai-tools/[id]`, pass `tool` into `<ToolForm />`, loading skeleton).

### Task 2.7: Categories / Providers / Plans pages

- [ ] Create `src/app/dashboard/ai-tools/categories/page.tsx` — table (Name, Slug, Order, Status, Tools, Actions), Add button; copy `blog/categories/page.tsx`.
- [ ] Create `src/app/dashboard/ai-tools/categories/new/page.tsx` + `[id]/edit/page.tsx` — shared inline form (name, slug auto, description, icon, image, sortOrder, isActive, SEO).
- [ ] Create `src/app/dashboard/ai-tools/providers/page.tsx` — cards/table per provider: name, type, status, default badge, env var name + `configured ✓/✗` (from API boolean), models table (name, enabled, costs), Add/Edit dialog (or separate page if dialog gets heavy), Delete. Shows warning "API keys are read from environment variables and never displayed."
- [ ] Create `src/app/dashboard/ai-tools/plans/page.tsx` — plan cards (name, monthly/yearly price, credits, executions, features, status) + create/edit form (inline dialog or section) + note that entitlement checkout is Phase 8.
- [ ] Create `src/app/dashboard/ai-tools/settings/page.tsx` — read-only-ish settings panel: default rate limits, retention info (180d), rollup explanation, feature flags placeholders (local state + saved to localStorage for now — no settings model added; keep honest labels).

### Task 2.8: Phase 2 verification

- [ ] `npm run lint` → exit 0. `npx tsc --noEmit` → exit 0. `npm run build` → passes.
- [ ] Manual smoke (dev server): sidebar section visible for admin, tools list loads, create tool works, category CRUD works, provider page shows configured booleans, publish action logs to ActivityLog.
- [ ] Commit: `feat: AI Tools admin module — CRUD APIs, sidebar, tools/categories/providers/plans pages`

---

## Phase 3: Public Catalogue

### Task 3.1: Public tools APIs

- [ ] Create `src/app/api/tools/route.ts` — GET (public): `AITool.find({ status: "published", "visibility.toolsPage": true })` populate `category name slug`, select safe fields only (no `aiConfig`, no `usagePolicy.rateLimitPerMinute` internals beyond what UI needs — include `accessModel` + `usagePolicy.lifetimeFreeExecutions` for badges), sort `displayOrder` then `createdAt`. Query filters `?category=&accessModel=&search=`. No auth.
- [ ] Create `src/app/api/tools/[slug]/route.ts` — GET published single by slug, same safe select; 404 if not published.

### Task 3.2: Public catalogue pages

- [ ] Create `src/app/(website)/tools/page.tsx` — server component: `export const revalidate = 300;`, fetch published tools + categories (try/catch → empty), `generateSEO({ title: "AI Tools", description: ..., url: "/tools" })`, render `<ToolListContent initialTools={...} initialCategories={...} />`.
- [ ] Create `src/app/(website)/tools/tool-list-content.tsx` — `"use client"`: category chip filter, access-model filter, search input, `ToolCard` grid, count display, "Coming Soon" cards disabled. Empty state.
- [ ] Create `src/components/tools/ToolCard.tsx` — name, category, shortDescription (2-line clamp), featuredImage/icon tile, AccessBadge (FREE/FREEMIUM/PRO), flags (Featured/New), link to `/tools/{slug}`.
- [ ] Create `src/app/(website)/tools/[slug]/page.tsx` — copy products/[slug] pattern exactly: `revalidate = 60`, async params, `getTool()` helper (`findOne({ slug, status: "published" })` populate category/tags), `generateMetadata` via `generateSEO` + `resolveSocialImage(social?.ogImage, featuredImage)` + keywords fallback, early-return not-found UI, `<JsonLd>` SoftwareApplication schema, `<ToolDetailContent initialTool={...} />`.
- [ ] Create `src/components/tools/ToolHeader.tsx` — icon/featured image, name, category link, AccessBadge, flags, shortDescription.
- [ ] Create `src/app/(website)/tools/[slug]/tool-detail-content.tsx` — `"use client"`: hero (ToolHeader), description + features list (`.article-content` class for HTML), usage info card (daily/monthly limits from policy, `UsageMeter`), tool interaction panel (`ToolInput` → `POST /api/tools/[slug]/execute` → `ToolOutput`), upgrade prompt when 403 with reason `limit_reached`/`plan_required` (`UpgradePrompt`), SEO content sections. Fires `POST /api/tools/[slug]/view` beacon once on mount (fire-and-forget).

### Task 3.3: Tool interaction components (stubs wired in Phase 4)

- [ ] Create `src/components/tools/ToolInput.tsx` — props `{ maxLength, onSubmit(text), busy, disabledReason? }`: textarea with char counter, Submit button, disabled state explanation.
- [ ] Create `src/components/tools/ToolOutput.tsx` — props `{ result?, error?, busy }`: loading skeleton, output area (text/markdown pre-wrap), copy button, error banner.
- [ ] Create `src/components/tools/UsageMeter.tsx` — props `{ used, limit, label }`: progress bar (`rounded-full bg-muted` + fill), "X of Y remaining today"; when limit=0 show "Unlimited".
- [ ] Create `src/components/tools/UpgradePrompt.tsx` — props `{ reason: "limit_reached"|"plan_required"|"auth_required", toolName }`: bordered CTA card linking `/pricing` + `/login`, copy varies by reason.

### Task 3.4: Sitemap + footer/nav discovery

- [ ] Edit `src/app/sitemap.ts`: add `{ url: \`${baseUrl}/tools\`, changeFrequency: "daily", priority: 0.9 }` to static array; in DB section add `AITool.find({ status: "published" }).select("slug updatedAt")` → `/tools/{slug}` entries.
- [ ] Edit `src/app/(website)/sitemap/page.tsx` — add `Tools` entry to public sections list.
- [ ] Add a `/tools` link to the website header/footer navigation component (locate nav array in `src/components/` — header config where `/products` is defined — and add Tools beside it).

### Task 3.5: Phase 3 verification

- [ ] `npm run lint` && `npx tsc --noEmit` && `npm run build` all pass.
- [ ] Manual: `/tools` shows seeded/created published tools; `/tools/{slug}` metadata correct; unpublished tools 404; sitemap contains `/tools`.
- [ ] Commit: `feat: public /tools catalogue — SSR pages, cards, sitemap, metadata`

---

## Phase 4: Tool Engine

### Task 4.1: Access control (`src/lib/tools/access.ts`)

- [ ] Create file:

```typescript
import connectToDatabase from "@/lib/mongodb";
import AITool from "@/models/ai-tool";
import AIToolExecution from "@/models/ai-tool-execution";
import { JWTPayload } from "@/lib/auth";

export type AccessDenyReason = "not_found" | "auth_required" | "plan_required" | "limit_reached" | "input_too_long" | "inactive";

export interface AccessCheck {
  allowed: boolean;
  reason?: AccessDenyReason;
  remainingToday?: number;
  remainingMonth?: number;
  freeRemaining?: number;
}

function startOf(d: Date, unit: "day" | "month"): Date {
  const x = new Date(d);
  if (unit === "day") x.setHours(0, 0, 0, 0);
  else { x.setDate(1); x.setHours(0, 0, 0, 0); }
  return x;
}

export async function checkToolAccess(
  toolId: string,
  user: JWTPayload | null,
  inputLength = 0
): Promise<AccessCheck> {
  await connectToDatabase();
  const tool = await AITool.findById(toolId).lean();
  if (!tool || tool.status !== "published") return { allowed: false, reason: "not_found" };
  const p = tool.usagePolicy;

  if (p.maxInputLength > 0 && inputLength > p.maxInputLength) {
    return { allowed: false, reason: "input_too_long" };
  }

  // Subscription tools require a logged-in user (entitlement check is Phase 8)
  if (tool.accessModel === "subscription") {
    if (!user) return { allowed: false, reason: "auth_required" };
    // Phase 8: replace with AIToolSubscription entitlement lookup
    return { allowed: false, reason: "plan_required" };
  }

  // Anonymous users: allow free tools only, with per-IP daily cap of 10
  const userFilter = user ? { user: user.userId } : {};
  const sinceDay = startOf(new Date(), "day");
  const sinceMonth = startOf(new Date(), "month");

  if (!user) {
    const today = await AIToolExecution.countDocuments({ tool: toolId, createdAt: { $gte: sinceDay }, status: { $ne: "started" } });
    if (today >= 10) return { allowed: false, reason: "limit_reached", remainingToday: 0 };
    return { allowed: true, remainingToday: 10 - today };
  }

  if (p.dailyLimit > 0) {
    const used = await AIToolExecution.countDocuments({ tool: toolId, ...userFilter, createdAt: { $gte: sinceDay }, status: { $ne: "started" } });
    if (used >= p.dailyLimit) return { allowed: false, reason: "limit_reached", remainingToday: 0 };
  }
  if (p.monthlyLimit > 0) {
    const used = await AIToolExecution.countDocuments({ tool: toolId, ...userFilter, createdAt: { $gte: sinceMonth }, status: { $ne: "started" } });
    if (used >= p.monthlyLimit) return { allowed: false, reason: "limit_reached", remainingMonth: 0 };
  }
  if (tool.accessModel === "freemium" && p.lifetimeFreeExecutions > 0) {
    const used = await AIToolExecution.countDocuments({ tool: toolId, ...userFilter, status: { $ne: "started" } });
    if (used >= p.lifetimeFreeExecutions) {
      return { allowed: false, reason: "plan_required", freeRemaining: 0 };
    }
    return { allowed: true, freeRemaining: p.lifetimeFreeExecutions - used };
  }

  let remainingToday: number | undefined;
  if (p.dailyLimit > 0) {
    const used = await AIToolExecution.countDocuments({ tool: toolId, ...userFilter, createdAt: { $gte: sinceDay }, status: { $ne: "started" } });
    remainingToday = Math.max(0, p.dailyLimit - used);
  }
  return { allowed: true, remainingToday };
}
```

### Task 4.2: Recorder + rollup (`src/lib/tools/recorder.ts`)

- [ ] Create file with two exported functions:
  - `recordExecution(params)`: creates `AIToolExecution` (or updates an existing "started" row), then atomically upserts `AIToolDailyStat` for `startOfDay` + tool: `$inc { executions, successCount|failureCount, credits, estimatedCost }`, and `AITool.updateOne({ $inc: { "stats.executions": ..., "stats.successCount"|"stats.failureCount": ..., "stats.credits": ..., "stats.estimatedCost": ... }, $set: { "stats.lastExecutedAt": now } })`. For `uniqueUsers`: only increment `stats.uniqueUsers`/stat `uniqueUsers` when the user's first execution of the day (check `AIToolExecution.exists({tool, user, createdAt: >= startOfDay, _id: {$ne: current}})` before insert) — best-effort, documented.
  - `recordFunnelEvent(toolId, event: "views"|"started"|"upgradePrompts"|"conversions", userId?)`: `$inc` the day's `funnel.{event}` via upsert; views are IP-throttled by caller (in-memory `checkRateLimit`).
  - Estimated cost: from provider `models[]` (`inputCostPer1k`/`outputCostPer1k` × tokens) when tokens known, else `estimatedCost: 0`.
- [ ] All functions swallow+log errors (never break the execution response).

### Task 4.3: Execute route

- [ ] Create `src/app/api/tools/[slug]/route.ts` sibling `src/app/api/tools/[slug]/execute/route.ts`:
  - POST body `{ input: string }`. Validate with zod (`z.object({ input: z.string().min(1).max(50000) })`).
  - `getClientIp` + `checkRateLimit(\`tool-exec:{slug}:{ip}\`, tool.usagePolicy.rateLimitPerMinute || 5, 60000)` → 429 if blocked.
  - `getAuthUser()` (optional), resolve tool by slug, `checkToolAccess()` → if denied: 401/403/429 JSON `{ error, reason, remainingToday/FreeRemaining }` + `recordFunnelEvent(tool, "upgradePrompts")` when reason is `limit_reached`/`plan_required`.
  - Execute: read tool `aiConfig` → if `routing === "provider"` load `AIToolProvider`, pick enabled model, call `getProviderAdapter(model).chat({ model, messages: [{role:"user", content: input}] })` from `@/lib/ai-provider-adapter`; if `global-default`, use `generateAIContent()` from `@/services/ai`. Wrap in try/catch; compute `durationMs`.
  - `recordExecution({...status: success|failed, creditsConsumed: policy.creditsPerExecution, model, tokens from usage, estimatedCost, errorType})`.
  - Response `{ success: true, output, usage: { credits, remainingToday } }`.
- [ ] Create `src/app/api/tools/[slug]/view/route.ts` — POST, `checkRateLimit("tool-view:{ip}", 30, 60000)`, resolves tool, `recordFunnelEvent(slug→id, "views")`, returns `{ ok: true }`.

### Task 4.4: Wire interaction components

- [ ] In `tool-detail-content.tsx`: `ToolInput onSubmit` → POST execute; on 403 with `reason` show `UpgradePrompt`; show `UsageMeter` refreshed from response `usage`; `ToolOutput` renders `output`. On first submit for anonymous users of free tools, no login wall (per-IP cap only).

### Task 4.5: Phase 4 verification

- [ ] `npm run lint` && `npx tsc --noEmit` && `npm run build`.
- [ ] Manual: execute a published tool → output renders, execution row created, daily stat incremented, second tool on same day counts; exceed daily limit → UpgradePrompt; unpublished tool → 404; rate limit → 429.
- [ ] Commit: `feat: AI Tool execution engine — access policy, provider routing, usage recording, public interaction UI`

---

## Phase 5: Overview + Analytics

### Task 5.1: Date-range helpers + overview API

- [ ] Create `src/lib/tools/date-range.ts` — `resolveRange(range: string, start?: string, end?: string): { from: Date; to: Date; label: string }` supporting `today|yesterday|7d|30d|month|lastMonth|year|custom` (start-of-day/to-end-of-day, UTC-safe local).
- [ ] Create `src/app/api/ai-tools/overview/route.ts` (guard `AI_TOOLS_ANALYTICS`):
  - Query `AIToolDailyStat` between `from..to`.
  - **KPIs:** totalTools/published/draft/free/freemium/subscription (from `AITool` counts); totalUsers/activeUsers (`AIToolExecution` distinct user in range — rollup can't do distinct, so aggregate raw with `$group` on user but capped, OR maintain `dailyStat` per-tool only and compute distinct users from raw `AIToolExecution` with index `{user:1,createdAt:-1}` — acceptable for drill KPI with 180d TTL); executions (sum rollup), executionsToday, credits, newUsers, conversions (sum funnel.conversions), revenue (sum revenue), avgExecutionsPerUser.
  - **Series:** executions+users by day (`$group` by date), access-mix by accessModel (sum executions), credits by day, revenue by day, top tools (sum executions sort desc limit 10), fastest-growing (compare last 7d vs prior 7d per tool), declining (inverse).
  - Response `{ success, data: { kpis, series, range } }`.

### Task 5.2: Charts + KPI components

- [ ] Create `src/components/ai-tools/kpi-card.tsx` — `{ label, value, sublabel?, delta?, icon?, href? }` (Card copy from `dashboard/page.tsx`).
- [ ] Create `src/components/ai-tools/date-range-filter.tsx` — preset chips + custom date inputs + Apply (pattern from `marketing/tracking/attribution/page.tsx`); props `{ value, onChange }`.
- [ ] Create `src/components/ai-tools/charts/usage-trend.tsx` — recharts `ResponsiveContainer` + `AreaChart` (`executions`, `users` lines), custom tooltip styled with Tailwind, no grid overload.
- [ ] Create `src/components/ai-tools/charts/access-mix.tsx` — recharts `PieChart` donut (free/freemium/subscription) + legend.
- [ ] Create `src/components/ai-tools/charts/rank-bar.tsx` — recharts `BarChart` horizontal layout; props `{ data: {name, value}[], color? }`.

### Task 5.3: Overview page

- [ ] Create `src/app/dashboard/ai-tools/page.tsx` — `"use client"`: `DateRangeFilter` at top; 16 `KpiCard`s in `grid-cols-2 md:grid-cols-4`; charts row: `UsageTrend` (2/3) + `AccessMix` (1/3); second row: `RankBar` top tools + `RankBar` growing/declining; loading skeletons; fetch on range change (`/api/ai-tools/overview?range=...`).

### Task 5.4: Analytics API + page (Global / Tool / User tabs)

- [ ] Create `src/app/api/ai-tools/analytics/route.ts` (guard `AI_TOOLS_ANALYTICS`) — `?scope=`:
  - `global`: tool counts by status/access, adoption (unique users per week), retention proxy (users active 2+ weeks), estimated cost sum.
  - `tool&toolId=`: per-tool series, success/failure, avg duration, credits, cost, views→exec conversion, repeat users (users with >1 execution in range / users total).
  - `user`: top users by executions & credits (raw `AIToolExecution` `$group`), multi-tool users, free vs paid split, users who stopped (active before range but not in range — capped query).
- [ ] Create `src/app/dashboard/ai-tools/analytics/page.tsx` — `Tabs` (Global | Tool-level | User-level): Global renders KPIs + adoption chart; Tool-level has tool selector + per-tool KPIs + success-rate bar + series; User-level renders sortable table (user, executions, credits, tools used, last active). Uses `UsageTrend`/`RankBar`.

---

## Phase 6: Depth (Funnel / Performance / Usage / Insights / SEO)

### Task 6.1: Funnel + performance

- [ ] Extend `/api/ai-tools/analytics` with `scope=funnel&toolId=` (sum `funnel.*` in range + stage-to-stage %) and `scope=performance` (per-tool rows: executions, growth% (range vs previous equal-length window), uniqueUsers, repeatRate, conversionRate, revenue, estimatedCost, profitContribution = revenue − cost, errorRate = failure/executions).
- [ ] Create `src/components/ai-tools/charts/funnel-chart.tsx` — stage rows: Views → Opened(started) → Attempted → Succeeded → Repeated → Upgrade Prompt → Conversion, each with count + % of previous + % of first.
- [ ] Add `Funnel` + `Performance` tabs to analytics page (Performance = sortable table via column header clicks, all numeric columns sortable — no library, simple `sortState`).

### Task 6.2: Usage & Credits page

- [ ] Create `src/app/api/ai-tools/usage/route.ts` (guard `AI_TOOLS_ANALYTICS`) — `?groupBy=tool|user|provider|date&range=...`: sums credits, executions, estimatedCost, avg cost/execution; plus `?raw=true&page=` for paginated execution log rows (populate tool name, user name).
- [ ] Create `src/app/dashboard/ai-tools/usage/page.tsx` — KPI row (total credits, by-tool credits, avg cost/execution, est. API cost) + group-by tabs rendering `RankBar`/table + raw log drill-down table with pagination.

### Task 6.3: Product Insights

- [ ] Create `src/lib/tools/insights.ts` — `generateInsights(from, to): Promise<Insight[]>` computing evidence-based observations (each `{ id, text, metric, range, severity, drilldown }`):
  - usage growth ≥ 20% vs previous window → "Tool X usage increased N%…"
  - top-decile views but repeatRate < 15% → "high traffic but low repeat usage"
  - single tool > 35% of estimated cost → "accounts for N% of AI API costs"
  - freemium tools where `limit_reached` deny events / executions > threshold (count executions with status success equal to lifetime cap? use upgradePrompts vs executions) → "reached free usage limit frequently"
  - errorRate > 10% → "high execution failure rate"
  - category growth comparison.
  - Sort by severity. Clearly mark each with metric + range (no AI generation in v1; schema allows `source: "computed" | "ai"` for later).
- [ ] Create `src/app/api/ai-tools/insights/route.ts` (guard `AI_TOOLS_ANALYTICS`) + `src/components/ai-tools/insight-card.tsx` (text, metric chip, range chip, drill-down link to analytics tab).
- [ ] Add `Insights` tab to analytics page.

### Task 6.4: SEO tab (honest, no fake data)

- [ ] Add `scope=seo` to analytics API: returns per-tool stored SEO fields completeness (metaTitle, metaDescription, keywords count, canonicalUrl present) + indexed/traffic fields as `null` with `source: "not_connected"`.
- [ ] SEO tab renders: tool SEO completeness table + a "Google Search Console not connected" empty state explaining future integration (no fabricated impressions/CTR).

### Task 6.5: Phase 5–6 verification

- [ ] `npm run lint` && `npx tsc --noEmit` && `npm run build`.
- [ ] Manual: overview KPIs react to range change; charts render (recharts first consumer); funnel shows stage %; performance table sorts; usage group-by works; insights show metric+range; SEO tab shows not-connected state.
- [ ] Commits: `feat: AI Tools overview + analytics with rollup-driven charts`, `feat: funnel, performance, usage, insights, SEO analytics`

---

## Phase 7: Reports + Market Research

### Task 7.1: CSV report engine

- [ ] Create `src/lib/tools/report-csv.ts` — `toCsv(headers: string[], rows: (string|number|null)[][]): string` (RFC-4180 escaping: quote fields containing `,`/`"`/newline, escape `"`→`""`).
- [ ] Create `src/app/api/ai-tools/reports/route.ts` (guard `AI_TOOLS_REPORTS`):
  - `?type=` one of `usage|adoption|revenue|credits|cost|access|conversion|seo|growth|errors|providers|market`; `?format=csv` (default) plus filters `range/start/end/toolId/category/accessModel/userType`.
  - Each type builds headers+rows from rollups/raw (reuse analytics queries); returns `NextResponse` with `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="ai-tools-{type}-{from}-{to}.csv"`.
  - Log report generation via `logAiToolAction(user, "report.generated", "AIToolReport", type, {...filters})`.

### Task 7.2: Reports page

- [ ] Create `src/app/dashboard/ai-tools/reports/page.tsx` — report type cards (12, name + description), DateRangeFilter, tool/category/access filters, Preview button (fetch CSV as text → render in `<pre>` table preview, cap 200 rows), Download button (direct link), history note (audit log link `/dashboard/ai-tools` logs API if needed).

### Task 7.3: Market Research

- [ ] Create `src/app/api/ai-tools/market/route.ts` + `[id]/route.ts` (GET/POST/PUT/DELETE, guard `AI_TOOLS_ANALYTICS`, zod `marketResearchSchema`, log actions).
- [ ] Add `Market` tab (or sub-page `analytics` → Market section) rendering table (Competitor, Product, Category, Pricing, URL, Researched date, Actions) + create/edit dialog. Header note: "External market research — separate from internal Wall-V analytics. Data recorded manually or by future research agent."

### Task 7.4: Phase 7 verification

- [ ] `npm run lint` && `npx tsc --noEmit` && `npm run build`.
- [ ] Manual: CSV downloads with correct headers for 3 report types; market CRUD works; report generation appears in ActivityLog.
- [ ] Commit: `feat: AI Tools reports (CSV) + market research module`

---

## Phase 8: Subscription entitlement (DEFERRED — needs billing sign-off)

Not executed in this pass. When approved:
1. `AIToolSubscription` model `{ user, plan, status, currentPeriodStart/End, creditsRemaining, convertedViaTool }`.
2. Purchase via existing 2Checkout `/api/payments/checkout` with `items.type: "subscription"`.
3. Replace the `plan_required` branch in `checkToolAccess()` with entitlement lookup + credit deduction.
4. `recordFunnelEvent(tool, "conversions")` on successful purchase + `AIToolDailyStat.revenue`.
5. Real Revenue/Conversion KPIs light up automatically (fields already exist).

---

## Final Verification (after all phases)

- [ ] `npm run lint` → exit 0
- [ ] `npx tsc --noEmit` → exit 0
- [ ] `npm run build` → passes
- [ ] Smoke: `/tools` 200, `/tools/[slug]` 200 + metadata, `/dashboard/ai-tools` KPIs load as admin, non-admin 403 on APIs, execute route works, CSV exports, sitemap contains `/tools`.
- [ ] Report results; push only if requested.

## Self-Review Notes

- Spec coverage: overview 16 KPIs ✓ · tools table w/ bulk+export ✓ · create/edit all sections ✓ · free/freemium/subscription policy config ✓ · categories ✓ · tags many-to-many via ObjectId[] ✓ · providers w/o keys ✓ · routing via existing adapter ✓ · usage&credits ✓ · analytics global/tool/user ✓ · funnel ✓ · performance ✓ · market ✓ · SEO honest stub ✓ · 12 report types ✓ · insights w/ evidence ✓ · responsive (Tailwind grids) ✓ · permissions 9 ✓ · activity log ✓ · public `/tools` config-driven ✓ · featured/discovery flags ✓ · rollup performance ✓.
- Deferred by design: PDF export, GSC live data, Phase 8 billing, OmniRouter adapter (registry value reserved), subdomain (path-first per decision).
- Type consistency: `checkToolAccess` returns `AccessCheck` in both Phase 4 tasks; `recordExecution` params match execute route fields; permission constants identical across permissions.ts / guard / sidebar / roles page.
