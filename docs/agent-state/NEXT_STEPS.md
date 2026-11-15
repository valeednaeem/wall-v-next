# Wall-V — Agent Next Steps

> Prioritized unfinished work. Updated at every checkpoint.
> **Last updated:** 2026-11-15 (Stages 1–4 complete AND pushed — `origin/master` at `13c6a9a`, Vercel Production deployed & live-verified with provider=Vapi; Stage 5 live-call CSP/error fix complete locally, commit+push pending)

## Priority 1 — Persistent project checkpoints

- [x] A1. Establish checkpoint docs under `docs/agent-state/` (PROJECT_STATE, PROGRESS_LOG, NEXT_STEPS).
- [x] A2–A4. Checkpoint rules and session-resumption procedure adopted into state docs.

## Priority 2 — Vapi functional recovery (Dograh parity)

- [x] B1. Deep Dograh audit complete (widget, loader, config, webhook, API routes, dashboard, public settings, AI registry, DB models, tests, env).
- [x] B2. Dograh capability map + Dograh→Vapi mapping produced.
- [x] C1. Research official Vapi docs (docs.vapi.ai) — Web SDK, public key, assistant config, server URL/webhook, variables, lifecycle, tools, transcripts, errors.
- [x] C2. Assess Vapi recovery gaps in current restored code — Vapi ABSENT; full port required.
- [x] C3. Dograh→Vapi configuration mapping table produced.
- [x] C4. Preserve existing architecture constraints (OpenAI/Anthropic AI stack, CRM, auth, Mongo, tool registry) — ongoing, honored.
- [x] C5. Secure Vapi webhook architecture — `POST /api/webhooks/vapi` + `src/lib/vapi-webhook.ts` (rate limit, fail-closed auth, 1MB caps, validation, idempotent end-of-call conversation persistence; lead/project pipeline deferred to E2E approval) — commit `4ffe6c9`.
- [x] Phase 4a. Implement Vapi config (`@vapi-ai/web`, `src/lib/vapi-config.ts`) + `useVapi` hook — commit `88f0a3b`.
- [x] Phase 4b. Wire Vapi widget UI — `VapiWidget` mounted in `(website)/layout.tsx`; Dograh loader/widget gated to `provider==="dograh"` — commit `4ffe6c9`.
- [x] Phase 5. Vapi webhook (auth/validation/idempotency/end-of-call persistence) — commit `4ffe6c9` (v1: conversation persistence only).

## Priority 3 — Controlled migration

- [x] D. Dashboard provider management — settings voice tab provider selector + config-health checklist + `GET /api/voice/status` + public non-secret vapi settings block — commit `4ffe6c9`.
- [ ] E. Testing: technical + E2E validation; manual Vapi-dashboard/browser steps outstanding (**NOT TESTED** — no Vapi credentials locally).

## Priority 4 — Current brief (admin controls / AI Tools / public capabilities)

- [x] P2. Vapi admin dashboard controls + provider gating — commit `4ffe6c9`.
- [x] P3. AI Tools page populated — 12 idempotent draft `AITool` seeds + diagnostic empty states — commit `53a82d8`.
- [x] P4. Safe public-visitor capability access — `capability-access.ts` (default deny, 5-tool allow-list), `GET /api/ai/capabilities`, offer-filter + execution gate in both executors — commit `36846ec`.
- [x] P5. **Fix A — Vapi webhook payload compatibility:** message-level `artifact`/`endedReason` first with call-level fallback, `transcriptPersisted` marker, sanitized missing-artifact diagnostic (no false success), retries never clobber valid transcripts — commit `e2cad86` (30 tests).
- [x] P6. **Fix B — staff-aware rate limits:** `/api/ai/execute` (10/min anon, 30/min auth) + `/api/ai/unified-chat` (15/min anon, 30/min auth), per-user/per-IP keys, consistent 429 + `Retry-After`, enforced before LLM/tools/writes — commit `104f9c5` (7 tests).
- [x] P7. **Webhook fixes F-5/F-1 + preview push:** empty-retry summary guard (`6756181`) + `VapiWebhookEvent` unique `eventKey` claim-before-upsert (`de02ed5`) — 142 tests; pushed to **`deploy/pre-vapi`** (user-approved, Vercel Preview only; `origin/master` untouched).
- [x] P8. **General Settings → Voice Agent Configuration:** section renamed, provider cards **Dograh Agent** / **Vapi Voice Agent**, selected-provider health checklist + webhook endpoint, masked public-key input, config-status badge, webhook-auth status (server-side only), save validation, DB `voice.vapiPublicKey` + env fallback in `/api/voice/status` + `/api/settings/public`, `useVapi`/`VapiWidget` public-key wiring — 29 new tests (**171 total**).
- [x] P9. **CRITICAL recovery brief — public Talk to Agent provider routing:** `InlineVoicePanel` provider-routed (Vapi path via `useVapi`, no Dograh init when Vapi selected), `VapiWidget` shows the exact required not-configured error instead of silently disappearing + surfaces `startCall` errors, `/api/settings/public` adds `vapi.assistantIdConfigured`/`vapi.configured`, `VAPI_NOT_CONFIGURED_MESSAGE` constant, dashboard labels **Dograh Voice Agent**/**Vapi Voice Agent** + no-auto-fallback copy + **Validate Configuration** button — commit `64df936`, 15 new tests (**186 total / 14 suites**), tsc 0 / lint 0 / build exit 0. **Pushed & deployed** (`64df936`+`13c6a9a` → Vercel Production; live-verified `provider:"vapi"`, `configured:true`, webhook 401).
- [x] P10. **Stage 5 — live "Talk to AI" error fix:** CSP `connect-src`/`script-src` gained the Vapi call path (`https://api.vapi.ai`, `c.daily.co`/`*.daily.co`, `wss://*.daily.co`, Daily base domains, `*.ingest.sentry.io`) + new `worker-src 'self' blob:` / `media-src 'self' blob: mediastream:` (previously ALL missing → browser blocked call creation + Daily bundle); `extractVapiErrorMessage()` handles the SDK's plain-object error payloads (was `instanceof Error` only → generic message); invalid `assistantOverrides.systemPrompt` removed (not in SDK `AssistantOverrides`; hint now says configure it on the Vapi assistant) — new `vapi-live-call-fix.test.ts` (17 tests, **203 total / 15 suites**), tsc 0 / lint 0 / build 0. **Commit + push pending.**

## Immediate next action (resume point)

> **STOP POINT (2026-11-15):** Stage 5 fix complete + verified locally (203 tests / 15 suites; tsc 0; lint 0; build 0) — **commit + push pending** (deploy cycle for this fix authorized by the user). Stage 4 already pushed & deployed; production provider = **Vapi** (user-switched, Dograh retained).

1. **Commit Stage 5:** `next.config.ts` (CSP Vapi/Daily), `src/hooks/useVapi.ts` (`extractVapiErrorMessage` + drop invalid `systemPrompt` override), `vapi-widget.tsx` / `inline-voice-panel.tsx` (catch handlers), `dashboard/settings/page.tsx` (hint), new `src/__tests__/vapi-live-call-fix.test.ts`, agent-state docs.
2. **Push to `master`** → auto-deploys Vercel (authorized for this fix). Verify live: `curl -I https://www.wall-v.com` → CSP must contain `api.vapi.ai` + `*.daily.co` + `worker-src`.
3. **User retest:** hard-refresh (or incognito to bust cached JS), click **Talk to AI**, allow microphone — expect mic prompt + connected call. If an error still appears, request the DevTools console text (CSP "Refused to connect…" lines would name any remaining missing host).
4. **Vapi E2E (follow-up):** confirm the webhook persists a real transcript end-to-end (browser Web SDK; no phone number). Credential = Header Name `X-Vapi-Secret`, **Bearer prefix OFF**, token = `VAPI_WEBHOOK_SECRET`; server URL `https://www.wall-v.com/api/webhooks/vapi`. Verify `duration` semantics.
5. **Deployment check:** rate limiting on Vercel (store is process-local → per-instance protection only).

## Blockers / manual steps pending

- **NOT TESTED:** Vapi E2E voice in production (user's browser/mic — Stage 5 retest requested after deploy; cannot be done headlessly).
- **NOT TESTED:** rate limiting in the actual deployment environment (unit-tested only).
- **DEFERRED (own controlled step):** production DB seed (`npm run seed:ai-tools`) — requires DB backup + URI preflight first: the seed `$set`-overwrites admin edits to categories/tags/providers/plans (tool records themselves are `$setOnInsert`-safe). No local `.env`/`MONGODB_URI`.
