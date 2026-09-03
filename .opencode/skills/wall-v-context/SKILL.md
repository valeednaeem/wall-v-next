---
name: wall-v-context
description: Wall-V platform architectural context — load before any development task
compatibility: opencode
---

# Wall-V Platform Context

## Quick Facts

- **Domain:** https://www.wall-v.com
- **Stack:** Next.js 15.3.4, React 19, TypeScript 5.8 (strict), MongoDB/Mongoose 9.7.4, Tailwind CSS v4
- **Auth:** NextAuth v5 (dashboard) + custom cookie JWT (API routes)
- **Database:** MongoDB Atlas `nextjs.jxqvyor.mongodb.net/wallvnext`
- **Deployment:** Vercel, push to master auto-deploys
- **Models:** 43 Mongoose models in `src/models/`
- **Roles:** 10 — super-admin, admin, project-manager, staff, developer, designer, marketing, sales, support, customer
- **Permissions:** ~80+ `resource:action` strings in `src/lib/permissions.ts`

## Path Alias

`@/*` → `./src/*`

## Directory Structure

```
src/
├── app/
│   ├── (website)/        # Public: home, blog, products, hosting, domains, services, pricing, contact
│   ├── (auth)/           # Login, signup, forgot/reset password
│   ├── dashboard/        # Admin panel, 26+ subsections
│   └── api/              # 15 route groups
│       ├── ai/, auth/, blog/, clients/, contact/, crm/
│       ├── dashboard/, inquiries/, legal/, payments/
│       ├── products/, projects/, search/, settings/, upload/
│       └── agents/       # AI agent chat + admin-master-chat
├── components/           # Shared UI components
├── lib/
│   ├── auth.ts           # Dual auth helpers
│   ├── mongodb.ts        # Mongoose singleton
│   ├── permissions.ts    # Role-permission mappings
│   ├── validations/      # Zod schemas
│   ├── utils.ts          # Shared utilities (formatPrice, generateId, etc.)
│   ├── api-middleware.ts # Role constants, handleApiError()
│   ├── mail.ts           # Email service (sole source)
│   ├── site-settings.ts  # SiteSettings from DB
│   └── pm-*.ts           # PM service modules (13 files)
├── models/               # 43 Mongoose models
├── services/             # email.ts is re-export shim only
├── context/              # React context providers
└── scripts/              # Seed scripts
```

## Auth Patterns

```typescript
// Dashboard pages (NextAuth v5)
import { auth } from "@/lib/auth";
const session = await auth();
if (!session) redirect("/login");

// API routes (custom JWT)
import { getAuthUser, requireAuth, requireRole } from "@/lib/auth";
const user = await getAuthUser();  // returns JWTPayload | null — use user.userId (not _id)
const user = await requireAuth(handler);
const user = await requireRole(["admin"])(handler);
```

## API Route Pattern

```typescript
import { NextResponse } from "next/server";
import { getAuthUser, handleApiError } from "@/lib/api-middleware";

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // ... implementation
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}
```

## Role Constants (centralized in api-middleware.ts)

```typescript
import { ADMIN_ROLES, CRM_ROLES, CONTENT_ROLES, SUPER_ADMIN_ROLES } from "@/lib/api-middleware";
```

## Key Models

| Model | Purpose |
|-------|---------|
| User | Users with roles |
| Agent | AI agents (agentMode: "client-facing" | "internal" | "dual") |
| Product | Products/services with type enum |
| Project | Projects with milestones |
| Task | Tasks with dependencies |
| Contact | Contact form submissions |
| SiteSettings | Site configuration |
| AgentConversation | Agent chat persistence |
| AgentExecution | Agent tool execution logs |

## Product Types

```typescript
type: "product" | "service" | "digital" | "hosting" | "domain" | "saas" | "ai-service"
```

## Agent Modes

```typescript
agentMode: "client-facing" | "internal" | "dual"
isClientFacing: Boolean
isMasterAgent: Boolean
```

## PM System

13 service modules in `src/lib/pm-*.ts`, barrel export via `src/lib/pm-tools.ts`:
- pm-triage, pm-intake, pm-decomposition, pm-planning, pm-workforce
- pm-monitoring, pm-scanner, pm-notifications, pm-client-comm
- pm-financials, pm-reports, pm-config, pm-workflows, pm-integrations, pm-admin-center

## Shared Utilities (src/lib/utils.ts)

- `formatPrice(amount, currency?)` — "$1,234.56"
- `formatPriceCompact(amount)` — "$1234.56"
- `formatDate(date)` — "September 3, 2026"
- `formatDateTime(date)` — "Sep 3, 2026, 10:30 AM"
- `generateId()` — 12-char alphanumeric
- `generateOrderNumber()` — "ORD-20260903-XXXX"
- `slugify(text)` — URL-safe slug
- `capitalize(text)` — "Hello"
- `getInitials(name)` — "JD"
- `debounce(fn, ms)` — debounced function

## Build Commands

```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run start     # Production server
npm run lint      # ESLint
```

## Never Do

- Place API keys in UI components
- Commit secrets to repository
- Skip authentication/authorization
- Create duplicate systems
- Rename files without understanding downstream effects
- Change architecture without explicit approval
- Use `Select-Object` in PowerShell (use dedicated tools instead)
