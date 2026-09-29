import "@testing-library/jest-dom";
import { TextDecoder, TextEncoder } from "util";

// Never fire the fire-and-forget queue kick from unit tests.
process.env.SOCIAL_QUEUE_DISABLE_KICK = "1";

// jsdom does not provide TextEncoder/TextDecoder — required by mongodb's
// dependency chain (whatwg-url) when tests load mongoose models.
if (typeof globalThis.TextEncoder === "undefined") {
  (globalThis as unknown as { TextEncoder: typeof TextEncoder }).TextEncoder =
    TextEncoder;
}
if (typeof globalThis.TextDecoder === "undefined") {
  (globalThis as unknown as { TextDecoder: typeof TextDecoder }).TextDecoder =
    TextDecoder;
}

jest.mock("@/lib/mongodb", () => ({
  connectToDatabase: jest.fn().mockResolvedValue({ connection: {} }),
}));

jest.mock("@/services/ai", () => ({
  generateContent: jest.fn().mockResolvedValue({ content: "Test content" }),
}));

jest.mock("@/lib/ai-provider-adapter", () => ({
  getProviderAdapter: jest.fn().mockReturnValue({
    chat: jest.fn().mockResolvedValue({ content: '{"score":80,"issues":[],"suggestions":[]}' }),
  }),
}));

jest.mock("@/lib/topic-discovery", () => ({
  discoverTopics: jest.fn().mockResolvedValue([]),
  scoreTopics: jest.fn().mockResolvedValue([]),
  selectBestTopics: jest.fn().mockResolvedValue([]),
}));

jest.mock("@/lib/content-generator", () => ({
  generateArticle: jest.fn().mockResolvedValue({ content: "Test article", excerpt: "Test excerpt", seo: {}, internalLinks: [] }),
  generateSocialVariants: jest.fn().mockResolvedValue([]),
  generateImagePrompt: jest.fn().mockResolvedValue("Test prompt"),
}));

jest.mock("@/lib/content-linking", () => ({
  findInternalLinks: jest.fn().mockResolvedValue([]),
}));

jest.mock("@/lib/generate-slug", () => ({
  generateSlug: jest.fn((text: string) => text.toLowerCase().replace(/\s+/g, "-")),
}));

jest.mock("@/models/content-metric", () => ({
  __esModule: true,
  default: {
    find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) }),
    findOneAndUpdate: jest.fn().mockResolvedValue({}),
    aggregate: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock("@/models/content-item", () => ({
  __esModule: true,
  default: {
    find: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    }),
    findById: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
      populate: jest.fn().mockReturnThis(),
    }),
    findByIdAndUpdate: jest.fn().mockResolvedValue({}),
    create: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock("@/models/blog-post", () => ({
  __esModule: true,
  default: {
    find: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    }),
    findOne: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    }),
    findById: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    }),
  },
}));

jest.mock("@/models/content-campaign", () => ({
  __esModule: true,
  default: {
    findById: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
      populate: jest.fn().mockReturnThis(),
    }),
    findByIdAndUpdate: jest.fn().mockResolvedValue({}),
    create: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock("@/models/content-plan", () => ({
  __esModule: true,
  default: {
    findById: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
      populate: jest.fn().mockReturnThis(),
    }),
    findByIdAndUpdate: jest.fn().mockResolvedValue({}),
    create: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock("@/models/content-topic", () => ({
  __esModule: true,
  default: {
    findById: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    }),
    insertMany: jest.fn().mockResolvedValue([]),
    findByIdAndUpdate: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock("@/models/content-settings", () => ({
  __esModule: true,
  default: {
    find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
    findOneAndUpdate: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock("@/models/socialAccount", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    }),
    updateOne: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock("next/navigation", () => ({
  usePathname: jest.fn().mockReturnValue("/"),
  useSearchParams: jest.fn().mockReturnValue(new URLSearchParams()),
}));

jest.mock("next/script", () => {
  const MockScript = ({ children, ...props }: Record<string, unknown>) => null;
  return { __esModule: true, default: MockScript };
});
