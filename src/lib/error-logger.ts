import { connectToDatabase } from "./mongodb";
import ErrorLog from "@/models/error-log";

interface LogErrorParams {
  message: string;
  stack?: string;
  level?: "error" | "warning" | "info";
  source?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export async function logError({
  message,
  stack,
  level = "error",
  source,
  userId,
  metadata,
}: LogErrorParams) {
  try {
    await connectToDatabase();
    await ErrorLog.create({
      message,
      stack,
      level,
      source,
      userId,
      metadata,
      userAgent: typeof window !== "undefined" ? window.navigator.userAgent : "server",
    });
  } catch (error) {
    console.error("Failed to log error:", error);
  }
}
