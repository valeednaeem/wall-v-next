import { connectToDatabase } from "@/lib/mongodb";
import ErrorLog from "@/models/error-log";

export type ErrorLevel = "info" | "warning" | "error" | "critical";

interface LogErrorOptions {
  level?: ErrorLevel;
  message: string;
  stack?: string;
  source?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  userAgent?: string;
}

/**
 * Centralized error logging utility.
 * Logs errors to the ErrorLog collection in MongoDB.
 * Use this throughout the application for consistent error tracking.
 */
export async function logError(options: LogErrorOptions): Promise<void> {
  try {
    await connectToDatabase();
    await ErrorLog.create({
      message: options.message,
      stack: options.stack || "",
      level: options.level || "error",
      source: options.source || "unknown",
      userId: options.userId || undefined,
      metadata: options.metadata || {},
      userAgent: options.userAgent || "",
      resolved: false,
    });
  } catch (err) {
    // Silently fail - error logging should never crash the app
    console.error("[ErrorLogger] Failed to log error:", err);
  }
}

/**
 * Express-style error handler for API routes.
 * Wraps a handler and logs any errors that occur.
 */
export function withErrorLogging(
  handler: (request: Request, context?: unknown) => Promise<Response>,
  source: string
) {
  return async (request: Request, context?: unknown): Promise<Response> => {
    try {
      return await handler(request, context);
    } catch (error) {
      const err = error as Error;
      await logError({
        level: "error",
        message: err.message || "Unhandled API error",
        stack: err.stack,
        source,
        metadata: {
          url: request.url,
          method: request.method,
        },
        userAgent: request.headers.get("user-agent") || "",
      });
      return Response.json(
        { success: false, error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}
