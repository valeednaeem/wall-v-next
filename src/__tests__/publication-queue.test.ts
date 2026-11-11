import {
  makeRevision,
  makeIdempotencyKey,
  makeEventKey,
} from "@/lib/social-publisher/idempotency";
import {
  computeBackoffMs,
  claimDueJobs,
  processJob,
  reclaimStaleLeases,
  runSocialQueue,
} from "@/lib/social-publisher/worker";
import {
  processContentEvent,
  cancelOutstandingJobs,
  enqueuePublication,
} from "@/lib/social-publisher/enqueue";
import {
  templatePost,
  clampForPlatform,
  resolvePostContent,
} from "@/lib/social-publisher/post-content";
import type { IPublicationJob } from "@/models/publication-job";
import type { IContentEvent } from "@/models/content-event";

jest.mock("@/lib/mongodb", () => ({
  connectToDatabase: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/models/publication-job", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updateOne: jest.fn(),
    updateMany: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
  },
}));

jest.mock("@/models/content-event", () => ({
  __esModule: true,
  default: {
    findOneAndUpdate: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    updateOne: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock("@/models/socialAccount", () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
  },
}));

jest.mock("@/models/content-item", () => ({
  __esModule: true,
  default: {
    findByIdAndUpdate: jest.fn(),
  },
}));

jest.mock("@/models/content-distribution", () => ({
  __esModule: true,
  default: {
    updateOne: jest.fn(),
  },
}));

jest.mock("@/models/content-execution", () => ({
  __esModule: true,
  default: {
    findByIdAndUpdate: jest.fn(),
  },
}));

jest.mock("@/lib/social-adapters", () => ({
  getAdapter: jest.fn(),
}));

jest.mock("@/lib/content-generator", () => ({
  generateSocialVariants: jest.fn(),
}));

jest.mock("@/lib/pm-notifications", () => ({
  sendNotification: jest.fn(),
}));

import PublicationJob from "@/models/publication-job";
import ContentEvent from "@/models/content-event";
import SocialAccount from "@/models/socialAccount";
import { getAdapter } from "@/lib/social-adapters";
import { generateSocialVariants } from "@/lib/content-generator";
import { sendNotification } from "@/lib/pm-notifications";

const mockPublicationJob = PublicationJob as unknown as Record<string, jest.Mock>;
const mockContentEvent = ContentEvent as unknown as Record<string, jest.Mock>;
const mockSocialAccount = SocialAccount as unknown as Record<string, jest.Mock>;
const mockGetAdapter = getAdapter as unknown as jest.Mock;
const mockGenerateSocialVariants = generateSocialVariants as unknown as jest.Mock;
const mockSendNotification = sendNotification as unknown as jest.Mock;

function makePayload(overrides: Record<string, unknown> = {}) {
  return {
    title: "Test Post",
    content: "Hello world excerpt",
    canonicalPath: "/blog/test-post",
    link: "https://www.wall-v.com/blog/test-post",
    ...overrides,
  };
}

function makeEvent(overrides: Record<string, unknown> = {}): IContentEvent {
  return {
    _id: "event1",
    type: "published",
    contentType: "blog",
    contentId: { toString: () => "656565656565656565656565" },
    revision: "rev123",
    eventKey: "published:blog:656565656565656565656565:rev123",
    payload: makePayload(),
    platforms: ["linkedin"],
    status: "pending",
    attempts: 0,
    ...overrides,
  } as unknown as IContentEvent;
}

function makeJob(overrides: Record<string, unknown> = {}): IPublicationJob {
  return {
    _id: "job1",
    contentType: "blog",
    contentId: { toString: () => "656565656565656565656565" },
    revision: "rev123",
    platform: "linkedin",
    idempotencyKey: "abc123",
    state: "processing",
    payload: makePayload(),
    attempt: 1,
    maxAttempts: 5,
    ...overrides,
  } as unknown as IPublicationJob;
}

describe("Social publishing queue", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SOCIAL_QUEUE_DISABLE_KICK = "1";
    delete process.env.AI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    mockPublicationJob.updateOne.mockResolvedValue({ matchedCount: 1 });
    mockPublicationJob.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    });
    mockSendNotification.mockResolvedValue({ sent: 1, channels: ["in-app"] });
  });

  afterAll(() => {
    delete process.env.SOCIAL_QUEUE_DISABLE_KICK;
  });

  describe("idempotency", () => {
    it("produces the same key for identical content+revision+platform+account", () => {
      const a = makeIdempotencyKey("blog", "id1", "rev1", "linkedin");
      const b = makeIdempotencyKey("blog", "id1", "rev1", "linkedin");
      expect(a).toBe(b);
      expect(a).toHaveLength(32);
    });

    it("differs across platform, revision, content, and account", () => {
      const base = makeIdempotencyKey("blog", "id1", "rev1", "linkedin");
      expect(makeIdempotencyKey("blog", "id1", "rev1", "facebook")).not.toBe(base);
      expect(makeIdempotencyKey("blog", "id1", "rev2", "linkedin")).not.toBe(base);
      expect(makeIdempotencyKey("blog", "id2", "rev1", "linkedin")).not.toBe(base);
      expect(makeIdempotencyKey("blog", "id1", "rev1", "linkedin", "acct1")).not.toBe(base);
    });

    it("revision changes only when publishing fields change", () => {
      const p1 = makePayload();
      const p2 = makePayload();
      expect(makeRevision(p1)).toBe(makeRevision(p2));

      const edited = makePayload({ content: "Changed excerpt" });
      expect(makeRevision(edited)).not.toBe(makeRevision(p1));
    });

    it("builds deterministic event keys", () => {
      expect(makeEventKey("published", "blog", "id1", "rev1")).toBe(
        "published:blog:id1:rev1"
      );
    });
  });

  describe("computeBackoffMs", () => {
    it("is bounded by exponential window with jitter", () => {
      for (let attempt = 1; attempt <= 6; attempt++) {
        const exp = Math.min(60_000 * Math.pow(2, attempt - 1), 3_600_000);
        for (let i = 0; i < 25; i++) {
          const delay = computeBackoffMs(attempt);
          expect(delay).toBeGreaterThanOrEqual(Math.floor(exp / 2));
          expect(delay).toBeLessThanOrEqual(exp);
        }
      }
    });

    it("caps at one hour", () => {
      const delay = computeBackoffMs(50);
      expect(delay).toBeLessThanOrEqual(3_600_000);
      expect(delay).toBeGreaterThanOrEqual(1_800_000);
    });
  });

  describe("processContentEvent", () => {
    it("creates jobs idempotently with deterministic keys", async () => {
      const event = makeEvent();
      mockPublicationJob.findOne.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });
      mockPublicationJob.create.mockResolvedValue({});
      mockPublicationJob.updateMany.mockResolvedValue({ modifiedCount: 0 });

      const result = await processContentEvent(event);

      expect(result.created).toBe(1);
      expect(result.existing).toBe(0);
      expect(mockPublicationJob.create).toHaveBeenCalledTimes(1);
      const created = mockPublicationJob.create.mock.calls[0][0];
      expect(created.state).toBe("pending");
      expect(created.idempotencyKey).toBe(
        makeIdempotencyKey(
          "blog",
          "656565656565656565656565",
          "rev123",
          "linkedin"
        )
      );
      expect(mockContentEvent.updateOne).toHaveBeenCalledWith(
        { _id: "event1" },
        expect.objectContaining({
          $set: expect.objectContaining({ status: "processed" }),
        })
      );
    });

    it("does not create a duplicate job when one already exists", async () => {
      const event = makeEvent();
      mockPublicationJob.findOne.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({ _id: "existing" }),
        }),
      });

      const result = await processContentEvent(event);

      expect(result.created).toBe(0);
      expect(result.existing).toBe(1);
      expect(mockPublicationJob.create).not.toHaveBeenCalled();
    });

    it("cancels outstanding jobs for stale revisions before deriving", async () => {
      const event = makeEvent();
      mockPublicationJob.findOne.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({ _id: "existing" }),
        }),
      });
      mockPublicationJob.updateMany.mockResolvedValue({ modifiedCount: 1 });

      const result = await processContentEvent(event);

      expect(result.cancelledStale).toBe(1);
      expect(mockPublicationJob.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          contentType: "blog",
          revision: { $ne: "rev123" },
          state: { $in: ["pending", "retrying"] },
        }),
        expect.objectContaining({
          $set: expect.objectContaining({ state: "cancelled" }),
        })
      );
    });

    it("cancels all outstanding jobs on unpublished events", async () => {
      const event = makeEvent({ type: "unpublished" });
      mockPublicationJob.updateMany.mockResolvedValue({ modifiedCount: 2 });

      const result = await processContentEvent(event);

      expect(result.cancelledStale).toBe(2);
      expect(mockPublicationJob.create).not.toHaveBeenCalled();
      expect(mockPublicationJob.updateMany).toHaveBeenCalledWith(
        {
          contentType: "blog",
          contentId: "656565656565656565656565",
          state: { $in: ["pending", "retrying"] },
        },
        expect.any(Object)
      );
    });

    it("skips when no platforms are configured or connected", async () => {
      const event = makeEvent({ platforms: [] });
      mockSocialAccount.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });

      const result = await processContentEvent(event);

      expect(result.created).toBe(0);
      expect(result.skippedReason).toBe("No connected social accounts");
      expect(mockContentEvent.updateOne).toHaveBeenCalledWith(
        { _id: "event1" },
        expect.objectContaining({
          $set: expect.objectContaining({ status: "skipped" }),
        })
      );
      expect(mockPublicationJob.create).not.toHaveBeenCalled();
    });
  });

  describe("enqueuePublication", () => {
    it("reports existing jobs when the event was already processed", async () => {
      mockContentEvent.findOneAndUpdate.mockResolvedValue(
        makeEvent({ status: "processed" })
      );
      mockPublicationJob.countDocuments.mockResolvedValue(1);

      const result = await enqueuePublication({
        type: "published",
        contentType: "blog",
        contentId: "656565656565656565656565",
        payload: makePayload(),
        platforms: ["linkedin"],
      });

      expect(result.created).toBe(0);
      expect(result.existing).toBe(1);
      expect(result.skippedReason).toBe("Event already processed");
      expect(mockPublicationJob.create).not.toHaveBeenCalled();
    });

    it("derives jobs and kicks the queue for a fresh event", async () => {
      mockContentEvent.findOneAndUpdate.mockResolvedValue(
        makeEvent({ status: "pending" })
      );
      mockPublicationJob.findOne.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });
      mockPublicationJob.create.mockResolvedValue({});
      mockPublicationJob.updateMany.mockResolvedValue({ modifiedCount: 0 });

      const result = await enqueuePublication({
        type: "published",
        contentType: "blog",
        contentId: "656565656565656565656565",
        payload: makePayload(),
        platforms: ["linkedin"],
      });

      expect(result.created).toBe(1);
      expect(result.existing).toBe(0);
      expect(mockPublicationJob.create).toHaveBeenCalledTimes(1);
    });
  });

  describe("cancelOutstandingJobs", () => {
    it("cancels only pending and retrying jobs", async () => {
      mockPublicationJob.updateMany.mockResolvedValue({ modifiedCount: 3 });

      const count = await cancelOutstandingJobs("blog", "abc");

      expect(count).toBe(3);
      expect(mockPublicationJob.updateMany).toHaveBeenCalledWith(
        {
          contentType: "blog",
          contentId: "abc",
          state: { $in: ["pending", "retrying"] },
        },
        expect.objectContaining({
          $set: expect.objectContaining({ state: "cancelled" }),
        })
      );
    });
  });

  describe("crash recovery & admin notifications", () => {
    it("retries stale crashed jobs while attempts remain, without notifying", async () => {
      mockPublicationJob.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });
      mockPublicationJob.updateMany.mockResolvedValue({ modifiedCount: 2 });

      const count = await reclaimStaleLeases();

      expect(count).toBe(2);
      expect(mockPublicationJob.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ state: "processing" }),
        expect.objectContaining({
          $set: expect.objectContaining({ state: "retrying" }),
        })
      );
      expect(mockSendNotification).not.toHaveBeenCalled();
    });

    it("fails a crashed job that exhausted attempts and notifies admins", async () => {
      const stale = makeJob({
        state: "processing",
        attempt: 5,
        maxAttempts: 5,
        leaseUntil: new Date(Date.now() - 5000),
      });
      mockPublicationJob.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([stale]),
      });
      mockPublicationJob.updateMany.mockResolvedValue({ modifiedCount: 0 });

      const count = await reclaimStaleLeases();

      expect(count).toBe(1);
      expect(mockPublicationJob.updateOne).toHaveBeenCalledWith(
        { _id: "job1", state: { $in: ["processing", "retrying"] } },
        expect.objectContaining({
          $set: expect.objectContaining({
            state: "failed",
            errorCode: "exhausted",
          }),
        })
      );
      expect(mockSendNotification).toHaveBeenCalledTimes(1);
      expect(mockSendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "error",
          link: "/dashboard/content/queue",
        })
      );
    });

    it("notifies admins when a job fails permanently (attempts exhausted)", async () => {
      mockGetAdapter.mockReturnValue({
        isConnected: jest.fn().mockResolvedValue(true),
        publish: jest
          .fn()
          .mockResolvedValue({
            success: false,
            platform: "linkedin",
            error: "boom",
          }),
      });

      const job = makeJob({ state: "processing", attempt: 5, maxAttempts: 5 });
      const finalState = await processJob(job);

      expect(finalState).toBe("failed");
      expect(mockSendNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: "error" })
      );
    });

    it("notifies admins when a job needs review (platform not connected)", async () => {
      mockGetAdapter.mockReturnValue({
        isConnected: jest.fn().mockResolvedValue(false),
        publish: jest.fn(),
      });

      const job = makeJob({ state: "processing", attempt: 1 });
      const finalState = await processJob(job);

      expect(finalState).toBe("needs_review");
      expect(mockSendNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: "warning" })
      );
    });

    it("stops retrying a repeatedly crashing job and informs admins", async () => {
      const crashing = makeJob({
        state: "processing",
        attempt: 5,
        maxAttempts: 5,
      });

      mockContentEvent.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([]),
        }),
      });
      mockPublicationJob.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });
      mockPublicationJob.updateMany.mockResolvedValue({ modifiedCount: 0 });
      mockPublicationJob.findOneAndUpdate
        .mockResolvedValueOnce(crashing)
        .mockResolvedValue(null);
      // First finalize attempt (needs_review) hits a DB error → processJob
      // throws → runSocialQueue crash handler sees attempts exhausted.
      mockPublicationJob.updateOne
        .mockRejectedValueOnce(new Error("db write failed"))
        .mockResolvedValue({ matchedCount: 1 });
      mockGetAdapter.mockReturnValue({
        isConnected: jest.fn().mockResolvedValue(false),
        publish: jest.fn(),
      });

      const stats = await runSocialQueue();

      expect(stats.failed).toBe(1);
      expect(stats.errors).toBe(1);
      expect(mockPublicationJob.updateOne).toHaveBeenLastCalledWith(
        { _id: "job1", state: "processing" },
        expect.objectContaining({
          $set: expect.objectContaining({ state: "failed" }),
        })
      );
      expect(mockSendNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: "error" })
      );
    });
  });

  describe("claimDueJobs", () => {
    it("returns an empty list when nothing is due", async () => {
      mockPublicationJob.findOneAndUpdate.mockResolvedValue(null);

      const jobs = await claimDueJobs(5);

      expect(jobs).toEqual([]);
      expect(mockPublicationJob.findOneAndUpdate).toHaveBeenCalledTimes(1);
      const filter = mockPublicationJob.findOneAndUpdate.mock.calls[0][0];
      expect(filter.state).toEqual({ $in: ["pending", "retrying"] });
      expect(filter.nextAttemptAt).toHaveProperty("$lte");
    });
  });

  describe("processJob", () => {
    it("moves to needs_review when the platform is not connected", async () => {
      mockGetAdapter.mockReturnValue({
        isConnected: jest.fn().mockResolvedValue(false),
        publish: jest.fn(),
      });

      const state = await processJob(makeJob());

      expect(state).toBe("needs_review");
      expect(mockPublicationJob.updateOne).toHaveBeenCalledWith(
        { _id: "job1", state: "processing" },
        expect.objectContaining({
          $set: expect.objectContaining({
            state: "needs_review",
            errorCode: "requires_auth",
          }),
        })
      );
    });

    it("publishes successfully using provided payload content", async () => {
      mockGetAdapter.mockReturnValue({
        isConnected: jest.fn().mockResolvedValue(true),
        publish: jest.fn().mockResolvedValue({
          success: true,
          platform: "linkedin",
          platformPostId: "li-1",
          platformUrl: "https://linkedin.com/post/1",
          publishedAt: new Date(),
        }),
      });

      const state = await processJob(makeJob());

      expect(state).toBe("published");
      const update = mockPublicationJob.updateOne.mock.calls[0][1];
      expect(update.$set.state).toBe("published");
      expect(update.$set.platformPostId).toBe("li-1");
      expect(update.$set.generatedBy).toBe("template");
    });

    it("retries with backoff on provider errors", async () => {
      mockGetAdapter.mockReturnValue({
        isConnected: jest.fn().mockResolvedValue(true),
        publish: jest.fn().mockResolvedValue({
          success: false,
          platform: "linkedin",
          error: "server exploded",
        }),
      });

      const state = await processJob(makeJob({ attempt: 1, maxAttempts: 5 }));

      expect(state).toBe("retrying");
      const update = mockPublicationJob.updateOne.mock.calls[0][1];
      expect(update.$set.state).toBe("retrying");
      expect(update.$set.errorCode).toBe("provider_error");
      expect(update.$set.nextAttemptAt).toBeInstanceOf(Date);
      expect(update.$set.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());
    });

    it("retries on rate limits without consuming the terminal state", async () => {
      mockGetAdapter.mockReturnValue({
        isConnected: jest.fn().mockResolvedValue(true),
        publish: jest.fn().mockResolvedValue({
          success: false,
          platform: "linkedin",
          rateLimited: true,
          error: "429",
        }),
      });

      const state = await processJob(makeJob({ attempt: 2, maxAttempts: 5 }));

      expect(state).toBe("retrying");
      const update = mockPublicationJob.updateOne.mock.calls[0][1];
      expect(update.$set.errorCode).toBe("rate_limited");
    });

    it("fails permanently once attempts are exhausted", async () => {
      mockGetAdapter.mockReturnValue({
        isConnected: jest.fn().mockResolvedValue(true),
        publish: jest.fn().mockResolvedValue({
          success: false,
          platform: "linkedin",
          error: "always down",
        }),
      });

      const state = await processJob(makeJob({ attempt: 5, maxAttempts: 5 }));

      expect(state).toBe("failed");
      const update = mockPublicationJob.updateOne.mock.calls[0][1];
      expect(update.$set.state).toBe("failed");
      expect(update.$set.errorCode).toBe("exhausted");
      expect(update.$set.error).toContain("after 5 attempts");
    });

    it("moves to needs_review when the adapter signals requiresAuth", async () => {
      mockGetAdapter.mockReturnValue({
        isConnected: jest.fn().mockResolvedValue(true),
        publish: jest.fn().mockResolvedValue({
          success: false,
          platform: "linkedin",
          requiresAuth: true,
          error: "token revoked",
        }),
      });

      const state = await processJob(makeJob());

      expect(state).toBe("needs_review");
      const update = mockPublicationJob.updateOne.mock.calls[0][1];
      expect(update.$set.errorCode).toBe("requires_auth");
    });

    it("uses per-platform variants when provided", async () => {
      const publish = jest.fn().mockResolvedValue({
        success: true,
        platform: "linkedin",
        publishedAt: new Date(),
      });
      mockGetAdapter.mockReturnValue({
        isConnected: jest.fn().mockResolvedValue(true),
        publish,
      });

      await processJob(
        makeJob({
          payload: makePayload({
            variants: {
              linkedin: { content: "LinkedIn specific text", hashtags: ["AI"] },
            },
          }),
        })
      );

      expect(publish).toHaveBeenCalledWith(
        expect.objectContaining({
          content: "LinkedIn specific text",
          hashtags: ["AI"],
        })
      );
    });
  });

  describe("content generation fallback", () => {
    it("clampForPlatform truncates X posts to 280 chars", () => {
      const long = "word ".repeat(100);
      const clamped = clampForPlatform(long, "x");
      expect(clamped.length).toBeLessThanOrEqual(280);
      expect(clamped.endsWith("…")).toBe(true);
    });

    it("templatePost builds deterministic text with canonical link and hashtags", () => {
      const post = templatePost(makePayload(), "linkedin");
      expect(post.generatedBy).toBe("template");
      expect(post.content).toContain("Hello world excerpt");
      expect(post.content).toContain("https://www.wall-v.com/blog/test-post");
      expect(post.hashtags).toContain("WallV");
    });

    it("resolvePostContent falls back to the template when AI is unavailable", async () => {
      mockGenerateSocialVariants.mockRejectedValue(new Error("no credits"));

      const result = await resolvePostContent(
        { _id: "job1", platform: "linkedin" },
        makePayload()
      );

      expect(result.generatedBy).toBe("template");
      expect(result.content).toContain("Hello world excerpt");
      expect(mockPublicationJob.updateOne).not.toHaveBeenCalled();
    });

    it("resolvePostContent uses provided variants without AI", async () => {
      const result = await resolvePostContent(
        { _id: "job1", platform: "linkedin" },
        makePayload({
          variants: { linkedin: { content: "Provided text", hashtags: ["X"] } },
        })
      );

      expect(result.generatedBy).toBe("provided");
      expect(result.content).toBe("Provided text");
      expect(mockGenerateSocialVariants).not.toHaveBeenCalled();
    });

    it("resolvePostContent persists AI-generated variants for retry reuse", async () => {
      process.env.AI_API_KEY = "test-key";
      mockGenerateSocialVariants.mockResolvedValue([
        { platform: "linkedin", content: "AI text", hashtags: ["#AI"] },
      ]);

      const result = await resolvePostContent(
        { _id: "job1", platform: "linkedin" },
        makePayload()
      );

      expect(result.generatedBy).toBe("ai");
      expect(result.content).toBe("AI text");
      expect(mockPublicationJob.updateOne).toHaveBeenCalledWith(
        { _id: "job1" },
        expect.objectContaining({
          $set: expect.objectContaining({
            generatedBy: "ai",
            "payload.variants.linkedin": {
              content: "AI text",
              hashtags: ["#AI"],
            },
          }),
        })
      );
      delete process.env.AI_API_KEY;
    });
  });
});
