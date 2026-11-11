/**
 * PM Admin Control Center — unified view of all PM subsystems.
 *
 * Aggregates:
 * - System health status
 * - Workforce summary
 * - Financial overview
 * - Active alerts and risks
 * - Recent scan results
 * - Workflow status
 * - Integration status
 * - Quick actions
 */

import connectToDatabase from "@/lib/mongodb";
import { getSystemHealth } from "./pm-monitoring";
import { getWorkforceSummary } from "./pm-workforce";
import { getFinancialSummary } from "./pm-financials";
import { getIntegrationSummary } from "./pm-integrations";
import PmAlert from "@/models/pm-alert";
import PmRisk from "@/models/pm-risk";
import PmIssue from "@/models/pm-issue";
import Task from "@/models/task";
import Project from "@/models/project";
import Agent from "@/models/agent";

export interface AdminCenterData {
  timestamp: Date;
  overview: {
    totalProjects: number;
    activeProjects: number;
    totalTasks: number;
    activeTasks: number;
    totalAgents: number;
    activeAgents: number;
    totalUsers: number;
  };
  health: {
    overall: string;
    score: number;
  };
  workforce: {
    ai: { total: number; active: number; healthy: number; overloaded: number };
    human: { total: number; active: number; available: number };
  };
  financial: {
    revenue: number;
    pending: number;
    overdue: number;
  };
  alerts: {
    total: number;
    critical: number;
    high: number;
    warning: number;
  };
  risks: {
    total: number;
    critical: number;
    high: number;
  };
  issues: {
    total: number;
    critical: number;
  };
  integrations: {
    total: number;
    active: number;
  };
  quickActions: QuickAction[];
  recentActivity: RecentActivity[];
}

export interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: string;
  action: string;
  color: string;
}

export interface RecentActivity {
  type: string;
  title: string;
  description: string;
  timestamp: string;
  icon: string;
}

/**
 * Get aggregated admin center data.
 */
export async function getAdminCenterData(): Promise<AdminCenterData> {
  await connectToDatabase();

  // Parallel data fetching
  const [
    health,
    workforce,
    financials,
    integrations,
    totalProjects,
    activeProjects,
    totalTasks,
    activeTasks,
    totalAgents,
    activeAgents,
    totalAlerts,
    criticalAlerts,
    highAlerts,
    warningAlerts,
    totalRisks,
    criticalRisks,
    highRisks,
    totalIssues,
    criticalIssues,
  ] = await Promise.all([
    getSystemHealth().catch(() => ({ overall: "unknown", score: 0 })),
    getWorkforceSummary().catch(() => ({
      ai: { total: 0, active: 0, healthy: 0, degraded: 0, unhealthy: 0, offline: 0, available: 0, overloaded: 0, avgHealthScore: 0 },
      human: { total: 0, active: 0, available: 0, overloaded: 0, avgUtilization: 0 },
      gaps: { skillGaps: [], overloadedResources: [], unhealthyAgents: [] },
    })),
    getFinancialSummary().catch(() => ({
      totalRevenue: 0, totalPending: 0, totalOverdue: 0, totalPaid: 0,
      averageInvoiceValue: 0, totalProjects: 0, projectsOverBudget: 0,
      projectsAtRisk: 0, monthlyRevenue: [], topProjects: [],
    })),
    getIntegrationSummary().catch(() => ({ total: 0, active: 0, configured: 0, inactive: 0, categories: {} })),
    Project.countDocuments().catch(() => 0),
    Project.countDocuments({ status: { $in: ["in-progress", "active"] } }).catch(() => 0),
    Task.countDocuments().catch(() => 0),
    Task.countDocuments({ status: { $in: ["in-progress", "review"] } }).catch(() => 0),
    Agent.countDocuments().catch(() => 0),
    Agent.countDocuments({ status: "active" }).catch(() => 0),
    PmAlert.countDocuments({ status: "active" }).catch(() => 0),
    PmAlert.countDocuments({ status: "active", severity: "critical" }).catch(() => 0),
    PmAlert.countDocuments({ status: "active", severity: "high" }).catch(() => 0),
    PmAlert.countDocuments({ status: "active", severity: "warning" }).catch(() => 0),
    PmRisk.countDocuments({ status: { $nin: ["closed", "realized"] } }).catch(() => 0),
    PmRisk.countDocuments({ status: { $nin: ["closed", "realized"] }, severity: "critical" }).catch(() => 0),
    PmRisk.countDocuments({ status: { $nin: ["closed", "realized"] }, severity: "high" }).catch(() => 0),
    PmIssue.countDocuments({ status: { $nin: ["resolved", "closed", "wont-fix", "duplicate"] } }).catch(() => 0),
    PmIssue.countDocuments({ status: { $nin: ["resolved", "closed", "wont-fix", "duplicate"] }, severity: { $in: ["critical", "blocker"] } }).catch(() => 0),
  ]);

  // Quick actions
  const quickActions: QuickAction[] = [
    { id: "run-scan", label: "Run System Scan", description: "Scan all agents, projects, and tasks", icon: "scan", action: "/api/pm/scanner", color: "bg-blue-500" },
    { id: "generate-report", label: "Generate Report", description: "Create a weekly management report", icon: "report", action: "/api/pm/reports", color: "bg-emerald-500" },
    { id: "check-budgets", label: "Check Budgets", description: "Review project budget utilization", icon: "budget", action: "/api/pm/financials", color: "bg-amber-500" },
    { id: "view-alerts", label: "Review Alerts", description: "Address active alerts", icon: "alerts", action: "/api/pm/monitoring", color: "bg-red-500" },
  ];

  // Recent activity (from audit logs)
  const PmAuditLog = (await import("@/models/pm-audit-log")).default;
  const recentLogs = await PmAuditLog.find().sort({ createdAt: -1 }).limit(10).lean();

  const recentActivity: RecentActivity[] = recentLogs.map((log: any) => ({
    type: log.category || "system",
    title: log.action,
    description: log.description || "",
    timestamp: new Date(log.createdAt).toISOString(),
    icon: log.result === "success" ? "check" : log.result === "failure" ? "x" : "info",
  }));

  return {
    timestamp: new Date(),
    overview: {
      totalProjects,
      activeProjects,
      totalTasks,
      activeTasks,
      totalAgents,
      activeAgents,
      totalUsers: workforce.human.total,
    },
    health: {
      overall: health.overall,
      score: health.score,
    },
    workforce: {
      ai: {
        total: workforce.ai.total,
        active: workforce.ai.active,
        healthy: workforce.ai.healthy,
        overloaded: workforce.ai.overloaded,
      },
      human: {
        total: workforce.human.total,
        active: workforce.human.active,
        available: workforce.human.available,
      },
    },
    financial: {
      revenue: financials.totalPaid,
      pending: financials.totalPending,
      overdue: financials.totalOverdue,
    },
    alerts: {
      total: totalAlerts,
      critical: criticalAlerts,
      high: highAlerts,
      warning: warningAlerts,
    },
    risks: {
      total: totalRisks,
      critical: criticalRisks,
      high: highRisks,
    },
    issues: {
      total: totalIssues,
      critical: criticalIssues,
    },
    integrations: {
      total: integrations.total,
      active: integrations.active,
    },
    quickActions,
    recentActivity,
  };
}
