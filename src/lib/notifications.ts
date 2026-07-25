import { connectToDatabase } from "./mongodb";
import Notification from "@/models/notification";

interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type?: "info" | "success" | "warning" | "error";
  link?: string;
}

export async function createNotification({
  userId,
  title,
  message,
  type = "info",
  link,
}: CreateNotificationParams) {
  await connectToDatabase();
  return Notification.create({ userId, title, message, type, link });
}

export async function getUserNotifications(userId: string, limit = 20) {
  await connectToDatabase();
  return Notification.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

export async function markAsRead(notificationId: string) {
  await connectToDatabase();
  return Notification.findByIdAndUpdate(notificationId, { read: true }, { new: true });
}

export async function markAllAsRead(userId: string) {
  await connectToDatabase();
  return Notification.updateMany({ userId, read: false }, { read: true });
}
