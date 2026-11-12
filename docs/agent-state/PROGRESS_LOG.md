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

---

*End of log entries for this session.*
