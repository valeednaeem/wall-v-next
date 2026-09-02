import { connectToDatabase } from "@/lib/mongodb";
import Notification from "@/models/notification";
import User from "@/models/user";
import { ADMIN_ROLES } from "@/lib/api-middleware";

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: "info" | "success" | "warning" | "error" = "info",
  link?: string
) {
  try {
    await connectToDatabase();
    return await Notification.create({ user: userId, title, message, type, link });
  } catch (error) {
    console.error("[Notification] Failed to create:", error);
    return null;
  }
}

export async function notifyAdmins(
  title: string,
  message: string,
  type: "info" | "success" | "warning" | "error" = "info",
  link?: string
) {
  try {
    await connectToDatabase();
    const admins = await User.find({ role: { $in: ADMIN_ROLES } }).select("_id").lean();

    for (const admin of admins) {
      await createNotification(admin._id.toString(), title, message, type, link);
    }
  } catch (error) {
    console.error("[Notification] Failed to notify admins:", error);
  }
}

export async function notifyUser(
  userId: string,
  title: string,
  message: string,
  type: "info" | "success" | "warning" | "error" = "info",
  link?: string
) {
  return createNotification(userId, title, message, type, link);
}

export async function getUserNotifications(userId: string, limit = 20) {
  await connectToDatabase();
  return Notification.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

export async function getUnreadCount(userId: string) {
  await connectToDatabase();
  return Notification.countDocuments({ user: userId, read: false });
}

export async function markAsRead(notificationId: string, userId: string) {
  await connectToDatabase();
  return Notification.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { read: true },
    { new: true }
  );
}

export async function markAllAsRead(userId: string) {
  await connectToDatabase();
  return Notification.updateMany({ user: userId, read: false }, { read: true });
}
