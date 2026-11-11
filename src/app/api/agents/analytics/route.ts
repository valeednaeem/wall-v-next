import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import AgentExecution from "@/models/agent-execution";
import Agent from "@/models/agent";
import connectToDatabase from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    const url = new URL(request.url);
    const period = url.searchParams.get("period") || "7d";
    const days = period === "30d" ? 30 : period === "90d" ? 90 : 7;
    const since = new Date(Date.now() - days * 86400000);

    const [topAgents, divisionStats, typeStats, costOverTime, agentWorkload] = await Promise.all([
      AgentExecution.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: {
          _id: "$agent",
          totalExecutions: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
          totalCost: { $sum: "$cost" },
          totalTokens: { $sum: "$tokens.total" },
          avgDuration: { $avg: "$duration" },
        }},
        { $lookup: { from: "agents", localField: "_id", foreignField: "_id", as: "agent" } },
        { $unwind: { path: "$agent", preserveNullAndEmptyArrays: true } },
        { $project: {
          _id: 1, name: "$agent.name", slug: "$agent.slug", role: "$agent.role", division: "$agent.division",
          totalExecutions: 1, completed: 1, failed: 1,
          successRate: { $cond: [{ $gt: [{ $add: ["$completed", "$failed"] }, 0] },
            { $multiply: [{ $divide: ["$completed", { $add: ["$completed", "$failed"] }] }, 100] }, 100] },
          totalCost: { $round: ["$totalCost", 4] }, totalTokens: 1, avgDuration: { $round: ["$avgDuration", 0] },
        }},
        { $sort: { totalExecutions: -1 } },
        { $limit: 20 },
      ]),
      AgentExecution.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $lookup: { from: "agents", localField: "agent", foreignField: "_id", as: "agentDoc" } },
        { $unwind: { path: "$agentDoc", preserveNullAndEmptyArrays: true } },
        { $group: {
          _id: "$agentDoc.division",
          totalExecutions: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
          totalCost: { $sum: "$cost" },
        }},
        { $project: { _id: 1, totalExecutions: 1, completed: 1, failed: 1, totalCost: { $round: ["$totalCost", 4] } } },
        { $sort: { totalExecutions: -1 } },
      ]),
      AgentExecution.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: { type: "$type", status: "$status" }, count: { $sum: 1 } } },
      ]),
      AgentExecution.aggregate([
        { $match: { createdAt: { $gte: since }, status: "completed" } },
        { $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          executions: { $sum: 1 },
          cost: { $sum: "$cost" },
          tokens: { $sum: "$tokens.total" },
        }},
        { $sort: { _id: 1 } },
      ]),
      Agent.aggregate([
        { $match: { status: "active" } },
        { $project: {
          name: 1, slug: 1, role: 1, division: 1,
          totalExecutions: "$stats.totalExecutions",
          failedExecutions: "$stats.failedExecutions",
        }},
        { $sort: { totalExecutions: -1 } },
        { $limit: 15 },
      ]),
    ]);

    return NextResponse.json({
      topAgents,
      divisionStats,
      typeStats: Object.fromEntries(typeStats.map((t) => [`${t._id.type}:${t._id.status}`, t.count])),
      costOverTime,
      agentWorkload,
      period,
      since,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch analytics";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
