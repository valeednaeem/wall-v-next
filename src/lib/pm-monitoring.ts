/**
 * PM Monitoring Engine — real-time system health, alerts, and workload monitoring.
 *
 * Checks:
 * - Agent health (execution success, failures, last active)
 * - Project health (progress, blockers, overdue tasks)
 * - Capacity alerts (overloaded agents/humans)
 * - Deadline alerts (overdue tasks, at-risk deadlines)
 * - Risk alerts (unmitigated high-severity risks)
 * - Skill gaps (uncovered capabilities)
 * - System health (model availability, API response times)
 */

import connectToDatabase from "@/lib/mongodb";
import Agent from "@/models/agent";
import Task from "@/models/task";
import Project from "@/models/project";
import PmAlert from "@/models/pm-alert";
import PmRisk from "@/models/pm-risk";
import PmIssue from "@/models/pm-issue";
import PmCapacity from "@/models/pm-capacity";

export interface SystemHealthStatus {
  timestamp: Date;
  overall: "healthy" | "degraded" | "unhealthy" | "critical";
  score: number;
  agents: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    offline: number;
  };
  projects: {
    total: number;
    onTrack: number;
    atRisk: number;
    overdue: number;
    blocked: number;
  };
  alerts: {
    total: number;
    critical: number;
    high: number;
    warning: number;
    info: number;
    unresolved: number;
  };
  risks: {
    total: number;
    critical: number;
    high: number;
    unmitigated: number;
  };
  issues: {
    total: number;
    critical: number;
    open: number;
  };
  capacity: {
    overloadedAgents: string[];
    overloadedHumans: string[];
    totalOverloaded: number;
  };
  deadlines: {
    overdueTasks: number;
    tasksDueToday: number;
    tasksDueThisWeek: number;
  };
  checks: HealthCheck[];
}

export interface HealthCheck {
  name: string;
  status: "pass" | "warn" | "fail";
  message: string;
  value?: number;
  threshold?: number;
  category: string;
}

/**
 * Run all monitoring checks and return system health.
 */
export async function getSystemHealth(): Promise<SystemHealthStatus> {
  await connectToDatabase();

  const checks: HealthCheck[] = [];

  // 1. Agent Health
  const agents = await Agent.find({ status: { $ne: "inactive" } })
    .select("name slug status stats aiModel channels skills tools workflows")
    .lean();

  let agentHealthy = 0, agentDegraded = 0, agentUnhealthy = 0, agentOffline = 0;

  for (const agent of agents) {
    const a = agent as any;
    const totalExec = a.stats?.totalExecutions || 0;
    const successRate = totalExec > 0 ? (a.stats?.successfulExecutions || 0) / totalExec : 0;
    const lastActive = a.stats?.lastActive ? new Date(a.stats.lastActive).getTime() : 0;
    const daysSinceActive = lastActive ? (Date.now() - lastActive) / (1000 * 60 * 60 * 24) : 999;

    if (a.status === "inactive" || daysSinceActive > 30) {
      agentOffline++;
    } else if (a.status === "active" && successRate >= 0.8 && daysSinceActive < 7) {
      agentHealthy++;
    } else if (a.status === "active" && (successRate >= 0.5 || daysSinceActive < 14)) {
      agentDegraded++;
    } else {
      agentUnhealthy++;
    }
  }

  checks.push({
    name: "Agent Health",
    status: agentUnhealthy > 0 ? "fail" : agentDegraded > 0 ? "warn" : "pass",
    message: `${agentHealthy} healthy, ${agentDegraded} degraded, ${agentUnhealthy} unhealthy, ${agentOffline} offline`,
    category: "agents",
  });

  // 2. Project Health
  const projects = await Project.find().select("name status progress deadline").lean();
  let onTrack = 0, atRisk = 0, overdue = 0, blocked = 0;

  const now = Date.now();
  for (const project of projects) {
    const p = project as any;
    const deadline = p.deadline ? new Date(p.deadline).getTime() : 0;
    if (deadline && deadline < now) { overdue++; continue; }
    if (p.status === "blocked") { blocked++; continue; }
    if ((p.progress || 0) >= 70) { onTrack++; }
    else if ((p.progress || 0) >= 40) { atRisk++; }
    else { atRisk++; }
  }

  checks.push({
    name: "Project Health",
    status: overdue > 0 ? "fail" : atRisk > onTrack ? "warn" : "pass",
    message: `${onTrack} on track, ${atRisk} at risk, ${overdue} overdue, ${blocked} blocked`,
    category: "projects",
  });

  // 3. Alert Backlog
  const alerts = await PmAlert.find({ status: "active" }).select("severity category").lean();
  const criticalAlerts = alerts.filter((a: any) => a.severity === "critical").length;
  const highAlerts = alerts.filter((a: any) => a.severity === "high").length;
  const warningAlerts = alerts.filter((a: any) => a.severity === "warning").length;
  const infoAlerts = alerts.filter((a: any) => a.severity === "info").length;

  checks.push({
    name: "Alert Backlog",
    status: criticalAlerts > 0 ? "fail" : highAlerts > 3 ? "warn" : "pass",
    message: `${alerts.length} active: ${criticalAlerts} critical, ${highAlerts} high, ${warningAlerts} warning`,
    value: alerts.length,
    threshold: 10,
    category: "alerts",
  });

  // 4. Risk Register
  const risks = await PmRisk.find({ status: { $nin: ["closed", "realized"] } }).select("severity probability status").lean();
  const criticalRisks = risks.filter((r: any) => r.severity === "critical").length;
  const highRisks = risks.filter((r: any) => r.severity === "high").length;
  const unmitigated = risks.filter((r: any) => !r.mitigation && r.status === "identified").length;

  checks.push({
    name: "Risk Register",
    status: criticalRisks > 0 ? "fail" : unmitigated > 2 ? "warn" : "pass",
    message: `${risks.length} open: ${criticalRisks} critical, ${highRisks} high, ${unmitigated} unmitigated`,
    category: "risks",
  });

  // 5. Issue Tracker
  const issues = await PmIssue.find({ status: { $nin: ["resolved", "closed", "wont-fix", "duplicate"] } }).select("severity status").lean();
  const criticalIssues = issues.filter((i: any) => i.severity === "critical" || i.severity === "blocker").length;

  checks.push({
    name: "Issue Tracker",
    status: criticalIssues > 0 ? "fail" : issues.length > 10 ? "warn" : "pass",
    message: `${issues.length} open issues, ${criticalIssues} critical`,
    category: "issues",
  });

  // 6. Capacity
  const overloadedAgents: string[] = [];
  const overloadedHumans: string[] = [];

  const agentTasks = await Task.aggregate([
    { $match: { status: { $in: ["in-progress", "review"] } } },
    { $group: { _id: "$assignee", count: { $sum: 1 } } },
    { $match: { count: { $gt: 5 } } },
  ]);

  for (const at of agentTasks) {
    const agent = await Agent.findById(at._id).select("name").lean();
    if (agent) overloadedAgents.push((agent as any).name);
  }

  checks.push({
    name: "Capacity",
    status: overloadedAgents.length + overloadedHumans.length > 0 ? "warn" : "pass",
    message: `${overloadedAgents.length} overloaded agents, ${overloadedHumans.length} overloaded humans`,
    category: "capacity",
  });

  // 7. Deadlines
  const today = new Date(); today.setHours(23, 59, 59, 999);
  const endOfWeek = new Date(today); endOfWeek.setDate(endOfWeek.getDate() + 7);

  const overdueTasks = await Task.countDocuments({ status: { $ne: "done" }, dueDate: { $lt: new Date() } });
  const tasksDueToday = await Task.countDocuments({ status: { $ne: "done" }, dueDate: { $lte: today } });
  const tasksDueThisWeek = await Task.countDocuments({ status: { $ne: "done" }, dueDate: { $gt: today, $lte: endOfWeek } });

  checks.push({
    name: "Deadlines",
    status: overdueTasks > 0 ? "fail" : tasksDueToday > 3 ? "warn" : "pass",
    message: `${overdueTasks} overdue, ${tasksDueToday} due today, ${tasksDueThisWeek} due this week`,
    category: "deadlines",
  });

  // Calculate overall score
  const passCount = checks.filter((c) => c.status === "pass").length;
  const warnCount = checks.filter((c) => c.status === "warn").length;
  const failCount = checks.filter((c) => c.status === "fail").length;
  const score = Math.round(((passCount * 100 + warnCount * 50) / (checks.length * 100)) * 100);
  const overall = failCount > 0 ? "unhealthy" : warnCount > 2 ? "degraded" : "healthy";

  return {
    timestamp: new Date(),
    overall,
    score,
    agents: { total: agents.length, healthy: agentHealthy, degraded: agentDegraded, unhealthy: agentUnhealthy, offline: agentOffline },
    projects: { total: projects.length, onTrack, atRisk, overdue, blocked },
    alerts: { total: alerts.length, critical: criticalAlerts, high: highAlerts, warning: warningAlerts, info: infoAlerts, unresolved: alerts.length },
    risks: { total: risks.length, critical: criticalRisks, high: highRisks, unmitigated },
    issues: { total: issues.length, critical: criticalIssues, open: issues.length },
    capacity: { overloadedAgents, overloadedHumans, totalOverloaded: overloadedAgents.length + overloadedHumans.length },
    deadlines: { overdueTasks, tasksDueToday, tasksDueThisWeek },
    checks,
  };
}

/**
 * Auto-generate alerts from monitoring checks.
 */
export async function generateAlertsFromHealth(): Promise<{ created: number; alerts: any[] }> {
  const health = await getSystemHealth();
  const created: any[] = [];

  for (const check of health.checks) {
    if (check.status === "fail" || check.status === "warn") {
      // Check if similar alert already exists
      const existing = await PmAlert.findOne({
        title: check.name,
        status: "active",
        category: check.category === "agents" ? "agent-failure" :
                  check.category === "projects" ? "blocked" :
                  check.category === "alerts" ? "system" :
                  check.category === "risks" ? "risk" :
                  check.category === "issues" ? "system" :
                  check.category === "capacity" ? "capacity" :
                  check.category === "deadlines" ? "deadline" : "system",
      }).lean();

      if (!existing) {
        const alert = await PmAlert.create({
          title: check.name,
          message: check.message,
          category: check.category === "agents" ? "agent-failure" :
                    check.category === "projects" ? "blocked" :
                    check.category === "alerts" ? "system" :
                    check.category === "risks" ? "risk" :
                    check.category === "issues" ? "system" :
                    check.category === "capacity" ? "capacity" :
                    check.category === "deadlines" ? "deadline" : "system",
          severity: check.status === "fail" ? "critical" : "warning",
          status: "active",
          source: "automated-check",
          actionRequired: check.status === "fail",
        });
        created.push(alert);
      }
    }
  }

  return { created: created.length, alerts: created };
}

/**
 * Get monitoring timeline (recent alerts over time).
 */
export async function getMonitoringTimeline(days: number = 7): Promise<{
  date: string;
  critical: number;
  high: number;
  warning: number;
  info: number;
  total: number;
}[]> {
  await connectToDatabase();

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const alerts = await PmAlert.find({ createdAt: { $gte: since } })
    .select("severity createdAt")
    .lean();

  const timeline: Record<string, { critical: number; high: number; warning: number; info: number; total: number }> = {};

  for (let i = 0; i < days; i++) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().split("T")[0];
    timeline[key] = { critical: 0, high: 0, warning: 0, info: 0, total: 0 };
  }

  for (const alert of alerts) {
    const key = new Date(alert.createdAt).toISOString().split("T")[0];
    if (!timeline[key]) timeline[key] = { critical: 0, high: 0, warning: 0, info: 0, total: 0 };
    timeline[key].total++;
    if (alert.severity === "critical") timeline[key].critical++;
    else if (alert.severity === "high") timeline[key].high++;
    else if (alert.severity === "warning") timeline[key].warning++;
    else timeline[key].info++;
  }

  return Object.entries(timeline)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({ date, ...data }));
}
