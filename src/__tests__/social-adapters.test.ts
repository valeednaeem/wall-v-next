import { LinkedInAdapter } from "@/lib/social-adapters/linkedin";
import { FacebookAdapter } from "@/lib/social-adapters/facebook";
import { XAdapter } from "@/lib/social-adapters/x";
import { getAdapter, getConnectionStatus } from "@/lib/social-adapters/index";

describe("Social Adapters", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("LinkedIn Adapter", () => {
    it("has correct name", () => {
      const adapter = new LinkedInAdapter();
      expect(adapter.name).toBe("linkedin");
    });

    it("returns false when not connected", async () => {
      const adapter = new LinkedInAdapter();
      const connected = await adapter.isConnected();
      expect(connected).toBe(false);
    });

    it("returns requiresAuth when publishing without connection", async () => {
      const adapter = new LinkedInAdapter();
      const result = await adapter.publish({ content: "Test post" });
      expect(result.success).toBe(false);
      expect(result.requiresAuth).toBe(true);
    });

    it("generates auth URL with correct scopes", () => {
      const adapter = new LinkedInAdapter();
      const url = adapter.getAuthUrl();
      if (url) {
        expect(url).toContain("linkedin.com/oauth");
        expect(url).toContain("w_member_social");
      }
    });
  });

  describe("Facebook Adapter", () => {
    it("has correct name", () => {
      const adapter = new FacebookAdapter();
      expect(adapter.name).toBe("facebook");
    });

    it("returns false when not connected", async () => {
      const adapter = new FacebookAdapter();
      const connected = await adapter.isConnected();
      expect(connected).toBe(false);
    });

    it("returns requiresAuth when publishing without connection", async () => {
      const adapter = new FacebookAdapter();
      const result = await adapter.publish({ content: "Test post" });
      expect(result.success).toBe(false);
      expect(result.requiresAuth).toBe(true);
    });
  });

  describe("X/Twitter Adapter", () => {
    it("has correct name", () => {
      const adapter = new XAdapter();
      expect(adapter.name).toBe("x");
    });

    it("always returns false for isConnected", async () => {
      const adapter = new XAdapter();
      const connected = await adapter.isConnected();
      expect(connected).toBe(false);
    });

    it("returns requiresAuth when publishing", async () => {
      const adapter = new XAdapter();
      const result = await adapter.publish({ content: "Test tweet" });
      expect(result.success).toBe(false);
      expect(result.requiresAuth).toBe(true);
    });
  });

  describe("Adapter Registry", () => {
    it("returns correct adapter for linkedin", () => {
      const adapter = getAdapter("linkedin");
      expect(adapter.name).toBe("linkedin");
    });

    it("returns correct adapter for facebook", () => {
      const adapter = getAdapter("facebook");
      expect(adapter.name).toBe("facebook");
    });

    it("returns correct adapter for x", () => {
      const adapter = getAdapter("x");
      expect(adapter.name).toBe("x");
    });

    it("throws for unknown platform", () => {
      expect(() => getAdapter("unknown")).toThrow("Unknown platform");
    });

    it("caches adapters", () => {
      const a1 = getAdapter("linkedin");
      const a2 = getAdapter("linkedin");
      expect(a1).toBe(a2);
    });
  });

  describe("getConnectionStatus", () => {
    it("returns status for all platforms", async () => {
      const status = await getConnectionStatus();
      expect(status).toHaveProperty("linkedin");
      expect(status).toHaveProperty("facebook");
      expect(status).toHaveProperty("x");
      expect(status).toHaveProperty("instagram");
      expect(status).toHaveProperty("tiktok");
      expect(status).toHaveProperty("youtube");
    });

    it("marks all platforms as disconnected when no accounts exist", async () => {
      const status = await getConnectionStatus();
      for (const platform of Object.values(status)) {
        expect(platform.connected).toBe(false);
      }
    });
  });
});
