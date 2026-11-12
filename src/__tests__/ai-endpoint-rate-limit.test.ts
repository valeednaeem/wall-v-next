/**
 * Rate-limit regression tests for the public AI endpoints (Fix B).
 *
 * Guards: anonymous quotas (within + over limit), authenticated staff having
 * their OWN quota (never the anonymous IP quota), rejection occurring BEFORE
 * any LLM/tool execution, a consistent 429 response with retry info, and
 * independent quotas per endpoint. Uses the REAL @/lib/security store.
 */
import { POST as executePost } from "@/app/api/ai/execute/route";
import { POST as unifiedPost } from "@/app/api/ai/unified-chat/route";
import { getAuthUser } from "@/lib/auth";
import { orchestrateConversation } from "@/lib/conversation-agent";
import { processRequest } from "@/lib/unified-request-processor";

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

jest.mock("@/lib/auth", () => ({
  getAuthUser: jest.fn().mockResolvedValue(null),
}));

jest.mock("@/lib/conversation-agent", () => ({
  orchestrateConversation: jest.fn(),
  createVisitorState: jest.fn().mockReturnValue({}),
}));

jest.mock("@/lib/unified-request-processor", () => ({
  processRequest: jest.fn(),
}));

jest.mock("@/models/project", () => ({
  __esModule: true,
  default: { findOne: jest.fn(), create: jest.fn() },
}));

jest.mock("@/models/client", () => ({
  __esModule: true,
  default: { findOne: jest.fn(), create: jest.fn() },
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

interface ApiResponse {
  status: number;
  body: Record<string, unknown>;
  headers: Record<string, string>;
}

function aiRequest(ip: string, body: Record<string, unknown>): Request {
  const bodyText = JSON.stringify(body);
  return {
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "x-forwarded-for" ? ip : name.toLowerCase() === "content-length" ? String(bodyText.length) : null,
    },
    json: async () => JSON.parse(bodyText),
  } as unknown as Request;
}

const getAuthUserMock = jest.mocked(getAuthUser);
const orchestrateMock = jest.mocked(orchestrateConversation);
const processRequestMock = jest.mocked(processRequest);

const ORCHESTRATE_RESULT = {
  response: "Hello!",
  visitorState: {},
  toolCallsMade: [],
  conversationId: "conv-x",
  executionId: "exec-x",
  duration: 5,
  requiresProject: false,
  requiresConfirmation: false,
};

const PROCESS_RESULT = {
  success: true,
  response: "Hi there",
  classified: false,
  capability: null,
  agent: null,
  conversationId: "conv-u",
  requiresConfirmation: false,
};

const BODY = { message: "hello" };

beforeEach(() => {
  jest.clearAllMocks();
  getAuthUserMock.mockResolvedValue(null);
  orchestrateMock.mockResolvedValue(ORCHESTRATE_RESULT as never);
  processRequestMock.mockResolvedValue(PROCESS_RESULT as never);
});

async function callExecute(ip: string): Promise<ApiResponse> {
  return (await executePost(aiRequest(ip, BODY) as never)) as unknown as ApiResponse;
}

async function callUnified(ip: string): Promise<ApiResponse> {
  return (await unifiedPost(aiRequest(ip, BODY) as never)) as unknown as ApiResponse;
}

// ─── /api/ai/execute ────────────────────────────────────────────────────────

describe("POST /api/ai/execute — anonymous rate limiting", () => {
  it("allows anonymous requests within the limit", async () => {
    for (let i = 0; i < 10; i++) {
      const res = await callExecute("198.51.100.10");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    }
    expect(orchestrateMock).toHaveBeenCalledTimes(10);
  });

  it("rejects the anonymous request over the limit with 429 before any LLM/tool execution", async () => {
    // Within limit.
    for (let i = 0; i < 10; i++) {
      expect((await callExecute("198.51.100.11")).status).toBe(200);
    }
    expect(orchestrateMock).toHaveBeenCalledTimes(10);

    // Over the limit.
    const blocked = await callExecute("198.51.100.11");
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toBe("Too many requests. Please try again later.");
    expect(typeof blocked.body.retryAfterSeconds).toBe("number");
    expect(blocked.body.retryAfterSeconds as number).toBeGreaterThanOrEqual(1);
    expect(blocked.headers["Retry-After"]).toBe(String(blocked.body.retryAfterSeconds));

    // Rejection happened BEFORE orchestration (LLM/tools/emails).
    expect(orchestrateMock).toHaveBeenCalledTimes(10);
  });
});

describe("POST /api/ai/execute — authenticated staff", () => {
  it("gives staff their own per-user quota, independent of the anonymous IP quota", async () => {
    // Exhaust the anonymous quota for this IP first.
    for (let i = 0; i < 10; i++) {
      expect((await callExecute("198.51.100.12")).status).toBe(200);
    }
    expect((await callExecute("198.51.100.12")).status).toBe(429);
    expect(orchestrateMock).toHaveBeenCalledTimes(10); // 429 never reaches orchestration

    // Same IP, but authenticated → keyed by userId → still allowed.
    getAuthUserMock.mockResolvedValue({ userId: "staff-exec-1", role: "admin" } as never);
    const staff = await callExecute("198.51.100.12");
    expect(staff.status).toBe(200);
    expect(orchestrateMock).toHaveBeenCalledTimes(11);

    // Staff quota (30/min) is independent: further staff calls stay allowed.
    for (let i = 0; i < 18; i++) {
      expect((await callExecute("198.51.100.12")).status).toBe(200);
    }
    // 1 + 18 = 19 of 30 used → one more still allowed.
    expect((await callExecute("198.51.100.12")).status).toBe(200);
    expect(orchestrateMock).toHaveBeenCalledTimes(30);
  });
});

// ─── /api/ai/unified-chat ───────────────────────────────────────────────────

describe("POST /api/ai/unified-chat — anonymous rate limiting", () => {
  it("allows anonymous requests within its own limit (15/min)", async () => {
    for (let i = 0; i < 15; i++) {
      const res = await callUnified("198.51.100.20");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    }
    expect(processRequestMock).toHaveBeenCalledTimes(15);
  });

  it("rejects the anonymous request over the limit with 429 before processing", async () => {
    for (let i = 0; i < 15; i++) {
      expect((await callUnified("198.51.100.21")).status).toBe(200);
    }
    expect(processRequestMock).toHaveBeenCalledTimes(15);

    const blocked = await callUnified("198.51.100.21");
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toBe("Too many requests. Please try again later.");
    expect(typeof blocked.body.retryAfterSeconds).toBe("number");
    expect(blocked.headers["Retry-After"]).toBe(String(blocked.body.retryAfterSeconds));

    // Rejected BEFORE processRequest (LLM classification/response).
    expect(processRequestMock).toHaveBeenCalledTimes(15);
  });

  it("keeps authenticated staff on their own quota for this endpoint too", async () => {
    for (let i = 0; i < 15; i++) {
      expect((await callUnified("198.51.100.22")).status).toBe(200);
    }
    expect((await callUnified("198.51.100.22")).status).toBe(429);

    getAuthUserMock.mockResolvedValue({ userId: "staff-unified-1", role: "manager" } as never);
    const staff = await callUnified("198.51.100.22");
    expect(staff.status).toBe(200);
    expect(processRequestMock).toHaveBeenCalledTimes(16);
  });
});

// ─── Endpoint isolation ─────────────────────────────────────────────────────

describe("rate-limit quotas are distinct per endpoint", () => {
  it("exhausting /api/ai/execute does not block /api/ai/unified-chat from the same IP", async () => {
    for (let i = 0; i < 11; i++) {
      await callExecute("198.51.100.30"); // last one → 429
    }
    const executeBlocked = await callExecute("198.51.100.30");
    expect(executeBlocked.status).toBe(429);

    const unified = await callUnified("198.51.100.30");
    expect(unified.status).toBe(200);
    expect(unified.body.success).toBe(true);
  });
});
