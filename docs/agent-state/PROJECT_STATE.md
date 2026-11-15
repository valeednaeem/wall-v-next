# Wall-V — Agent Project State (Authoritative Checkpoint)

> **Last updated:** 2026-11-14
> **Session context:** Two-part controlled recovery & integration project — Part A (persistent state management) + Part B–E (Dograh → Vapi recovery) + Stage 3 (General Settings Vapi controls) + Stage 4 (public Talk to Agent provider routing)
> **Domain:** https://www.wall-v.com

## 1. Project Snapshot

- **Name:** Wall-V — AI-powered software agency platform
- **Stack:** Next.js 15.3.4 App Router, React 19, TypeScript 5.8 (strict), Tailwind CSS v4, MongoDB (Mongoose 9.7.4), NextAuth v5 (beta), tiptap, framer-motion, recharts, zod, Jest.
- **Production:** Vercel (`valeednaeems-projects/wall-v-next`), production alias `https://www.wall-v.com`.

## 2. Git State (verified 2026-11-13)

- **Branch:** `master` (canonical work line, unpushed). `deploy/pre-vapi` = preview snapshot branch (pushed, user-approved) at `de02ed5`.
- **HEAD:** `64df936` (`fix(voice): route public Talk to Agent by selected provider, no Dograh fallback`) + docs handoff commit, on top of `85fc850`/`d0e71c4`/`0ec7430` (Stage 3), `de02ed5`/`6756181` (F-1/F-5).
- **Ahead of origin:** local `master` = **17 commits ahead of `origin/master`** (`2fcfb88`) — **NOT pushed** (push to `master` auto-deploys Vercel; approval required).
- **Preview branch:** `deploy/pre-vapi` pushed (user-approved) → `origin/deploy/pre-vapi` = `de02ed5` — Vercel Preview only; does NOT yet contain the General Settings Vapi commits (re-push needs approval).
- **Ancestry:** `origin/master` = `2fcfb88` = merge-base → clean fast-forward (no merge, no unrelated histories).
- **Origin:** `https://github.com/valeednaeem/wall-v-next.git` (plain HTTPS, no embedded credentials; default branch `master`).
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
6. **Pre-deployment Fix A — Vapi webhook payload compatibility:** message-level `artifact`/`endedReason`/`transcript`/`messages`/`summary` first with call-level fallback, `transcriptPersisted` marker, sanitized missing-artifact diagnostic (never claims success), retry/idempotency preserved — **DONE** (`e2cad86`, 30 tests).
7. **Pre-deployment Fix B — staff-aware rate limits:** `/api/ai/execute` 10/min anon + 30/min auth, `/api/ai/unified-chat` 15/min anon + 30/min auth, keyed per user/IP, consistent 429 + `Retry-After`, enforced before LLM/tools/writes — **DONE** (`104f9c5`, 7 tests). Store is process-local (per-instance only on Vercel — no shared store configured).
8. **Webhook fixes F-5/F-1 + preview push:** empty-retry summary guard (`6756181`) + `VapiWebhookEvent` unique `eventKey` claim-before-upsert (`de02ed5`) — **DONE** (142 tests); pushed to `deploy/pre-vapi` (user-approved Vercel **Preview**; `origin/master` untouched).
9. **General Settings → Voice Agent Configuration:** section renamed with **Dograh Agent** / **Vapi Voice Agent** cards, masked public-key input, config-status badge, read-only webhook endpoint, webhook-auth status (boolean only — secret server-side), selected-provider health checklist, save validation, DB `voice.vapiPublicKey` + env fallback in `/api/voice/status` and `/api/settings/public`, `useVapi`/`VapiWidget` public-key pass-through — **DONE** (171 tests / 13 suites); pushed with Stage 4 (`13c6a9a`).
10. **Stage 4 — public Talk to Agent provider routing (CRITICAL recovery brief):** `InlineVoicePanel` (/voice-agent) now resolves the provider from `/api/settings/public` and initialises ONLY that runtime (Dograh path unchanged; Vapi path via `useVapi` with loading/connecting/connected/error states); `VapiWidget` renders the exact required error — "Vapi Voice Agent is selected but not configured. Please contact the administrator." — when selected-but-unconfigured instead of silently disappearing, and surfaces `startCall` failures in-UI; `/api/settings/public` adds non-secret `vapi.assistantIdConfigured` + `vapi.configured`; shared `VAPI_NOT_CONFIGURED_MESSAGE` in `vapi-config.ts`; dashboard labels renamed to **Dograh Voice Agent** / **Vapi Voice Agent**, no-auto-fallback copy, **Validate Configuration** button; new `voice-provider-routing` test suite (12 tests) — **DONE** (`64df936`, 186 tests / 14 suites); **pushed & deployed** (`2fcfb88..13c6a9a` → Vercel Production, live-verified: `provider:"vapi"`, `configured:true`, webhook 401).
11. **Stage 5 — live "Talk to AI" error fix:** CSP in `next.config.ts` now allows the Vapi call path (`https://api.vapi.ai` in connect-src; `c.daily.co`/`*.daily.co` + Daily base domains in script-src/connect-src incl. `wss://`; new `worker-src 'self' blob:` + `media-src 'self' blob: mediastream:`) — the SDK's `start()` POST and Daily's call-machine bundle were previously blocked outright; `extractVapiErrorMessage()` exported from `useVapi.ts` recovers real messages from the SDK's plain-object error payloads (Error / string / `{message}` / nested `{error:{message}}` / stage-only) and is wired into `handleError`, `handleCallStartFailed`, and both component catches; invalid `assistantOverrides.systemPrompt` removed (field does not exist in the SDK's `AssistantOverrides` — prompt is configured on the Vapi assistant; dashboard hint corrected); every Dograh entry retained — **DONE, awaiting commit/push** (203 tests / 15 suites, tsc 0, lint 0, build 0).

**Remaining (not code):** production `npm run seed:ai-tools` run (backup + preflight first — see §8), Vapi E2E verification (webhook transcript persistence + duration semantics), rate-limit behaviour on Vercel, **Stage 5 commit/push** (live "Talk to AI" CSP fix — authorized). **Production provider is now Vapi** (switched by the user after Stage 4 deploy; Dograh config retained and never removed).

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
- Voice: `DOGRAH_WEBHOOK_SECRET`, widget URL via DB settings (`voice.widgetUrl`); Vapi: `NEXT_PUBLIC_VAPI_PUBLIC_KEY` (**public** — inlined into browser bundle), `VAPI_ASSISTANT_ID`, `VAPI_WEBHOOK_SECRET`, `VAPI_WEBHOOK_HEADER` (optional, default `X-Vapi-Secret`), `VAPI_SERVER_URL` (optional) — **all server-only except the public key**; names documented in `.env.example`. `VAPI_API_KEY`/`VAPI_ORGANIZATION_ID` exist as getters but are unused by runtime code (deliberately not in `.env.example`).

## 8. Known Bugs / Unresolved Issues

- Vapi E2E untested: no Vapi credentials/env locally; webhook conversation-persistence scope is v1 (transcript only — no lead/inquiry/project pipeline until E2E approval). Webhook auth matches Vapi **only** with credential Header Name `X-Vapi-Secret`, Bearer prefix OFF, token = `VAPI_WEBHOOK_SECRET` (standard `Authorization: Bearer` form is NOT compatible as written).
- No local `.env` / `.env.local` present (only `.env.example`) — production DB seeding/verification requires administrator action.
- `call.duration` semantics (units/existence) unverified — do not rely on `durationSeconds` until E2E confirms it.
- **Seed hazard (deferred by decision):** `npm run seed:ai-tools` uses `$setOnInsert` for the 12 tool records (safe) but `$set` for categories/tags/providers/plans — a re-run overwrites admin edits and re-activates deactivated reference records; no dry-run; DB selection silently falls back to localhost when `MONGODB_URI` is unset. Requires its own controlled backup + URI preflight before any run.
- **Rate-limit store is process-local** (`Map` in `src/lib/security.ts`) — `checkRateLimit` gives per-instance protection only on Vercel (cold starts reset state); no Redis/Upstash/KV is configured anywhere in the project. Smallest safe next step (needs approval): Vercel middleware/edge throttling or an Upstash Redis limiter. Do NOT claim cross-instance protection until then.
- Pre-existing (not introduced): `runAgentWithTools` management-tool role filter is reset by the agentId DB-tool merge (affects authenticated staff flows only; visitor gate applied after the merge so it is unaffected).

## 9. Test / Build / Deploy Status

- `npx tsc --noEmit`: **clean** (exit 0). `npm run lint`: exit 0 (warnings only, all pre-existing; none in changed files). `npm test`: **14 suites / 186 tests passing** (incl. 30 webhook + 7 rate-limit + 29 General Settings voice + 12 provider-routing tests). `npm run build`: **exit 0** (2026-11-14; robots/sitemap `MONGODB_URI` warnings are the known local no-`.env` condition, build completes).
- Vercel deployment: **Ready** (production, old design) — unchanged; **no push/deploy** for the 17 local commits. `origin/master` = `2fcfb88`; `origin/deploy/pre-vapi` = `de02ed5` (preview only, does not yet contain the General Settings or provider-routing commits).
- Live site: `https://www.wall-v.com` — responding (untouched).
- **NOT runtime-verified:** webhook payload fix (needs a real Vapi E2E call), rate limiting in the actual Vercel deployment (process-local store), the General Settings save/load flow against the real DB, and the new public provider routing in a real browser (component-tested with mocked SDKs only — no live Vapi or Dograh call made).

## 10. Architectural Decisions / Constraints

- `next.config.ts`: security headers (CSP etc.), redirects, `eslint.ignoreDuringBuilds: true`.
- `vercel.json`: function maxDuration 30; crons.
- Never remove Dograh, delete its config, change production voice provider, push, or deploy without explicit approval.
- Preserve OpenRouter AI integration, CRM/inquiry workflows, auth/roles, MongoDB models, Socket.IO/notifications, capability/tool registry; no duplicates.
- Visitor capability access: default deny via `src/lib/capability-access.ts`; public allow-list = `get_service_info`, `get_company_info`, `create_inquiry`, `create_lead`, `create_project_request`; seeded AI tools are `draft` until an admin publishes (`ai-tools:publish`).
- Existing `GET /api/ai/request` (public service-catalog feed for the restored `/ai-capabilities` page) deliberately untouched; new `GET /api/ai/capabilities` is the audience-gated authorization view (distinct purpose, not a duplicate).
- Vapi public key is browser-visible by design: stored as `voice.vapiPublicKey` in `SiteSettings`, resolved DB → env (`NEXT_PUBLIC_VAPI_PUBLIC_KEY`), exposed only as `vapi.publicKey` in `/api/settings/public`. The webhook secret (`VAPI_WEBHOOK_SECRET`) is server-side env ONLY — never stored in DB, never an input in the dashboard, never returned by any API.

## 11. Exact Next Action Required to Resume

- Brief Phases 1–4, Fixes A/B, webhook fixes F-5/F-1, Stage 3 (General Settings Vapi), Stage 4 (public provider routing), and Stage 5 (live-call CSP/error fix): **ALL COMPLETE** (Stage 4 pushed & deployed; Stage 5 local — see PROGRESS_LOG).
- **Stage 4 shipped:** `64df936` (code) + `13c6a9a` (docs) pushed to `origin/master` → Vercel Production deployed & verified live (`provider:"vapi"`, `vapi.configured:true`, webhook no-cred → 401, SECRET_LEAK=false). User completed their own Vapi dashboard + Vercel env configuration.
- **Current stop point (2026-11-15): Stage 5 — live "Talk to AI" error fix awaiting commit/push.** User hit *"vapi voice call error"* clicking Talk to AI in production. Three root causes found by inspection: (1) CSP `connect-src`/`script-src` contained zero Vapi/Daily hosts → browser blocked `POST https://api.vapi.ai` and Daily's `c.daily.co` bundle/signalling; (2) `useVapi` `handleError` used `instanceof Error` but the SDK emits plain `{type, stage, error:{message}}` payloads → real reason flattened to the generic string; (3) invalid `assistantOverrides.systemPrompt` (field doesn't exist in the SDK's `AssistantOverrides`). Fixes: CSP Vapi/Daily additions + new `worker-src`/`media-src`; exported `extractVapiErrorMessage()` wired into `handleError` + `handleCallStartFailed` + both component catches; `systemPrompt` no longer sent (hint updated: prompt lives on the Vapi assistant). **Verification: tsc 0 / 15 suites, 203 tests / lint 0 / build 0.**
- Resume sequence for Stage 5:
  1. Commit Stage 5 (`next.config.ts`, `useVapi.ts`, both voice components, settings hint, new test file, these docs).
  2. Push to `master` (deploy cycle authorized by user for this fix) and verify the live CSP header contains `api.vapi.ai` + `*.daily.co`.
  3. Ask the user to hard-refresh (or incognito) and retry the "Talk to AI" call — mic permission prompt should appear and the call connect.
  4. If any error remains, request the browser DevTools console text (expect "Refused to connect…" CSP lines only if a host is still missing).
- Later Vapi steps (unchanged): webhook E2E transcript persistence check; rate-limit behaviour on Vercel; duration semantics; provider stays Vapi per user's own switch (Dograh retained, never removed).
- Deferred (own controlled steps): production `npm run seed:ai-tools` — requires DB backup + URI preflight first (`$set` reference-collection overwrite hazard, §8).

---

# Wall-V — Project State Management + Dograh-to-Vapi Recovery (v1.0)

> **Classification:** Internal / Development
> **Status:** IN PROGRESS — Part A checkpoints being established; Part B audit in progress.
