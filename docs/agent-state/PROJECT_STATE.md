# Wall-V — Agent Project State (Authoritative Checkpoint)

> **Last updated:** 2026-11-12
> **Session context:** Two-part controlled recovery & integration project — Part A (persistent state management) + Part B–E (Dograh → Vapi recovery)
> **Domain:** https://www.wall-v.com

## 1. Project Snapshot

- **Name:** Wall-V — AI-powered software agency platform
- **Stack:** Next.js 15.3.4 App Router, React 19, TypeScript 5.8 (strict), Tailwind CSS v4, MongoDB (Mongoose 9.7.4), NextAuth v5 (beta), tiptap, framer-motion, recharts, zod, Jest.
- **Production:** Vercel (`valeednaeems-projects/wall-v-next`), production alias `https://www.wall-v.com`.

## 2. Git State (verified)

- **Branch:** `master`
- **HEAD:** `36846ec` — `feat(ai): audience-gated capability access for public visitors`
- **Working tree:** clean
- **Ahead of origin:** **5 commits** (`247a2c8`, `88f0a3b`, `4ffe6c9`, `53a82d8`, `36846ec`) — **NOT pushed** (push to `master` auto-deploys Vercel; approval required)
- **Origin:** `https://github.com/valeednaeem/wall-v-next.git`
- **Note:** Repository was **not** a git repo at session start; git was initialized locally during the deployment task on 2026-11-11.

## 3. Implementation Status

- **Restored version:** OLD DESIGN (user replaced working folder with older version on 2026-11-11 because design had changed).
- **Deployment:** OLD-design build deployed to Vercel production → **Ready** (deployment `dpl_7aKsVpgBmRF6VDsDFJPxqw7sYr2y`, later re-verified via `dpl_BL1M4gzUQ5FHAhx6mmLoiUYSGqLW`). Live at `https://www.wall-v.com` (verified via fetch).
- **Voice provider in restored code:** **Dograh** (active/complete). Vapi: **ABSENT** in restored source (no `@vapi-ai/web` dep, no `src/lib/vapi-config.ts`, no Vapi refs); historical Vapi artifacts exist only in prior-design history.

## 4. Completed Features / Integrations

- Old-design restore + Git init → commit `ea4c093` → push (forced) → Vercel auto-deploy → Ready.
- Live-site verification via webfetch.
- Lint: warnings only (pre-existing patterns). TypeScript: clean.
- Project state tracker created at repo root (`PROJECT_STATE.md`) and committed as `2fcfb88`; consolidated into `docs/agent-state/` per recovery spec (root copy removed).

## 5. Active Development Tasks

All four phases of the current brief are **COMPLETE (local commits, unpushed)**:

1. **Part A — Persistent project-state checkpoints:** `docs/agent-state/{PROJECT_STATE,PROGRESS_LOG,NEXT_STEPS}.md` — **DONE** (`247a2c8`).
2. **Vapi config + hook:** `src/lib/vapi-config.ts`, `src/hooks/useVapi.ts`, `@vapi-ai/web` installed — **DONE** (`88f0a3b`).
3. **Vapi admin dashboard controls (Phase 2):** provider selector, config-health, `/api/voice/status`, provider-gated Dograh widgets, new `VapiWidget`, `/api/webhooks/vapi` (conversation persistence only) — **DONE** (`4ffe6c9`).
4. **AI Tools page populated (Phase 3):** 12 idempotent draft `AITool` seeds (`$setOnInsert`, never auto-published) + diagnostic empty states — **DONE** (`53a82d8`); **production seed run pending** (manual).
5. **Public visitor capability access (Phase 4):** `capability-access.ts` policy (default deny, 5-tool public allow-list), `GET /api/ai/capabilities`, offer-filter + execution gate in both executors — **DONE** (`36846ec`).

**Remaining (not code):** production `npm run seed:ai-tools` run, Vapi env vars + Vapi dashboard setup, Vapi E2E verification, push/deploy approval.

## 6. Voice Integration State (verified 2026-11-12)

- **Dograh implementation files (present in restored code):**
  - `src/components/ai/voice-agent.tsx` (Dograh widget global types, `waitForDograhWidget`, `loadDograhScript`, `useDograh`)
  - `src/components/ai/voice-widget.tsx` (mounts `useDograh`, call-ended handling)
  - `src/components/ai/dograh-widget-loader.tsx`
  - `src/components/ai/inline-voice-panel.tsx`
  - `src/lib/dograh-widget.ts` (`resolveDograhWidgetUrl`, `validateDograhWidgetUrl`)
  - `src/lib/dograh-webhook.ts` (`authenticateDograhWebhook`, `validateDograhWebhookBody`)
  - `src/app/api/webhooks/dograh/route.ts` (webhook endpoint)
  - `src/models/dograh-webhook-event.ts`
  - `src/app/api/voice-agent/*` routes
  - `src/app/(website)/voice-agent/page.tsx`
  - `src/__tests__/dograh-widget.test.ts`, `src/scripts/test-voice-normalization.ts`
  - Dashboard voice settings: `src/app/dashboard/settings/page.tsx` (Dograh widget URL config)
- **Vapi state (verified 2026-11-12):** **NOT PRESENT** in restored source. `@vapi-ai/web` not in `package.json`; `src/lib/vapi-config.ts` absent; no Vapi components/hooks/routes/env refs in `src`.
- **Historical Vapi references (from replaced design era, commits on 2026-10-20/21):** `@vapi-ai/web@3.0.0`, `src/lib/vapi-config.ts`, `useVapi`, `NEXT_PUBLIC_VAPI_PUBLIC_KEY`, `VAPI_ASSISTANT_ID`, `VAPI_WEBHOOK_SECRET`.

## 7. Environment Variables (NAMES ONLY — never values)

- Core: `MONGODB_URI`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `JWT_SECRET`, `NEXT_PUBLIC_APP_URL`
- OAuth: `GOOGLE_CLIENT_ID/SECRET`, `FACEBOOK_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET`, `LINKEDIN_CLIENT_ID/SECRET`
- Email: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`
- AI: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`
- Payments: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- Cron: `CRON_SECRET`
- Analytics: `GA4_MEASUREMENT_ID`, `GA4_API_SECRET`, `GA4_PROPERTY_ID`, `GOOGLE_SERVICE_ACCOUNT_KEY`
- Voice (historical/current): `DOGRAH_WEBHOOK_SECRET`, widget URL via DB settings (`voice.widgetUrl`); Vapi-era: `NEXT_PUBLIC_VAPI_PUBLIC_KEY`, `VAPI_ASSISTANT_ID`, `VAPI_WEBHOOK_SECRET`

## 8. Known Bugs / Unresolved Issues

- Vapi E2E untested: no Vapi credentials/env locally; webhook conversation-persistence scope is v1 (transcript only — no lead/inquiry/project pipeline until E2E approval).
- No local `.env` / `.env.local` present (only `.env.example`) — production DB seeding/verification requires administrator action.
- Pre-existing (not introduced): `runAgentWithTools` management-tool role filter is reset by the agentId DB-tool merge (affects authenticated staff flows only; visitor gate applied after the merge so it is unaffected).

## 9. Test / Build / Deploy Status

- `npx tsc --noEmit`: **clean**. `npm run lint`: warnings only (all pre-existing). `npm test`: **7 suites / 81 tests passing** (rerun after Phase 4).
- Vercel deployment: **Ready** (production, old design) — unchanged this session; **no push/deploy performed** for the 5 local commits.
- Live site: `https://www.wall-v.com` — responding (untouched).

## 10. Architectural Decisions / Constraints

- `next.config.ts`: security headers (CSP etc.), redirects, `eslint.ignoreDuringBuilds: true`.
- `vercel.json`: function maxDuration 30; crons.
- Never remove Dograh, delete its config, change production voice provider, push, or deploy without explicit approval.
- Preserve OpenRouter AI integration, CRM/inquiry workflows, auth/roles, MongoDB models, Socket.IO/notifications, capability/tool registry; no duplicates.
- Visitor capability access: default deny via `src/lib/capability-access.ts`; public allow-list = `get_service_info`, `get_company_info`, `create_inquiry`, `create_lead`, `create_project_request`; seeded AI tools are `draft` until an admin publishes (`ai-tools:publish`).
- Existing `GET /api/ai/request` (public service-catalog feed for the restored `/ai-capabilities` page) deliberately untouched; new `GET /api/ai/capabilities` is the audience-gated authorization view (distinct purpose, not a duplicate).

## 11. Exact Next Action Required to Resume

- Brief Phases 1–4: **ALL COMPLETE** (local commits; see PROGRESS_LOG 2026-11-12 entries).
- Resume point:
  1. **Administrator:** run `npm run seed:ai-tools` against production (`MONGODB_URI` set) to populate the AI Tools dashboard; verify `/dashboard/ai-tools/tools` shows 12 draft records.
  2. **Administrator:** configure Vapi env vars (`NEXT_PUBLIC_VAPI_PUBLIC_KEY`, `VAPI_ASSISTANT_ID`, `VAPI_WEBHOOK_SECRET`, `VAPI_API_KEY`, `VAPI_SERVER_URL`) + Vapi dashboard assistant/phone/webhook → `https://www.wall-v.com/api/webhooks/vapi`; E2E verify before any provider switch (production stays **Dograh** until approved).
  3. **Approval:** review the 5 local commits and authorize `git push` to `master` (auto-deploys Vercel).

---

# Wall-V — Project State Management + Dograh-to-Vapi Recovery (v1.0)

> **Classification:** Internal / Development
> **Status:** IN PROGRESS — Part A checkpoints being established; Part B audit in progress.
