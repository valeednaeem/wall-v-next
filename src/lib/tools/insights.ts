import AITool from "@/models/ai-tool";
import AIToolCategory from "@/models/ai-tool-category";
import AIToolDailyStat from "@/models/ai-tool-daily-stat";
import AIToolExecution from "@/models/ai-tool-execution";

export interface Insight {
  id: string;
  text: string;
  metric: string;
  range: string;
  severity: "warning" | "opportunity" | "info";
  drilldown: { tab: string; toolId?: string };
  source: "computed" | "ai";
}

const SEVERITY_ORDER: Record<Insight["severity"], number> = { warning: 0, opportunity: 1, info: 2 };

function pct(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

function growthPct(prev: number, cur: number): number {
  if (prev === 0) return cur > 0 ? 100 : 0;
  return Math.round(((cur - prev) / prev) * 100);
}

function rangeLabel(from: Date, to: Date, prevFrom: Date | null): string {
  const f = from.toISOString().slice(0, 10);
  const t = to.toISOString().slice(0, 10);
  if (!prevFrom) return `${f} → ${t}`;
  return `${f} → ${t} vs previous equal window from ${prevFrom.toISOString().slice(0, 10)}`;
}

export async function generateInsights(from: Date, to: Date): Promise<Insight[]> {
  const span = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - span);
  const label = rangeLabel(from, to, prevFrom);

  const groupStage = {
    $group: {
      _id: "$tool",
      executions: { $sum: "$executions" },
      failure: { $sum: "$failureCount" },
      credits: { $sum: "$credits" },
      cost: { $sum: "$estimatedCost" },
      views: { $sum: "$funnel.views" },
      upgradePrompts: { $sum: "$funnel.upgradePrompts" },
      conversions: { $sum: "$funnel.conversions" },
    },
  };

  const [current, previous, repeatAgg, toolDocs] = await Promise.all([
    AIToolDailyStat.aggregate<{
      _id: unknown;
      executions: number;
      failure: number;
      cost: number;
      views: number;
      upgradePrompts: number;
      conversions: number;
    }>([{ $match: { date: { $gte: from, $lte: to } } }, groupStage]),
    AIToolDailyStat.aggregate<{ _id: unknown; executions: number }>([
      { $match: { date: { $gte: prevFrom, $lte: prevTo } } },
      { $group: { _id: "$tool", executions: { $sum: "$executions" } } },
    ]),
    // Users with 2+ executions per tool (repeat users)
    AIToolExecution.aggregate<{ _id: { tool: unknown; user: unknown }; n: number }>([
      { $match: { user: { $ne: null }, createdAt: { $gte: from, $lte: to } } },
      { $group: { _id: { tool: "$tool", user: "$user" }, n: { $sum: 1 } } },
    ]),
    AITool.find({})
      .select("name slug accessModel status category")
      .lean(),
  ]);

  const prevById = new Map<string, number>();
  for (const p of previous) prevById.set(String(p._id), p.executions || 0);

  const uniqueUsers = new Map<string, Set<string>>();
  const repeatUsers = new Map<string, number>();
  for (const r of repeatAgg) {
    const id = String(r._id.tool);
    if (!uniqueUsers.has(id)) uniqueUsers.set(id, new Set());
    uniqueUsers.get(id)!.add(String(r._id.user));
    if (r.n > 1) repeatUsers.set(id, (repeatUsers.get(id) || 0) + 1);
  }

  const toolMeta = new Map(
    toolDocs.map((t) => [
      String(t._id),
      { name: t.name, accessModel: t.accessModel, status: t.status, category: String(t.category || "") },
    ])
  );

  const totalExec = current.reduce((s, c) => s + c.executions, 0);
  const totalCost = current.reduce((s, c) => s + c.cost, 0);
  const insights: Insight[] = [];

  // ── 1. Usage growth ≥ 20% vs previous window (per tool, top grower) ──────
  const growthRows = current
    .map((c) => {
      const id = String(c._id);
      const prev = prevById.get(id) || 0;
      return { id, cur: c.executions, prev, growth: growthPct(prev, c.executions) };
    })
    .filter((g) => g.cur > 0 && g.growth >= 20)
    .sort((a, b) => b.growth - a.growth);
  for (const g of growthRows.slice(0, 2)) {
    const name = toolMeta.get(g.id)?.name || "Unknown tool";
    insights.push({
      id: `growth-${g.id}`,
      text: `${name} usage increased ${g.growth}% — ${g.cur} executions vs ${g.prev} in the previous window.`,
      metric: `growth ${g.growth}%`,
      range: label,
      severity: "info",
      drilldown: { tab: "performance", toolId: g.id },
      source: "computed",
    });
  }

  // ── 2. High views but repeatRate < 15% ───────────────────────────────────
  const withViews = current.filter((c) => c.views > 0);
  if (withViews.length > 0) {
    const maxViews = Math.max(...withViews.map((c) => c.views));
    for (const c of withViews) {
      const id = String(c._id);
      if (c.views < maxViews) continue; // top-decile proxy: top views holder
      const users = uniqueUsers.get(id)?.size || 0;
      const repeats = repeatUsers.get(id) || 0;
      const repeatRate = pct(repeats, users);
      if (users > 0 && repeatRate < 15) {
        const name = toolMeta.get(id)?.name || "Unknown tool";
        insights.push({
          id: `low-repeat-${id}`,
          text: `${name} gets high traffic (${c.views} views) but only ${repeatRate}% of users come back for a second run.`,
          metric: `repeat rate ${repeatRate}%`,
          range: label,
          severity: "opportunity",
          drilldown: { tab: "funnel", toolId: id },
          source: "computed",
        });
      }
    }
  }

  // ── 3. Single tool > 35% of estimated AI API cost ────────────────────────
  if (totalCost > 0 && current.length > 1) {
    const costSorted = [...current].sort((a, b) => b.cost - a.cost);
    const top = costSorted[0];
    const share = pct(top.cost, totalCost);
    if (share > 35) {
      const id = String(top._id);
      const name = toolMeta.get(id)?.name || "Unknown tool";
      insights.push({
        id: `cost-concentration-${id}`,
        text: `${name} accounts for ${share}% of AI API costs in this range ($${top.cost.toFixed(4)}).`,
        metric: `cost share ${share}%`,
        range: label,
        severity: "warning",
        drilldown: { tab: "usage", toolId: id },
        source: "computed",
      });
    }
  }

  // ── 4. Freemium tools frequently hitting free usage limits ───────────────
  for (const c of current) {
    const id = String(c._id);
    const meta = toolMeta.get(id);
    if (!meta || meta.accessModel !== "freemium") continue;
    const promptRate = pct(c.upgradePrompts, c.executions);
    if (c.upgradePrompts > 0 && promptRate >= 20) {
      insights.push({
        id: `limit-reached-${id}`,
        text: `${meta.name} users reached the free usage limit frequently — upgrade prompts on ${promptRate}% of executions.`,
        metric: `upgrade prompt rate ${promptRate}%`,
        range: label,
        severity: "opportunity",
        drilldown: { tab: "funnel", toolId: id },
        source: "computed",
      });
    }
  }

  // ── 5. Error rate > 10% ──────────────────────────────────────────────────
  for (const c of current) {
    const id = String(c._id);
    const errRate = pct(c.failure, c.executions);
    if (c.executions >= 10 && errRate > 10) {
      const name = toolMeta.get(id)?.name || "Unknown tool";
      insights.push({
        id: `error-rate-${id}`,
        text: `${name} has a high execution failure rate (${errRate}% — ${c.failure} of ${c.executions} executions failed).`,
        metric: `error rate ${errRate}%`,
        range: label,
        severity: "warning",
        drilldown: { tab: "performance", toolId: id },
        source: "computed",
      });
    }
  }

  // ── 6. Category growth comparison ────────────────────────────────────────
  const categoryGrowth = new Map<string, { cur: number; prev: number }>();
  for (const c of current) {
    const id = String(c._id);
    const cat = toolMeta.get(id)?.category;
    if (!cat) continue;
    const entry = categoryGrowth.get(cat) || { cur: 0, prev: 0 };
    entry.cur += c.executions;
    entry.prev += prevById.get(id) || 0;
    categoryGrowth.set(cat, entry);
  }
  if (categoryGrowth.size >= 2) {
    const categoryDocs = await AIToolCategory.find({ _id: { $in: Array.from(categoryGrowth.keys()) } })
      .select("name")
      .lean();
    const names = new Map(categoryDocs.map((d) => [String(d._id), d.name]));
    const rows = Array.from(categoryGrowth.entries())
      .map(([cat, v]) => ({ cat, name: names.get(cat) || "Category", growth: growthPct(v.prev, v.cur), cur: v.cur }))
      .filter((r) => r.cur > 0)
      .sort((a, b) => b.growth - a.growth);
    if (rows.length >= 2 && rows[0].growth >= 20 && rows[0].growth > rows[rows.length - 1].growth) {
      const slowest = rows[rows.length - 1];
      insights.push({
        id: `category-growth-${rows[0].cat}`,
        text: `Category "${rows[0].name}" grew ${rows[0].growth}% while "${slowest.name}" grew ${slowest.growth}% — consider rebalancing catalogue promotion.`,
        metric: `category growth ${rows[0].growth}% vs ${slowest.growth}%`,
        range: label,
        severity: "info",
        drilldown: { tab: "global" },
        source: "computed",
      });
    }
  }

  // Overall usage trend when there is a global swing
  const curTotal = totalExec;
  const prevTotal = previous.reduce((s, p) => s + p.executions, 0);
  const overallGrowth = growthPct(prevTotal, curTotal);
  if (prevTotal > 0 && Math.abs(overallGrowth) >= 20) {
    insights.push({
      id: "overall-usage",
      text:
        overallGrowth > 0
          ? `Overall tool usage grew ${overallGrowth}% vs the previous window (${curTotal} vs ${prevTotal} executions).`
          : `Overall tool usage dropped ${Math.abs(overallGrowth)}% vs the previous window (${curTotal} vs ${prevTotal} executions).`,
      metric: `usage ${overallGrowth > 0 ? "+" : ""}${overallGrowth}%`,
      range: label,
      severity: overallGrowth > 0 ? "info" : "warning",
      drilldown: { tab: "global" },
      source: "computed",
    });
  }

  return insights.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
