/**
 * Vapi live-call fix tests (Stage 5 — "Talk to AI" error on screen).
 *
 * Guards two production regressions found in browser E2E:
 *
 * 1. CSP: the Vapi Web SDK POSTs to https://api.vapi.ai and Daily.co's
 *    runtime loads its bundle from c.daily.co / connects over wss://*.daily.co.
 *    The previous Content-Security-Policy listed NEITHER, so the browser
 *    blocked the call and the widget showed a generic error. These tests pin
 *    the required hosts (plus worker/media directives) and assert the Dograh
 *    entries are never dropped while editing the Vapi ones.
 *
 * 2. Error surfacing: the SDK's `error` events carry plain payloads such as
 *    `{ type, stage, error: { message } }`, not `Error` instances, so the old
 *    `instanceof Error` check flattened every failure to
 *    "Vapi voice call error." — hiding the real reason. `extractVapiErrorMessage`
 *    must recover the message from all observed shapes.
 */
import nextConfig from "../../next.config";

// Only `extractVapiErrorMessage` (a pure function) is under test — mock the
// SDK so Daily's heavy runtime bundle isn't loaded under jsdom.
jest.mock("@vapi-ai/web", () => ({ __esModule: true, default: class MockVapi {} }));

import { extractVapiErrorMessage } from "@/hooks/useVapi";

// ─── CSP guard (next.config.ts) ─────────────────────────────────────────────

interface HeaderEntry {
  key: string;
  value: string;
}

async function getSecurityHeaders(): Promise<HeaderEntry[]> {
  expect(typeof nextConfig.headers).toBe("function");
  // Next.js `headers()` returns route objects: [{ source, headers }]
  const routes = await nextConfig.headers!();
  return routes.flatMap((route) => route.headers ?? []);
}

/** Returns one directive (e.g. "connect-src https://…") from a CSP string. */
function cspDirective(csp: string, name: string): string {
  return (
    csp
      .split(";")
      .map((d) => d.trim())
      .find((d) => d === name || d.startsWith(`${name} `)) ?? ""
  );
}

describe("Security headers — Vapi/Daily.co CSP (live-call blocker)", () => {
  let headers: HeaderEntry[];
  let csp: string;

  beforeAll(async () => {
    headers = await getSecurityHeaders();
    csp = headers.find((h) => h.key === "Content-Security-Policy")?.value ?? "";
  });

  it("exposes a Content-Security-Policy header at all", () => {
    expect(csp).not.toBe("");
  });

  it("allows connect-src to the Vapi API (call creation is a POST to api.vapi.ai)", () => {
    const connectSrc = cspDirective(csp, "connect-src");
    expect(connectSrc).toContain("https://api.vapi.ai");
  });

  it("allows connect-src to Daily.co over HTTPS and WSS (media/signalling)", () => {
    const connectSrc = cspDirective(csp, "connect-src");
    expect(connectSrc).toContain("https://c.daily.co");
    expect(connectSrc).toContain("https://*.daily.co");
    expect(connectSrc).toContain("wss://*.daily.co");
  });

  it("allows script-src for Daily's call-machine bundle loaded at call start", () => {
    const scriptSrc = cspDirective(csp, "script-src");
    expect(scriptSrc).toContain("https://c.daily.co");
    expect(scriptSrc).toContain("https://*.daily.co");
    // Daily spawns audio workers from blob: URLs.
    expect(scriptSrc).toContain("blob:");
  });

  it("declares worker-src and media-src so Daily's audio pipeline can run", () => {
    const workerSrc = cspDirective(csp, "worker-src");
    expect(workerSrc).toContain("blob:");
    const mediaSrc = cspDirective(csp, "media-src");
    expect(mediaSrc).toContain("blob:");
    expect(mediaSrc).toContain("mediastream:");
  });

  it("retains every Dograh entry (no regression while adding Vapi hosts)", () => {
    const scriptSrc = cspDirective(csp, "script-src");
    const connectSrc = cspDirective(csp, "connect-src");
    // script-src: Dograh widget hosts
    expect(scriptSrc).toContain("https://dograh.vercel.app");
    expect(scriptSrc).toContain("https://app.dograh.com");
    // connect-src: Dograh API + websocket
    expect(connectSrc).toContain("https://api.dograh.com");
    expect(connectSrc).toContain("wss://api.dograh.com");
    expect(connectSrc).toContain("https://app.dograh.com");
    expect(connectSrc).toContain("https://dograh.vercel.app");
  });

  it("keeps default-src 'self' and the microphone permission (mic required for calls)", () => {
    expect(cspDirective(csp, "default-src")).toContain("'self'");
    const permissions = headers.find((h) => h.key === "Permissions-Policy")?.value ?? "";
    expect(permissions).toContain("microphone=(self)");
  });

  it("does not expose secrets in any header value", () => {
    const joined = headers.map((h) => h.value).join(" ");
    expect(joined).not.toMatch(/(sk-|vapi_sk|whsec_|MONGODB_URI)/i);
  });
});

// ─── Error extraction (useVapi) ─────────────────────────────────────────────

describe("extractVapiErrorMessage — real reason must reach the UI", () => {
  const FALLBACK = "Vapi voice call error.";

  it("reads an Error's message", () => {
    expect(extractVapiErrorMessage(new Error("mic blocked"), FALLBACK)).toBe("mic blocked");
  });

  it("reads a plain string", () => {
    expect(extractVapiErrorMessage("network down", FALLBACK)).toBe("network down");
  });

  it("reads the SDK's nested { type, stage, error: { message } } payload", () => {
    const sdkPayload = {
      type: "start-method-error",
      stage: "web-call-creation",
      error: {
        message: "Request failed with status code 401",
        name: "Error",
        stack: "at start ()",
      },
      timestamp: "2026-01-01T00:00:00.000Z",
    };
    expect(extractVapiErrorMessage(sdkPayload, FALLBACK)).toBe(
      "Request failed with status code 401"
    );
  });

  it("reads a flat { error: 'string' } payload", () => {
    expect(extractVapiErrorMessage({ error: "assistant not found" }, FALLBACK)).toBe(
      "assistant not found"
    );
  });

  it("reads a top-level { message } payload", () => {
    expect(extractVapiErrorMessage({ message: "public key rejected" }, FALLBACK)).toBe(
      "public key rejected"
    );
  });

  it("names the failure stage when no message exists (never fully silent)", () => {
    const msg = extractVapiErrorMessage(
      { type: "validation-error", stage: "input-validation" },
      FALLBACK
    );
    expect(msg).toContain("validation-error");
    expect(msg).toContain("input-validation");
    expect(msg).not.toBe(FALLBACK);
  });

  it("falls back for null/undefined/non-object junk", () => {
    expect(extractVapiErrorMessage(null, FALLBACK)).toBe(FALLBACK);
    expect(extractVapiErrorMessage(undefined, FALLBACK)).toBe(FALLBACK);
    expect(extractVapiErrorMessage(42, FALLBACK)).toBe(FALLBACK);
    expect(extractVapiErrorMessage({}, FALLBACK)).toBe(FALLBACK);
  });

  it("falls back for empty/whitespace-only messages", () => {
    expect(extractVapiErrorMessage("   ", FALLBACK)).toBe(FALLBACK);
    expect(extractVapiErrorMessage(new Error(""), FALLBACK)).toBe(FALLBACK);
    expect(extractVapiErrorMessage({ message: "" }, FALLBACK)).toBe(FALLBACK);
  });

  it("trims surrounding whitespace from recovered messages", () => {
    expect(extractVapiErrorMessage("  Failed to fetch  ", FALLBACK)).toBe("Failed to fetch");
  });
});
