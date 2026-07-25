# Wall-V — Next.js App Router + MongoDB

## Commands

```
npm run dev       # Start dev server
npm run build     # Production build (runs TypeScript checks)
npm run start     # Production server
npm run lint      # ESLint (next lint)
```

No test framework configured. No formatter or pre-commit hooks.

## Path Aliases

`@/*` → `./src/*` (configured in `tsconfig.json`)

## Architecture

- **Next.js 15.3.4** App Router, **React 19**, **TypeScript 5.8** (strict)
- **MongoDB** via Mongoose 9.7.4 — connection singleton in `src/lib/mongodb.ts` uses `global.mongooseCache` to survive dev hot-reload
- **35 Mongoose models** in `src/models/`

### Dual Authentication System

Two auth mechanisms coexist — know which one applies:

1. **NextAuth v5** (`src/lib/auth.ts`) — JWT strategy, used by dashboard pages via `useSession()`
2. **Custom cookie JWT** (`src/lib/auth.ts` helper functions: `getAuthUser()`, `getFullUser()`, `requireAuth()`, `requireRole()`) — used by most API routes, cookie name: `token`

Auth API routes: `/api/auth/[...nextauth]` (NextAuth) + `/api/auth/login`, `/api/auth/signup` (custom)

### Backend Proxy

Middleware (`src/middleware.ts`) proxies `/api/backend/*` and other `/api/*` routes to a separate backend server at `BACKEND_URL` (default `http://localhost:8080`). This app is a BFF (Backend-for-Frontend).

### Route Groups

- `(website)` — public pages (home, blog, products, etc.)
- `(auth)` — login, signup, forgot/reset password
- `dashboard` — admin panel, 26 subsections, all `"use client"`, requires NextAuth session
- `api/` — 15 route groups, mix of local handlers and backend proxy

## Tailwind CSS v4

No `tailwind.config.js` — Tailwind v4 uses CSS-based config. Theme tokens defined in `src/app/globals.css` via `@theme` directive. Custom colors, animations, and utilities are in that file.

## Environment Variables

Required in `.env.local`:
- `MONGODB_URI` (default: `mongodb://localhost:27017/wallvnext`)
- `JWT_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`
- `BACKEND_URL` (default: `http://localhost:8080`)

Optional OAuth: `GOOGLE_*`, `FACEBOOK_*`, `GITHUB_*`, `LINKEDIN_*` (only loaded if set)

## Roles & Permissions

5 default roles: `super-admin` (`*` wildcard), `admin`, `manager`, `staff`, `customer`
Permission format: `resource:action` (e.g., `users:view`, `blog:publish`)
Helpers: `hasPermission()`, `hasAnyPermission()` in `src/lib/permissions.ts`
API protection: `requireAuth(handler)`, `requireRole(roles[])(handler)`

## Validation

Zod 4 schemas in `src/lib/validations/` — forms use `react-hook-form` + `@hookform/resolvers`.

## Dograh Voice Agent

Docker-based voice AI platform for the Voice Agent feature.

**Start Dograh:**
```bash
docker compose -f docker-compose.sip.yaml up -d
```

**Dashboard:** http://localhost:3010 (create agents here)
**API:** http://localhost:8000

**Setup flow:**
1. Start Docker: `docker compose -f docker-compose.sip.yaml up -d`
2. Open `http://localhost:3010`, create an agent
3. Agent Settings > "Add to website" > copy widget script URL
4. Update `NEXT_PUBLIC_DOGRAH_WIDGET_URL` in `.env.local` with the URL

**Components:** `useDograh` hook, `FloatingVoiceWidget`, `InlineVoicePanel` in `src/components/ai/`

**Environment variables:**
- `NEXT_PUBLIC_DOGRAH_WIDGET_URL` — widget script (CDN default or local after setup)
- `DOGRAH_API_URL` — `http://localhost:3010` (Dograh UI/dashboard)
- `DOGRAH_API_KEY` — optional, for API management

## Key Quirks

- **No tests** — no test framework, no test files, no test scripts
- **No formatter** — no Prettier configured
- **No pre-commit hooks** — no automated checks before commits
- **File uploads** go to `public/` directory with UUID filenames
- **Services are stubs** — payment (Stripe/PayPal/2Checkout), hosting, domain services are TODO implementations
- **Seed script**: `src/scripts/seed.ts` — creates default roles + admin user (`admin@wall-v.com` / `admin123`)
- **SEO**: dynamic metadata via `src/lib/seo.ts`, JSON-LD structured data, sitemap at `/sitemap.ts`
- **UI stack**: lucide-react icons, framer-motion animations, recharts, sonner notifications, next-themes
