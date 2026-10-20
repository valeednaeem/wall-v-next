import {
  VAPI_PUBLIC_KEY_ENV,
  VAPI_ASSISTANT_ID_ENV,
  getVapiPublicKey,
  resolveVapiAssistantId,
  isServerVapiConfigured,
  validateVapiConfig,
} from "@/lib/vapi-config";

describe("vapi-config", () => {
  const originalPublicKey = process.env[VAPI_PUBLIC_KEY_ENV];
  const originalAssistantId = process.env[VAPI_ASSISTANT_ID_ENV];

  afterAll(() => {
    if (originalPublicKey === undefined) delete process.env[VAPI_PUBLIC_KEY_ENV];
    else process.env[VAPI_PUBLIC_KEY_ENV] = originalPublicKey;
    if (originalAssistantId === undefined) delete process.env[VAPI_ASSISTANT_ID_ENV];
    else process.env[VAPI_ASSISTANT_ID_ENV] = originalAssistantId;
  });

  beforeEach(() => {
    delete process.env[VAPI_PUBLIC_KEY_ENV];
    delete process.env[VAPI_ASSISTANT_ID_ENV];
  });

  describe("getVapiPublicKey", () => {
    it("returns empty string when not configured", () => {
      expect(getVapiPublicKey()).toBe("");
    });

    it("reads and trims the public key from env", () => {
      process.env[VAPI_PUBLIC_KEY_ENV] = "  pk-test-123  ";
      expect(getVapiPublicKey()).toBe("pk-test-123");
    });
  });

  describe("resolveVapiAssistantId", () => {
    it("returns trimmed settings value", () => {
      expect(resolveVapiAssistantId("  asst_abc  ")).toBe("asst_abc");
    });

    it("returns empty string for null/undefined/blank", () => {
      expect(resolveVapiAssistantId(null)).toBe("");
      expect(resolveVapiAssistantId(undefined)).toBe("");
      expect(resolveVapiAssistantId("   ")).toBe("");
      expect(resolveVapiAssistantId(42 as unknown as string)).toBe("");
    });
  });

  describe("isServerVapiConfigured", () => {
    it("is false when VAPI_ASSISTANT_ID is absent", () => {
      expect(isServerVapiConfigured()).toBe(false);
    });

    it("is true when VAPI_ASSISTANT_ID is present", () => {
      process.env[VAPI_ASSISTANT_ID_ENV] = "asst_abc";
      expect(isServerVapiConfigured()).toBe(true);
    });
  });

  describe("validateVapiConfig", () => {
    it("rejects a missing public key", () => {
      const result = validateVapiConfig({ publicKey: "", assistantId: "asst_abc" });
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/public key/i);
    });

    it("rejects a public key containing whitespace", () => {
      const result = validateVapiConfig({ publicKey: "pk with space", assistantId: "asst_abc" });
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/invalid/i);
    });

    it("rejects a missing assistant ID", () => {
      const result = validateVapiConfig({ publicKey: "pk-test-123", assistantId: "  " });
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/assistant ID/i);
    });

    it("accepts a complete configuration", () => {
      const result = validateVapiConfig({ publicKey: "pk-test-123", assistantId: "asst_abc" });
      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("treats missing fields as unconfigured rather than throwing", () => {
      const result = validateVapiConfig({});
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/not configured/i);
    });
  });
});
