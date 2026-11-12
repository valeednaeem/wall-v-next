# Wall-V — Agent Progress Log

> Chronological log of meaningful development events. Updated at every logical milestone.

## 2026-11-11 — Deployment of restored old-design version

- **Task:** User replaced working folder with older version (old design); requested GitHub + Vercel deployment to restore old looks.
- **Work:** Verified git (none), Vercel CLI (logged in as `valeednaeem`), gh CLI (logged in). Found GitHub repo `valeednaeem/wall-v-next`; Vercel project `wall-v-next` (prod `https://www.wall-v.com`).
- **Actions:** `git init -b master`; `git add .`; commit `ea4c093`; remote add origin; push (forced update) → OK. Vercel auto-deploy triggered → deployment `dpl_7aKsVpgBmRF6VDsDFJPxqw7sYr2y` → status **Ready**, build 5m 9s, aliases incl. `https://www.wall-v.com`.
- **Verification:** webfetch of `https://www.wall-v.com` → content OK (old-design UI).
- **Actions:** lint (warnings only), `tsc --noEmit` (clean).
- **State file:** created root `PROJECT_STATE.md`.

## 2026-11-12 — Recovery project kickoff (Part A + Part B)

- **Task:** Two-part controlled recovery: (1) persistent project-state checkpoints; (2) restore & configure Vapi to reproduce Dograh experience without replacing existing AI/CRM/inquiry/project workflows.
- **Work:** Verified `docs/` contains only `plans/` and `qa/` (no existing agent-state system). Created authoritative checkpoint docs under `docs/agent-state/`.
- **Audit discovery:** Restored old-design source contains **Dograh** implementation; **no Vapi references** in restored source (`src/**`). `@vapi-ai/web` absent from `package.json`; `src/lib/vapi-config.ts` absent; no `useVapi`; no Vapi env refs.
- **Historical Vapi refs** (from replaced-design commits `db0926a8`…`04099b07`, 2026-10-20/21): `@vapi-ai/web@3.0.0`, `src/lib/vapi-config.ts`, `useVapi`, `NEXT_PUBLIC_VAPI_PUBLIC_KEY`, `VAPI_ASSISTANT_ID`, `VAPI_WEBHOOK_SECRET`, `/api/webhooks/dograh`.

## 2026-11-12 — Checkpoint consolidation

- **Task:** Adopt `docs/agent-state/` structure per recovery spec; avoid duplicate state files.
- **Actions:** Created `docs/agent-state/PROJECT_STATE.md` (authoritative snapshot). Created `docs/agent-state/PROGRESS_LOG.md` and `docs/agent-state/NEXT_STEPS.md`.

## 2026-11-12 — Part A/B audit completion (voice recovery discovery)

- **Task:** Deep audit of Dograh implementation + Vapi recovery state.
- **Dograh audit (subagent, very thorough):**
  - Active restored voice stack = **Dograh** (widget, loader, inline panel, floating widget headless, webhook, voice API routes, settings, models, AI orchestrator).
  - Key files identified: `src/components/ai/{voice-agent,voice-widget,dograh-widget-loader,inline-voice-panel}.tsx`, `src/lib/{dograh-widget,dograh-webhook}.ts`, `src/app/api/webhooks/dograh/*`, `src/app/api/voice-agent/*`, `src/models/{dograh-webhook-event,conversation,agent,site-settings}.ts`, `src/app/dashboard/settings/page.tsx`, `src/app/api/settings/public/route.ts`, `src/lib/agent-tools.ts`, `src/lib/conversation-agent/*`, `src/lib/ai-execution-engine.ts`, `src/lib/capability-registry.ts`, `src/lib/agent-registry.ts`, `src/lib/ai-provider-adapter.ts`, `src/services/ai.ts`.
  - Webhook pipeline: rate limit (30/min/IP), fail-closed auth (`DOGRAH_WEBHOOK_SECRET`, header override `DOGRAH_WEBHOOK_HEADER` default `X-API-Key`, timing-safe compare), size cap 1MB, payload validation, dedup via `DograhWebhookEvent` (eventKey `workflow:<id>|session:<id>`), idempotency, conversation upsert, caller-info merge (callerInfo/context_variables + transcript regex), Lead/Inquiry/Client/ServicePrice/Budget/Project/Demo/Quote flow, `outcome:"project-created"`, preview email.
  - Voice APIs: `/api/voice-agent/{pre-call,call-ended,generate-demo,billing,check-account}`.
  - Welcome popup/suggestions, greeting, context (`setContext` client vars + `system_prompt`/`instructions`), status machine, mic delegated to Dograh widget.
- **Vapi audit (subagent, very thorough):**
  - **Vapi is ABSENT** in restored source; Dograh is the complete active provider.
  - No `@vapi-ai/*` deps, no `src/lib/vapi-config.ts`, no `useVapi`, no Vapi env/deps/config; `.env.example`, `vercel.json`, `next.config.ts` (CSP/CORS), `package-lock.json` all free of Vapi.
  - Historical artifacts (from replaced design era, commits `db0926a8…04099b07`): `@vapi-ai/web@3.0.0`, `src/lib/vapi-config.ts`, `useVapi`, envs `NEXT_PUBLIC_VAPI_PUBLIC_KEY`, `VAPI_ASSISTANT_ID`, `VAPI_WEBHOOK_SECRET`.
  - Those commits are **not resolvable** in current clone (history squashed during restore); only 2 commits exist locally (`ea4c093`, `2fcfb88`).
  - Official Vapi docs (docs.vapi.ai) key facts: `@vapi-ai/web` Web SDK (`new Vapi(key)`, `start(assistantId)`, events call-start/call-end/message/speech-*/error); HTML script `https://cdn.jsdelivr.net/gh/VapiAI/html-script-tag@latest/dist/assets/index.js` with `window.vapiSDK.run({apiKey, assistant, config})`; assistant `{firstMessage, model{provider,model,messages}, voice{provider,voiceId}}` (publish required); server URL protocol `{message:{type,call...}}`, `assistant-request` <7.5s, tool-calls respond `{results:[{name,toolCallId,result}]}`, end-of-call-report `artifact{recording,transcript,messages}` + structured outputs, transcripts final via `transcript[transcriptType="final"]`, dynamic vars `{{var}}`/`assistantOverrides.variableValues`, personalization via phone→server→assistant-request→variableValues, server auth via credentialId (Bearer/`X-Vapi-Secret`/HMAC/OAuth2).

## 2026-11-12 — Phase 1–3 status

- Phase 1 (checkpoints): DONE (docs/agent-state created; root PROJECT_STATE.md migrated/removed).
- Phase 2 (audit): DONE (Dograh deep audit + Vapi recovery assessment).
- Phase 3 (Vapi docs research + mapping): DONE (official-docs facts gathered; mapping table produced).
- Phase 4 (Vapi implementation): IN PROGRESS — Vapi config layer + useVapi hook implemented (see entries below).

## 2026-11-12 — Phase 4 implementation start (Vapi config + hook)

- Task: Phase 4 — recover Vapi configuration and browser integration.
- Actions:
  - Installed `@vapi-ai/web@^3.1.0` (npm resolved `^3.0.0` → `3.1.0`; latest published version; SDK engine node>=22.14.0 satisfied by node v24).
  - Created `src/lib/vapi-config.ts`: Vapi env names (`NEXT_PUBLIC_VAPI_PUBLIC_KEY`, `VAPI_ASSISTANT_ID`, `VAPI_WEBHOOK_SECRET`, `VAPI_API_KEY`, `VAPI_ORGANIZATION_ID`, `VAPI_SERVER_URL`), `resolveVapiConfig`, getters, `createVapiClient`, `isVapiConfigured`.
  - Created `src/hooks/useVapi.ts`: `useVapi` hook mirroring `useDograh` surface (status/duration/error/isConfigured/startCall/endCall + callbacks); subscribes to Vapi SDK events (`call-start`, `call-start-success`, `call-start-failed`, `call-end`, `error`); status machine idle→connecting→connected→failed; `startCall(context)` maps context → `assistantOverrides` (`systemPrompt`, `firstMessage`, `variableValues`) and calls `client.start(assistantId, assistantOverrides)`; module-level Vapi client singleton.
- Verification: `npx tsc --noEmit` clean; `npm run lint` warnings only (pre-existing).

## 2026-11-12 — Phase 4 fix

- Fixed TS2353: `client.start(assistantId, assistantOverrides)` — overrides passed directly as the second parameter (not wrapped).

## 2026-11-12 — Phase 4 status

- Phase 4 (Vapi config + browser hook): IMPLEMENTED; typecheck + lint clean. Widget UI wiring (floating/inline Vapi widgets) remains for Phase 6 (dashboard/provider management) and later phases.
- Production provider remains **Dograh** (no switch performed — migration approval pending).

## 2026-11-12 — Phase 2 (new brief): Vapi admin dashboard controls — commit `4ffe6c9`

- **Task:** Admin can see/configure Vapi + provider management without disturbing Dograh.
- **Actions (10 files):**
  - Settings voice tab: Dograh/Vapi provider selector, configuration-health checklist (public key, assistant ID, webhook secret, server URL), Vapi config card (assistant ID, first message, system prompt) persisted as key-value `SiteSettings` (`voice.*` keys — no migration needed).
  - New `GET /api/voice/status` (admin-only): non-secret health for both providers (Dograh widget URL, Vapi env/config presence).
  - `GET /api/settings/public` exposes `voice.provider` + non-secret `vapi` block (`assistantId`, `publicKeyConfigured`, `firstMessage`).
  - **Provider gating:** `DograhWidgetLoader` never loads the Dograh script when `provider==="vapi"`; `FloatingVoiceWidget` only initializes `useDograh` when settings confirm `provider==="dograh"` (also waits for settings load — no premature init) and returns null for Vapi; new `VapiWidget` (`src/components/ai/vapi-widget.tsx`, uses `useVapi`) mounted in `(website)/layout.tsx`, renders only when provider=vapi + enabled + publicKey configured.
  - New `POST /api/webhooks/vapi` (+ `src/lib/vapi-webhook.ts`): mirrors Dograh security posture (30/min/IP rate limit, fail-closed secret auth — Bearer/X-Vapi-Secret/HMAC, 1MB size caps, payload validation, event extraction, idempotent by call ID). **v1 scope:** persists `end-of-call-report` transcripts/summaries to `Conversation` (sessionId `vapi_<callId>`); transient events acknowledged. Dograh's lead/inquiry/client/project auto-creation pipeline deliberately NOT mirrored — activates only after Vapi E2E approval.
  - `Conversation.voiceAgent` gains additive optional `vapiCallId`/`vapiAssistantId` (interface + schema; strict mode requires both).
- **Verification:** `npx tsc --noEmit` clean; `npm run lint` warnings only (pre-existing: img/alt in settings logo section, unused `getStatusLabel`).
- **Constraint honored:** production voice provider stays Dograh; selecting Vapi never initializes Dograh scripts; no push.

## 2026-11-12 — Phase 3 (new brief): AI Tools page populated — commit `53a82d8`

- **Task:** Dashboard `/dashboard/ai-tools/tools` empty in production (likely missing seed) — populate without duplicating records or auto-publishing.
- **Root cause:** `src/scripts/seed-ai-tools.ts` seeded categories/tags/providers/plans but **never created `AITool` records**.
- **Actions:**
  - Seed extended with 12 curated `AITool` starter records (Content Writer, Blog Outline Generator, Image Prompt Studio, Code Assistant, SEO Meta Optimizer, Document Summarizer, Email Campaign Writer, Social Post Generator, Voice Script Writer, Workflow Automation Planner, Business Name Brainstorm, Research Synthesizer) — `updateOne({slug}, {$setOnInsert}, {upsert:true})`: re-runs never duplicate (slug unique) and **never overwrite admin edits**; `status:"draft"` so nothing appears publicly (`/api/tools` filters `status:"published"`); publish remains a permission-gated admin action (`ai-tools:publish` bulk gate); categories/tags/providers linked by slug lookup with warnings when missing; aiConfig references provider doc + model name only — **no secrets**.
  - Tools list page diagnostics: distinguishes 401 (session expired) / 403 (missing `ai-tools:view`) / API unreachable (Retry) from genuinely-empty (seed guidance + "Add your first tool" + Refresh) and filtered-empty (clear-filters hint) — previously all showed a misleading "No tools found."
- **Verification:** tsc clean; lint warnings pre-existing only.

## 2026-11-12 — Phase 4 (new brief): public visitor capability access — commit `36846ec`

- **Task:** Visitors may use only explicitly approved public capabilities; internal tools/private data protected.
- **Security findings (pre-fix):**
  - `/api/ai/execute` (public sales chatbot) → orchestrator offered **all** tools to the model regardless of role; `TOOL_MAP` handlers (`lookup_user`, `create_user`, `create_invoice`, `create_notification`, `delegate_to_agent`, …) executed **with no role check** — anonymous callers could probe user accounts (other users' data), create invoices, spam notifications.
  - `/api/ai/unified-chat` (also anonymous-allowed) → `runAgentWithTools` only filtered management tools `if (userRole)` — **visitors got the full internal toolset** (`get_projects`, `get_clients`, `get_invoices`, `get_quotes`, `update_project`, content tools, …) and the agentId DB-tool merge even reset the filtered list.
  - Management tools (blog/product/SEO/security/logging) enforce RBAC internally — safe; `admin-master-chat` route is cookie-auth + ADMIN_ROLES gated — safe.
- **Actions:**
  - New `src/lib/capability-access.ts` — central public/client/staff policy, **default deny** for anonymous; explicit `PUBLIC_ASSISTANT_TOOLS` allow-list spanning BOTH executors: `get_service_info`, `get_company_info`, `create_inquiry`, `create_lead`, `create_project_request` (read-only public info + contact intake; reads no other user's data). Registry audience derives from existing `capability-registry` `requiresAuth`/`minUserRole` (no duplicate registry); `toPublicCapabilityView` omits `requiredTools`/`requiredSkills`/`minUserRole`/`requestTypes`.
  - New `GET /api/ai/capabilities` — audience-filtered discovery (anonymous → only `requiresAuth:false` registry entries `sales`/`support`; authenticated → role-appropriate). Distinct purpose from existing `GET /api/ai/request` (the restored public *service catalog* page feed — deliberately untouched).
  - Defense in depth, both layers: tools **never offered** to the model for visitors (orchestrator filter after DB-tool assembly; `runAgentWithTools` filter after the agentId merge) AND execution re-checked centrally at the top of `executeConversationTool` and `executeTool` (covers LLM tool-calls, deterministic plan steps, content/management fallbacks, all entry points). Adapter safely omits `tools` when empty.
  - Authenticated callers keep existing behavior (management RBAC internal) — no staff/dashboard regression.
- **Verification:** `npx tsc --noEmit` clean; `npm run lint` warnings only (all pre-existing); **`npm test` → 7 suites / 81 tests all passing**.

## 2026-11-12 — Milestone checkpoint (all four brief phases complete, local only)

- Commits on local `master` (NOT pushed — push to `master` auto-deploys Vercel): `247a2c8` (checkpoints), `88f0a3b` (Vapi config+hook), `4ffe6c9` (Phase 2 admin controls), `53a82d8` (Phase 3 AI Tools), `36846ec` (Phase 4 capability access) — **5 ahead of `origin/master`**.
- Working tree clean. Production DB seed + Vapi env/E2E remain manual (no local `.env`/`MONGODB_URI`).

## 2026-11-12 — State docs + policy regression suite (commits `b5ec2dd`, `ae9ea13`)

- `b5ec2dd` docs(agent-state): checkpoint Phases 2-4 completion and resume point.
- `ae9ea13` test(ai): 13-test capability access policy suite (`src/__tests__/capability-access.test.ts`).
- Local `master` reached **7 ahead of `origin/master`**, clean fast-forward, working tree clean.

## 2026-11-12 — Read-only pre-production safety audit (user-ordered)

- **Mode:** STRICT READ-ONLY (no writes, no seed, no push, no deploy). Verified facts:
  - **Git:** `master` @ `ae9ea13`, 7 local commits; `origin/master` = `2fcfb88` = merge-base → **0 behind / 7 ahead, clean fast-forward**; remote `https://github.com/valeednaeem/wall-v-next.git` (no credentials embedded), default branch `master`; single author; push auto-deploys Vercel (documented + historically observed).
  - **AI Tools architecture:** no generic `Tool` model exists. **AITool** = visitor-facing marketplace catalogue with its OWN guarded execute pipeline (`/api/tools/[slug]/execute`: published-only, zod input cap, 5/min per IP, plan/credit checks, `AIToolExecution` persistence). **AgentTool** = DB tool registry for agents (RBAC'd `/api/agents/tools`), plus hardcoded conversation tools and `CAPABILITY_REGISTRY` (routing, not a tool store). **Intentionally separated layers — no duplicate registry**, no misleading dashboard UI (zero assistant-execution claims on the AI Tools page).
  - **Capability trace:** public `sales` capability requires exactly `create_inquiry`+`create_lead` (⊆ allow-list); `support` requires none; `GET /api/ai/request` omits `requiredTools`/`minUserRole`; `validateToolArgs` enforces required fields + 1000-char caps; `create_project_request` creates `ProjectRequest` (status `collecting`), never an active Project.
  - **Seed safety:** tool records use `$setOnInsert` (never overwrite, never duplicate, always draft) BUT categories/tags/providers/plans use `$set` — a re-run overwrites admin edits (names, provider model lists, plan prices) and re-activates deactivated reference records. No dry-run; DB selection = `MONGODB_URI` else silent localhost fallback (host not echoed). **Backup + preflight required before any run** (deferred by user decision).
  - **Vapi config:** browser gets only `NEXT_PUBLIC_VAPI_PUBLIC_KEY` (+ assistantId/firstMessage via `/api/settings/public`); `/api/voice/status` admin-gated booleans only; webhook auth matches Vapi credentials **only when configured as Header Name `X-Vapi-Secret`, Bearer prefix OFF, token = `VAPI_WEBHOOK_SECRET`** (standard `Authorization: Bearer` form NOT compatible as written). No phone number needed for the browser Web SDK test.
- **Gaps found (→ approved as fixes a/b):**
  1. Extractor read only `message.call.artifact`, but official Vapi docs place `artifact`/`endedReason` at the **message level** → transcripts could persist **empty** (silent data loss).
  2. `/api/ai/execute` and `/api/ai/unified-chat` had **no rate limits** (siblings: chat 20/min, assist 30/min) → anonymous LLM cost + inquiry/email spam exposure (pre-existing in production, not introduced by the 7 commits).
  3. `checkRateLimit` store = **process-local `Map`** (no Redis/Upstash/KV anywhere in the project) → per-instance protection only on Vercel.
- **User decision table:** fix (a) webhook payload = Required; fix (b) rate limits = Required before promotion; seed `$set` = Defer (own backup+preflight); `.env.example` = include if convenient; seed host logging = Defer; duration semantics = verify during E2E.

## 2026-11-12 — Fix A: Vapi webhook payload compatibility — commit `e2cad86`

- **Changes:** `src/lib/vapi-webhook.ts` (extractor reads `message.artifact`/`message.transcript`/`message.endedReason` FIRST with `call.artifact`/`call.endedReason` fallback; new `artifactPresent` flag), `src/app/api/webhooks/vapi/route.ts` (content check + `voiceAgent.transcriptPersisted` marker; missing-artifact deliveries persist call metadata but respond `success:false, incomplete:true, diagnostic:"missing_transcript_artifact"` — never claim success — plus sanitized console + SecurityEvent diagnostic containing only event key/reason/artifact presence), `src/models/conversation.ts` (additive `voiceAgent.transcriptPersisted?: boolean`), `.env.example` (Vapi env names, public vs server-only; unused `VAPI_API_KEY`/`VAPI_ORGANIZATION_ID` deliberately NOT listed).
- **Preserved:** auth (fail-closed 503/401), 30/min/IP rate limit, 1MB size caps, payload validation, idempotency (duplicate-with-content = no-op; empty retry NEVER overwrites a valid transcript; incomplete deliveries ARE fillable by retry), safe logging (no secrets/content in diagnostics).
- **Tests:** 30 new (`vapi-webhook.test.ts` 16: message-level artifact, call-level fallback, message-level endedReason, missing artifact, auth/invalid-payload/key; `vapi-webhook-route.test.ts` 14: both payload shapes, transient ack, duplicate, empty-retry-no-clobber, retry-after-incomplete, missing-artifact diagnostic + no-false-success + sanitized output, 503/401/400s/429).

## 2026-11-12 — Fix B: staff-aware rate limits on public AI endpoints — commit `104f9c5`

- **Changes:** `src/app/api/ai/execute/route.ts` (10/min anonymous, 30/min authenticated) and `src/app/api/ai/unified-chat/route.ts` (15/min anonymous, 30/min authenticated), both via existing `checkRateLimit`/`getClientIp` from `@/lib/security`; keys `ai-execute:<userId|ip>` / `ai-unified:<userId|ip>` so authenticated staff get a per-user quota never shared with the anonymous IP quota; consistent 429 body `{error, retryAfterSeconds}` + `Retry-After` header; enforced after `getAuthUser` but BEFORE body parsing, LLM calls, tool execution, inquiry/lead creation, and email sending.
- **Store honesty:** the helper is a **process-local `Map`** — per-instance protection only on Vercel; no shared production store is configured anywhere in the repo (no Redis/Upstash/KV dependency). Documented in code; smallest safe next step (not implemented, needs approval): Vercel edge/middleware throttling or an Upstash Redis rate limiter.
- **Tests:** 7 new (`ai-endpoint-rate-limit.test.ts`, real store): anonymous within/over limit per endpoint, staff separate quota (IP exhausted → staff still allowed; staff 30/min own cap), rejection-before-execution (mock call counts unchanged on 429), 429 shape (status + body + Retry-After), per-endpoint quota isolation.
- **Verification:** `npx tsc --noEmit` exit 0; `npm test` **11 suites / 131 tests passing** (+37 new); `npm run lint` exit 0 (only pre-existing warnings; no new warnings in changed files).

## 2026-11-12 — Pre-deployment webhook fixes F-5/F-1 + approved preview push (commits `6756181`, `de02ed5`)

- **F-5 (`6756181`):** stored Vapi conversation summaries protected from empty webhook retries (summary guard — an empty retry never clobbers a valid stored summary).
- **F-1 (`de02ed5`):** new `VapiWebhookEvent` model with unique `eventKey` (mirrors Dograh's `DograhWebhookEvent` idempotency) — claim-before-upsert prevents duplicate conversation writes under concurrent/retried deliveries; deliberately NO unique index on `Conversation.sessionId`.
- **Verification:** `tsc` 0, lint 0, **142 tests / 11 suites**, `npm run build` exit 0; secrets/design scan clean.
- **Push (user-approved):** `git switch -c deploy/pre-vapi` + `git push -u origin deploy/pre-vapi` → `origin/deploy/pre-vapi` = `de02ed5` (Vercel **Preview** only). **`origin/master` untouched at `2fcfb88` — production not deployed.**

## 2026-11-13 — General Settings → Voice Agent Configuration (Vapi alongside Dograh) — commits `0ec7430` (code) + `d0e71c4` (docs)

- **User report:** Vapi Voice Agent options not visible in Dashboard → General Settings (brief required inspecting first, not trusting prior reports).
- **Root causes found by inspection:**
  1. Production `origin/master` (`2fcfb88`) predates ALL Vapi UI — controls exist only in local commits / the `deploy/pre-vapi` preview.
  2. Health checklist + webhook URL were keyed to the **saved** `voiceStatus.provider` — with Dograh saved (production default), clicking the Vapi card still rendered Dograh items; Vapi health/webhook endpoint never appeared (primary "controls not appearing" defect).
  3. Vapi config card only rendered after clicking the Vapi card, and its inner controls were hidden entirely when `voice.enabled` was false (empty card header).
  4. Section named "Voice Agent Provider" (brief requires **Voice Agent Configuration**); cards labeled "Dograh"/"Vapi" (required "Dograh Agent"/"Vapi Voice Agent"); no Public API Key input; no explicit configuration-status line.
- **UI (`src/app/dashboard/settings/page.tsx`):** section renamed **Voice Agent Configuration**; provider cards **Dograh Agent** / **Vapi Voice Agent**; active-(saved)-provider indicator + pending-selection note ("applies when you save"); checklist + webhook URL now keyed to the **selected** provider; Vapi card gains: masked `vapiPublicKey` input (existing `SecretInput`, show/hide), configuration-status badge (Configured/Missing/Error), read-only webhook endpoint, webhook-auth status (boolean only — secret stays server-side via `VAPI_WEBHOOK_SECRET` env, never an input, never returned); controls render when selected even while disabled (amber note); save validation requires Assistant ID AND resolved public key (dashboard input or env) when provider=vapi && enabled; "Test configuration" validates the selected provider. Dograh section untouched.
- **API:** `/api/voice/status` + `/api/settings/public` resolve the public key as DB `voice.vapiPublicKey` → env fallback; public projection adds `vapi.publicKey` (public by design — required by the browser SDK) and fixes `publicKeyConfigured`; webhook secret / `VAPI_API_KEY` / organization id never projected. `/api/settings/general` unchanged (generic key-value PUT persists the new field).
- **Runtime wiring:** `useVapi` gains optional `publicKey` prop (env fallback; client recreated if the key changes); `VapiWidget` passes `settings.vapi.publicKey`. Production provider remains **Dograh**; no dual-provider init; Dograh fallback untouched; no `VAPI_API_KEY` introduced.
- **Tests:** +29 — `voice-settings-api.test.ts` (14: role matrix 401/403/200 for admin + super-admin across all three routes, DB public-key fallback, missing-config diagnostic, PUT persistence of `voice.provider`/`voice.vapiPublicKey`, reload-verify, and no-secret serialization — webhook secret/apiKey/organizationId never appear in any response) and `general-settings-voice-ui.test.tsx` (15: section + both provider options, Vapi controls appear on select despite saved=Dograh (regression guard), masked key + show/hide, no webhook-secret input anywhere, active-provider indicator, save blocked on missing key, PUT body carries provider + public key, Test configuration, Dograh controls intact).
- **Test infra:** new `tsconfig.jest.json` (extends `tsconfig.json`, `jsx: "react-jsx"`) + `jest.config.js` points ts-jest at it — required because `tsconfig.json` uses `jsx: "preserve"` (Next.js), which left raw JSX under jest (first `.tsx` test suite in the repo).
- **Verification:** `npx tsc --noEmit` exit 0; `npm run lint` exit 0 (pre-existing warnings only, none in changed files); `npm test` **13 suites / 171 tests passing** (+29 new); `npm run build` exit 0.

---

*End of log entries for this session.*
