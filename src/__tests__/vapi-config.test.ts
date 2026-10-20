import {
  VAPI_PUBLIC_KEY_ENV,
  VAPI_ASSISTANT_ID_ENV,
  VAPI_WEBHOOK_SECRET_ENV,
  getVapiPublicKey,
  resolveVapiAssistantId,
  isServerVapiConfigured,
  validateVapiConfig,
  normalizeVoiceProvider,
  resolvePublicVoiceVapiConfig,
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

  describe("normalizeVoiceProvider (provider flag, D1)", () => {
    it("defaults every unknown/absent value to dograh so Vapi can never silently enable", () => {
      expect(normalizeVoiceProvider(undefined)).toBe("dograh");
      expect(normalizeVoiceProvider(null)).toBe("dograh");
      expect(normalizeVoiceProvider("")).toBe("dograh");
      expect(normalizeVoiceProvider("dograh")).toBe("dograh");
      expect(normalizeVoiceProvider("VAPI")).toBe("dograh"); // case-sensitive
      expect(normalizeVoiceProvider("vapi ")).toBe("dograh"); // no trim-matching
      expect(normalizeVoiceProvider(1)).toBe("dograh");
      expect(normalizeVoiceProvider({})).toBe("dograh");
    });

    it("accepts only the exact string vapi", () => {
      expect(normalizeVoiceProvider("vapi")).toBe("vapi");
    });
  });

  describe("resolvePublicVoiceVapiConfig (public settings view)", () => {
    it("returns provider=dograh and unconfigured when nothing is set", () => {
      const result = resolvePublicVoiceVapiConfig({});
      expect(result.provider).toBe("dograh");
      expect(result.vapiConfigured).toBe(false);
      expect(result.vapiConfigError).toMatch(/public key/i);
      expect(result.vapiAssistantId).toBe("");
    });

    it("reports assistant ID missing when only the public key exists", () => {
      process.env[VAPI_PUBLIC_KEY_ENV] = "pk_test_wallv";
      const result = resolvePublicVoiceVapiConfig({ provider: "vapi", vapiAssistantId: "" });
      expect(result.provider).toBe("vapi");
      expect(result.vapiConfigured).toBe(false);
      expect(result.vapiConfigError).toMatch(/assistant ID/i);
    });

    it("uses settings assistant ID and falls back to VAPI_ASSISTANT_ID env", () => {
      process.env[VAPI_PUBLIC_KEY_ENV] = "pk_test_wallv";
      process.env[VAPI_ASSISTANT_ID_ENV] = "asst_from_env";
      // settings value wins over env
      expect(
        resolvePublicVoiceVapiConfig({ provider: "vapi", vapiAssistantId: " asst_from_settings " }).vapiAssistantId
      ).toBe("asst_from_settings");
      // blank settings value falls back to env
      expect(
        resolvePublicVoiceVapiConfig({ provider: "vapi", vapiAssistantId: "   " }).vapiAssistantId
      ).toBe("asst_from_env");
      delete process.env[VAPI_ASSISTANT_ID_ENV];
    });

    it("reports fully configured when both public key and assistant ID are present", () => {
      process.env[VAPI_PUBLIC_KEY_ENV] = "pk_test_wallv";
      const result = resolvePublicVoiceVapiConfig({ provider: "vapi", vapiAssistantId: "asst_ok" });
      expect(result).toEqual({
        provider: "vapi",
        vapiAssistantId: "asst_ok",
        vapiConfigured: true,
        vapiConfigError: "",
      });
    });

    it("never leaks the private webhook secret into the public view", () => {
      process.env[VAPI_PUBLIC_KEY_ENV] = "pk_test_wallv";
      process.env[VAPI_WEBHOOK_SECRET_ENV] = "super-secret-webhook-value";
      const result = resolvePublicVoiceVapiConfig({ provider: "vapi", vapiAssistantId: "asst_ok" });
      expect(JSON.stringify(result)).not.toContain("super-secret-webhook-value");
      delete process.env[VAPI_WEBHOOK_SECRET_ENV];
    });
  });
});
