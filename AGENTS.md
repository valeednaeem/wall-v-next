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
