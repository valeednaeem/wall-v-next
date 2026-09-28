import { connectToDatabase } from "@/lib/mongodb";
import AITool from "@/models/ai-tool";
import AIToolExecution from "@/models/ai-tool-execution";
import type { JWTPayload } from "@/lib/jwt";

export type AccessDenyReason =
  | "not_found"
  | "auth_required"
  | "plan_required"
  | "limit_reached"
  | "input_too_long"
  | "inactive";

export interface AccessCheck {
  allowed: boolean;
  reason?: AccessDenyReason;
  remainingToday?: number;
  remainingMonth?: number;
  freeRemaining?: number;
}

const ANONYMOUS_DAILY_CAP = 10;

function startOf(d: Date, unit: "day" | "month"): Date {
  const x = new Date(d);
  if (unit === "day") x.setHours(0, 0, 0, 0);
  else {
    x.setDate(1);
    x.setHours(0, 0, 0, 0);
  }
  return x;
}

export async function checkToolAccess(
  toolId: string,
  user: JWTPayload | null,
  inputLength = 0,
  ip?: string | null
): Promise<AccessCheck> {
  await connectToDatabase();
  const tool = await AITool.findById(toolId).lean();
  if (!tool || tool.status !== "published") return { allowed: false, reason: "not_found" };
  const p = tool.usagePolicy;

  if (p.maxInputLength > 0 && inputLength > p.maxInputLength) {
    return { allowed: false, reason: "input_too_long" };
  }

  // Subscription tools require a logged-in user (entitlement check is Phase 8)
  if (tool.accessModel === "subscription") {
    if (!user) return { allowed: false, reason: "auth_required" };
    // Phase 8: replace with AIToolSubscription entitlement lookup
    return { allowed: false, reason: "plan_required" };
  }

  const sinceDay = startOf(new Date(), "day");
  const sinceMonth = startOf(new Date(), "month");

  // Anonymous users: free tools only, with a per-IP daily cap
  if (!user) {
    if (tool.accessModel !== "free") {
      return { allowed: false, reason: "auth_required" };
    }
    const today = await AIToolExecution.countDocuments({
      tool: toolId,
      ip: ip || "unknown",
      createdAt: { $gte: sinceDay },
      status: { $ne: "started" },
    });
    if (today >= ANONYMOUS_DAILY_CAP) {
      return { allowed: false, reason: "limit_reached", remainingToday: 0 };
    }
    return { allowed: true, remainingToday: ANONYMOUS_DAILY_CAP - today };
  }

  const userFilter = { user: user.userId };

  if (p.dailyLimit > 0) {
    const used = await AIToolExecution.countDocuments({
      tool: toolId,
      ...userFilter,
      createdAt: { $gte: sinceDay },
      status: { $ne: "started" },
    });
    if (used >= p.dailyLimit) return { allowed: false, reason: "limit_reached", remainingToday: 0 };
  }
  if (p.monthlyLimit > 0) {
    const used = await AIToolExecution.countDocuments({
      tool: toolId,
      ...userFilter,
      createdAt: { $gte: sinceMonth },
      status: { $ne: "started" },
    });
    if (used >= p.monthlyLimit) return { allowed: false, reason: "limit_reached", remainingMonth: 0 };
  }
  if (tool.accessModel === "freemium" && p.lifetimeFreeExecutions > 0) {
    const used = await AIToolExecution.countDocuments({
      tool: toolId,
      ...userFilter,
      status: { $ne: "started" },
    });
    if (used >= p.lifetimeFreeExecutions) {
      return { allowed: false, reason: "plan_required", freeRemaining: 0 };
    }
    return { allowed: true, freeRemaining: p.lifetimeFreeExecutions - used };
  }

  let remainingToday: number | undefined;
  if (p.dailyLimit > 0) {
    const used = await AIToolExecution.countDocuments({
      tool: toolId,
      ...userFilter,
      createdAt: { $gte: sinceDay },
      status: { $ne: "started" },
    });
    remainingToday = Math.max(0, p.dailyLimit - used);
  }
  return { allowed: true, remainingToday };
}
