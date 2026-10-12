import { resolveDograhWidgetUrl, validateDograhWidgetUrl } from "@/lib/dograh-widget";
import { authenticateDograhWebhook, validateDograhWebhookBody } from "@/lib/dograh-webhook";

const validUrl = "https://app.dograh.com/embed/dograh-widget.js?token=redacted";

describe("Dograh widget URL configuration", () => {
  it("accepts a generated Dograh website widget URL", () => {
    expect(validateDograhWidgetUrl(validUrl, { production: true })).toEqual({ valid: true });
  });

  it("rejects the obsolete CDN URL and missing values", () => {
    expect(validateDograhWidgetUrl("https://cdn.dograh.com/widget.js").valid).toBe(false);
    expect(validateDograhWidgetUrl("").valid).toBe(false);
  });

  it("allows local HTTP widget hosts only outside production", () => {
    const localUrl = "http://localhost:3010/embed/dograh-widget.js";
    expect(validateDograhWidgetUrl(localUrl).valid).toBe(true);
    expect(validateDograhWidgetUrl(localUrl, { production: true }).valid).toBe(false);
  });

  it("falls back to a valid environment URL when the database value is invalid", () => {
    expect(resolveDograhWidgetUrl("https://cdn.dograh.com/widget.js", validUrl, { production: true })).toEqual({
      url: validUrl,
      source: "environment",
    });
  });
});

describe("Dograh webhook security", () => {
  const originalSecret = process.env.DOGRAH_WEBHOOK_SECRET;
  const makeRequest = (headers: Record<string, string> = {}) => ({
    headers: { get: (name: string) => headers[name.toLowerCase()] || null },
  } as unknown as Request);

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.DOGRAH_WEBHOOK_SECRET;
    else process.env.DOGRAH_WEBHOOK_SECRET = originalSecret;
  });

  it("fails closed when webhook authentication is not configured", () => {
    delete process.env.DOGRAH_WEBHOOK_SECRET;
    expect(authenticateDograhWebhook(makeRequest()).status).toBe(503);
  });

  it("accepts the configured API key and rejects an invalid key", () => {
    process.env.DOGRAH_WEBHOOK_SECRET = "test-webhook-secret";
    expect(authenticateDograhWebhook(makeRequest({ "x-api-key": "test-webhook-secret" })).ok).toBe(true);
    expect(authenticateDograhWebhook(makeRequest({ "x-api-key": "wrong" })).status).toBe(401);
  });

  it("rejects non-object webhook payloads", () => {
    expect(validateDograhWebhookBody([]).valid).toBe(false);
    expect(validateDograhWebhookBody({ workflow_run_id: 123 }).valid).toBe(true);
  });

  it("rejects oversized webhook payloads", () => {
    expect(validateDograhWebhookBody({ transcript: "x".repeat(1_000_001) }).valid).toBe(false);
  });
});
