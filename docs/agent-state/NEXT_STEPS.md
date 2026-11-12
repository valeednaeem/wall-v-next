# Wall-V — Agent Next Steps

> Prioritized unfinished work. Updated at every checkpoint.
> **Last updated:** 2026-11-13 (Stages 1–3 complete — F-1/F-5 preview pushed to `deploy/pre-vapi`; General Settings Vapi work committed locally; 14 local commits on `master`, unpushed)

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

## Immediate next action (resume point)

> **STOP POINT (2026-11-13):** Stage 3 final report (8 items) delivered — **awaiting user approval.** Nothing pushed, nothing deployed, provider still Dograh. Code commit `0ec7430`, docs `d0e71c4` (local `master` 14 ahead; 15 with the handoff commit).

1. **Review:** user reviews the General Settings Vapi work (root causes + controls + end-to-end wiring) and the final report.
2. **Approval decision:** whether to push the new local commit(s) (push to `master` auto-deploys Vercel — explicit approval required) and/or update `deploy/pre-vapi` for the Preview.
3. **Vapi E2E:** confirm the webhook persists a real Vapi transcript end-to-end (browser Web SDK; **no phone number required**). Configure the Vapi credential as Header Name `X-Vapi-Secret`, **Bearer prefix OFF**, token = `VAPI_WEBHOOK_SECRET`; server URL `https://www.wall-v.com/api/webhooks/vapi`. Verify `duration` semantics during this test.
4. **Deployment check:** confirm rate limiting behaves as expected on Vercel (store is process-local → per-instance protection only; no shared store configured).
5. **Provider switch (separate approval):** production provider stays **Dograh** until the user explicitly approves switching to Vapi after E2E.

## Blockers / manual steps pending

- **DEFERRED (own controlled step):** production DB seed (`npm run seed:ai-tools`) — requires DB backup + URI preflight first: the seed `$set`-overwrites admin edits to categories/tags/providers/plans (tool records themselves are `$setOnInsert`-safe). No local `.env`/`MONGODB_URI`.
- **NOT TESTED:** Vapi E2E voice (dashboard-side assistant creation, keys — user action; browser mic — cannot be done headlessly).
- **NOT TESTED:** rate limiting in the actual deployment environment (unit-tested only).
- Vercel env vars for Vapi (user action; names only documented in `.env.example` — never values).
- Push/deploy of the 14 local `master` commits awaits explicit approval (`deploy/pre-vapi` preview branch already pushed, user-approved; `origin/master` still at `2fcfb88`).
