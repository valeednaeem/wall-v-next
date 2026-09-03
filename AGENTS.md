# Wall-V — AI-Powered Software Agency

> **Full documentation:** See `knowledge-base/` folder for comprehensive platform documentation.

## Quick Reference

| Topic | File |
|-------|------|
| Company Info | `knowledge-base/company.md` |
| Services & Pricing | `knowledge-base/services.md`, `knowledge-base/pricing.md` |
| AI Agents | `knowledge-base/ai-agents.md`, `knowledge-base/voice-agent.md`, `knowledge-base/chat-agent.md` |
| Tech Stack | `knowledge-base/technologies.md` |
| Integrations | `knowledge-base/integrations.md` |
| Hosting & Domains | `knowledge-base/hosting.md`, `knowledge-base/domains.md` |
| Client Dashboard | `knowledge-base/client-dashboard.md` |
| Project Workflow | `knowledge-base/project-workflow.md` |
| FAQs | `knowledge-base/faqs.md` |
| Glossary | `knowledge-base/glossary.md` |

## Commands

```
npm run dev       # Start dev server
npm run build     # Production build
npm run start     # Production server
npm run lint      # ESLint
npx tsc --noEmit  # TypeScript check
```

## Deployment

Push to `master` triggers auto-deploy on Vercel. Always `git push` after committing.

## Architecture

- **Next.js 15.3.4** App Router, **React 19**, **TypeScript 5.8** (strict)
- **MongoDB** via Mongoose 9.7.4 — 43 models in `src/models/`
- **Tailwind CSS v4** — CSS-based config in `src/app/globals.css`
- **Domain**: https://www.wall-v.com

## Path Aliases

`@/*` → `./src/*`

## Key Files

- `src/lib/auth.ts` — Dual auth (NextAuth v5 + custom cookie JWT)
- `src/lib/project-discovery.ts` — AI discovery engine (1076+ lines)
- `src/lib/demo-generator.ts` — AI demo page generation
- `src/middleware.ts` — Backend proxy for `/api/backend/*`
- `src/scripts/seed.ts` — Seed roles + admin user

## Project Structure

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
│   ├── permissions.ts    # Role-permission mappings (~80+ strings)
│   ├── validations/      # Zod schemas
│   ├── utils.ts          # Shared utilities
│   ├── api-middleware.ts # Role constants, handleApiError()
│   ├── mail.ts           # Email service (sole source)
│   ├── site-settings.ts  # SiteSettings from DB
│   └── pm-*.ts           # PM service modules (13 files)
├── models/               # 43 Mongoose models
├── services/             # email.ts is re-export shim only
└── context/              # React context providers
```

## Development Rules

### Auth Patterns

```typescript
// Dashboard pages (NextAuth v5)
import { auth } from "@/lib/auth";
const session = await auth();
if (!session) redirect("/login");

// API routes (custom JWT)
import { getAuthUser, requireAuth, requireRole } from "@/lib/auth";
const user = await getAuthUser();  // returns JWTPayload | null — use user.userId (not _id)
```

### Role Constants (centralized in api-middleware.ts)

```typescript
import { ADMIN_ROLES, CRM_ROLES, CONTENT_ROLES, SUPER_ADMIN_ROLES } from "@/lib/api-middleware";
```

### API Route Pattern

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

### Code Conventions

- Dashboard pages: `"use client"` + NextAuth session
- API routes: `export async function GET/POST/PUT/DELETE(request: Request)`
- Components: functional components with TypeScript
- Validation: Zod schemas in `src/lib/validations/`
- Styling: Tailwind CSS v4 (CSS-based config in `globals.css`)
- Email service: `src/lib/mail.ts` (sole source). `src/services/email.ts` is re-export shim.
- Never place API keys in UI components
- Never commit secrets to the repository
- Always validate and sanitize user input
- Always use `requireAuth` or `requireRole` for protected routes

### Shared Utilities (src/lib/utils.ts)

- `formatPrice(amount, currency?)` — "$1,234.56"
- `formatDate(date)` / `formatDateTime(date)` — date formatting
- `generateId()` — 12-char alphanumeric
- `slugify(text)` — URL-safe slug
- `capitalize(text)` / `getInitials(name)`

### Product Types

```typescript
type: "product" | "service" | "digital" | "hosting" | "domain" | "saas" | "ai-service"
```

### Agent Modes

```typescript
agentMode: "client-facing" | "internal" | "dual"
isClientFacing: Boolean
isMasterAgent: Boolean
```

### Database

- Production: `nextjs.jxqvyor.mongodb.net/wallvnext`
- Connection singleton in `src/lib/mongodb.ts`
- 43 Mongoose models in `src/models/`

## Verification

After every change, run:
```bash
npm run lint
npx tsc --noEmit
```

Both must pass before code is considered complete.

## OpenCode Configuration

### Skills (38 total)

**Wall-V specific:**
- `wall-v-agent` — Strategic AI agent behavior
- `wall-v-context` — Architectural context (load before any task)
- `content-creation`, `devops-cloud`, `project-management`, `qa-testing`
- `research-analysis`, `security-engineering`, `software-architecture`
- `ui-ux-design`, `universal-handler`

**Web development (from farmage/opencode-skills):**
- `nextjs-developer`, `react-expert`, `typescript-pro`, `javascript-pro`
- `php-pro`, `sql-pro`, `api-designer`, `architecture-designer`
- `code-reviewer`, `test-master`, `debugging-wizard`, `devops-engineer`
- `prompt-engineer`, `rag-architect`, `mcp-developer`

**Engineering rigor (from osmontero/opencode-skills):**
- `systematic-debugging`, `reviewing-security`, `test-driven-development`
- `verifying-before-completion`, `investigating-performance`
- `writing-release-notes`, `writing-plans`, `evolving-apis-and-schemas`
- `designing-frontend-interfaces`, `designing-user-experience`
- `building-accessible-interfaces`, `reviewing-interface-quality`

### Agents (5 Wall-V agents)

| Agent | Purpose |
|-------|---------|
| `wall-v-development` | Primary development agent |
| `wall-v-architect` | Architecture and system design |
| `wall-v-debugger` | Root cause analysis and debugging |
| `wall-v-security` | Security audit and vulnerability review |
| `wall-v-qa` | Quality assurance and testing |

### Commands (4)

| Command | Purpose |
|---------|---------|
| `implement` | Implement features following Wall-V conventions |
| `debug` | Find root causes before proposing fixes |
| `review` | Code quality, security, and architecture review |
| `verify` | Run lint and typecheck to validate changes |

## Never Do

- Place API keys in UI components
- Commit secrets to repository
- Skip authentication/authorization
- Create duplicate systems
- Rename files without understanding downstream effects
- Change architecture without explicit approval
- Trust client-side validation alone for security
- Use `Select-Object` in PowerShell (use dedicated tools instead)
