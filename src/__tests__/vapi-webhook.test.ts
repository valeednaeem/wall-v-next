/**
 * Regression tests for Vapi webhook payload extraction and security helpers.
 *
 * Guards the pre-deployment Fix A invariant: transcript/summary/endedReason
 * are read from the MESSAGE-level payload first (official Vapi docs) with a
 * call-level compatibility fallback, and authentication stays fail-closed.
 */
import {
  authenticateVapiWebhook,
  validateVapiWebhookBody,
  extractVapiCallEvent,
  buildVapiEventKey,
} from "@/lib/vapi-webhook";

// ─── Helpers ────────────────────────────────────────────────────────────────

function authRequest(headers: Record<string, string>): Request {
  return {
    headers: {
      get: (name: string) => (name in headers ? headers[name] : null),
    },
  } as unknown as Request;
}

const ORIGINAL_SECRET = process.env.VAPI_WEBHOOK_SECRET;
const ORIGINAL_HEADER = process.env.VAPI_WEBHOOK_HEADER;

afterAll(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.VAPI_WEBHOOK_SECRET;
  else process.env.VAPI_WEBHOOK_SECRET = ORIGINAL_SECRET;
  if (ORIGINAL_HEADER === undefined) delete process.env.VAPI_WEBHOOK_HEADER;
  else process.env.VAPI_WEBHOOK_HEADER = ORIGINAL_HEADER;
});

// ─── Extraction: message-level first, call-level fallback ───────────────────

describe("extractVapiCallEvent — message-level artifact (official docs shape)", () => {
  it("reads transcript and messages from message.artifact", () => {
    const { event, error } = extractVapiCallEvent({
      message: {
        type: "end-of-call-report",
        endedReason: "hangup",
        artifact: {
          transcript: "AGENT: How can I help?\n\nUSER: Pricing please",
          messages: [
            { role: "assistant", message: "How can I help?" },
            { role: "user", message: "Pricing please" },
          ],
          summary: "Pricing question",
        },
        call: { id: "call-msg-level" },
      },
    });

    expect(error).toBeUndefined();
    expect(event?.transcript).toBe("AGENT: How can I help?\n\nUSER: Pricing please");
    expect(event?.messages).toHaveLength(2);
    expect(event?.messages?.[0]).toMatchObject({ role: "assistant", content: "How can I help?" });
    expect(event?.messages?.[1]).toMatchObject({ role: "user", content: "Pricing please" });
    expect(event?.summary).toBe("Pricing question");
    expect(event?.artifactPresent).toBe(true);
    expect(event?.callId).toBe("call-msg-level");
  });

  it("prefers message-level endedReason over call-level", () => {
    const { event } = extractVapiCallEvent({
      message: {
        type: "end-of-call-report",
        endedReason: "customer-ended",
        artifact: { transcript: "AGENT: Bye" },
        call: { id: "call-er", endedReason: "hangup" },
      },
    });

    expect(event?.endedReason).toBe("customer-ended");
  });

  it("reads a message-level transcript field when no artifact object exists", () => {
    const { event } = extractVapiCallEvent({
      message: {
        type: "end-of-call-report",
        endedReason: "hangup",
        transcript: "USER: Hello",
        call: { id: "call-flat" },
      },
    });

    expect(event?.transcript).toBe("USER: Hello");
    expect(event?.endedReason).toBe("hangup");
    expect(event?.artifactPresent).toBe(false);
  });
});

describe("extractVapiCallEvent — call-level artifact fallback", () => {
  it("falls back to message.call.artifact when message.artifact is absent", () => {
    const { event, error } = extractVapiCallEvent({
      message: {
        type: "end-of-call-report",
        call: {
          id: "call-fallback",
          endedReason: "error",
          artifact: {
            transcript: "AGENT: Testing",
            messages: [{ role: "assistant", content: "Testing" }],
          },
        },
      },
    });

    expect(error).toBeUndefined();
    expect(event?.transcript).toBe("AGENT: Testing");
    expect(event?.messages).toHaveLength(1);
    expect(event?.endedReason).toBe("error");
    expect(event?.artifactPresent).toBe(true);
    expect(event?.callId).toBe("call-fallback");
  });

  it("reads endedReason from the call object when only the call-level value exists", () => {
    const { event } = extractVapiCallEvent({
      message: {
        type: "end-of-call-report",
        call: { id: "call-er2", endedReason: "assistant-error", artifact: { transcript: "x" } },
      },
    });

    expect(event?.endedReason).toBe("assistant-error");
  });
});

describe("extractVapiCallEvent — missing artifact", () => {
  it("returns no content and flags artifact absence instead of inventing a transcript", () => {
    const { event, error } = extractVapiCallEvent({
      message: {
        type: "end-of-call-report",
        endedReason: "hangup",
        call: { id: "call-empty", duration: 4 },
      },
    });

    expect(error).toBeUndefined();
    expect(event?.transcript).toBeUndefined();
    expect(event?.messages).toBeUndefined();
    expect(event?.summary).toBeUndefined();
    expect(event?.endedReason).toBe("hangup");
    expect(event?.artifactPresent).toBe(false);
    expect(event?.callId).toBe("call-empty");
  });
});

// ─── Authentication (fail-closed) ────────────────────────────────────────────

describe("authenticateVapiWebhook", () => {
  beforeEach(() => {
    delete process.env.VAPI_WEBHOOK_HEADER;
  });

  it("fails closed with 503 when the secret is not configured", () => {
    delete process.env.VAPI_WEBHOOK_SECRET;
    const result = authenticateVapiWebhook(authRequest({ "X-Vapi-Secret": "anything" }));
    expect(result.ok).toBe(false);
    expect(result.status).toBe(503);
  });

  it("rejects a wrong secret with 401", () => {
    process.env.VAPI_WEBHOOK_SECRET = "unit-test-secret";
    const result = authenticateVapiWebhook(authRequest({ "X-Vapi-Secret": "wrong-value" }));
    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
  });

  it("rejects a missing header with 401", () => {
    process.env.VAPI_WEBHOOK_SECRET = "unit-test-secret";
    const result = authenticateVapiWebhook(authRequest({}));
    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
  });

  it("accepts the exact secret on the default X-Vapi-Secret header", () => {
    process.env.VAPI_WEBHOOK_SECRET = "unit-test-secret";
    const result = authenticateVapiWebhook(authRequest({ "X-Vapi-Secret": "unit-test-secret" }));
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
  });

  it("honors a custom header name from VAPI_WEBHOOK_HEADER", () => {
    process.env.VAPI_WEBHOOK_SECRET = "unit-test-secret";
    process.env.VAPI_WEBHOOK_HEADER = "X-Custom-WallV";

    const onCustom = authenticateVapiWebhook(authRequest({ "X-Custom-WallV": "unit-test-secret" }));
    expect(onCustom.ok).toBe(true);

    // The default header must no longer authenticate.
    const onDefault = authenticateVapiWebhook(authRequest({ "X-Vapi-Secret": "unit-test-secret" }));
    expect(onDefault.ok).toBe(false);
    expect(onDefault.status).toBe(401);

    delete process.env.VAPI_WEBHOOK_HEADER;
  });
});

// ─── Payload validation ─────────────────────────────────────────────────────

describe("validateVapiWebhookBody", () => {
  it("rejects non-object bodies", () => {
    expect(validateVapiWebhookBody(null).valid).toBe(false);
    expect(validateVapiWebhookBody([]).valid).toBe(false);
    expect(validateVapiWebhookBody("string").valid).toBe(false);
  });

  it("rejects payloads without a message object", () => {
    expect(validateVapiWebhookBody({ foo: 1 }).valid).toBe(false);
  });

  it("rejects messages without a type", () => {
    expect(validateVapiWebhookBody({ message: { call: { id: "x" } } }).valid).toBe(false);
  });

  it("accepts a well-formed envelope", () => {
    expect(
      validateVapiWebhookBody({ message: { type: "end-of-call-report", call: { id: "x" } } }).valid
    ).toBe(true);
  });
});

describe("buildVapiEventKey", () => {
  it("scopes the key by type and call id", () => {
    expect(buildVapiEventKey("call-9", "end-of-call-report")).toBe("vapi:end-of-call-report:call-9");
    expect(buildVapiEventKey(undefined, "status-update")).toBe("vapi:status-update:");
  });
});
