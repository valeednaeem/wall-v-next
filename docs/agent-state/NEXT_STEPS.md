# Wall-V — Agent Next Steps

> Prioritized unfinished work. Updated at every checkpoint.
> **Last updated:** 2026-11-12 (all four brief phases + approved pre-deployment Fixes A/B complete — 10 local commits, unpushed)

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

## Immediate next action (resume point — user-approved post-fix sequence)

1. **Review:** inspect local commits `e2cad86` (Fix A) and `104f9c5` (Fix B) and their test suites.
2. **Vapi E2E:** confirm the webhook persists a real Vapi transcript end-to-end (browser Web SDK; **no phone number required**). Configure the Vapi credential as Header Name `X-Vapi-Secret`, **Bearer prefix OFF**, token = `VAPI_WEBHOOK_SECRET`; server URL `https://www.wall-v.com/api/webhooks/vapi`. Verify `duration` semantics during this test.
3. **Deployment check:** confirm rate limiting behaves as expected on Vercel (store is process-local → per-instance protection only; no shared store configured).
4. **Re-run** the Git/deployment-readiness check (branch, remote, fast-forward, expected file set).
5. **Decide** whether to push the 10 local commits (push to `master` auto-deploys Vercel) — explicit approval required.

## Blockers / manual steps pending

- **DEFERRED (own controlled step):** production DB seed (`npm run seed:ai-tools`) — requires DB backup + URI preflight first: the seed `$set`-overwrites admin edits to categories/tags/providers/plans (tool records themselves are `$setOnInsert`-safe). No local `.env`/`MONGODB_URI`.
- **NOT TESTED:** Vapi E2E voice (dashboard-side assistant creation, keys — user action; browser mic — cannot be done headlessly).
- **NOT TESTED:** rate limiting in the actual deployment environment (unit-tested only).
- Vercel env vars for Vapi (user action; names only documented in `.env.example` — never values).
- Push/deploy of the 10 local commits awaits explicit approval (after steps 1–4).
