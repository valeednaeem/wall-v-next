import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, CONTENT_ROLES } from "@/lib/api-middleware";
import { connectToDatabase } from "@/lib/mongodb";
import PublicationJob from "@/models/publication-job";
import BlogPost from "@/models/blog-post";
import ContentItem from "@/models/content-item";
import ActivityLog from "@/models/activity-log";
import {
  enqueueJobsDirect,
  kickSocialQueue,
} from "@/lib/social-publisher/enqueue";
import { blogPostPayload, contentItemPayload } from "@/lib/social-publisher/payloads";

const RETRYABLE_STATES = ["failed", "needs_review", "cancelled", "retrying"];
const CANCELLABLE_STATES = ["pending", "retrying", "needs_review"];

async function audit(
  userId: string,
  action: string,
  entityId: string,
  details: Record<string, unknown>
): Promise<void> {
  try {
    await ActivityLog.create({
      user: userId,
      action,
      entity: "PublicationJob",
      entityId,
      details,
    });
  } catch (error) {
    console.error("[SocialJobs] audit log failed:", error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!CONTENT_ROLES.includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();
    const { id } = await params;

    const body = await request.json().catch(() => ({}) as Record<string, unknown>);
    const action = typeof body.action === "string" ? body.action : "";

    const job = await PublicationJob.findById(id);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (action === "retry") {
      if (!RETRYABLE_STATES.includes(job.state)) {
        return NextResponse.json(
          { error: `Cannot retry a job in state "${job.state}"` },
          { status: 400 }
        );
      }

      const previousState = job.state;
      job.set({
        state: "pending",
        attempt: 0,
        nextAttemptAt: new Date(),
        leaseUntil: null,
        claimedBy: null,
        error: null,
        errorCode: null,
      });
      await job.save();

      await audit(user.userId, "publication_job.retry", id, {
        platform: job.platform,
        from: previousState,
        to: "pending",
      });
      kickSocialQueue();

      return NextResponse.json({ success: true, data: job });
    }

    if (action === "cancel") {
      if (!CANCELLABLE_STATES.includes(job.state)) {
        return NextResponse.json(
          { error: `Cannot cancel a job in state "${job.state}"` },
          { status: 400 }
        );
      }

      const previousState = job.state;
      job.set({
        state: "cancelled",
        errorCode: "cancelled",
        error: "Cancelled by admin",
        nextAttemptAt: null,
      });
      await job.save();

      await audit(user.userId, "publication_job.cancel", id, {
        platform: job.platform,
        from: previousState,
        to: "cancelled",
      });

      return NextResponse.json({ success: true, data: job });
    }

    if (action === "republish") {
      const contentId = job.contentId.toString();

      if (job.contentType === "blog") {
        const post = await BlogPost.findById(contentId).lean();
        if (!post) {
          return NextResponse.json(
            { error: "Source blog post no longer exists" },
            { status: 404 }
          );
        }
        const result = await enqueueJobsDirect({
          contentType: "blog",
          contentId,
          payload: blogPostPayload(post),
          platforms: [job.platform],
          actorId: user.userId,
          accountKey: `manual-${Date.now()}`,
        });
        await audit(user.userId, "publication_job.republish", id, {
          platform: job.platform,
          created: result.created,
          existing: result.existing,
        });
        return NextResponse.json({ success: true, result });
      }

      const item = await ContentItem.findById(contentId).lean();
      if (!item) {
        return NextResponse.json(
          { error: "Source content item no longer exists" },
          { status: 404 }
        );
      }
      const payload = contentItemPayload(item);
      payload.relatedContentItem = contentId;
      const result = await enqueueJobsDirect({
        contentType: "content-item",
        contentId,
        payload,
        platforms: [job.platform],
        actorId: user.userId,
        accountKey: `manual-${Date.now()}`,
      });
      await audit(user.userId, "publication_job.republish", id, {
        platform: job.platform,
        created: result.created,
        existing: result.existing,
      });
      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json(
      { error: "Unknown action. Use retry, cancel, or republish." },
      { status: 400 }
    );
  } catch (error) {
    return handleApiError(error, "Social job action");
  }
}
