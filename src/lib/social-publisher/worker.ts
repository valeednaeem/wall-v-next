import { connectToDatabase } from "@/lib/mongodb";
import PublicationJob, { IPublicationJob } from "@/models/publication-job";
import ContentEvent from "@/models/content-event";
import ContentItem from "@/models/content-item";
import ContentDistribution from "@/models/content-distribution";
import ContentExecution from "@/models/content-execution";
import { getAdapter } from "@/lib/social-adapters";
import type { PublishResult, SocialPost } from "@/lib/social-adapters";
import { processContentEvent } from "./enqueue";
import { resolvePostContent } from "./post-content";
import { notifyPublishAttention } from "./notify";
import type {
  PublicationErrorCode,
  PublicationJobState,
  PublicationPayload,
} from "./types";

const WORKER_ID = `${process.env.VERCEL_REGION || "local"}-${process.pid}`;
const LEASE_MS = 60_000;
const BACKOFF_BASE_MS = 60_000;
const BACKOFF_MAX_MS = 60 * 60_000;
const PENDING_EVENT_LIMIT = 20;
const MAX_EVENT_ATTEMPTS = 10;

/**
 * Bounded exponential backoff with jitter: attempt N waits
 * min(base * 2^(N-1), cap), half fixed + half random.
 */
export function computeBackoffMs(attempt: number): number {
  const safeAttempt = Math.max(1, attempt);
  const exp = Math.min(
    BACKOFF_BASE_MS * Math.pow(2, safeAttempt - 1),
    BACKOFF_MAX_MS
  );
  const half = Math.floor(exp / 2);
  return half + Math.floor(Math.random() * (exp - half));
}

/** Atomically claims due jobs (pending/retrying, nextAttemptAt reached). */
export async function claimDueJobs(limit = 10): Promise<IPublicationJob[]> {
  const now = new Date();
  const jobs: IPublicationJob[] = [];
  for (let i = 0; i < limit; i++) {
    const job = await PublicationJob.findOneAndUpdate(
      {
        state: { $in: ["pending", "retrying"] },
        nextAttemptAt: { $lte: now },
      },
      {
        $set: {
          state: "processing",
          leaseUntil: new Date(now.getTime() + LEASE_MS),
          claimedBy: WORKER_ID,
        },
        $inc: { attempt: 1 },
      },
      { new: true, sort: { nextAttemptAt: 1 } }
    );
    if (!job) break;
    jobs.push(job);
  }
  return jobs;
}

/**
 * Returns crashed/stale processing jobs to the retry pool.
 * Jobs that crashed repeatedly until their attempts were exhausted are moved
 * to `failed` and admins are notified instead of retrying forever.
 */
export async function reclaimStaleLeases(): Promise<number> {
  const now = new Date();

  // 1. Exhausted jobs (crash loop or repeated provider failures) → failed.
  const exhausted = await PublicationJob.find({
    state: { $in: ["processing", "retrying"] },
    $or: [
      { state: "retrying" },
      { state: "processing", leaseUntil: { $lte: now } },
    ],
    $expr: { $gte: ["$attempt", "$maxAttempts"] },
  } as Record<string, unknown>).lean();

  let failedCount = 0;
  for (const doc of exhausted) {
    const job = doc as unknown as IPublicationJob;
    const result = await PublicationJob.updateOne(
      { _id: job._id, state: { $in: ["processing", "retrying"] } },
      {
        $set: {
          state: "failed",
          errorCode: "exhausted",
          error: `Publishing crashed repeatedly — gave up after ${job.attempt} of ${job.maxAttempts} attempts`,
          nextAttemptAt: null,
          leaseUntil: null,
        },
      }
    );
    if (result.matchedCount > 0) {
      failedCount += 1;
      await syncAfterTerminal(job);
      await notifyPublishAttention({
        platform: job.platform,
        contentType: job.contentType,
        contentId: job.contentId.toString(),
        state: "failed",
        error: `Publishing crashed repeatedly — gave up after ${job.attempt} of ${job.maxAttempts} attempts`,
        attempt: job.attempt,
        maxAttempts: job.maxAttempts,
      });
    }
  }

  // 2. Remaining stale processing jobs (attempts still left) → retrying.
  const result = await PublicationJob.updateMany(
    { state: "processing", leaseUntil: { $lte: now } },
    {
      $set: {
        state: "retrying",
        nextAttemptAt: now,
        leaseUntil: null,
        error: "Worker lease expired before completion",
        errorCode: "provider_error",
      },
    }
  );
  return result.modifiedCount + failedCount;
}

async function processPendingEvents(): Promise<number> {
  const events = await ContentEvent.find({
    status: "pending",
    attempts: { $lt: MAX_EVENT_ATTEMPTS },
  })
    .sort({ createdAt: 1 })
    .limit(PENDING_EVENT_LIMIT);

  let processed = 0;
  for (const event of events) {
    try {
      await processContentEvent(event);
      processed += 1;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error(`[SocialQueue] event ${event.eventKey} failed: ${msg}`);
      await ContentEvent.updateOne(
        { _id: event._id },
        {
          $inc: { attempts: 1 },
          $set: {
            status: event.attempts + 1 >= MAX_EVENT_ATTEMPTS ? "failed" : "pending",
            error: msg,
          },
        }
      );
    }
  }
  return processed;
}

async function markExecution(
  executionId: string,
  stage: string,
  status: "completed" | "failed" | "running",
  message?: string
): Promise<void> {
  try {
    const update: Record<string, unknown> = {
      stage,
      $push: {
        auditTrail: { stage, status, timestamp: new Date(), message },
      },
    };
    if (status === "completed" || status === "failed") {
      update.completedAt = new Date();
      update.status = status;
    }
    await ContentExecution.findByIdAndUpdate(executionId, update);
  } catch (error) {
    console.error("[SocialQueue] execution stage update failed:", error);
  }
}

const DISTRIBUTION_STATUS: Record<PublicationJobState, string> = {
  pending: "pending",
  processing: "publishing",
  published: "published",
  retrying: "retrying",
  failed: "failed",
  cancelled: "cancelled",
  needs_review: "requires_auth",
};

async function syncAfterTerminal(job: IPublicationJob): Promise<void> {
  const fresh = await PublicationJob.findById(job._id).lean();
  if (!fresh) return;

  if (fresh.contentType === "content-item") {
    const jobState = fresh.state as PublicationJobState;
    const contentItemId =
      (fresh.payload as PublicationPayload | undefined)?.relatedContentItem ||
      fresh.contentId.toString();

    try {
      await ContentDistribution.updateOne(
        { contentItem: contentItemId, platform: fresh.platform },
        {
          $set: {
            status: DISTRIBUTION_STATUS[jobState],
            platformPostId: fresh.platformPostId,
            platformUrl: fresh.platformUrl,
            publishedAt: fresh.publishedAt,
            error: fresh.error,
            response: fresh.response,
            retryCount: fresh.attempt > 0 ? fresh.attempt - 1 : 0,
            lastRetryAt: fresh.state === "retrying" ? new Date() : undefined,
          },
        },
        { upsert: true }
      );
    } catch (error) {
      console.error("[SocialQueue] distribution mirror failed:", error);
    }

    try {
      const jobs = await PublicationJob.find({
        contentType: "content-item",
        contentId: fresh.contentId,
      })
        .select("state")
        .lean();

      if (jobs.length > 0) {
        const states = jobs.map((j) => j.state);
        const allPublished = states.every((s) => s === "published");
        const allTerminal = states.every((s) =>
          ["published", "failed", "cancelled", "needs_review"].includes(s)
        );
        const status = allPublished
          ? "published"
          : allTerminal && !allPublished
            ? "failed"
            : "publishing";
        await ContentItem.findByIdAndUpdate(fresh.contentId, { status });
      }
    } catch (error) {
      console.error("[SocialQueue] content item status sync failed:", error);
    }
  }

  const executionId = (fresh.payload as PublicationPayload | undefined)
    ?.executionId;
  if (executionId) {
    if (fresh.state === "published") {
      await markExecution(
        executionId,
        "social_published",
        "completed",
        `Published to ${fresh.platform}`
      );
    } else if (fresh.state === "failed" || fresh.state === "needs_review") {
      await markExecution(
        executionId,
        fresh.state === "failed" ? "publish_failed" : "publish_needs_review",
        "failed",
        fresh.error || `Publish ${fresh.state} on ${fresh.platform}`
      );
    }
  }
}

interface FinishFields {
  state: PublicationJobState;
  error?: string | null;
  errorCode?: PublicationErrorCode;
  platformPostId?: string;
  platformUrl?: string;
  publishedAt?: Date;
  response?: Record<string, unknown>;
  nextAttemptAt?: Date | null;
  generatedBy?: "ai" | "template" | "provided";
}

async function finish(
  job: IPublicationJob,
  fields: FinishFields
): Promise<PublicationJobState> {
  const set: Record<string, unknown> = {
    state: fields.state,
    error: fields.error ?? null,
    ...(fields.errorCode ? { errorCode: fields.errorCode } : {}),
    ...(fields.platformPostId ? { platformPostId: fields.platformPostId } : {}),
    ...(fields.platformUrl ? { platformUrl: fields.platformUrl } : {}),
    ...(fields.publishedAt ? { publishedAt: fields.publishedAt } : {}),
    ...(fields.response ? { response: fields.response } : {}),
    ...(fields.generatedBy ? { generatedBy: fields.generatedBy } : {}),
    nextAttemptAt: fields.nextAttemptAt ?? null,
    leaseUntil: null,
  };

  const result = await PublicationJob.updateOne(
    { _id: job._id, state: "processing" },
    { $set: set }
  );

  if (result.matchedCount === 0) {
    // Lease was reclaimed by another worker — do not double-finalize.
    return job.state;
  }

  await syncAfterTerminal(job);

  // Terminal states that need a human: retries exhausted or platform auth.
  if (fields.state === "failed" || fields.state === "needs_review") {
    await notifyPublishAttention({
      platform: job.platform,
      contentType: job.contentType,
      contentId: job.contentId.toString(),
      state: fields.state,
      error: fields.error || `Publish ${fields.state} on ${job.platform}`,
      attempt: job.attempt,
      maxAttempts: job.maxAttempts,
    });
  }

  return fields.state;
}

/** Processes one claimed job through its platform adapter. */
export async function processJob(
  job: IPublicationJob
): Promise<PublicationJobState> {
  const payload = (job.payload || {}) as PublicationPayload;
  const platform = job.platform;

  let connected = false;
  try {
    const adapter = getAdapter(platform);
    connected = await adapter.isConnected();
  } catch (error) {
    return finish(job, {
      state: "needs_review",
      error:
        error instanceof Error ? error.message : `Platform ${platform} unavailable`,
      errorCode: "not_eligible",
    });
  }

  if (!connected) {
    return finish(job, {
      state: "needs_review",
      error: `Platform ${platform} is not connected — connect the account to publish`,
      errorCode: "requires_auth",
    });
  }

  const variant = payload.variants?.[platform];
  const generated = await resolvePostContent(job, payload);
  const socialPost: SocialPost = {
    content: generated.content,
    hashtags: generated.hashtags,
    imageUrl: variant?.imageUrl ?? payload.imageUrl,
    link: variant?.link ?? payload.link,
    title: payload.title,
    description: payload.excerpt,
  };

  let result: PublishResult;
  try {
    const adapter = getAdapter(platform);
    result = await adapter.publish(socialPost);
  } catch (error) {
    result = {
      success: false,
      platform,
      error: error instanceof Error ? error.message : "Publish threw",
    };
  }

  if (result.success) {
    return finish(job, {
      state: "published",
      platformPostId: result.platformPostId,
      platformUrl: result.platformUrl,
      publishedAt: result.publishedAt || new Date(),
      response: result as unknown as Record<string, unknown>,
      generatedBy: generated.generatedBy,
    });
  }

  if (result.requiresAuth) {
    return finish(job, {
      state: "needs_review",
      error: result.error || `Platform ${platform} requires re-authorization`,
      errorCode: "requires_auth",
    });
  }

  const exhausted = job.attempt >= job.maxAttempts;

  if (result.rateLimited && !exhausted) {
    return finish(job, {
      state: "retrying",
      error: result.error || `Rate limited on ${platform}`,
      errorCode: "rate_limited",
      response: result as unknown as Record<string, unknown>,
      nextAttemptAt: new Date(Date.now() + computeBackoffMs(job.attempt)),
    });
  }

  if (exhausted) {
    return finish(job, {
      state: "failed",
      error:
        (result.error || `Publish failed on ${platform}`) +
        ` (after ${job.attempt} attempts)`,
      errorCode: "exhausted",
      response: result as unknown as Record<string, unknown>,
    });
  }

  return finish(job, {
    state: "retrying",
    error: result.error || `Publish failed on ${platform}`,
    errorCode: "provider_error",
    response: result as unknown as Record<string, unknown>,
    nextAttemptAt: new Date(Date.now() + computeBackoffMs(job.attempt)),
  });
}

export interface QueueStats {
  reclaimed: number;
  eventsProcessed: number;
  claimed: number;
  published: number;
  retrying: number;
  failed: number;
  needsReview: number;
  errors: number;
}

let running = false;

/**
 * Main queue pass: reclaim stale leases → derive pending outbox events →
 * claim and process due jobs. Idempotent and safe to run concurrently
 * across serverless instances (claims are atomic in MongoDB).
 */
export async function runSocialQueue(options?: {
  maxJobs?: number;
}): Promise<QueueStats> {
  const stats: QueueStats = {
    reclaimed: 0,
    eventsProcessed: 0,
    claimed: 0,
    published: 0,
    retrying: 0,
    failed: 0,
    needsReview: 0,
    errors: 0,
  };

  if (running) return stats;
  running = true;
  try {
    await connectToDatabase();

    stats.reclaimed = await reclaimStaleLeases();
    stats.eventsProcessed = await processPendingEvents();

    const jobs = await claimDueJobs(options?.maxJobs ?? 10);
    stats.claimed = jobs.length;

    for (const job of jobs) {
      try {
        const finalState = await processJob(job);
        if (finalState === "published") stats.published += 1;
        else if (finalState === "retrying") stats.retrying += 1;
        else if (finalState === "failed") stats.failed += 1;
        else if (finalState === "needs_review") stats.needsReview += 1;
      } catch (error) {
        stats.errors += 1;
        const msg = error instanceof Error ? error.message : "Unknown error";
        console.error(`[SocialQueue] job ${job._id} crashed: ${msg}`);

        if (job.attempt >= job.maxAttempts) {
          // Crashed too many times — stop retrying and inform admins.
          const finalState = await finish(job, {
            state: "failed",
            errorCode: "exhausted",
            error: `${msg} (after ${job.attempt} attempts)`,
          });
          if (finalState === "failed") stats.failed += 1;
        } else {
          await PublicationJob.updateOne(
            { _id: job._id, state: "processing" },
            {
              $set: {
                state: "retrying",
                leaseUntil: null,
                error: msg,
                errorCode: "provider_error",
                nextAttemptAt: new Date(
                  Date.now() + computeBackoffMs(job.attempt)
                ),
              },
            }
          );
        }
      }
    }
  } finally {
    running = false;
  }

  return stats;
}
