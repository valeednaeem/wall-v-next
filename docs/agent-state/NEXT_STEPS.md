# Wall-V — Agent Next Steps

> Prioritized unfinished work. Updated at every checkpoint.
> **Last updated:** 2026-11-12 (all four brief phases complete — local commits, unpushed)

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

## Immediate next action (resume point)

1. **Administrator — production seed:** run `npm run seed:ai-tools` with `MONGODB_URI` set (no local `.env` exists), then verify `/dashboard/ai-tools/tools` shows the 12 draft records (seed is idempotent; never overwrites admin edits; nothing auto-published).
2. **Administrator — Vapi setup:** set env vars (`NEXT_PUBLIC_VAPI_PUBLIC_KEY`, `VAPI_ASSISTANT_ID`, `VAPI_WEBHOOK_SECRET`, `VAPI_API_KEY`, `VAPI_SERVER_URL`), create the Vapi assistant + phone number, point the assistant server URL at `https://www.wall-v.com/api/webhooks/vapi`.
3. **E2E verification** (requires real credentials + browser mic) — only after which a production provider switch may be *proposed* (Dograh stays production until explicitly approved).
4. **Approval — push:** review the 5 local commits (`247a2c8`…`36846ec`) and authorize `git push` to `master` (auto-deploys Vercel).

## Blockers / manual steps pending

- **REQUIRES MANUAL ACTION:** production DB seed (`npm run seed:ai-tools`) — no local `.env`/`MONGODB_URI`.
- **NOT TESTED:** Vapi E2E voice (dashboard-side assistant creation, phone numbers, keys — user action; browser mic — cannot be done headlessly).
- Vercel env vars for Vapi (user action; names only documented — never values).
- Push/deploy of the 5 local commits awaits explicit approval.
