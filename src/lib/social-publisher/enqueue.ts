import ContentEvent, { IContentEvent } from "@/models/content-event";
import PublicationJob from "@/models/publication-job";
import { emitContentEvent } from "./events";
import { makeIdempotencyKey, makeRevision } from "./idempotency";
import { resolveTargetPlatforms } from "./platforms";
import type { ContentEventParams, ContentRefType } from "./types";

export const DEFAULT_MAX_ATTEMPTS = 5;

export interface DeriveResult {
  created: number;
  existing: number;
  cancelledStale: number;
  platforms: string[];
  skippedReason?: string;
}

/** Cancels all outstanding (pending/retrying) jobs for a content reference. */
export async function cancelOutstandingJobs(
  contentType: ContentRefType,
  contentId: string,
  reason = "Content unpublished or removed"
): Promise<number> {
  const result = await PublicationJob.updateMany(
    { contentType, contentId, state: { $in: ["pending", "retrying"] } },
    {
      $set: {
        state: "cancelled",
        errorCode: "cancelled",
        error: reason,
        nextAttemptAt: null,
      },
    }
  );
  return result.modifiedCount;
}

async function markEvent(
  event: IContentEvent,
  status: "processed" | "skipped" | "failed",
  error?: string
): Promise<void> {
  await ContentEvent.updateOne(
    { _id: event._id },
    {
      $set: {
        status,
        processedAt: new Date(),
        ...(error ? { error } : {}),
      },
      $inc: { attempts: 1 },
    }
  );
}

/**
 * Derives publication jobs from a durable content event.
 * Jobs are created idempotently (unique idempotencyKey), outstanding jobs for
 * stale revisions are cancelled first, and the event is marked processed.
 */
export async function processContentEvent(
  event: IContentEvent
): Promise<DeriveResult> {
  const contentType = event.contentType;
  const contentId = event.contentId.toString();

  if (event.type === "unpublished") {
    const cancelled = await cancelOutstandingJobs(contentType, contentId);
    await markEvent(event, "processed");
    return { created: 0, existing: 0, cancelledStale: cancelled, platforms: [] };
  }

  const platforms =
    event.platforms.length > 0
      ? event.platforms
      : await resolveTargetPlatforms();

  if (platforms.length === 0) {
    await markEvent(event, "skipped", "No connected social accounts");
    return {
      created: 0,
      existing: 0,
      cancelledStale: 0,
      platforms: [],
      skippedReason: "No connected social accounts",
    };
  }

  const staleCancelled = await PublicationJob.updateMany(
    {
      contentType,
      contentId,
      revision: { $ne: event.revision },
      state: { $in: ["pending", "retrying"] },
    },
    {
      $set: {
        state: "cancelled",
        errorCode: "cancelled",
        error: "Superseded by a newer content revision",
        nextAttemptAt: null,
      },
    }
  );

  let created = 0;
  let existing = 0;

  for (const platform of platforms) {
    const idempotencyKey = makeIdempotencyKey(
      contentType,
      contentId,
      event.revision,
      platform
    );

    const found = await PublicationJob.findOne({ idempotencyKey })
      .select("_id")
      .lean();
    if (found) {
      existing += 1;
      continue;
    }

    try {
      await PublicationJob.create({
        contentType,
        contentId,
        revision: event.revision,
        platform,
        idempotencyKey,
        state: "pending",
        payload: event.payload,
        attempt: 0,
        maxAttempts: DEFAULT_MAX_ATTEMPTS,
        nextAttemptAt: new Date(),
        generatedBy: "provided",
        actorId: event.actorId,
      });
      created += 1;
    } catch (error) {
      // Unique index race — another writer created the same job.
      if (
        error instanceof Error &&
        "code" in error &&
        (error as { code?: number }).code === 11000
      ) {
        existing += 1;
      } else {
        throw error;
      }
    }
  }

  await markEvent(event, "processed");

  return {
    created,
    existing,
    cancelledStale: staleCancelled.modifiedCount,
    platforms,
  };
}

/** Fire-and-forget queue kick — the cron worker is only a safety net. */
export function kickSocialQueue(): void {
  if (process.env.SOCIAL_QUEUE_DISABLE_KICK === "1") return;
  void import("./worker")
    .then((m) => m.runSocialQueue())
    .catch((error) => {
      console.error("[SocialPublisher] queue kick failed:", error);
    });
}

export interface EnqueueResult {
  eventId: string | null;
  created: number;
  existing: number;
  platforms: string[];
  skippedReason?: string;
  cancelledStale?: number;
}

/**
 * Event-driven entry point: emit durable event → derive jobs → kick worker.
 * Safe to call multiple times for identical content (idempotent).
 */
export async function enqueuePublication(
  params: ContentEventParams
): Promise<EnqueueResult> {
  const event = await emitContentEvent(params);
  if (!event) {
    return { eventId: null, created: 0, existing: 0, platforms: [] };
  }

  if (event.status === "pending") {
    const result = await processContentEvent(event);
    if (result.created > 0) {
      kickSocialQueue();
    }
    return {
      eventId: event._id.toString(),
      created: result.created,
      existing: result.existing,
      platforms: result.platforms,
      skippedReason: result.skippedReason,
    };
  }

  // Event already handled (unique eventKey) — report the jobs that already
  // exist for this revision so callers see the idempotent outcome.
  const platforms =
    event.platforms.length > 0
      ? event.platforms
      : await resolveTargetPlatforms();
  const existingKeys = platforms.map((platform) =>
    makeIdempotencyKey(
      event.contentType,
      event.contentId.toString(),
      event.revision,
      platform
    )
  );
  const existing =
    existingKeys.length > 0
      ? await PublicationJob.countDocuments({
          idempotencyKey: { $in: existingKeys },
        })
      : 0;

  return {
    eventId: event._id.toString(),
    created: 0,
    existing,
    platforms,
    skippedReason:
      event.status === "skipped"
        ? event.error || "Event already handled"
        : "Event already processed",
  };
}

/**
 * Bypasses the outbox (for manual/dashboard re-publish actions) and creates
 * jobs directly — still idempotent per content+revision+platform.
 */
export async function enqueueJobsDirect(
  params: Omit<ContentEventParams, "type"> & { accountKey?: string }
): Promise<EnqueueResult> {
  const revision = makeRevision(params.payload);
  const platforms =
    params.platforms && params.platforms.length > 0
      ? params.platforms
      : await resolveTargetPlatforms();

  if (platforms.length === 0) {
    return {
      eventId: null,
      created: 0,
      existing: 0,
      platforms: [],
      skippedReason: "No connected social accounts",
    };
  }

  const staleCancelled = await PublicationJob.updateMany(
    {
      contentType: params.contentType,
      contentId: params.contentId,
      revision: { $ne: revision },
      state: { $in: ["pending", "retrying"] },
    },
    {
      $set: {
        state: "cancelled",
        errorCode: "cancelled",
        error: "Superseded by a newer content revision",
        nextAttemptAt: null,
      },
    }
  );

  let created = 0;
  let existing = 0;

  for (const platform of platforms) {
    const idempotencyKey = makeIdempotencyKey(
      params.contentType,
      params.contentId,
      revision,
      platform,
      params.accountKey
    );
    const found = await PublicationJob.findOne({ idempotencyKey })
      .select("_id")
      .lean();
    if (found) {
      existing += 1;
      continue;
    }
    try {
      await PublicationJob.create({
        contentType: params.contentType,
        contentId: params.contentId,
        revision,
        platform,
        idempotencyKey,
        state: "pending",
        payload: params.payload,
        attempt: 0,
        maxAttempts: DEFAULT_MAX_ATTEMPTS,
        nextAttemptAt: new Date(),
        generatedBy: "provided",
        actorId: params.actorId,
      });
      created += 1;
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as { code?: number }).code === 11000
      ) {
        existing += 1;
      } else {
        throw error;
      }
    }
  }

  if (created > 0) {
    kickSocialQueue();
  }

  return {
    eventId: null,
    created,
    existing,
    platforms,
    cancelledStale: staleCancelled.modifiedCount,
  };
}
