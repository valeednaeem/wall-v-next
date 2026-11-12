/**
 * Route-level regression tests for POST /api/webhooks/vapi (Fix A).
 *
 * Guards: persistence from both payload shapes, duplicate deliveries as
 * no-ops, retries that never clobber valid transcripts with empties (and DO
 * fill in incomplete deliveries), the sanitized missing-artifact diagnostic,
 * and preserved auth/validation/rate-limit behavior.
 */
import { POST } from "@/app/api/webhooks/vapi/route";
import { logError } from "@/lib/error-logger";
import { checkRateLimit, logSecurityEvent } from "@/lib/security";
import Conversation from "@/models/conversation";
import VapiWebhookEvent from "@/models/vapi-webhook-event";

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

jest.mock("@/models/vapi-webhook-event", () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateOne: jest.fn(),
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
const eventCreateMock = VapiWebhookEvent.create as unknown as jest.Mock;
const eventFindOneMock = VapiWebhookEvent.findOne as unknown as jest.Mock;
const eventFindOneAndUpdateMock = VapiWebhookEvent.findOneAndUpdate as unknown as jest.Mock;
const eventUpdateOneMock = VapiWebhookEvent.updateOne as unknown as jest.Mock;
const checkRateLimitMock = jest.mocked(checkRateLimit);
const logSecurityEventMock = jest.mocked(logSecurityEvent);
const logErrorMock = jest.mocked(logError);

// ─── In-memory VapiWebhookEvent store (F-1) ─────────────────────────────────
// The real uniqueness lives in the MongoDB unique index on eventKey; this
// mock reproduces claim / duplicate-key / reclaim semantics at the model
// boundary so the route's dedup logic is exercised end-to-end.

type StoredEventStatus = "processing" | "processed" | "failed" | "incomplete";
interface StoredEvent {
  _id: string;
  status: StoredEventStatus;
  updatedAt: number;
}

const eventStore = new Map<string, StoredEvent>();
let eventSeq = 0;

function duplicateKeyError(): Error & { code: number } {
  const err = new Error("E11000 duplicate key error collection: vapiwebhookevents") as Error & {
    code: number;
  };
  err.code = 11000;
  return err;
}

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

  // Fresh event store per test, with claim/reclaim semantics wired up.
  eventStore.clear();
  eventSeq = 0;
  eventCreateMock.mockImplementation(
    async (doc: { eventKey: string; callId?: string; type?: string; status?: StoredEventStatus }) => {
      if (eventStore.has(doc.eventKey)) throw duplicateKeyError();
      eventSeq += 1;
      const record: StoredEvent = {
        _id: `evt-${eventSeq}`,
        status: doc.status ?? "processing",
        updatedAt: Date.now(),
      };
      eventStore.set(doc.eventKey, record);
      return { ...doc, _id: record._id };
    }
  );
  eventFindOneMock.mockImplementation(async ({ eventKey }: { eventKey: string }) => {
    const record = eventStore.get(eventKey);
    return record ? { eventKey, status: record.status, updatedAt: record.updatedAt } : null;
  });
  eventFindOneAndUpdateMock.mockImplementation(
    async (
      filter: { eventKey: string; $or?: Array<Record<string, unknown>> },
      update: { $set?: { status?: StoredEventStatus } }
    ) => {
      const record = eventStore.get(filter.eventKey);
      if (!record) return null;
      const matches = (filter.$or || []).some((clause) => {
        if (clause.status !== record.status) return false;
        const updatedAtCond = clause.updatedAt as { $lt?: Date } | undefined;
        if (updatedAtCond?.$lt) return record.updatedAt < updatedAtCond.$lt.getTime();
        return true;
      });
      if (!matches) return null;
      const nextStatus = update.$set?.status ?? record.status;
      eventStore.set(filter.eventKey, { ...record, status: nextStatus, updatedAt: Date.now() });
      return { eventKey: filter.eventKey, status: nextStatus, _id: record._id };
    }
  );
  eventUpdateOneMock.mockImplementation(
    async (filter: { _id?: string }, update: { $set?: { status?: StoredEventStatus } }) => {
      if (filter._id && update.$set?.status) {
        for (const [key, record] of eventStore) {
          if (record._id === filter._id) {
            eventStore.set(key, { ...record, status: update.$set.status, updatedAt: Date.now() });
            return { acknowledged: true, matchedCount: 1 };
          }
        }
      }
      return { acknowledged: true, matchedCount: 0 };
    }
  );
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

// ─── Persistence failure and retry (F-1 bookkeeping) ────────────────────────

describe("POST /api/webhooks/vapi — persistence failure and retry", () => {
  it("returns 500 without claiming success when the conversation write fails", async () => {
    findOneMock.mockResolvedValue(null);
    findOneAndUpdateMock.mockRejectedValueOnce(new Error("mongo write failed"));

    const res = (await POST(
      makeRequest(messageLevelPayload("call-db-fail"))
    )) as unknown as WebhookResponse;

    expect(res.status).toBe(500);
    expect(res.body.success).toBeUndefined();
    expect(res.body.error).toBe("Webhook processing failed");

    // The event is marked failed so a Vapi retry can reclaim it immediately
    // instead of waiting for the stale-processing window.
    expect(eventStore.get("vapi:end-of-call-report:call-db-fail")?.status).toBe("failed");
    expect(logErrorMock).toHaveBeenCalled();
  });

  it("lets a Vapi retry succeed after a failed persistence attempt", async () => {
    const key = "vapi:end-of-call-report:call-retry-fail";
    findOneMock.mockResolvedValue(null);
    findOneAndUpdateMock
      .mockRejectedValueOnce(new Error("transient mongo failure"))
      .mockResolvedValueOnce({ _id: "conv-rf" } as never);

    const first = (await POST(
      makeRequest(messageLevelPayload("call-retry-fail"))
    )) as unknown as WebhookResponse;
    expect(first.status).toBe(500);
    expect(eventStore.get(key)?.status).toBe("failed");

    const second = (await POST(
      makeRequest(messageLevelPayload("call-retry-fail"))
    )) as unknown as WebhookResponse;
    expect(second.status).toBe(200);
    expect(second.body.success).toBe(true);
    expect(second.body.duplicate).toBeUndefined();
    expect(eventStore.get(key)?.status).toBe("processed");

    const update = findOneAndUpdateMock.mock.calls[1][1] as {
      $set: { voiceAgent: Record<string, unknown> };
    };
    expect(update.$set.voiceAgent.transcriptPersisted).toBe(true);
  });
});

// ─── Concurrent deliveries (F-1 claim) ──────────────────────────────────────

describe("POST /api/webhooks/vapi — concurrent deliveries", () => {
  it("acknowledges both concurrent deliveries but writes the conversation exactly once", async () => {
    findOneMock.mockResolvedValue(null);
    findOneAndUpdateMock.mockResolvedValue({ _id: "conv-race" } as never);

    const [rawA, rawB] = await Promise.all([
      POST(makeRequest(messageLevelPayload("call-race"))),
      POST(makeRequest(messageLevelPayload("call-race"))),
    ]);
    const a = rawA as unknown as WebhookResponse;
    const b = rawB as unknown as WebhookResponse;

    // Exactly one delivery passes the claim and touches the Conversation store.
    expect(findOneAndUpdateMock).toHaveBeenCalledTimes(1);

    // Both are acknowledged with 200; exactly one is a duplicate ack.
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    const bodies = [a.body, b.body];
    expect(bodies.filter((body) => body.success === true)).toHaveLength(2);
    expect(bodies.filter((body) => body.duplicate === true)).toHaveLength(1);

    expect(eventStore.get("vapi:end-of-call-report:call-race")?.status).toBe("processed");
  });
});

// ─── Transcript derivation and malformed artifacts ──────────────────────────

describe("POST /api/webhooks/vapi — transcript derivation and malformed artifacts", () => {
  it("derives the transcript from messages when the artifact has no transcript string", async () => {
    const payload = {
      message: {
        type: "end-of-call-report",
        endedReason: "hangup",
        artifact: {
          messages: [
            { role: "user", message: "What are your prices?" },
            { role: "assistant", message: "Our plans start at twenty-nine dollars." },
          ],
        },
        call: { id: "call-derived", duration: 9 },
      },
    };
    findOneMock.mockResolvedValue(null);
    findOneAndUpdateMock.mockResolvedValue({ _id: "conv-d" } as never);

    const res = (await POST(makeRequest(payload))) as unknown as WebhookResponse;

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const update = findOneAndUpdateMock.mock.calls[0][1] as {
      $set: { voiceAgent: Record<string, unknown>; messages?: unknown[] };
    };
    expect(update.$set.voiceAgent.transcript).toBe(
      "USER: What are your prices?\n\nAGENT: Our plans start at twenty-nine dollars."
    );
    expect(update.$set.voiceAgent.transcriptPersisted).toBe(true);
    expect(update.$set.messages).toHaveLength(2);
    expect(eventStore.get("vapi:end-of-call-report:call-derived")?.status).toBe("processed");
  });

  it("treats wrong-typed artifact fields as incomplete without inventing content", async () => {
    const payload = {
      message: {
        type: "end-of-call-report",
        endedReason: "hangup",
        artifact: { transcript: 12345, messages: "not-an-array" }, // wrong types
        call: { id: "call-malformed", duration: 3 },
      },
    };
    findOneMock.mockResolvedValue(null);
    findOneAndUpdateMock.mockResolvedValue({ _id: "conv-m" } as never);

    const res = (await POST(makeRequest(payload))) as unknown as WebhookResponse;

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.incomplete).toBe(true);

    const update = findOneAndUpdateMock.mock.calls[0][1] as {
      $set: { voiceAgent: Record<string, unknown> };
    };
    expect(update.$set.voiceAgent.transcript).toBe("");
    expect(update.$set.voiceAgent.transcriptPersisted).toBe(false);

    // The artifact object exists (artifactPresent=true) but carried no usable
    // content — the diagnostic reports presence only, never the values.
    const diagnostic = logSecurityEventMock.mock.calls[0][0];
    expect(diagnostic.details).toMatchObject({
      reason: "missing_transcript_artifact",
      artifactPresent: true,
    });
    expect(eventStore.get("vapi:end-of-call-report:call-malformed")?.status).toBe("incomplete");
  });

  it("treats a non-object artifact as absent", async () => {
    const payload = {
      message: {
        type: "end-of-call-report",
        endedReason: "hangup",
        artifact: "just-a-string",
        call: { id: "call-string-artifact", duration: 2 },
      },
    };
    findOneMock.mockResolvedValue(null);
    findOneAndUpdateMock.mockResolvedValue({ _id: "conv-sa" } as never);

    const res = (await POST(makeRequest(payload))) as unknown as WebhookResponse;

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.incomplete).toBe(true);

    const diagnostic = logSecurityEventMock.mock.calls[0][0];
    expect(diagnostic.details).toMatchObject({ artifactPresent: false });
    expect(
      eventStore.get("vapi:end-of-call-report:call-string-artifact")?.status
    ).toBe("incomplete");
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
