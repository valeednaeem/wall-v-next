import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import AITool from "@/models/ai-tool";
import AIToolDailyStat from "@/models/ai-tool-daily-stat";
import AIToolExecution from "@/models/ai-tool-execution";
import AIToolProvider from "@/models/ai-tool-provider";
import MarketResearch from "@/models/market-research";
import { requireAiToolsPermission, logAiToolAction } from "@/lib/tools/api-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-middleware";
import { resolveRange } from "@/lib/tools/date-range";
import { toCsv, REPORT_TYPES, type ReportType, type CsvCell } from "@/lib/tools/report-csv";

const TZ = process.env.TZ || "UTC";

interface ReportContext {
  from: Date;
  to: Date;
  prevFrom: Date;
  prevTo: Date;
  statMatch: Record<string, unknown>;
  execMatch: Record<string, unknown>;
}

function pct(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

function round(n: number, digits = 4): number {
  const f = Math.pow(10, digits);
  return Math.round(n * f) / f;
}

async function buildReport(
  type: ReportType,
  ctx: ReportContext
): Promise<{ headers: string[]; rows: CsvCell[][] }> {
  const { statMatch, execMatch } = ctx;

  switch (type) {
    case "usage": {
      const [stats, usersAgg] = await Promise.all([
        AIToolDailyStat.aggregate<{
          _id: unknown;
          executions: number;
          success: number;
          failure: number;
          views: number;
          credits: number;
          cost: number;
          accessModel: string;
        }>([
          { $match: statMatch },
          {
            $group: {
              _id: "$tool",
              executions: { $sum: "$executions" },
              success: { $sum: "$successCount" },
              failure: { $sum: "$failureCount" },
              views: { $sum: "$funnel.views" },
              credits: { $sum: "$credits" },
              cost: { $sum: "$estimatedCost" },
              accessModel: { $first: "$accessModel" },
            },
          },
          { $sort: { executions: -1 } },
        ]),
        AIToolExecution.aggregate<{ _id: unknown; users: number }>([
          { $match: { ...execMatch, user: { $ne: null } } },
          { $group: { _id: { tool: "$tool", user: "$user" } } },
          { $group: { _id: "$_id.tool", users: { $sum: 1 } } },
        ]),
      ]);
      const usersById = new Map(usersAgg.map((u) => [String(u._id), u.users]));
      const names = await toolNames(stats.map((s) => s._id));
      return {
        headers: [
          "Tool",
          "Access model",
          "Executions",
          "Success",
          "Failure",
          "Success rate %",
          "Views",
          "Unique users",
          "Credits",
          "Est. cost",
        ],
        rows: stats.map((s) => [
          names.get(String(s._id)) || "Unknown tool",
          s.accessModel,
          s.executions,
          s.success,
          s.failure,
          pct(s.success, s.executions),
          s.views,
          usersById.get(String(s._id)) || 0,
          s.credits,
          round(s.cost),
        ]),
      };
    }

    case "adoption": {
      const daily = await AIToolExecution.aggregate<{
        _id: Date;
        executions: number;
        users: unknown[];
      }>([
        { $match: execMatch },
        {
          $group: {
            _id: { $dateTrunc: { date: "$createdAt", unit: "day", timezone: TZ } },
            executions: { $sum: 1 },
            users: { $addToSet: "$user" },
          },
        },
        { $sort: { _id: 1 } },
      ]);
      return {
        headers: ["Date", "Executions", "Unique users"],
        rows: daily.map((d) => [
          d._id.toISOString().slice(0, 10),
          d.executions,
          d.users.filter((u) => u != null).length,
        ]),
      };
    }

    case "revenue": {
      const stats = await AIToolDailyStat.aggregate<{
        _id: unknown;
        revenue: number;
        cost: number;
        conversions: number;
        executions: number;
      }>([
        { $match: statMatch },
        {
          $group: {
            _id: "$tool",
            revenue: { $sum: "$revenue" },
            cost: { $sum: "$estimatedCost" },
            conversions: { $sum: "$funnel.conversions" },
            executions: { $sum: "$executions" },
          },
        },
        { $sort: { revenue: -1, cost: -1 } },
      ]);
      const names = await toolNames(stats.map((s) => s._id));
      return {
        headers: ["Tool", "Executions", "Conversions", "Revenue", "Est. cost", "Profit contribution"],
        rows: stats.map((s) => [
          names.get(String(s._id)) || "Unknown tool",
          s.executions,
          s.conversions,
          round(s.revenue),
          round(s.cost),
          round(s.revenue - s.cost),
        ]),
      };
    }

    case "credits": {
      const stats = await AIToolDailyStat.aggregate<{
        _id: unknown;
        executions: number;
        credits: number;
        accessModel: string;
      }>([
        { $match: statMatch },
        {
          $group: {
            _id: "$tool",
            executions: { $sum: "$executions" },
            credits: { $sum: "$credits" },
            accessModel: { $first: "$accessModel" },
          },
        },
        { $sort: { credits: -1 } },
      ]);
      const names = await toolNames(stats.map((s) => s._id));
      return {
        headers: ["Tool", "Access model", "Executions", "Credits", "Credits per execution"],
        rows: stats.map((s) => [
          names.get(String(s._id)) || "Unknown tool",
          s.accessModel,
          s.executions,
          s.credits,
          s.executions > 0 ? round(s.credits / s.executions, 2) : 0,
        ]),
      };
    }

    case "cost": {
      const stats = await AIToolDailyStat.aggregate<{ _id: unknown; cost: number; executions: number }>([
        { $match: statMatch },
        {
          $group: {
            _id: "$tool",
            cost: { $sum: "$estimatedCost" },
            executions: { $sum: "$executions" },
          },
        },
        { $sort: { cost: -1 } },
      ]);
      const total = stats.reduce((s, r) => s + r.cost, 0);
      const names = await toolNames(stats.map((s) => s._id));
      return {
        headers: ["Tool", "Executions", "Est. cost", "Share of cost %", "Cost per execution"],
        rows: stats.map((s) => [
          names.get(String(s._id)) || "Unknown tool",
          s.executions,
          round(s.cost),
          pct(s.cost, total),
          s.executions > 0 ? round(s.cost / s.executions, 6) : 0,
        ]),
      };
    }

    case "access": {
      const [byAccess, toolCounts] = await Promise.all([
        AIToolDailyStat.aggregate<{ _id: string; executions: number; credits: number; revenue: number }>([
          { $match: statMatch },
          {
            $group: {
              _id: "$accessModel",
              executions: { $sum: "$executions" },
              credits: { $sum: "$credits" },
              revenue: { $sum: "$revenue" },
            },
          },
        ]),
        AITool.aggregate<{ _id: string; count: number }>([
          ...(statMatch.accessModel ? [{ $match: { accessModel: statMatch.accessModel } }] : []),
          { $group: { _id: "$accessModel", count: { $sum: 1 } } },
        ]),
      ]);
      const countById = new Map(toolCounts.map((t) => [t._id, t.count]));
      return {
        headers: ["Access model", "Tools", "Executions", "Credits", "Revenue"],
        rows: ["free", "freemium", "subscription"].map((am) => {
          const row = byAccess.find((r) => r._id === am);
          return [am, countById.get(am) || 0, row?.executions || 0, row?.credits || 0, round(row?.revenue || 0)];
        }),
      };
    }

    case "conversion": {
      const stats = await AIToolDailyStat.aggregate<{
        _id: unknown;
        views: number;
        started: number;
        attempted: number;
        succeeded: number;
        prompts: number;
        conversions: number;
      }>([
        { $match: statMatch },
        {
          $group: {
            _id: "$tool",
            views: { $sum: "$funnel.views" },
            started: { $sum: "$funnel.started" },
            attempted: { $sum: "$funnel.attempted" },
            succeeded: { $sum: "$funnel.succeeded" },
            prompts: { $sum: "$funnel.upgradePrompts" },
            conversions: { $sum: "$funnel.conversions" },
          },
        },
        { $sort: { views: -1 } },
      ]);
      const names = await toolNames(stats.map((s) => s._id));
      return {
        headers: [
          "Tool",
          "Views",
          "Opened",
          "Attempted",
          "Succeeded",
          "Upgrade prompts",
          "Conversions",
          "View to success %",
          "View to conversion %",
        ],
        rows: stats.map((s) => [
          names.get(String(s._id)) || "Unknown tool",
          s.views,
          s.started,
          s.attempted,
          s.succeeded,
          s.prompts,
          s.conversions,
          pct(s.succeeded, s.views),
          pct(s.conversions, s.views),
        ]),
      };
    }

    case "seo": {
      const tools = await AITool.find({}).select("name slug status seo").lean();
      return {
        headers: [
          "Tool",
          "Status",
          "Meta title",
          "Meta description",
          "Keywords count",
          "Canonical URL",
          "Completeness %",
          "Indexed",
          "Source",
        ],
        rows: tools.map((t) => {
          const seo = (
            t as unknown as {
              seo?: { metaTitle?: string; metaDescription?: string; keywords?: string[]; canonicalUrl?: string };
            }
          ).seo;
          const checks = [
            Boolean(seo?.metaTitle),
            Boolean(seo?.metaDescription),
            (seo?.keywords?.length || 0) > 0,
            Boolean(seo?.canonicalUrl),
          ];
          return [
            t.name,
            t.status,
            seo?.metaTitle || "",
            seo?.metaDescription || "",
            seo?.keywords?.length || 0,
            seo?.canonicalUrl || "",
            Math.round((checks.filter(Boolean).length / 4) * 100),
            "not_connected",
            "not_connected",
          ];
        }),
      };
    }

    case "growth": {
      const [current, previous] = await Promise.all([
        AIToolDailyStat.aggregate<{ _id: unknown; executions: number }>([
          { $match: statMatch },
          { $group: { _id: "$tool", executions: { $sum: "$executions" } } },
        ]),
        AIToolDailyStat.aggregate<{ _id: unknown; executions: number }>([
          { $match: { ...statMatch, date: { $gte: ctx.prevFrom, $lte: ctx.prevTo } } },
          { $group: { _id: "$tool", executions: { $sum: "$executions" } } },
        ]),
      ]);
      const prevById = new Map(previous.map((p) => [String(p._id), p.executions]));
      const ids = Array.from(new Set([...current.map((c) => String(c._id)), ...prevById.keys()]));
      const names = await toolNames(ids);
      const rows = current.map((c) => {
        const id = String(c._id);
        const prev = prevById.get(id) || 0;
        const growth = prev === 0 ? (c.executions > 0 ? 100 : 0) : pct(c.executions - prev, prev);
        return [names.get(id) || "Unknown tool", prev, c.executions, growth];
      });
      rows.sort((a, b) => Number(b[3]) - Number(a[3]));
      return {
        headers: ["Tool", "Previous window executions", "Current window executions", "Growth %"],
        rows,
      };
    }

    case "errors": {
      const [perTool, errorTypes] = await Promise.all([
        AIToolExecution.aggregate<{ _id: unknown; executions: number; failures: number }>([
          { $match: { ...execMatch, status: { $ne: "started" } } },
          {
            $group: {
              _id: "$tool",
              executions: { $sum: 1 },
              failures: { $sum: { $cond: [{ $in: ["$status", ["failed", "timeout"]] }, 1, 0] } },
            },
          },
        ]),
        AIToolExecution.aggregate<{ _id: { tool: unknown; errorType: string }; n: number }>([
          { $match: { ...execMatch, status: { $in: ["failed", "timeout"] } } },
          {
            $group: {
              _id: { tool: "$tool", errorType: { $ifNull: ["$errorType", "unknown"] } },
              n: { $sum: 1 },
            },
          },
          { $sort: { n: -1 } },
        ]),
      ]);
      const topError = new Map<string, { type: string; n: number }>();
      for (const e of errorTypes) {
        const id = String(e._id.tool);
        if (!topError.has(id)) topError.set(id, { type: e._id.errorType, n: e.n });
      }
      const names = await toolNames(perTool.map((p) => p._id));
      return {
        headers: ["Tool", "Executions", "Failures", "Error rate %", "Top error type", "Top error count"],
        rows: perTool
          .map((p) => {
            const id = String(p._id);
            const top = topError.get(id);
            return [
              names.get(id) || "Unknown tool",
              p.executions,
              p.failures,
              pct(p.failures, p.executions),
              top?.type || "",
              top?.n || 0,
            ];
          })
          .sort((a, b) => Number(b[3]) - Number(a[3])),
      };
    }

    case "providers": {
      const [usage, providers] = await Promise.all([
        AIToolExecution.aggregate<{
          _id: unknown;
          executions: number;
          success: number;
          credits: number;
          cost: number;
        }>([
          { $match: execMatch },
          {
            $group: {
              _id: "$provider",
              executions: { $sum: 1 },
              success: { $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] } },
              credits: { $sum: "$creditsConsumed" },
              cost: { $sum: "$estimatedCost" },
            },
          },
          { $sort: { executions: -1 } },
        ]),
        AIToolProvider.find({}).select("name type status isDefault models").lean(),
      ]);
      const byId = new Map(providers.map((p) => [String(p._id), p]));
      return {
        headers: [
          "Provider",
          "Type",
          "Status",
          "Default",
          "Executions",
          "Success rate %",
          "Credits",
          "Est. cost",
          "Enabled models",
        ],
        rows: usage.map((u) => {
          const id = u._id ? String(u._id) : "default";
          const p = id !== "default" ? byId.get(id) : undefined;
          return [
            p?.name || "Default provider",
            p?.type || "—",
            p?.status || "—",
            p?.isDefault ? "yes" : "no",
            u.executions,
            pct(u.success, u.executions),
            u.credits,
            round(u.cost),
            p ? p.models.filter((m: { enabled?: boolean }) => m.enabled).length : "—",
          ];
        }),
      };
    }

    case "market": {
      const docs = await MarketResearch.find({}).sort({ researchedAt: -1 }).lean();
      return {
        headers: [
          "Competitor",
          "Product",
          "Category",
          "Pricing",
          "URL",
          "Target audience",
          "Positioning",
          "Researched at",
          "Notes",
        ],
        rows: docs.map((m) => [
          m.competitor,
          m.product,
          m.category || "",
          m.pricing || "",
          m.url || "",
          m.targetAudience || "",
          m.positioning || "",
          m.researchedAt ? new Date(m.researchedAt).toISOString().slice(0, 10) : "",
          m.notes || "",
        ]),
      };
    }
  }
}

async function toolNames(ids: unknown[]): Promise<Map<string, string>> {
  const valid = ids.filter((v): v is mongoose.Types.ObjectId => v != null);
  if (valid.length === 0) return new Map();
  const docs = await AITool.find({ _id: { $in: valid } })
    .select("name")
    .lean();
  return new Map(docs.map((d) => [String(d._id), d.name]));
}

export async function GET(request: Request) {
  try {
    const guard = await requireAiToolsPermission(PERMISSIONS.AI_TOOLS_REPORTS);
    if (guard.error) return guard.error;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as ReportType;
    if (!type || !REPORT_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Valid types: ${REPORT_TYPES.join(", ")}` },
        { status: 400 }
      );
    }
    const format = searchParams.get("format") || "csv";
    if (format !== "csv") {
      return NextResponse.json({ error: "Only csv format is supported" }, { status: 400 });
    }

    const range = resolveRange(
      searchParams.get("range"),
      searchParams.get("start"),
      searchParams.get("end")
    );
    const toolId = searchParams.get("toolId");
    const category = searchParams.get("category");
    const accessModel = searchParams.get("accessModel");
    const userType = searchParams.get("userType");
    if (toolId && !mongoose.Types.ObjectId.isValid(toolId)) {
      return NextResponse.json({ error: "Invalid toolId" }, { status: 400 });
    }
    if (category && !mongoose.Types.ObjectId.isValid(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    if (accessModel && !["free", "freemium", "subscription"].includes(accessModel)) {
      return NextResponse.json({ error: "Invalid accessModel" }, { status: 400 });
    }
    if (userType && !["authenticated", "anonymous"].includes(userType)) {
      return NextResponse.json({ error: "Invalid userType" }, { status: 400 });
    }

    await connectToDatabase();

    const span = range.to.getTime() - range.from.getTime();
    const prevTo = new Date(range.from.getTime() - 1);
    const prevFrom = new Date(prevTo.getTime() - span);

    const statMatch: Record<string, unknown> = { date: { $gte: range.from, $lte: range.to } };
    if (toolId) statMatch.tool = new mongoose.Types.ObjectId(toolId);
    if (category) statMatch.category = new mongoose.Types.ObjectId(category);
    if (accessModel) statMatch.accessModel = accessModel;

    const execMatch: Record<string, unknown> = { createdAt: { $gte: range.from, $lte: range.to } };
    if (toolId) execMatch.tool = new mongoose.Types.ObjectId(toolId);
    if (accessModel) execMatch.accessModel = accessModel;
    if (userType === "authenticated") execMatch.user = { $ne: null };
    if (userType === "anonymous") execMatch.user = null;

    const ctx: ReportContext = { from: range.from, to: range.to, prevFrom, prevTo, statMatch, execMatch };
    const { headers, rows } = await buildReport(type, ctx);
    const csv = toCsv(headers, rows);

    await logAiToolAction(guard.user, "report.generated", "AIToolReport", type, {
      range: range.key,
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      toolId: toolId || null,
      category: category || null,
      accessModel: accessModel || null,
      userType: userType || null,
      rowCount: rows.length,
    });

    const fromStr = range.from.toISOString().slice(0, 10);
    const toStr = range.to.toISOString().slice(0, 10);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ai-tools-${type}-${fromStr}-${toStr}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleApiError(error, "ai-tools reports GET");
  }
}
