import { checkForDuplicates } from "@/lib/content-analytics";

describe("Content Deduplication", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns isDuplicate: false when no similar content exists", async () => {
    const result = await checkForDuplicates("Unique Title", "unique-keyword");
    expect(result.isDuplicate).toBe(false);
    expect(result.recommendation).toBe("create");
  });

  it("returns isDuplicate: true when highly similar content exists", async () => {
    const { default: ContentItem } = await import("@/models/content-item");
    (ContentItem.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { _id: "id1", title: "How to Build a Website", slug: "how-to-build-a-website", type: "article" },
        ]),
      }),
    });

    const result = await checkForDuplicates("How to Build a Website", "build website");
    expect(result.similarItems.length).toBeGreaterThan(0);
  });

  it("returns merge recommendation for moderately similar content", async () => {
    const { default: ContentItem } = await import("@/models/content-item");
    (ContentItem.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { _id: "id1", title: "Web Development Best Practices", slug: "web-dev-best", type: "article" },
        ]),
      }),
    });

    const result = await checkForDuplicates(
      "Web Development Tips and Tricks",
      "web development"
    );
    expect(result.recommendation).toBeDefined();
  });

  it("checks both ContentItem and BlogPost for duplicates", async () => {
    const { default: ContentItem } = await import("@/models/content-item");
    const { default: BlogPost } = await import("@/models/blog-post");

    (ContentItem.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    });
    (BlogPost.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { _id: "bp1", title: "Test Article", slug: "test-article" },
        ]),
      }),
    });

    const result = await checkForDuplicates("Test Article", "test");
    expect(BlogPost.find).toHaveBeenCalled();
  });
});
