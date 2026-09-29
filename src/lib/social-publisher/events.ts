import ContentEvent, { IContentEvent } from "@/models/content-event";
import { makeEventKey, makeRevision } from "./idempotency";
import type { ContentEventParams } from "./types";

/**
 * Durable outbox emit. Writes (or returns the already-existing) event with a
 * deterministic event key so retried requests never duplicate events.
 * Never throws — publishing must not break the content write that triggered it.
 */
export async function emitContentEvent(
  params: ContentEventParams
): Promise<IContentEvent | null> {
  try {
    const revision = makeRevision(params.payload);
    const eventKey = makeEventKey(
      params.type,
      params.contentType,
      params.contentId,
      revision
    );

    return await ContentEvent.findOneAndUpdate(
      { eventKey },
      {
        $setOnInsert: {
          type: params.type,
          contentType: params.contentType,
          contentId: params.contentId,
          revision,
          eventKey,
          payload: params.payload,
          platforms: params.platforms ?? [],
          actorId: params.actorId,
          status: "pending",
          attempts: 0,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch (error) {
    console.error("[SocialPublisher] emitContentEvent failed:", error);
    return null;
  }
}
