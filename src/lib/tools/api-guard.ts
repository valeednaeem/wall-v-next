import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import type { JWTPayload } from "@/lib/jwt";
import { connectToDatabase } from "@/lib/mongodb";

export type GuardResult =
  | { user: JWTPayload; error?: undefined }
  | { user?: undefined; error: NextResponse };

export async function requireAiToolsPermission(permission?: string): Promise<GuardResult> {
  const user = await getAuthUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!hasPermission(user.permissions || [], permission || PERMISSIONS.AI_TOOLS_VIEW)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user };
}

export function makeSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function logAiToolAction(
  user: JWTPayload,
  action: string,
  entity: string,
  entityId: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    const { default: ActivityLog } = await import("@/models/activity-log");
    await connectToDatabase();
    await ActivityLog.create({
      user: user.userId,
      action,
      entity,
      entityId,
      details,
    });
  } catch (error) {
    console.error("[ai-tools] audit log failed:", error);
  }
}
