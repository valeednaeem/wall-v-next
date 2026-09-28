import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import AITool from "@/models/ai-tool";
import AIToolExecution from "@/models/ai-tool-execution";
import AIToolDailyStat from "@/models/ai-tool-daily-stat";

function startOfDay(d: Date = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export interface RecordExecutionParams {
  toolId: string;
  categoryId?: string | null;
  userId?: string | null;
  ip?: string;
  userAgent?: string;
  sessionId?: string;
  accessModel: string;
  status: "success" | "failed" | "timeout";
  creditsConsumed: number;
  providerId?: string | null;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  durationMs?: number;
  errorType?: string;
  errorMessage?: string;
  estimatedCost?: number;
}

/**
 * Persists one execution row and atomically upserts the day's rollup
 * (AIToolDailyStat) plus the tool's lifetime stats. All errors are
 * swallowed+logged — recording must never break the execution response.
 *
 * uniqueUsers is best-effort: incremented only when this actor (user id or,
 * for anonymous runs, IP) has no prior execution of the tool today.
 */
export async function recordExecution(p: RecordExecutionParams): Promise<void> {
  try {
    await connectToDatabase();
    const now = new Date();
    const sod = startOfDay(now);
    const toolOid = new Types.ObjectId(p.toolId);
    const userOid = p.userId ? new Types.ObjectId(p.userId) : null;

    const priorToday = await AIToolExecution.exists(
      userOid
        ? { tool: toolOid, user: userOid, createdAt: { $gte: sod } }
        : { tool: toolOid, ip: p.ip || "unknown", createdAt: { $gte: sod } }
    );
    const isFirstToday = !priorToday;

    await AIToolExecution.create({
      tool: toolOid,
      user: userOid ?? undefined,
      sessionId: p.sessionId,
      ip: p.ip,
      userAgent: p.userAgent,
      accessModel: p.accessModel,
      status: p.status,
      creditsConsumed: p.creditsConsumed,
      provider: p.providerId ? new Types.ObjectId(p.providerId) : undefined,
      aiModel: p.model,
      inputTokens: p.inputTokens,
      outputTokens: p.outputTokens,
      durationMs: p.durationMs,
      errorType: p.errorType,
      errorMessage: p.errorMessage,
      estimatedCost: p.estimatedCost,
    });

    const statusKey = p.status === "success" ? "successCount" : "failureCount";
    const cost = p.estimatedCost ?? 0;

    const dailyInc: Record<string, number> = {
      executions: 1,
      [statusKey]: 1,
      credits: p.creditsConsumed,
      estimatedCost: cost,
    };
    if (isFirstToday) dailyInc.uniqueUsers = 1;

    await AIToolDailyStat.updateOne(
      { date: sod, tool: toolOid },
      {
        $set: { accessModel: p.accessModel, ...(p.categoryId ? { category: new Types.ObjectId(p.categoryId) } : {}) },
        $inc: dailyInc,
      },
      { upsert: true }
    );

    const toolInc: Record<string, number> = {
      "stats.executions": 1,
      [`stats.${statusKey}`]: 1,
      "stats.credits": p.creditsConsumed,
      "stats.estimatedCost": cost,
    };
    if (isFirstToday) toolInc["stats.uniqueUsers"] = 1;

    await AITool.updateOne(
      { _id: toolOid },
      { $inc: toolInc, $set: { "stats.lastExecutedAt": now } }
    );
  } catch (error) {
    console.error("[ai-tools] recordExecution failed:", error);
  }
}

export type FunnelEvent = "views" | "started" | "upgradePrompts" | "conversions";

/**
 * Increments a funnel counter on the current day's rollup for the tool.
 * Best-effort: errors are swallowed+logged.
 */
export async function recordFunnelEvent(toolId: string, event: FunnelEvent): Promise<void> {
  try {
    await connectToDatabase();
    await AIToolDailyStat.updateOne(
      { date: startOfDay(), tool: new Types.ObjectId(toolId) },
      { $inc: { [`funnel.${event}`]: 1 } },
      { upsert: true }
    );
  } catch (error) {
    console.error(`[ai-tools] recordFunnelEvent(${event}) failed:`, error);
  }
}
