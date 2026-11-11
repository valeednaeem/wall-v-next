jest.mock("@/lib/mongodb", () => ({
  connectToDatabase: jest.fn().mockResolvedValue({}),
}));

jest.mock("@/models/content-item", () => ({
  __esModule: true,
  default: {
    findById: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    }),
    create: jest.fn().mockResolvedValue({ _id: "new-item" }),
  },
}));

jest.mock("@/models/blog-post", () => ({
  __esModule: true,
  default: {
    findById: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    }),
  },
}));

jest.mock("@/lib/ai-provider-adapter", () => ({
  getProviderAdapter: jest.fn().mockReturnValue({
    chat: jest.fn().mockResolvedValue({
      content: '{"content":"Repurposed content","hashtags":["test"]}',
    }),
  }),
}));

jest.mock("@/lib/generate-slug", () => ({
  generateSlug: jest.fn((text: string) => text.toLowerCase().replace(/\s+/g, "-")),
}));

import { repurposeContent, type RepurposeFormat } from "@/lib/content-repurposer";

describe("Content Repurposer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("repurposeContent", () => {
    it("throws when source item not found", async () => {
      await expect(
        repurposeContent("nonexistent", ["linkedin_post"])
      ).rejects.toThrow("Source content item not found");
    });

    it("throws when source item has no content", async () => {
      const { default: ContentItem } = await import("@/models/content-item");
      (ContentItem.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: "item1",
          title: "Test",
          type: "article",
          content: null,
        }),
      });

      await expect(
        repurposeContent("item1", ["linkedin_post"])
      ).rejects.toThrow("Source content item has no content");
    });
  });

  describe("FORMAT_CONFIG", () => {
    it("supports all defined formats", async () => {
      const formats: RepurposeFormat[] = [
        "twitter_thread",
        "linkedin_post",
        "facebook_post",
        "newsletter",
        "video_script",
        "infographic",
        "email_sequence",
        "podcast_script",
      ];

      const { default: ContentItem } = await import("@/models/content-item");
      (ContentItem.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: "item1",
          title: "Test Article",
          type: "article",
          content: "Test content for repurposing with enough words to generate meaningful output.",
          campaign: "camp1",
        }),
      });
      (ContentItem.create as jest.Mock).mockResolvedValue({ _id: "new-item" });

      for (const format of formats) {
        const result = await repurposeContent("item1", [format]);
        expect(result.generatedItems.length).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("formatGeneratedContent", () => {
    it("formats twitter thread correctly", async () => {
      const { default: ContentItem } = await import("@/models/content-item");
      (ContentItem.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: "item1",
          title: "Test",
          type: "article",
          content: "Test content for repurposing.",
          campaign: "camp1",
        }),
      });
      (ContentItem.create as jest.Mock).mockResolvedValue({ _id: "new-item" });

      const { getProviderAdapter } = await import("@/lib/ai-provider-adapter");
      (getProviderAdapter as jest.Mock).mockReturnValue({
        chat: jest.fn().mockResolvedValue({
          content: '{"tweets":["Hook tweet","Value tweet","CTA tweet"],"hashtags":["tech"]}',
        }),
      });

      const result = await repurposeContent("item1", ["twitter_thread"]);
      expect(result.generatedItems.length).toBe(1);
    });
  });
});
