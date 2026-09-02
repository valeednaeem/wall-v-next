import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Agent from "@/models/agent";
import Task from "@/models/task";
import PmAlert from "@/models/pm-alert";

/**
 * GET /api/pm/healthcheck — lightweight health check for monitoring.
 * Returns system status without auth (for uptime monitors).
 */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const [agentCount, activeAgents, taskCount, overdueTasks, activeAlerts] = await Promise.all([
      Agent.countDocuments(),
      Agent.countDocuments({ status: "active" }),
      Task.countDocuments(),
      Task.countDocuments({ status: { $ne: "done" }, dueDate: { $lt: new Date() } }),
      PmAlert.countDocuments({ status: "active", severity: "critical" }),
    ]);

    const status = activeAlerts > 5 ? "degraded" : "healthy";

    return NextResponse.json({
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database: "ok",
        agents: { total: agentCount, active: activeAgents },
        tasks: { total: taskCount, overdue: overdueTasks },
        criticalAlerts: activeAlerts,
      },
    });
  } catch (error) {
    return NextResponse.json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: "Database connection failed",
    }, { status: 503 });
  }
}
