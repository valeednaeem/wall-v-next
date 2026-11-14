/**
 * Voice settings API tests — General Settings → Voice Agent Configuration.
 *
 * Guards:
 * - Role matrix: super-admin/admin allowed, unauthorized roles blocked (401/403)
 * - Vapi health diagnostics with dashboard-saved (DB) public-key fallback
 * - Save/load lifecycle: PUT persists voice.* keys, GET returns them
 * - Public projection exposes only browser-required fields — the webhook
 *   secret and server-side credentials are never serialized in any response
 */
import { GET as voiceStatusGet } from "@/app/api/voice/status/route";
import { GET as publicSettingsGet } from "@/app/api/settings/public/route";
import { GET as generalGet, PUT as generalPut } from "@/app/api/settings/general/route";
import { auth } from "@/lib/auth";
import SiteSettings from "@/models/site-settings";

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
  auth: jest.fn(),
  getAuthUser: jest.fn(),
  requireAuth: jest.fn(),
  requireRole: jest.fn(),
}));

jest.mock("@/models/site-settings", () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
}));

jest.mock("@/models/adsense-settings", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
  },
}));

jest.mock("@/lib/site-settings", () => ({
  clearSettingsCache: jest.fn(),
  getSiteSetting: jest.fn(),
  getSiteSettingsByCategory: jest.fn(),
  setSiteSetting: jest.fn(),
}));

const mockAuth = auth as jest.Mock;
const mockFind = SiteSettings.find as jest.Mock;
const mockFindOneAndUpdate = SiteSettings.findOneAndUpdate as jest.Mock;

// ─── Fixtures ───────────────────────────────────────────────────────────────

interface RouteResponse {
  status: number;
  body: Record<string, unknown>;
}

const WEBHOOK_SECRET = "unit-test-server-side-webhook-secret";

const VOICE_DOCS = [
  { key: "voice.provider", category: "voice", value: "dograh" },
  { key: "voice.enabled", category: "voice", value: true },
  { key: "voice.widgetUrl", category: "voice", value: "https://app.dograh.com/embed/dograh-widget.js?token=abc123" },
  { key: "voice.apiUrl", category: "voice", value: "https://dograh.example.com" },
  { key: "voice.vapiAssistantId", category: "voice", value: "asst_test_123" },
  { key: "voice.vapiPublicKey", category: "voice", value: "pk_db_saved_public_key" },
  { key: "voice.vapiFirstMessage", category: "voice", value: "Hello from Wall-V" },
];

function sessionFor(role: string | null) {
  return role ? { user: { role, id: "u1", email: "t@example.com" } } : null;
}

function makeJsonRequest(payload: unknown): Request {
  return { json: async () => payload } as unknown as Request;
}

beforeAll(() => {
  process.env.VAPI_WEBHOOK_SECRET = WEBHOOK_SECRET;
  process.env.VAPI_SERVER_URL = "https://wall-v.com";
  delete process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
  delete process.env.VAPI_ASSISTANT_ID;
});

afterAll(() => {
  delete process.env.VAPI_WEBHOOK_SECRET;
  delete process.env.VAPI_SERVER_URL;
});

beforeEach(() => {
  jest.clearAllMocks();
  mockFind.mockReturnValue({ lean: jest.fn().mockResolvedValue(VOICE_DOCS) });
  mockFindOneAndUpdate.mockResolvedValue({});
});

// ─── GET /api/voice/status — auth matrix ────────────────────────────────────

describe("GET /api/voice/status — authorization", () => {
  it("returns 401 without a session", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = (await voiceStatusGet()) as unknown as RouteResponse;
    expect(res.status).toBe(401);
  });

  it("returns 403 for unauthorized roles (customer)", async () => {
    mockAuth.mockResolvedValueOnce(sessionFor("customer"));
    const res = (await voiceStatusGet()) as unknown as RouteResponse;
    expect(res.status).toBe(403);
  });

  it("returns 403 for staff role", async () => {
    mockAuth.mockResolvedValueOnce(sessionFor("staff"));
    const res = (await voiceStatusGet()) as unknown as RouteResponse;
    expect(res.status).toBe(403);
  });

  it("returns 200 for admin", async () => {
    mockAuth.mockResolvedValueOnce(sessionFor("admin"));
    const res = (await voiceStatusGet()) as unknown as RouteResponse;
    expect(res.status).toBe(200);
  });

  it("returns 200 for super-admin", async () => {
    mockAuth.mockResolvedValueOnce(sessionFor("super-admin"));
    const res = (await voiceStatusGet()) as unknown as RouteResponse;
    expect(res.status).toBe(200);
  });
});

// ─── GET /api/voice/status — health diagnostics ─────────────────────────────

describe("GET /api/voice/status — diagnostics", () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue(sessionFor("admin"));
  });

  it("reports saved provider and Dograh health", async () => {
    const res = (await voiceStatusGet()) as unknown as RouteResponse;
    const data = (res.body as { data: Record<string, unknown> }).data;
    expect(data.provider).toBe("dograh");
    expect((data.dograh as Record<string, unknown>).widgetUrlConfigured).toBe(true);
    expect((data.vapi as Record<string, unknown>).assistantIdConfigured).toBe(true);
  });

  it("treats the dashboard-saved public key as configured (DB fallback)", async () => {
    const res = (await voiceStatusGet()) as unknown as RouteResponse;
    const vapi = (res.body as { data: { vapi: Record<string, unknown> } }).data.vapi;
    expect(vapi.publicKeyConfigured).toBe(true);
    expect(vapi.configured).toBe(true);
    expect(vapi.webhookSecretConfigured).toBe(true);
    expect(vapi.webhookUrl).toBe("https://wall-v.com/api/webhooks/vapi");
  });

  it("reports missing public key when neither DB nor env provides one", async () => {
    mockFind.mockReturnValue({
      lean: jest.fn().mockResolvedValue(VOICE_DOCS.filter((d) => d.key !== "voice.vapiPublicKey")),
    });
    const res = (await voiceStatusGet()) as unknown as RouteResponse;
    const vapi = (res.body as { data: { vapi: Record<string, unknown> } }).data.vapi;
    expect(vapi.publicKeyConfigured).toBe(false);
    expect(vapi.configured).toBe(false);
  });

  it("never serializes secrets or raw key values (booleans + public URL only)", async () => {
    const res = (await voiceStatusGet()) as unknown as RouteResponse;
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain(WEBHOOK_SECRET);
    expect(serialized).not.toContain("pk_db_saved_public_key");
    expect(serialized).not.toContain("VAPI_WEBHOOK_SECRET");
    // Only the boolean webhookSecretConfigured flag may appear — never a value.
    expect(serialized).not.toMatch(/"webhookSecret"\s*:/);
  });
});

// ─── GET /api/settings/public — browser projection ──────────────────────────

describe("GET /api/settings/public — browser projection", () => {
  it("exposes the resolved public key for the browser SDK (DB value)", async () => {
    const res = (await publicSettingsGet()) as unknown as RouteResponse;
    const voice = (res.body as { data: { voice: Record<string, unknown> } }).data.voice;
    const vapi = voice.vapi as Record<string, unknown>;
    expect(voice.provider).toBe("dograh");
    expect(vapi.publicKey).toBe("pk_db_saved_public_key");
    expect(vapi.publicKeyConfigured).toBe(true);
    expect(vapi.assistantId).toBe("asst_test_123");
  });

  it("falls back to the env public key when no DB value exists", async () => {
    process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY = "pk_env_public_key";
    try {
      mockFind.mockReturnValue({
        lean: jest.fn().mockResolvedValue(VOICE_DOCS.filter((d) => d.key !== "voice.vapiPublicKey")),
      });
      const res = (await publicSettingsGet()) as unknown as RouteResponse;
      const vapi = (res.body as { data: { voice: { vapi: Record<string, unknown> } } }).data.voice.vapi;
      expect(vapi.publicKey).toBe("pk_env_public_key");
      expect(vapi.publicKeyConfigured).toBe(true);
    } finally {
      delete process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
    }
  });

  it("never exposes the webhook secret or server-side credentials", async () => {
    const res = (await publicSettingsGet()) as unknown as RouteResponse;
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain(WEBHOOK_SECRET);
    expect(serialized).not.toContain("VAPI_WEBHOOK_SECRET");
    expect(serialized).not.toContain("VAPI_API_KEY");
    expect(serialized).not.toContain("VAPI_ORGANIZATION_ID");
    expect(serialized).not.toContain("webhookSecret");
    expect(serialized).not.toContain("apiKey");
  });

  it("exposes a combined non-secret 'configured' flag for public widget gating", async () => {
    const res = (await publicSettingsGet()) as unknown as RouteResponse;
    const vapi = (res.body as { data: { voice: { vapi: Record<string, unknown> } } }).data.voice.vapi;
    expect(vapi.assistantIdConfigured).toBe(true);
    expect(vapi.configured).toBe(true);
    expect(typeof vapi.configured).toBe("boolean");
  });

  it("reports configured=false when the assistant ID is missing (public key alone is not enough)", async () => {
    mockFind.mockReturnValue({
      lean: jest.fn().mockResolvedValue(VOICE_DOCS.filter((d) => d.key !== "voice.vapiAssistantId")),
    });
    const res = (await publicSettingsGet()) as unknown as RouteResponse;
    const vapi = (res.body as { data: { voice: { vapi: Record<string, unknown> } } }).data.voice.vapi;
    expect(vapi.assistantId).toBe("");
    expect(vapi.assistantIdConfigured).toBe(false);
    expect(vapi.configured).toBe(false);
  });
});

// ─── GET/PUT /api/settings/general — lifecycle + role matrix ────────────────

describe("GET /api/settings/general — authorization", () => {
  it("returns 401 without a session", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = (await generalGet()) as unknown as RouteResponse;
    expect(res.status).toBe(401);
  });

  it("returns 403 for customer", async () => {
    mockAuth.mockResolvedValueOnce(sessionFor("customer"));
    const res = (await generalGet()) as unknown as RouteResponse;
    expect(res.status).toBe(403);
  });

  it("returns 200 for admin with voice settings incl. vapiPublicKey", async () => {
    mockAuth.mockResolvedValueOnce(sessionFor("admin"));
    const res = (await generalGet()) as unknown as RouteResponse;
    expect(res.status).toBe(200);
    const voice = (res.body as { data: { voice: Record<string, unknown> } }).data.voice;
    expect(voice.provider).toBe("dograh");
    expect(voice.vapiPublicKey).toBe("pk_db_saved_public_key");
    expect(voice.vapiAssistantId).toBe("asst_test_123");
  });

  it("returns 200 for super-admin", async () => {
    mockAuth.mockResolvedValueOnce(sessionFor("super-admin"));
    const res = (await generalGet()) as unknown as RouteResponse;
    expect(res.status).toBe(200);
  });
});

describe("PUT /api/settings/general — voice persistence", () => {
  it("returns 401 without a session and persists nothing", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = (await generalPut(
      makeJsonRequest({ voice: { provider: "vapi" } })
    )) as unknown as RouteResponse;
    expect(res.status).toBe(401);
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it("returns 403 for customer and persists nothing", async () => {
    mockAuth.mockResolvedValueOnce(sessionFor("customer"));
    const res = (await generalPut(
      makeJsonRequest({ voice: { provider: "vapi" } })
    )) as unknown as RouteResponse;
    expect(res.status).toBe(403);
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it("persists provider + public key + assistant ID for admin", async () => {
    mockAuth.mockResolvedValueOnce(sessionFor("admin"));
    const res = (await generalPut(
      makeJsonRequest({
        voice: {
          provider: "vapi",
          enabled: true,
          vapiPublicKey: "pk_new_value",
          vapiAssistantId: "asst_new_value",
        },
      })
    )) as unknown as RouteResponse;

    expect(res.status).toBe(200);
    expect((res.body as { success: boolean }).success).toBe(true);

    const savedKeys = mockFindOneAndUpdate.mock.calls.map(
      ([query]) => (query as { key: string }).key
    );
    expect(savedKeys).toContain("voice.provider");
    expect(savedKeys).toContain("voice.vapiPublicKey");
    expect(savedKeys).toContain("voice.vapiAssistantId");

    const publicKeyCall = mockFindOneAndUpdate.mock.calls.find(
      ([query]) => (query as { key: string }).key === "voice.vapiPublicKey"
    );
    expect(publicKeyCall?.[1]).toMatchObject({ value: "pk_new_value", category: "voice" });
  });

  it("persists provider selection for super-admin (persists after reload)", async () => {
    mockAuth.mockResolvedValueOnce(sessionFor("super-admin"));
    const res = (await generalPut(
      makeJsonRequest({ voice: { provider: "vapi", vapiPublicKey: "pk_super" } })
    )) as unknown as RouteResponse;
    expect(res.status).toBe(200);

    // Reload semantics: GET now returns the saved provider from the same store.
    mockFind.mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        { key: "voice.provider", category: "voice", value: "vapi" },
        { key: "voice.vapiPublicKey", category: "voice", value: "pk_super" },
      ]),
    });
    mockAuth.mockResolvedValueOnce(sessionFor("super-admin"));
    const getRes = (await generalGet()) as unknown as RouteResponse;
    const voice = (getRes.body as { data: { voice: Record<string, unknown> } }).data.voice;
    expect(voice.provider).toBe("vapi");
    expect(voice.vapiPublicKey).toBe("pk_super");
  });
});
