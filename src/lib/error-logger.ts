import { connectToDatabase } from "@/lib/mongodb";
import ErrorLog from "@/models/error-log";

export type ErrorLevel = "info" | "warning" | "error" | "critical";

interface LogErrorOptions {
  level?: ErrorLevel;
  message: string;
  stack?: string;
  source?: string;
  userId?: string;
  projectId?: string;
  operation?: string;
  apiTool?: string;
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
      projectId: options.projectId || undefined,
      operation: options.operation || undefined,
      apiTool: options.apiTool || undefined,
      metadata: options.metadata || {},
      userAgent: options.userAgent || "",
      status: "open",
      retryCount: 0,
    });
  } catch (err) {
    // Silently fail - error logging should never crash the app
    console.error("[ErrorLogger] Failed to log error:", err);
  }
}

/**
 * Log production workflow specific errors
 */
export async function logProductionError(
  projectId: string,
  operation: string,
  error: Error,
  apiTool?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await logError({
    level: "error",
    message: `Production workflow error: ${error.message}`,
    stack: error.stack,
    source: "production-workflow",
    projectId,
    operation,
    apiTool,
    metadata: {
      ...metadata,
      errorName: error.name,
    },
  });
}

/**
 * Log API errors with request context
 */
export async function logApiError(
  request: Request,
  error: Error,
  source: string,
  projectId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await logError({
    level: "error",
    message: `API error in ${source}: ${error.message}`,
    stack: error.stack,
    source,
    projectId,
    operation: `API ${request.method} ${request.url}`,
    apiTool: source,
    metadata: {
      ...metadata,
      url: request.url,
      method: request.method,
      errorName: error.name,
    },
    userAgent: request.headers.get("user-agent") || undefined,
  });
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
