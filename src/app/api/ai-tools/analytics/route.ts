import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import AITool from "@/models/ai-tool";
import AIToolDailyStat from "@/models/ai-tool-daily-stat";
import AIToolExecution from "@/models/ai-tool-execution";
import User from "@/models/user";
import { requireAiToolsPermission } from "@/lib/tools/api-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-middleware";
import { resolveRange, eachDay, dayKey } from "@/lib/tools/date-range";

const TZ = process.env.TZ || "UTC";

interface StatRow {
  date: Date;
  tool: unknown;
  accessModel?: string;
  executions?: number;
  successCount?: number;
  failureCount?: number;
  uniqueUsers?: number;
  credits?: number;
  estimatedCost?: number;
  funnel?: Record<string, number>;
}

async function globalScope(from: Date, to: Date) {
  const [counts, costAgg, adoption, retentionAgg, totalAgg, activeAgg] = await Promise.all([
    AITool.aggregate<{ _id: { status: string; accessModel: string }; count: number }>([
      { $group: { _id: { status: "$status", accessModel: "$accessModel" }, count: { $sum: 1 } } },
    ]),
    AIToolDailyStat.aggregate<{ cost: number; credits: number; executions: number }>([
      { $match: { date: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: null,
          cost: { $sum: "$estimatedCost" },
          credits: { $sum: "$credits" },
          executions: { $sum: "$executions" },
        },
      },
    ]),
    // Unique users per week (+ executions that week) — adoption curve
    AIToolExecution.aggregate<{ _id: Date; users: number; executions: number }>([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: { w: { $dateTrunc: { date: "$createdAt", unit: "week", timezone: TZ } }, u: "$user" },
        },
      },
      {
        $group: {
          _id: "$_id.w",
          users: { $addToSet: "$_id.u" },
          executions: { $sum: 1 },
        },
      },
      { $project: { users: { $size: "$users" }, executions: 1 } },
      { $sort: { _id: 1 } },
    ]),
    // Retention proxy: users active in 2+ distinct weeks within the range
    AIToolExecution.aggregate<{ count: number }>([
      { $match: { user: { $ne: null }, createdAt: { $gte: from, $lte: to } } },
      { $group: { _id: { u: "$user", w: { $dateTrunc: { date: "$createdAt", unit: "week", timezone: TZ } } } } },
      { $group: { _id: "$_id.u", weeks: { $sum: 1 } } },
      { $match: { weeks: { $gte: 2 } } },
      { $count: "count" },
    ]),
    AIToolExecution.aggregate<{ total: number }>([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      { $group: { _id: null, total: { $sum: 1 } } },
    ]),
    AIToolExecution.aggregate<{ active: number }>([
      { $match: { user: { $ne: null }, createdAt: { $gte: from, $lte: to } } },
      { $group: { _id: "$user" } },
      { $count: "active" },
    ]),
  ]);

  const byStatus = new Map<string, number>();
  const byAccess = new Map<string, number>();
  let totalTools = 0;
  for (const c of counts) {
    totalTools += c.count;
    byStatus.set(c._id.status, (byStatus.get(c._id.status) || 0) + c.count);
    byAccess.set(c._id.accessModel, (byAccess.get(c._id.accessModel) || 0) + c.count);
  }

  const activeUsers = activeAgg[0]?.active || 0;
  const retentionUsers = retentionAgg[0]?.count || 0;

  return {
    toolCounts: {
      total: totalTools,
      byStatus: Object.fromEntries(byStatus),
      byAccess: Object.fromEntries(byAccess),
    },
    adoption: adoption.map((a) => ({
      date: dayKey(new Date(a._id)),
      users: a.users,
      executions: a.executions,
    })),
    retention: {
      usersActive2PlusWeeks: retentionUsers,
      pctOfActive: activeUsers > 0 ? Math.round((retentionUsers / activeUsers) * 100) : 0,
    },
    activeUsers,
    estimatedCost: costAgg[0]?.cost || 0,
    credits: costAgg[0]?.credits || 0,
    executions: costAgg[0]?.executions || totalAgg[0]?.total || 0,
  };
}

async function toolScope(toolId: string, from: Date, to: Date) {
  const tool = await AITool.findById(toolId).select("name slug accessModel usagePolicy stats").lean();
  if (!tool) return null;

  const dayKeys = eachDay(from, to);
  const [stats, durationAgg, execAgg, funnelAgg] = await Promise.all([
    AIToolDailyStat.find({ tool: toolId, date: { $gte: from, $lte: to } })
      .select("date executions successCount failureCount uniqueUsers credits estimatedCost funnel")
      .lean() as unknown as Promise<StatRow[]>,
    AIToolExecution.aggregate<{ avgDuration: number }>([
      { $match: { tool: tool._id, createdAt: { $gte: from, $lte: to }, durationMs: { $ne: null } } },
      { $group: { _id: null, avgDuration: { $avg: "$durationMs" } } },
    ]),
    AIToolExecution.aggregate<{ users: string[]; executions: number; success: number; failed: number; credits: number; cost: number }>([
      {
        $match: {
          tool: tool._id,
          createdAt: { $gte: from, $lte: to },
          status: { $ne: "started" },
        },
      },
      {
        $group: {
          _id: null,
          users: { $addToSet: "$user" },
          executions: { $sum: 1 },
          success: { $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
          credits: { $sum: "$creditsConsumed" },
          cost: { $sum: "$estimatedCost" },
        },
      },
    ]),
    AIToolDailyStat.aggregate<{
      executions: number;
      success: number;
      views: number;
      upgradePrompts: number;
      conversions: number;
    }>([
      { $match: { tool: tool._id, date: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: null,
          executions: { $sum: "$executions" },
          success: { $sum: "$successCount" },
          views: { $sum: "$funnel.views" },
          upgradePrompts: { $sum: "$funnel.upgradePrompts" },
          conversions: { $sum: "$funnel.conversions" },
        },
      },
    ]),
  ]);

  const byDay = new Map(dayKeys.map((d) => [d, { date: d, executions: 0, users: 0, credits: 0, revenue: 0 }]));
  let credits = 0;
  let estimatedCost = 0;
  let views = 0;
  let success = 0;
  let failure = 0;
  for (const row of stats) {
    const key = dayKey(new Date(row.date));
    const b = byDay.get(key);
    if (b) {
      b.executions += row.executions || 0;
      b.users += row.uniqueUsers || 0;
      b.credits += row.credits || 0;
    }
    credits += row.credits || 0;
    estimatedCost += row.estimatedCost || 0;
    views += row.funnel?.views || 0;
    success += row.successCount || 0;
    failure += row.failureCount || 0;
  }

  const totalExec = success + failure;
  const raw = execAgg[0];
  const userCounts = raw?.users || [];
  const nonNullUsers = userCounts.filter((u) => u != null);
  const repeatUsers = await AIToolExecution.aggregate<{ count: number }>([
    { $match: { tool: tool._id, user: { $ne: null }, createdAt: { $gte: from, $lte: to } } },
    { $group: { _id: "$user", n: { $sum: 1 } } },
    { $match: { n: { $gt: 1 } } },
    { $count: "count" },
  ]);

  return {
    tool: { _id: String(tool._id), name: tool.name, slug: tool.slug, accessModel: tool.accessModel },
    kpis: {
      executions: totalExec,
      successRate: totalExec > 0 ? Math.round((success / totalExec) * 100) : 0,
      success,
      failure,
      avgDurationMs: Math.round(durationAgg[0]?.avgDuration || 0),
      credits,
      estimatedCost,
      views,
      viewsToExecPct: views > 0 ? Math.round((totalExec / views) * 100) : 0,
      upgradePrompts: funnelAgg[0]?.upgradePrompts ?? 0,
      conversions: funnelAgg[0]?.conversions ?? 0,
      repeatRate:
        nonNullUsers.length > 0
          ? Math.round(((repeatUsers[0]?.count || 0) / nonNullUsers.length) * 100)
          : 0,
      uniqueUsers: nonNullUsers.length,
    },
    series: Array.from(byDay.values()),
    breakdown: [
      { name: "Success", value: success },
      { name: "Failed", value: failure },
    ],
  };
}

async function userScope(from: Date, to: Date) {
  const [topAgg, accessSplit, totalUsersAgg] = await Promise.all([
    AIToolExecution.aggregate<{
      _id: unknown;
      executions: number;
      credits: number;
      cost: number;
      tools: unknown[];
      lastActive: Date;
    }>([
      { $match: { user: { $ne: null }, createdAt: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: "$user",
          executions: { $sum: 1 },
          credits: { $sum: "$creditsConsumed" },
          cost: { $sum: "$estimatedCost" },
          tools: { $addToSet: "$tool" },
          lastActive: { $max: "$createdAt" },
        },
      },
      { $sort: { executions: -1 } },
      { $limit: 50 },
    ]),
    AIToolDailyStat.aggregate<{ _id: string; executions: number; credits: number }>([
      { $match: { date: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: "$accessModel",
          executions: { $sum: "$executions" },
          credits: { $sum: "$credits" },
        },
      },
    ]),
    // Users active before the range but not during it (stopped users), 90d lookback
    AIToolExecution.aggregate<{ _id: unknown; lastActive: Date }>([
      { $match: { user: { $ne: null }, createdAt: { $lt: from } } },
      { $group: { _id: "$user", lastActive: { $max: "$createdAt" } } },
      { $match: { lastActive: { $gte: new Date(from.getTime() - 90 * 24 * 60 * 60 * 1000) } } },
      { $sort: { lastActive: -1 } },
      { $limit: 20 },
    ]),
  ]);

  const userIds = topAgg.map((u) => u._id).filter(Boolean);
  const nameById = new Map<string, string>();
  if (userIds.length > 0) {
    const users = await User.find({ _id: { $in: userIds } })
      .select("name email")
      .lean();
    for (const u of users) {
      nameById.set(String(u._id), (u as { name?: string; email?: string }).name || (u as { email?: string }).email || "User");
    }
  }

  const stoppedIds = totalUsersAgg.map((u) => u._id).filter(Boolean);
  const stoppedNames = new Map<string, string>();
  if (stoppedIds.length > 0) {
    const users = await User.find({ _id: { $in: stoppedIds } })
      .select("name email")
      .lean();
    for (const u of users) {
      stoppedNames.set(String(u._id), (u as { name?: string; email?: string }).name || (u as { email?: string }).email || "User");
    }
  }

  return {
    topUsers: topAgg.map((u) => ({
      userId: String(u._id),
      name: nameById.get(String(u._id)) || "User",
      executions: u.executions,
      credits: u.credits,
      estimatedCost: u.cost,
      toolsUsed: u.tools.length,
      lastActive: u.lastActive,
    })),
    multiToolUsers: topAgg.filter((u) => u.tools.length > 1).length,
    accessSplit: accessSplit.map((s) => ({
      accessModel: s._id,
      executions: s.executions,
      credits: s.credits,
    })),
    stoppedUsers: totalUsersAgg.map((u) => ({
      userId: String(u._id),
      name: stoppedNames.get(String(u._id)) || "User",
      lastActive: u.lastActive,
    })),
  };
}

export async function GET(request: Request) {
  try {
    const guard = await requireAiToolsPermission(PERMISSIONS.AI_TOOLS_ANALYTICS);
    if (guard.error) return guard.error;

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope") || "global";
    const range = resolveRange(
      searchParams.get("range"),
      searchParams.get("start"),
      searchParams.get("end")
    );

    await connectToDatabase();

    if (scope === "tool") {
      const toolId = searchParams.get("toolId");
      if (!toolId) {
        return NextResponse.json({ error: "toolId is required" }, { status: 400 });
      }
      const data = await toolScope(toolId, range.from, range.to);
      if (!data) {
        return NextResponse.json({ error: "Tool not found" }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        data: { ...data, range: { from: range.from, to: range.to, label: range.label, key: range.key } },
      });
    }

    if (scope === "user") {
      const data = await userScope(range.from, range.to);
      return NextResponse.json({
        success: true,
        data: { ...data, range: { from: range.from, to: range.to, label: range.label, key: range.key } },
      });
    }

    const data = await globalScope(range.from, range.to);
    return NextResponse.json({
      success: true,
      data: { ...data, range: { from: range.from, to: range.to, label: range.label, key: range.key } },
    });
  } catch (error) {
    return handleApiError(error, "ai-tools analytics GET");
  }
}
