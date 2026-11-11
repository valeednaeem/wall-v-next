import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import AITool from "@/models/ai-tool";
import AIToolExecution from "@/models/ai-tool-execution";
import AIToolProvider from "@/models/ai-tool-provider";
import User from "@/models/user";
import { requireAiToolsPermission } from "@/lib/tools/api-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { handleApiError } from "@/lib/api-middleware";
import { resolveRange, dayKey } from "@/lib/tools/date-range";

const GROUP_BY = ["tool", "user", "provider", "date"] as const;
type GroupBy = (typeof GROUP_BY)[number];

interface GroupedRow {
  _id: unknown;
  executions: number;
  success: number;
  failed: number;
  credits: number;
  cost: number;
  inputTokens: number;
  outputTokens: number;
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
    const raw = searchParams.get("raw") === "true";
    const groupByParam = searchParams.get("groupBy") || "tool";
    if (!GROUP_BY.includes(groupByParam as GroupBy)) {
      return NextResponse.json({ error: "Invalid groupBy" }, { status: 400 });
    }
    const groupBy = groupByParam as GroupBy;
    const toolId = searchParams.get("toolId");
    if (toolId && !mongoose.Types.ObjectId.isValid(toolId)) {
      return NextResponse.json({ error: "Invalid toolId" }, { status: 400 });
    }

    await connectToDatabase();

    const match: Record<string, unknown> = { createdAt: { $gte: range.from, $lte: range.to } };
    if (toolId) match.tool = new mongoose.Types.ObjectId(toolId);

    const totalsAgg = await AIToolExecution.aggregate<{
      executions: number;
      success: number;
      credits: number;
      cost: number;
      users: unknown[];
    }>([
      { $match: match },
      {
        $group: {
          _id: null,
          executions: { $sum: 1 },
          success: { $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] } },
          credits: { $sum: "$creditsConsumed" },
          cost: { $sum: "$estimatedCost" },
          users: { $addToSet: "$user" },
        },
      },
    ]);
    const t = totalsAgg[0];
    const executions = t?.executions || 0;
    const totals = {
      executions,
      success: t?.success || 0,
      successRate: executions > 0 ? Math.round(((t?.success || 0) / executions) * 100) : 0,
      credits: t?.credits || 0,
      estimatedCost: t?.cost || 0,
      avgCostPerExecution: executions > 0 ? Math.round(((t?.cost || 0) / executions) * 10000) / 10000 : 0,
      uniqueUsers: (t?.users || []).filter((u) => u != null).length,
    };

    if (raw) {
      const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
      const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10) || 20));
      const [rows, total] = await Promise.all([
        AIToolExecution.find(match)
          .select("tool user provider aiModel status creditsConsumed estimatedCost durationMs errorType createdAt")
          .sort({ createdAt: -1 })
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .populate("tool", "name slug")
          .populate("user", "name email")
          .populate("provider", "name")
          .lean(),
        AIToolExecution.countDocuments(match),
      ]);
      return NextResponse.json({
        success: true,
        data: {
          raw: rows.map((r) => {
            const row = r as unknown as {
              _id: unknown;
              tool?: { name?: string } | null;
              user?: { name?: string; email?: string } | null;
              provider?: { name?: string } | null;
              aiModel?: string;
              status: string;
              creditsConsumed: number;
              estimatedCost?: number;
              durationMs?: number;
              errorType?: string;
              createdAt: Date;
            };
            return {
              id: String(row._id),
              tool: row.tool?.name || "Unknown",
              user: row.user?.name || row.user?.email || "Anonymous",
              provider: row.provider?.name || "Default",
              aiModel: row.aiModel || "—",
              status: row.status,
              credits: row.creditsConsumed,
              estimatedCost: row.estimatedCost || 0,
              durationMs: row.durationMs || 0,
              errorType: row.errorType || null,
              createdAt: row.createdAt,
            };
          }),
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
        totals,
        range: { from: range.from, to: range.to, label: range.label, key: range.key },
      });
    }

    const groupId =
      groupBy === "tool"
        ? "$tool"
        : groupBy === "user"
          ? "$user"
          : groupBy === "provider"
            ? "$provider"
            : { $dateTrunc: { date: "$createdAt", unit: "day" } };

    const groupMatch = groupBy === "user" ? { ...match, user: { $ne: null } } : match;

    const sortStage: import("mongoose").PipelineStage.Sort =
      groupBy === "date" ? { $sort: { _id: 1 } } : { $sort: { credits: -1, executions: -1 } };

    const grouped = await AIToolExecution.aggregate<GroupedRow>([
      { $match: groupMatch },
      {
        $group: {
          _id: groupId,
          executions: { $sum: 1 },
          success: { $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
          credits: { $sum: "$creditsConsumed" },
          cost: { $sum: "$estimatedCost" },
          inputTokens: { $sum: "$inputTokens" },
          outputTokens: { $sum: "$outputTokens" },
        },
      },
      sortStage,
      { $limit: groupBy === "date" ? 400 : 100 },
    ]);

    // Resolve display names
    const idKey =
      groupBy === "tool" ? "toolIds" : groupBy === "user" ? "userIds" : groupBy === "provider" ? "providerIds" : "";
    const ids = grouped.map((g) => g._id).filter((v): v is mongoose.Types.ObjectId => v != null);
    const nameById = new Map<string, string>();
    if (idKey && ids.length > 0) {
      const Model = idKey === "toolIds" ? AITool : idKey === "userIds" ? User : AIToolProvider;
      const docs = await Model.find({ _id: { $in: ids } }).select("name email").lean();
      for (const d of docs as { _id: unknown; name?: string; email?: string }[]) {
        nameById.set(String(d._id), d.name || d.email || "Unknown");
      }
    }

    const rows = grouped.map((g) => {
      const base = {
        executions: g.executions,
        success: g.success,
        failed: g.failed,
        credits: g.credits,
        estimatedCost: g.cost,
        avgCostPerExecution: g.executions > 0 ? Math.round((g.cost / g.executions) * 10000) / 10000 : 0,
        inputTokens: g.inputTokens,
        outputTokens: g.outputTokens,
      };
      if (groupBy === "date") {
        const d = g._id instanceof Date ? dayKey(g._id) : String(g._id);
        return { key: d, label: d, ...base };
      }
      if (groupBy === "provider") {
        const key = g._id ? String(g._id) : "default";
        return { key, label: nameById.get(key) || "Default provider", ...base };
      }
      const key = String(g._id);
      const label = nameById.get(key) || (groupBy === "user" ? "User" : "Unknown tool");
      return { key, label, ...base };
    });

    return NextResponse.json({
      success: true,
      data: {
        groupBy,
        rows,
        totals,
        range: { from: range.from, to: range.to, label: range.label, key: range.key },
      },
    });
  } catch (error) {
    return handleApiError(error, "ai-tools usage GET");
  }
}
