/**
 * Route-level regression tests for POST /api/webhooks/vapi (Fix A).
 *
 * Guards: persistence from both payload shapes, duplicate deliveries as
 * no-ops, retries that never clobber valid transcripts with empties (and DO
 * fill in incomplete deliveries), the sanitized missing-artifact diagnostic,
 * and preserved auth/validation/rate-limit behavior.
 */
import { POST } from "@/app/api/webhooks/vapi/route";
import { checkRateLimit, logSecurityEvent } from "@/lib/security";
import Conversation from "@/models/conversation";

// ─── Module mocks ───────────────────────────────────────────────────────────

jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
      body,
      status: init?.status ?? 200,
      headers: init?.headers ?? {},
    }),
  },
}));

jest.mock("@/lib/cors", () => ({
  corsHeaders: jest.fn().mockReturnValue({}),
  handleOPTIONS: jest.fn().mockReturnValue({ status: 204 }),
}));

jest.mock("@/lib/error-logger", () => ({
  logError: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/security", () => ({
  checkRateLimit: jest.fn().mockReturnValue({ allowed: true, remaining: 29, resetAt: Date.now() + 60_000 }),
  getClientIp: jest.fn().mockReturnValue("203.0.113.10"),
  logSecurityEvent: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/models/conversation", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
}));

// ─── Test fixtures ──────────────────────────────────────────────────────────

interface WebhookResponse {
  status: number;
  body: Record<string, unknown>;
  headers: Record<string, string>;
}

const SECRET = "unit-test-webhook-secret";

function makeRequest(payload: unknown, headers: Record<string, string> = {}): Request {
  const bodyText = typeof payload === "string" ? payload : JSON.stringify(payload);
  const allHeaders: Record<string, string> = { "X-Vapi-Secret": SECRET, ...headers };
  return {
    headers: {
      get: (name: string) => (name in allHeaders ? allHeaders[name] : null),
    },
    text: async () => bodyText,
  } as unknown as Request;
}

/** Official docs shape: artifact + endedReason at the MESSAGE level. */
function messageLevelPayload(callId = "call-abc") {
  return {
    message: {
      type: "end-of-call-report",
      endedReason: "hangup",
      artifact: {
        transcript: "AGENT: Hello there.\n\nUSER: Hi",
        messages: [
          { role: "assistant", message: "Hello there." },
          { role: "user", message: "Hi" },
        ],
        summary: "Short greeting",
      },
      call: { id: callId, duration: 12 },
    },
  };
}

/** Legacy/SDK shape: artifact only on the call object. */
function callLevelPayload(callId = "call-abc") {
  return {
    message: {
      type: "end-of-call-report",
      call: {
        id: callId,
        endedReason: "hangup",
        artifact: {
          transcript: "USER: Hello",
          messages: [{ role: "user", message: "Hello" }],
        },
      },
    },
  };
}

/** end-of-call-report with NO artifact anywhere. */
function emptyPayload(callId = "call-abc") {
  return {
    message: {
      type: "end-of-call-report",
      endedReason: "hangup",
      call: { id: callId, duration: 4 },
    },
  };
}

const findOneMock = jest.mocked(Conversation.findOne);
const findOneAndUpdateMock = jest.mocked(Conversation.findOneAndUpdate);
const checkRateLimitMock = jest.mocked(checkRateLimit);
const logSecurityEventMock = jest.mocked(logSecurityEvent);

const ORIGINAL_SECRET = process.env.VAPI_WEBHOOK_SECRET;

beforeAll(() => {
  process.env.VAPI_WEBHOOK_SECRET = SECRET;
});

afterAll(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.VAPI_WEBHOOK_SECRET;
  else process.env.VAPI_WEBHOOK_SECRET = ORIGINAL_SECRET;
});

beforeEach(() => {
  jest.clearAllMocks();
  checkRateLimitMock.mockReturnValue({ allowed: true, remaining: 29, resetAt: Date.now() + 60_000 });
  logSecurityEventMock.mockResolvedValue(undefined);
});

// ─── Persistence from both payload shapes ───────────────────────────────────

describe("POST /api/webhooks/vapi — persistence", () => {
  it("persists a transcript from a message-level artifact", async () => {
    findOneMock.mockResolvedValue(null);
    findOneAndUpdateMock.mockResolvedValue({ _id: "conv-1" } as never);

    const res = (await POST(makeRequest(messageLevelPayload("call-1")))) as unknown as WebhookResponse;

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.conversationId).toBe("conv-1");

    const update = findOneAndUpdateMock.mock.calls[0][1] as {
      $set: { voiceAgent: Record<string, unknown>; messages?: unknown[] };
    };
    expect(update.$set.voiceAgent.transcript).toBe("AGENT: Hello there.\n\nUSER: Hi");
    expect(update.$set.voiceAgent.transcriptPersisted).toBe(true);
    expect(update.$set.voiceAgent.callStatus).toBe("hangup"); // message-level endedReason
    expect(update.$set.voiceAgent.summary).toBe("Short greeting");
    expect(update.$set.messages).toHaveLength(2);
  });

  it("persists a transcript from a call-level artifact (compatibility fallback)", async () => {
    findOneMock.mockResolvedValue(null);
    findOneAndUpdateMock.mockResolvedValue({ _id: "conv-2" } as never);

    const res = (await POST(makeRequest(callLevelPayload("call-2")))) as unknown as WebhookResponse;

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const update = findOneAndUpdateMock.mock.calls[0][1] as {
      $set: { voiceAgent: Record<string, unknown> };
    };
    expect(update.$set.voiceAgent.transcript).toBe("USER: Hello");
    expect(update.$set.voiceAgent.transcriptPersisted).toBe(true);
    expect(update.$set.voiceAgent.callStatus).toBe("hangup");
  });

  it("acknowledges transient events without touching the database", async () => {
    const res = (await POST(
      makeRequest({ message: { type: "status-update", call: { id: "call-t" }, status: "in-progress" } })
    )) as unknown as WebhookResponse;

    expect(res.status).toBe(200);
    expect(res.body.acknowledged).toBe(true);
    expect(findOneMock).not.toHaveBeenCalled();
    expect(findOneAndUpdateMock).not.toHaveBeenCalled();
  });
});

// ─── Idempotency and retries ────────────────────────────────────────────────

describe("POST /api/webhooks/vapi — idempotency and retries", () => {
  it("treats a duplicate delivery of a completed call as a no-op", async () => {
    findOneMock.mockResolvedValue({
      _id: "conv-9",
      messages: [{ role: "assistant", content: "Hello there." }],
      voiceAgent: { transcript: "AGENT: Hello there." },
    } as never);

    const res = (await POST(makeRequest(messageLevelPayload("call-dup")))) as unknown as WebhookResponse;

    expect(res.status).toBe(200);
    expect(res.body.duplicate).toBe(true);
    expect(res.body.success).toBe(true);
    expect(findOneAndUpdateMock).not.toHaveBeenCalled();
  });

  it("never overwrites a valid transcript with an empty retry", async () => {
    findOneMock.mockResolvedValue({
      _id: "conv-10",
      messages: [{ role: "user", content: "Hi" }],
      voiceAgent: { transcript: "USER: Hi", transcriptPersisted: true },
    } as never);

    const res = (await POST(makeRequest(emptyPayload("call-empty-retry")))) as unknown as WebhookResponse;

    expect(res.status).toBe(200);
    expect(res.body.duplicate).toBe(true);
    expect(findOneAndUpdateMock).not.toHaveBeenCalled();
  });

  it("fills in content when a retry follows an incomplete delivery", async () => {
    findOneMock.mockResolvedValue({
      _id: "conv-11",
      messages: [],
      voiceAgent: { transcript: "", transcriptPersisted: false },
    } as never);
    findOneAndUpdateMock.mockResolvedValue({ _id: "conv-11" } as never);

    const res = (await POST(makeRequest(messageLevelPayload("call-retry")))) as unknown as WebhookResponse;

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.duplicate).toBeUndefined();

    const update = findOneAndUpdateMock.mock.calls[0][1] as {
      $set: { voiceAgent: Record<string, unknown> };
    };
    expect(update.$set.voiceAgent.transcript).toBe("AGENT: Hello there.\n\nUSER: Hi");
    expect(update.$set.voiceAgent.transcriptPersisted).toBe(true);
  });

  it("never lets an empty retry erase an existing summary (F-5)", async () => {
    findOneMock.mockResolvedValue({
      _id: "conv-12",
      messages: [],
      voiceAgent: { transcript: "", transcriptPersisted: false, summary: "Existing summary" },
    } as never);
    findOneAndUpdateMock.mockResolvedValue({ _id: "conv-12" } as never);

    const res = (await POST(makeRequest(emptyPayload("call-f5-empty")))) as unknown as WebhookResponse;

    // Not a content duplicate (no transcript/messages), so the write happens —
    // but the stored summary must survive the empty payload.
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.incomplete).toBe(true);

    const update = findOneAndUpdateMock.mock.calls[0][1] as {
      $set: { voiceAgent: Record<string, unknown> };
    };
    expect(update.$set.voiceAgent.summary).toBe("Existing summary");
    expect(update.$set.voiceAgent.transcriptPersisted).toBe(false);
  });

  it("lets a fresh non-empty summary replace the stored one (F-5)", async () => {
    findOneMock.mockResolvedValue({
      _id: "conv-13",
      messages: [],
      voiceAgent: { transcript: "", transcriptPersisted: false, summary: "Stale summary" },
    } as never);
    findOneAndUpdateMock.mockResolvedValue({ _id: "conv-13" } as never);

    const res = (await POST(makeRequest(messageLevelPayload("call-f5-new")))) as unknown as WebhookResponse;

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const update = findOneAndUpdateMock.mock.calls[0][1] as {
      $set: { voiceAgent: Record<string, unknown> };
    };
    expect(update.$set.voiceAgent.summary).toBe("Short greeting");
  });
});

// ─── Missing artifact: sanitized diagnostic, no false success ───────────────

describe("POST /api/webhooks/vapi — missing artifact", () => {
  it("persists call metadata but does not claim success, and records a sanitized diagnostic", async () => {
    findOneMock.mockResolvedValue(null);
    findOneAndUpdateMock.mockResolvedValue({ _id: "conv-3" } as never);

    const res = (await POST(makeRequest(emptyPayload("call-no-artifact")))) as unknown as WebhookResponse;

    // NOT marked as a successful transcript persistence.
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.incomplete).toBe(true);
    expect(res.body.diagnostic).toBe("missing_transcript_artifact");
    expect(res.body.conversationId).toBe("conv-3");

    // Call metadata is still persisted, explicitly flagged as incomplete.
    const update = findOneAndUpdateMock.mock.calls[0][1] as {
      $set: { voiceAgent: Record<string, unknown> };
    };
    expect(update.$set.voiceAgent.transcript).toBe("");
    expect(update.$set.voiceAgent.transcriptPersisted).toBe(false);
    expect(update.$set.voiceAgent.callStatus).toBe("hangup");
    expect(update.$set.voiceAgent.vapiCallId).toBe("call-no-artifact");

    // Diagnostic: logged, sanitized — only key/reason/artifact presence.
    expect(logSecurityEventMock).toHaveBeenCalledTimes(1);
    const diagnostic = logSecurityEventMock.mock.calls[0][0];
    expect(diagnostic.type).toBe("input_validation_failed");
    expect(diagnostic.details).toMatchObject({
      source: "vapi-webhook",
      reason: "missing_transcript_artifact",
      artifactPresent: false,
    });
    expect(String(diagnostic.details?.key)).toContain("call-no-artifact");

    // No secrets or conversation content anywhere in the response or diagnostic.
    const serialized = JSON.stringify({ res, diagnostic });
    expect(serialized).not.toContain(SECRET);
  });

  it("a later retry with a full artifact completes the same conversation", async () => {
    // First delivery: incomplete.
    findOneMock.mockResolvedValueOnce(null);
    findOneAndUpdateMock.mockResolvedValueOnce({ _id: "conv-4" } as never);

    const first = (await POST(makeRequest(emptyPayload("call-seq")))) as unknown as WebhookResponse;
    expect(first.body.success).toBe(false);

    // Retry: full artifact arrives — conversation already exists without content.
    findOneMock.mockResolvedValueOnce({
      _id: "conv-4",
      messages: [],
      voiceAgent: { transcript: "", transcriptPersisted: false },
    } as never);
    findOneAndUpdateMock.mockResolvedValueOnce({ _id: "conv-4" } as never);

    const second = (await POST(makeRequest(messageLevelPayload("call-seq")))) as unknown as WebhookResponse;
    expect(second.body.success).toBe(true);
    expect(second.body.duplicate).toBeUndefined();

    const update = findOneAndUpdateMock.mock.calls[1][1] as {
      $set: { voiceAgent: Record<string, unknown> };
    };
    expect(update.$set.voiceAgent.transcriptPersisted).toBe(true);
    expect(update.$set.voiceAgent.transcript).toContain("Hello there.");
  });
});

// ─── Preserved auth, validation, and rate-limit behavior ────────────────────

describe("POST /api/webhooks/vapi — auth, validation, rate limits", () => {
  it("returns 503 when the webhook secret is not configured (fail closed)", async () => {
    const saved = process.env.VAPI_WEBHOOK_SECRET;
    delete process.env.VAPI_WEBHOOK_SECRET;
    try {
      const res = (await POST(makeRequest(messageLevelPayload("call-x")))) as unknown as WebhookResponse;
      expect(res.status).toBe(503);
      expect(findOneMock).not.toHaveBeenCalled();
    } finally {
      process.env.VAPI_WEBHOOK_SECRET = saved;
    }
  });

  it("returns 401 for a wrong secret before any database work", async () => {
    const res = (await POST(
      makeRequest(messageLevelPayload("call-y"), { "X-Vapi-Secret": "wrong" })
    )) as unknown as WebhookResponse;

    expect(res.status).toBe(401);
    expect(findOneMock).not.toHaveBeenCalled();
    expect(findOneAndUpdateMock).not.toHaveBeenCalled();
    expect(logSecurityEventMock).toHaveBeenCalled();
  });

  it("returns 400 for invalid JSON", async () => {
    const res = (await POST(makeRequest("{not-json"))) as unknown as WebhookResponse;
    expect(res.status).toBe(400);
    expect(findOneMock).not.toHaveBeenCalled();
  });

  it("returns 400 for a payload without a message object", async () => {
    const res = (await POST(makeRequest({ foo: 1 }))) as unknown as WebhookResponse;
    expect(res.status).toBe(400);
  });

  it("returns 400 for an end-of-call-report without a call id", async () => {
    const res = (await POST(
      makeRequest({ message: { type: "end-of-call-report", artifact: { transcript: "x" } } })
    )) as unknown as WebhookResponse;

    expect(res.status).toBe(400);
    expect(findOneAndUpdateMock).not.toHaveBeenCalled();
  });

  it("returns 429 when the webhook rate limit is exhausted", async () => {
    checkRateLimitMock.mockReturnValue({ allowed: false, remaining: 0, resetAt: Date.now() + 30_000 });

    const res = (await POST(makeRequest(messageLevelPayload("call-rl")))) as unknown as WebhookResponse;

    expect(res.status).toBe(429);
    expect(findOneMock).not.toHaveBeenCalled();
    expect(logSecurityEventMock).toHaveBeenCalled(); // rate-limit security event
  });
});
