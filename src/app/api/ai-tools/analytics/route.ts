import { NextResponse } from "next/server";
import mongoose from "mongoose";
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

async function funnelScope(toolId: string | null, from: Date, to: Date) {
  const match: Record<string, unknown> = { date: { $gte: from, $lte: to } };
  if (toolId) match.tool = new mongoose.Types.ObjectId(toolId);

  const [agg, tool] = await Promise.all([
    AIToolDailyStat.aggregate<{
      views: number;
      started: number;
      attempted: number;
      succeeded: number;
      upgradePrompts: number;
      conversions: number;
      executions: number;
      credits: number;
      cost: number;
      revenue: number;
    }>([
      { $match: match },
      {
        $group: {
          _id: null,
          views: { $sum: "$funnel.views" },
          started: { $sum: "$funnel.started" },
          attempted: { $sum: "$funnel.attempted" },
          succeeded: { $sum: "$funnel.succeeded" },
          upgradePrompts: { $sum: "$funnel.upgradePrompts" },
          conversions: { $sum: "$funnel.conversions" },
          executions: { $sum: "$executions" },
          credits: { $sum: "$credits" },
          cost: { $sum: "$estimatedCost" },
          revenue: { $sum: "$revenue" },
        },
      },
    ]),
    toolId ? AITool.findById(toolId).select("name slug").lean() : Promise.resolve(null),
  ]);

  const a = agg[0];
  const totals = {
    views: a?.views || 0,
    started: a?.started || 0,
    attempted: a?.attempted || 0,
    succeeded: a?.succeeded || 0,
    upgradePrompts: a?.upgradePrompts || 0,
    conversions: a?.conversions || 0,
    executions: a?.executions || 0,
    credits: a?.credits || 0,
    cost: a?.cost || 0,
    revenue: a?.revenue || 0,
  };

  const defs: { key: keyof typeof totals; label: string }[] = [
    { key: "views", label: "Views" },
    { key: "started", label: "Opened" },
    { key: "attempted", label: "Attempted" },
    { key: "succeeded", label: "Succeeded" },
    { key: "upgradePrompts", label: "Upgrade prompt" },
    { key: "conversions", label: "Conversion" },
  ];

  const first = totals.views || totals.started || 1;
  const stages = defs.map((d, i) => {
    const count = totals[d.key];
    const prev = i > 0 ? totals[defs[i - 1].key] : 0;
    return {
      key: d.key,
      label: d.label,
      count,
      pctOfPrevious: i === 0 ? 100 : prev > 0 ? Math.round((count / prev) * 100) : 0,
      pctOfFirst: Math.round((count / first) * 100),
    };
  });

  return {
    tool: tool ? { _id: String(tool._id), name: tool.name, slug: tool.slug } : null,
    stages,
    totals,
  };
}

interface PerfRow {
  _id: unknown;
  executions: number;
  success: number;
  failure: number;
  credits: number;
  cost: number;
  revenue: number;
  views: number;
  conversions: number;
}

async function performanceScope(from: Date, to: Date) {
  const span = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - span);

  const groupStage = {
    $group: {
      _id: "$tool",
      executions: { $sum: "$executions" },
      success: { $sum: "$successCount" },
      failure: { $sum: "$failureCount" },
      credits: { $sum: "$credits" },
      cost: { $sum: "$estimatedCost" },
      revenue: { $sum: "$revenue" },
      views: { $sum: "$funnel.views" },
      conversions: { $sum: "$funnel.conversions" },
    },
  };

  const [current, previous, userAgg] = await Promise.all([
    AIToolDailyStat.aggregate<PerfRow>([
      { $match: { date: { $gte: from, $lte: to } } },
      groupStage,
    ]),
    AIToolDailyStat.aggregate<{ _id: unknown; executions: number }>([
      { $match: { date: { $gte: prevFrom, $lte: prevTo } } },
      { $group: { _id: "$tool", executions: { $sum: "$executions" } } },
    ]),
    // Per-tool unique + repeat users over the range
    AIToolExecution.aggregate<{ _id: { tool: unknown; user: unknown }; n: number }>([
      { $match: { user: { $ne: null }, createdAt: { $gte: from, $lte: to } } },
      { $group: { _id: { tool: "$tool", user: "$user" }, n: { $sum: 1 } } },
    ]),
  ]);

  const prevById = new Map<string, number>();
  for (const p of previous) prevById.set(String(p._id), p.executions || 0);

  const usersByTool = new Map<string, { users: number; repeats: number }>();
  for (const row of userAgg) {
    const id = String(row._id.tool);
    const entry = usersByTool.get(id) || { users: 0, repeats: 0 };
    entry.users += 1;
    if (row.n > 1) entry.repeats += 1;
    usersByTool.set(id, entry);
  }

  const toolIds = current.map((c) => c._id).filter((v): v is mongoose.Types.ObjectId => v != null);
  const toolNameById = new Map<string, { name: string; slug: string; status: string }>();
  if (toolIds.length > 0) {
    const tools = await AITool.find({ _id: { $in: toolIds } })
      .select("name slug status")
      .lean();
    for (const t of tools) {
      toolNameById.set(String(t._id), { name: t.name, slug: t.slug, status: t.status });
    }
  }

  const rows = current
    .map((c) => {
      const id = String(c._id);
      const prev = prevById.get(id) || 0;
      const growth = prev === 0 ? (c.executions > 0 ? 100 : 0) : Math.round(((c.executions - prev) / prev) * 100);
      const u = usersByTool.get(id) || { users: 0, repeats: 0 };
      const meta = toolNameById.get(id);
      return {
        toolId: id,
        name: meta?.name || "Unknown tool",
        status: meta?.status || "unknown",
        executions: c.executions,
        growth,
        previousExecutions: prev,
        uniqueUsers: u.users,
        repeatRate: u.users > 0 ? Math.round((u.repeats / u.users) * 100) : 0,
        conversionRate: c.views > 0 ? Math.round((c.conversions / c.views) * 100) : 0,
        revenue: c.revenue,
        estimatedCost: c.cost,
        profitContribution: Math.round((c.revenue - c.cost) * 10000) / 10000,
        errorRate:
          c.executions > 0 ? Math.round((c.failure / c.executions) * 100) : 0,
        success: c.success,
        failure: c.failure,
        credits: c.credits,
        views: c.views,
        conversions: c.conversions,
      };
    })
    .sort((a, b) => b.executions - a.executions);

  return {
    rows,
    totals: {
      executions: rows.reduce((s, r) => s + r.executions, 0),
      estimatedCost: rows.reduce((s, r) => s + r.estimatedCost, 0),
      revenue: rows.reduce((s, r) => s + r.revenue, 0),
      credits: rows.reduce((s, r) => s + r.credits, 0),
    },
    previousWindow: { from: prevFrom, to: prevTo },
  };
}

async function seoScope() {
  const tools = await AITool.find({})
    .select("name slug status seo")
    .lean();

  const rows = tools.map((t) => {
    const seo = (t as { seo?: { metaTitle?: string; metaDescription?: string; keywords?: string[]; canonicalUrl?: string } }).seo;
    const checks = {
      metaTitle: Boolean(seo?.metaTitle),
      metaDescription: Boolean(seo?.metaDescription),
      keywords: (seo?.keywords?.length || 0) > 0,
      canonicalUrl: Boolean(seo?.canonicalUrl),
    };
    const filled = Object.values(checks).filter(Boolean).length;
    return {
      toolId: String(t._id),
      name: t.name,
      slug: t.slug,
      status: t.status,
      checks,
      completeness: Math.round((filled / 4) * 100),
      indexed: null as number | null,
      impressions: null as number | null,
      clicks: null as number | null,
      ctr: null as number | null,
      source: "not_connected",
    };
  });

  const avg =
    rows.length > 0 ? Math.round(rows.reduce((s, r) => s + r.completeness, 0) / rows.length) : 0;

  return {
    rows,
    summary: {
      totalTools: rows.length,
      avgCompleteness: avg,
      fullyOptimized: rows.filter((r) => r.completeness === 100).length,
      missingMeta: rows.filter((r) => !r.checks.metaTitle || !r.checks.metaDescription).length,
    },
    searchConsole: {
      connected: false,
      source: "not_connected" as const,
      note: "Google Search Console is not connected. Impression, click, and CTR data will appear here once integrated.",
    },
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

    if (scope === "funnel") {
      const toolId = searchParams.get("toolId");
      if (toolId && !mongoose.Types.ObjectId.isValid(toolId)) {
        return NextResponse.json({ error: "Invalid toolId" }, { status: 400 });
      }
      const data = await funnelScope(toolId, range.from, range.to);
      if (toolId && !data.tool) {
        return NextResponse.json({ error: "Tool not found" }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        data: { ...data, range: { from: range.from, to: range.to, label: range.label, key: range.key } },
      });
    }

    if (scope === "performance") {
      const data = await performanceScope(range.from, range.to);
      return NextResponse.json({
        success: true,
        data: { ...data, range: { from: range.from, to: range.to, label: range.label, key: range.key } },
      });
    }

    if (scope === "seo") {
      const data = await seoScope();
      return NextResponse.json({ success: true, data });
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
