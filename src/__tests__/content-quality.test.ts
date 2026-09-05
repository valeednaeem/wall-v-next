import { calculateOverallScore, seoReview } from "@/lib/content-quality";
import type { IContentItem } from "@/models/content-item";

describe("Content Quality", () => {
  describe("calculateOverallScore", () => {
    it("returns weighted score with factualConfidence having highest weight", () => {
      const score = calculateOverallScore({
        research: 10,
        seo: 10,
        originality: 10,
        factualConfidence: 10,
        readability: 10,
        businessRelevance: 10,
        conversionPotential: 10,
        socialPotential: 10,
        videoPotential: 10,
      });
      expect(score).toBe(10);
    });

    it("returns 0 for all-zero scores", () => {
      const score = calculateOverallScore({
        research: 0,
        seo: 0,
        originality: 0,
        factualConfidence: 0,
        readability: 0,
        businessRelevance: 0,
        conversionPotential: 0,
        socialPotential: 0,
        videoPotential: 0,
      });
      expect(score).toBe(0);
    });

    it("weights factualConfidence at 25%", () => {
      const highFact = calculateOverallScore({
        research: 0,
        seo: 0,
        originality: 0,
        factualConfidence: 10,
        readability: 0,
        businessRelevance: 0,
        conversionPotential: 0,
        socialPotential: 0,
        videoPotential: 0,
      });
      const highSeo = calculateOverallScore({
        research: 0,
        seo: 10,
        originality: 0,
        factualConfidence: 0,
        readability: 0,
        businessRelevance: 0,
        conversionPotential: 0,
        socialPotential: 0,
        videoPotential: 0,
      });
      expect(highFact).toBeGreaterThan(highSeo);
    });

    it("clamps result between 0 and 10", () => {
      const score = calculateOverallScore({
        research: 15,
        seo: 15,
        originality: 15,
        factualConfidence: 15,
        readability: 15,
        businessRelevance: 15,
        conversionPotential: 15,
        socialPotential: 15,
        videoPotential: 15,
      });
      expect(score).toBeLessThanOrEqual(10);
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });

  describe("seoReview", () => {
    const LONG_CONTENT = [
      "## Introduction",
      "",
      "Web development best practices are essential for building modern, performant applications. This comprehensive guide covers the key principles that every developer should follow for web development success in today's competitive landscape.",
      "",
      "## Performance Optimization",
      "",
      "Performance is critical for user experience and SEO. We discuss lazy loading, code splitting, and caching strategies that improve load times significantly for any web development project. These techniques help reduce initial bundle sizes and improve core web vitals metrics that search engines use for ranking.",
      "",
      "When implementing performance optimization for web development, consider using a CDN, optimizing images with modern formats like WebP, and implementing proper caching headers. Server-side rendering and static site generation can also dramatically improve perceived performance for web development projects.",
      "",
      "## Security Considerations",
      "",
      "Security should be a priority in every web development project. Implementing authentication, authorization, and input validation protects against common vulnerabilities like XSS, CSRF, and SQL injection attacks that target web development applications.",
      "",
      "For web development security, always sanitize user inputs, use HTTPS everywhere, implement Content Security Policy headers, and keep dependencies updated. Regular security audits of your web development codebase help identify and fix potential issues before they become exploited.",
      "",
      "## Testing Strategies",
      "",
      "A comprehensive testing strategy includes unit tests, integration tests, and end-to-end tests. Learn how to structure your web development test suite for maximum coverage and reliability across different environments and browsers.",
      "",
      "Effective web development testing requires choosing the right tools for each layer. Unit tests verify individual components, integration tests check API endpoints and database operations, while end-to-end tests simulate real user workflows in web development applications.",
      "",
      "## Conclusion",
      "",
      "Following these web development best practices will help you build better software that scales. Contact us to learn more about our development services and how we can help with your next web development project.",
    ].join("\n");

    const createItem = (overrides: Record<string, unknown> = {}): IContentItem =>
      ({
        title: "Complete Guide to Web Development Best Practices",
        content: LONG_CONTENT,
        type: "article",
        seo: {
          metaTitle: "Complete Guide to Web Development Best Practices",
          metaDescription:
            "Learn essential web development best practices including performance optimization, security considerations, and testing strategies for modern applications.",
          keywords: ["web development"],
        },
        internalLinks: [{ text: "Related article", url: "/blog/related" }],
        ...overrides,
      }) as unknown as IContentItem;

    it("returns high score for well-optimized content", async () => {
      const item = createItem();
      const result = await seoReview(item);
      expect(result.score).toBeGreaterThanOrEqual(50);
      expect(result.passed).toBe(true);
    });

    it("flags missing meta description as critical", async () => {
      const item = createItem({
        seo: {
          metaTitle: "Complete Guide to Web Development Best Practices",
          metaDescription: "",
          keywords: ["web development"],
        },
      });
      const result = await seoReview(item);
      const hasCritical = result.issues.some((i) => i.severity === "critical");
      expect(hasCritical).toBe(true);
    });

    it("warns on short meta title", async () => {
      const item = createItem({
        seo: {
          metaTitle: "Short",
          metaDescription:
            "Learn essential web development best practices including performance optimization, security considerations, and testing strategies for modern applications.",
          keywords: ["web development"],
        },
      });
      const result = await seoReview(item);
      const titleIssue = result.issues.find((i) => i.location === "metaTitle");
      expect(titleIssue).toBeDefined();
    });

    it("warns when primary keyword not in title", async () => {
      const item = createItem({
        title: "An Unrelated Title About Cooking Recipes Here",
        seo: {
          metaTitle: "An Unrelated Title About Cooking Recipes Here",
          metaDescription:
            "Learn essential web development best practices including performance optimization, security considerations, and testing strategies for modern applications.",
          keywords: ["web development"],
        },
      });
      const result = await seoReview(item);
      const keywordIssue = result.issues.find((i) =>
        i.message.includes("not in title")
      );
      expect(keywordIssue).toBeDefined();
    });

    it("deducts score for content too short for articles", async () => {
      const item = createItem({
        content: "Short content.",
        type: "article",
      });
      const result = await seoReview(item);
      expect(result.score).toBeLessThan(80);
    });
  });
});
