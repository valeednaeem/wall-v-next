import { sendNotification } from "@/lib/pm-notifications";

const QUEUE_LINK = "/dashboard/content/queue";
const ALERT_ROLES = ["super-admin", "admin", "manager", "project-manager"];

export interface PublishAttentionAlert {
  platform: string;
  contentType: string;
  contentId: string;
  state: "failed" | "needs_review";
  error: string;
  attempt: number;
  maxAttempts: number;
}

/**
 * In-app dashboard notification for admins when a publication job needs human
 * attention (retries exhausted → failed, or platform auth → needs_review).
 * Never throws — notification delivery must not break queue processing.
 */
export async function notifyPublishAttention(
  alert: PublishAttentionAlert
): Promise<void> {
  try {
    const failed = alert.state === "failed";
    await sendNotification({
      title: failed
        ? `Social publish failed — ${alert.platform}`
        : `Social publish needs review — ${alert.platform}`,
      message: failed
        ? `A ${alert.contentType} post to ${alert.platform} gave up after ${alert.attempt}/${alert.maxAttempts} attempts: ${alert.error}`
        : `A ${alert.contentType} post to ${alert.platform} needs attention: ${alert.error}`,
      type: failed ? "error" : "warning",
      link: QUEUE_LINK,
      roles: ALERT_ROLES,
      channels: ["in-app"],
    });
  } catch (error) {
    console.error("[SocialPublisher] admin notification failed:", error);
  }
}
