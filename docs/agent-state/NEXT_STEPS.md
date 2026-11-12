# Wall-V — Agent Next Steps

> Prioritized unfinished work. Updated at every checkpoint.

## Priority 1 — Persistent project checkpoints

- [x] A1. Establish checkpoint docs under `docs/agent-state/` (PROJECT_STATE, PROGRESS_LOG, NEXT_STEPS).
- [x] A2–A4. Checkpoint rules and session-resumption procedure adopted into state docs.

## Priority 2 — Vapi functional recovery (Dograh parity)

- [x] B1. Deep Dograh audit complete (widget, loader, config, webhook, API routes, dashboard, public settings, AI registry, DB models, tests, env).
- [x] B2. Dograh capability map + Dograh→Vapi mapping produced.
- [x] C1. Research official Vapi docs (docs.vapi.ai) — Web SDK, public key, assistant config, server URL/webhook, variables, lifecycle, tools, transcripts, errors.
- [x] C2. Assess Vapi recovery gaps in current restored code — Vapi ABSENT; full port required.
- [x] C3. Dograh→Vapi configuration mapping table produced.
- [ ] C4. Preserve existing architecture constraints (OpenAI/Anthropic AI stack, CRM, auth, Mongo, tool registry) — ongoing.
- [ ] C5. Design secure Vapi webhook architecture (dedicated endpoint preferred; idempotency; auth; validation; safe logging) — pending design.
- [ ] Phase 4 (next): implement Vapi config + browser integration (`@vapi-ai/web`, `src/lib/vapi-config.ts`, `useVapi`), keep Dograh fallback.

## Priority 3 — Controlled migration

- [ ] D. Dashboard provider management (Dograh ↔ Vapi selection, status, enable/disable, test; no private creds in browser).
- [ ] E. Testing: technical + E2E validation; manual Vapi-dashboard/browser steps outstanding.

## Immediate next action (resume point)

1. Phase 4: implement Vapi configuration layer (`@vapi-ai/web` install + `src/lib/vapi-config.ts`) and `useVapi` hook mirroring `useDograh` API.
2. Then wire Vapi widget/browser integration; keep Dograh path intact.
3. Phase 5: Vapi webhook server flow (`assistant-request`, `end-of-call-report`, `tool-calls`) at dedicated endpoint; idempotency; auth.
4. Phase 6: dashboard provider management; Phase 7: tests; Phase 8: final report.

## Blockers / manual steps pending

- Vapi dashboard-side: assistant creation, phone numbers, keys (user action; cannot be created from code).
- Vercel env vars for Vapi (user action; names only documented).
- Live E2E voice testing requires real Vapi credentials + browser mic — cannot be completed headlessly.
