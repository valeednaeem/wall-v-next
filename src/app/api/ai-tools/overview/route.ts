import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import AITool from "@/models/ai-tool";
import AIToolDailyStat from "@/models/ai-tool-daily-stat";
import AIToolExecution from "@/models/ai-tool-execution";
import { requireAiToolsPermission } from "@/lib/tools/api-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-middleware";
import { resolveRange, eachDay, dayKey } from "@/lib/tools/date-range";

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
  revenue?: number;
  funnel?: Record<string, number>;
}

export async function GET(request: Request) {
  try {
    const guard = await requireAiToolsPermission(PERMISSIONS.AI_TOOLS_ANALYTICS);
    if (guard.error) return guard.error;

    const { searchParams } = new URL(request.url);
    const range = resolveRange(
      searchParams.get("range"),
      searchParams.get("start"),
      searchParams.get("end")
    );

    await connectToDatabase();

    const dayKeys = eachDay(range.from, range.to);

    // ── Tool counts (lifetime, independent of range) ────────────────────────
    const [
      totalTools,
      publishedTools,
      draftTools,
      freeTools,
      freemiumTools,
      subscriptionTools,
    ] = await Promise.all([
      AITool.countDocuments({}),
      AITool.countDocuments({ status: "published" }),
      AITool.countDocuments({ status: "draft" }),
      AITool.countDocuments({ accessModel: "free" }),
      AITool.countDocuments({ accessModel: "freemium" }),
      AITool.countDocuments({ accessModel: "subscription" }),
    ]);

    // ── Rollups in range (small: tools × days) ─────────────────────────────
    const stats = (await AIToolDailyStat.find({
      date: { $gte: range.from, $lte: range.to },
    })
      .select("date tool accessModel executions uniqueUsers credits estimatedCost revenue funnel")
      .lean()) as unknown as StatRow[];

    // ── User metrics from raw executions (distinct; rollup can't dedupe) ────
    const [activeUserIds, userMinMax, todayAgg] = await Promise.all([
      AIToolExecution.distinct("user", {
        user: { $ne: null },
        createdAt: { $gte: range.from, $lte: range.to },
      }),
      // One row per user over the TTL window — accepted cost for KPI drill-down
      AIToolExecution.aggregate<{ _id: unknown; first: Date; last: Date }>([
        { $match: { user: { $ne: null } } },
        { $group: { _id: "$user", first: { $min: "$createdAt" }, last: { $max: "$createdAt" } } },
      ]),
      AIToolDailyStat.aggregate<{ executions: number }>([
        {
          $match: {
            date: { $gte: resolveRange("today").from, $lte: resolveRange("today").to },
          },
        },
        { $group: { _id: null, executions: { $sum: "$executions" } } },
      ]),
    ]);

    const totalUsers = userMinMax.length;
    const newUsers = userMinMax.filter(
      (u) => u.first >= range.from && u.first <= range.to
    ).length;

    // ── Aggregate rollups in JS (local-day bucketing is TZ-portable) ────────
    let executions = 0;
    let credits = 0;
    let estimatedCost = 0;
    let revenue = 0;
    let conversions = 0;
    let views = 0;
    const byDay = new Map<string, { executions: number; users: number; credits: number; revenue: number }>();
    for (const d of dayKeys) {
      byDay.set(d, { executions: 0, users: 0, credits: 0, revenue: 0 });
    }
    const byAccess = new Map<string, number>();
    const byTool = new Map<string, number>();

    for (const row of stats) {
      const exec = row.executions || 0;
      executions += exec;
      credits += row.credits || 0;
      estimatedCost += row.estimatedCost || 0;
      revenue += row.revenue || 0;
      conversions += row.funnel?.conversions || 0;
      views += row.funnel?.views || 0;

      const key = dayKey(new Date(row.date));
      const bucket = byDay.get(key);
      if (bucket) {
        bucket.executions += exec;
        // Approximation: sum of per-tool daily uniques (rollup can't dedupe across tools)
        bucket.users += row.uniqueUsers || 0;
        bucket.credits += row.credits || 0;
        bucket.revenue += row.revenue || 0;
      }

      const am = row.accessModel || "free";
      byAccess.set(am, (byAccess.get(am) || 0) + exec);

      const toolId = String(row.tool);
      byTool.set(toolId, (byTool.get(toolId) || 0) + exec);
    }

    // ── Growth: last 7 days vs prior 7 days (fixed windows, per plan) ──────
    const todayStart = resolveRange("today").from;
    const last7From = new Date(todayStart);
    last7From.setDate(last7From.getDate() - 6);
    const prior7From = new Date(last7From);
    prior7From.setDate(prior7From.getDate() - 7);
    const growthRows = (await AIToolDailyStat.find({
      date: { $gte: prior7From, $lt: last7From },
    })
      .select("date tool executions")
      .lean()) as unknown as Pick<StatRow, "date" | "tool" | "executions">[];
    const growthStats = await AIToolDailyStat.find({
      date: { $gte: last7From, $lte: resolveRange("today").to },
    })
      .select("tool executions")
      .lean();

    const priorByTool = new Map<string, number>();
    for (const r of growthRows) {
      const id = String(r.tool);
      priorByTool.set(id, (priorByTool.get(id) || 0) + (r.executions || 0));
    }
    const curByTool = new Map<string, number>();
    for (const r of growthStats) {
      const id = String(r.tool);
      curByTool.set(id, (curByTool.get(id) || 0) + (r.executions || 0));
    }
    const toolIds = Array.from(new Set([...byTool.keys(), ...priorByTool.keys(), ...curByTool.keys()]));
    const toolNameById = new Map<string, { name: string; slug: string }>();
    if (toolIds.length > 0) {
      const tools = await AITool.find({ _id: { $in: toolIds } })
        .select("name slug")
        .lean();
      for (const t of tools) toolNameById.set(String(t._id), { name: t.name, slug: t.slug });
    }

    const growthEntries = Array.from(new Set([...priorByTool.keys(), ...curByTool.keys()]))
      .map((id) => {
        const prev = priorByTool.get(id) || 0;
        const cur = curByTool.get(id) || 0;
        const growth = prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100);
        return { id, name: toolNameById.get(id)?.name || "Unknown tool", prev, cur, growth };
      })
      .filter((e) => e.cur > 0 || e.prev > 0);

    const growing = growthEntries
      .filter((e) => e.cur > e.prev || (e.prev === 0 && e.cur > 0))
      .sort((a, b) => b.growth - a.growth)
      .slice(0, 5)
      .map((e) => ({ name: e.name, value: e.growth }));
    const declining = growthEntries
      .filter((e) => e.prev > 0 && e.cur < e.prev)
      .sort((a, b) => a.growth - b.growth)
      .slice(0, 5)
      .map((e) => ({ name: e.name, value: e.growth }));

    const topTools = Array.from(byTool.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, value]) => ({ name: toolNameById.get(id)?.name || "Unknown tool", value }));

    const activeUsers = activeUserIds.length;
    const avgExecutionsPerUser = activeUsers > 0 ? Math.round((executions / activeUsers) * 10) / 10 : 0;

    return NextResponse.json({
      success: true,
      data: {
        kpis: {
          totalTools,
          publishedTools,
          draftTools,
          freeTools,
          freemiumTools,
          subscriptionTools,
          totalUsers,
          activeUsers,
          newUsers,
          executions,
          executionsToday: todayAgg[0]?.executions || 0,
          credits,
          estimatedCost,
          revenue,
          conversions,
          avgExecutionsPerUser,
          views,
        },
        series: {
          byDay: dayKeys.map((d) => ({ date: d, ...byDay.get(d)! })),
          accessMix: ["free", "freemium", "subscription"].map((name) => ({
            name,
            value: byAccess.get(name) || 0,
          })),
          topTools,
          growing,
          declining,
        },
        range: { from: range.from.toISOString(), to: range.to.toISOString(), label: range.label, key: range.key },
      },
    });
  } catch (error) {
    return handleApiError(error, "ai-tools overview GET");
  }
}
