import { connectToDatabase } from "@/lib/mongodb";
import Notification from "@/models/notification";

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: "info" | "success" | "warning" | "error" = "info",
  link?: string
) {
  try {
    await connectToDatabase();
    await Notification.create({ user: userId, title, message, type, link });
  } catch (error) {
    console.error("[Notification] Failed to create:", error);
  }
}

export async function notifyAdmins(
  title: string,
  message: string,
  type: "info" | "success" | "warning" | "error" = "info",
  link?: string
) {
  try {
    const { connectToDatabase } = await import("@/lib/mongodb");
    const { default: User } = await import("@/models/user");

    await connectToDatabase();
    const admins = await User.find({ role: { $in: ["super-admin", "admin"] } }).select("_id").lean();

    for (const admin of admins) {
      await createNotification(admin._id.toString(), title, message, type, link);
    }
  } catch (error) {
    console.error("[Notification] Failed to notify admins:", error);
  }
}
