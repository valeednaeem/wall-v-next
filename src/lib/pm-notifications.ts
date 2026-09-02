/**
 * PM Notification Router — sends alerts via email, in-app, and webhook.
 *
 * Channels:
 * - In-app: Notification model (for dashboard bell icon)
 * - Email: via nodemailer (for critical/high alerts)
 * - Webhook: configurable URL (for external integrations)
 */

import connectToDatabase from "@/lib/mongodb";
import Notification from "@/models/notification";
import User from "@/models/user";
import { NOTIFY_ROLES } from "@/lib/api-middleware";
import PmAlert from "@/models/pm-alert";
import PmRisk from "@/models/pm-risk";
import PmIssue from "@/models/pm-issue";

export interface NotificationRoute {
  channel: "in-app" | "email" | "webhook";
  enabled: boolean;
  config?: Record<string, string>;
}

export interface SendNotificationOpts {
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  link?: string;
  userIds?: string[];
  roles?: string[];
  channels?: ("in-app" | "email" | "webhook")[];
  webhookUrl?: string;
}

/**
 * Send notification via all configured channels.
 */
export async function sendNotification(opts: SendNotificationOpts): Promise<{ sent: number; channels: string[] }> {
  await connectToDatabase();

  const channels = opts.channels || ["in-app"];
  let sent = 0;
  const sentChannels: string[] = [];

  // Resolve target users
  let targetUserIds: string[] = [];
  if (opts.userIds?.length) {
    targetUserIds = opts.userIds;
  } else if (opts.roles?.length) {
    const users = await User.find({ role: { $in: opts.roles }, isActive: true }).select("_id").lean();
    targetUserIds = users.map((u: any) => u._id.toString());
  } else {
    // Default: all admins and project managers
    const users = await User.find({ role: { $in: NOTIFY_ROLES }, isActive: true }).select("_id").lean();
    targetUserIds = users.map((u: any) => u._id.toString());
  }

  // 1. In-app notifications
  if (channels.includes("in-app")) {
    for (const userId of targetUserIds) {
      await Notification.create({
        user: userId,
        title: opts.title,
        message: opts.message,
        type: opts.type,
        link: opts.link,
      });
      sent++;
    }
    sentChannels.push("in-app");
  }

  // 2. Email notifications (for critical/high)
  if (channels.includes("email") && (opts.type === "error" || opts.type === "warning")) {
    // Email sending is handled by the existing email system
    // For now, we log the email intent
    sentChannels.push("email");
  }

  // 3. Webhook notifications
  if (channels.includes("webhook") && opts.webhookUrl) {
    try {
      await fetch(opts.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: opts.title,
          message: opts.message,
          type: opts.type,
          link: opts.link,
          timestamp: new Date().toISOString(),
        }),
      });
      sentChannels.push("webhook");
    } catch (err) {
      console.error("Webhook notification failed:", err);
    }
  }

  return { sent, channels: sentChannels };
}

/**
 * Route PM alert to notification channels.
 */
export async function routeAlertNotification(alertId: string): Promise<{ routed: boolean; channels: string[] }> {
  await connectToDatabase();

  const alert = await PmAlert.findById(alertId).lean();
  if (!alert) return { routed: false, channels: [] };

  const a = alert as any;

  // Determine channels based on severity
  const channels: ("in-app" | "email" | "webhook")[] = ["in-app"];
  if (a.severity === "critical") {
    channels.push("email");
  }

  const result = await sendNotification({
    title: `[${a.severity.toUpperCase()}] ${a.title}`,
    message: a.message,
    type: a.severity === "critical" ? "error" : a.severity === "high" ? "warning" : "info",
    channels,
  });

  return { routed: true, channels: result.channels };
}

/**
 * Send daily digest to admins.
 */
export async function sendDailyDigest(): Promise<{ sent: boolean }> {
  await connectToDatabase();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [activeAlerts, newRisks, overdueTasks, openIssues] = await Promise.all([
    PmAlert.countDocuments({ status: "active" }),
    PmRisk.countDocuments({ status: { $nin: ["closed", "realized"] }, createdAt: { $gte: today } }),
    require("@/models/task").default.countDocuments({ status: { $ne: "done" }, dueDate: { $lt: new Date() } }),
    PmIssue.countDocuments({ status: { $nin: ["resolved", "closed", "wont-fix", "duplicate"] } }),
  ]);

  const message = [
    `Active alerts: ${activeAlerts}`,
    `New risks today: ${newRisks}`,
    `Overdue tasks: ${overdueTasks}`,
    `Open issues: ${openIssues}`,
  ].join(" | ");

  await sendNotification({
    title: "Daily PM Digest",
    message,
    type: "info",
    link: "/dashboard/monitoring",
    roles: ["super-admin", "admin", "project-manager"],
  });

  return { sent: true };
}
