import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import BlogPost from "@/models/blog-post";
import ContentItem from "@/models/content-item";
import { runSocialQueue } from "@/lib/social-publisher/worker";
import { enqueuePublication } from "@/lib/social-publisher/enqueue";
import { blogPostPayload } from "@/lib/social-publisher/payloads";
import { publishContentItem } from "@/lib/content-orchestrator";

async function flipScheduledContent(): Promise<{ blog: number; items: number }> {
  const now = new Date();
  let blog = 0;
  let items = 0;

  const duePosts = await BlogPost.find({
    status: "scheduled",
    scheduledAt: { $lte: now },
  }).lean();

  for (const post of duePosts) {
    const updated = await BlogPost.findOneAndUpdate(
      { _id: post._id, status: "scheduled" },
      { $set: { status: "published", publishedAt: new Date() } },
      { new: true }
    );
    if (!updated) continue;
    blog += 1;
    await enqueuePublication({
      type: "published",
      contentType: "blog",
      contentId: updated._id.toString(),
      payload: blogPostPayload(updated),
    });
  }

  const dueItems = await ContentItem.find({
    status: "scheduled",
    scheduledAt: { $lte: now },
  })
    .select("_id")
    .lean();

  for (const item of dueItems) {
    try {
      await publishContentItem(item._id.toString());
      items += 1;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error(`[Cron:social-publish] scheduled item ${item._id} failed: ${msg}`);
    }
  }

  return { blog, items };
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const isVercelCron = request.headers.get("x-vercel-cron") !== null;
  const isValidBearer = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isVercelCron && !isValidBearer && !(!cronSecret && authHeader)) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    console.log("[Cron:social-publish] start", new Date().toISOString());
    await connectToDatabase();

    const flipped = await flipScheduledContent();
    const queue = await runSocialQueue();

    console.log("[Cron:social-publish] done", JSON.stringify({ flipped, queue }));
    return NextResponse.json({ success: true, flipped, queue });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Execution failed";
    console.error("[Cron:social-publish] failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
