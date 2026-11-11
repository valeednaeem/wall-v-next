/**
 * PM Reporting Engine — automated report generation with templates.
 *
 * Report Types:
 * - daily-ops: daily operations summary
 * - weekly-mgmt: weekly management report
 * - app-health: application health report
 * - project-status: project status report
 * - capacity: workforce capacity report
 * - risk-summary: risk summary report
 * - agent-performance: AI agent performance report
 * - custom: custom report
 */

import connectToDatabase from "@/lib/mongodb";
import PmReport from "@/models/pm-report";
import Project from "@/models/project";
import Task from "@/models/task";
import Agent from "@/models/agent";
import PmAlert from "@/models/pm-alert";
import PmRisk from "@/models/pm-risk";
import PmIssue from "@/models/pm-issue";
import User from "@/models/user";
import { NOTIFY_ROLES } from "@/lib/api-middleware";
import Notification from "@/models/notification";
import { getSystemHealth } from "./pm-monitoring";
import { getFinancialSummary } from "./pm-financials";
import { getWorkforceSummary } from "./pm-workforce";

export interface ReportTemplate {
  type: string;
  title: string;
  description: string;
  sections: string[];
}

export const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    type: "daily-ops",
    title: "Daily Operations Report",
    description: "Summary of today's operations, tasks, and alerts",
    sections: ["Overview", "Tasks Completed Today", "Active Alerts", "Agent Status"],
  },
  {
    type: "weekly-mgmt",
    title: "Weekly Management Report",
    description: "Comprehensive weekly summary for management",
    sections: ["Executive Summary", "Project Progress", "Financial Overview", "Risk Summary", "Upcoming Deadlines"],
  },
  {
    type: "app-health",
    title: "Application Health Report",
    description: "System health, uptime, and performance metrics",
    sections: ["System Health", "Agent Health", "Error Rates", "Performance Metrics"],
  },
  {
    type: "project-status",
    title: "Project Status Report",
    description: "Detailed status of all active projects",
    sections: ["Project Overview", "Milestones", "Task Progress", "Issues", "Next Steps"],
  },
  {
    type: "capacity",
    title: "Capacity Report",
    description: "Workforce capacity and utilization analysis",
    sections: ["AI Workforce", "Human Workforce", "Utilization", "Gaps", "Recommendations"],
  },
  {
    type: "risk-summary",
    title: "Risk Summary Report",
    description: "Overview of identified risks and mitigation status",
    sections: ["Risk Register", "Critical Risks", "Mitigation Status", "New Risks"],
  },
  {
    type: "agent-performance",
    title: "Agent Performance Report",
    description: "AI agent execution metrics and health",
    sections: ["Agent Overview", "Execution Stats", "Health Scores", "Top Performers"],
  },
];

/**
 * Generate a report from template.
 */
export async function generateReport(
  type: string,
  projectId?: string,
  period?: string
): Promise<any> {
  await connectToDatabase();

  const template = REPORT_TEMPLATES.find((t) => t.type === type);
  if (!template) throw new Error(`Unknown report type: ${type}`);

  const now = new Date();
  const reportPeriod = period || (type.includes("daily") ? "daily" : type.includes("weekly") ? "weekly" : "monthly");

  const sections: any[] = [];
  const metrics: any[] = [];

  // Generate content based on type
  switch (type) {
    case "daily-ops": {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const tasksCompleted = await Task.countDocuments({ status: "done", updatedAt: { $gte: today } });
      const tasksCreated = await Task.countDocuments({ createdAt: { $gte: today } });
      const activeAlerts = await PmAlert.countDocuments({ status: "active" });

      sections.push(
        { title: "Overview", content: `Today: ${tasksCompleted} tasks completed, ${tasksCreated} created, ${activeAlerts} active alerts.`, data: { tasksCompleted, tasksCreated, activeAlerts } },
        { title: "Tasks Completed Today", content: `${tasksCompleted} tasks were completed.`, data: { count: tasksCompleted } },
        { title: "Active Alerts", content: `${activeAlerts} alerts require attention.`, data: { count: activeAlerts } }
      );

      metrics.push(
        { name: "Tasks Completed", value: tasksCompleted, unit: "tasks", trend: "up", previousValue: 0 },
        { name: "Active Alerts", value: activeAlerts, unit: "alerts", trend: "stable", previousValue: activeAlerts }
      );
      break;
    }

    case "weekly-mgmt": {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const tasksCompleted = await Task.countDocuments({ status: "done", updatedAt: { $gte: weekAgo } });
      const projects = await Project.find().lean();
      const financials = await getFinancialSummary();

      sections.push(
        { title: "Executive Summary", content: `Weekly: ${tasksCompleted} tasks completed across ${projects.length} projects. Revenue: $${financials.totalPaid.toLocaleString()}.`, data: { tasksCompleted, projectCount: projects.length, revenue: financials.totalPaid } },
        { title: "Financial Overview", content: `Total revenue: $${financials.totalPaid.toLocaleString()}. Pending: $${financials.totalPending.toLocaleString()}.`, data: financials }
      );

      metrics.push(
        { name: "Tasks Completed", value: tasksCompleted, unit: "tasks", trend: "up", previousValue: 0 },
        { name: "Revenue", value: financials.totalPaid, unit: "USD", trend: "up", previousValue: 0 },
        { name: "Projects", value: projects.length, unit: "projects", trend: "stable", previousValue: projects.length }
      );
      break;
    }

    case "app-health": {
      const health = await getSystemHealth();
      sections.push(
        { title: "System Health", content: `Overall: ${health.overall} (${health.score}%). Agents: ${health.agents.healthy} healthy, ${health.agents.degraded} degraded.`, data: health }
      );
      metrics.push(
        { name: "Health Score", value: health.score, unit: "%", trend: health.score > 70 ? "up" : "down", previousValue: health.score },
        { name: "Active Alerts", value: health.alerts.unresolved, unit: "alerts", trend: "stable", previousValue: health.alerts.unresolved }
      );
      break;
    }

    case "project-status": {
      const pid = projectId || (await Project.findOne().lean())?._id?.toString();
      if (pid) {
        const project = await Project.findById(pid).lean() as any;
        const tasks = await Task.find({ project: pid }).lean();
        const done = tasks.filter((t: any) => t.status === "done").length;
        const inProgress = tasks.filter((t: any) => t.status === "in-progress").length;
        const blocked = tasks.filter((t: any) => t.status === "blocked").length;

        sections.push(
          { title: "Project Overview", content: `Project: ${project?.name}. Status: ${project?.status}. Progress: ${project?.progress || 0}%.`, data: project },
          { title: "Task Progress", content: `${done} done, ${inProgress} in progress, ${blocked} blocked out of ${tasks.length} total.`, data: { done, inProgress, blocked, total: tasks.length } }
        );

        metrics.push(
          { name: "Progress", value: project?.progress || 0, unit: "%", trend: "up", previousValue: 0 },
          { name: "Tasks Done", value: done, unit: "tasks", trend: "up", previousValue: 0 }
        );
      }
      break;
    }

    case "capacity": {
      const workforce = await getWorkforceSummary();
      sections.push(
        { title: "AI Workforce", content: `${workforce.ai.total} agents: ${workforce.ai.healthy} healthy, ${workforce.ai.overloaded} overloaded.`, data: workforce.ai },
        { title: "Human Workforce", content: `${workforce.human.total} staff: ${workforce.human.available} available, ${workforce.human.overloaded} overloaded.`, data: workforce.human },
        { title: "Gaps", content: `Skill gaps: ${workforce.gaps.skillGaps.join(", ") || "none"}. Overloaded: ${workforce.gaps.overloadedResources.length}.`, data: workforce.gaps }
      );
      metrics.push(
        { name: "AI Agents", value: workforce.ai.total, unit: "agents", trend: "stable", previousValue: workforce.ai.total },
        { name: "Avg Health", value: workforce.ai.avgHealthScore, unit: "%", trend: "up", previousValue: workforce.ai.avgHealthScore }
      );
      break;
    }

    case "risk-summary": {
      const risks = await PmRisk.find({ status: { $nin: ["closed", "realized"] } }).lean();
      const critical = risks.filter((r: any) => r.severity === "critical").length;
      const high = risks.filter((r: any) => r.severity === "high").length;
      const unmitigated = risks.filter((r: any) => !r.mitigation).length;

      sections.push(
        { title: "Risk Register", content: `${risks.length} open risks: ${critical} critical, ${high} high, ${unmitigated} unmitigated.`, data: { total: risks.length, critical, high, unmitigated } }
      );
      metrics.push(
        { name: "Open Risks", value: risks.length, unit: "risks", trend: "stable", previousValue: risks.length },
        { name: "Critical Risks", value: critical, unit: "risks", trend: critical > 0 ? "down" : "stable", previousValue: critical }
      );
      break;
    }

    case "agent-performance": {
      const agents = await Agent.find({ status: "active" }).lean();
      let totalExec = 0, totalSuccess = 0;
      for (const a of agents) {
        totalExec += (a as any).stats?.totalExecutions || 0;
        totalSuccess += (a as any).stats?.successfulExecutions || 0;
      }
      const successRate = totalExec > 0 ? Math.round((totalSuccess / totalExec) * 100) : 0;

      sections.push(
        { title: "Agent Overview", content: `${agents.length} active agents. Total executions: ${totalExec}. Success rate: ${successRate}%.`, data: { agentCount: agents.length, totalExec, successRate } }
      );
      metrics.push(
        { name: "Active Agents", value: agents.length, unit: "agents", trend: "stable", previousValue: agents.length },
        { name: "Success Rate", value: successRate, unit: "%", trend: "up", previousValue: successRate }
      );
      break;
    }
  }

  // Create report record
  const report = await PmReport.create({
    title: template.title,
    type: type as any,
    period: reportPeriod,
    date: now,
    generatedByType: "system",
    status: "completed",
    summary: sections.map((s) => s.title + ": " + s.content).join("\n"),
    sections,
    metrics,
    metadata: { projectId, generatedAt: now },
  });

  // Notify admins
  const admins = await User.find({ role: { $in: NOTIFY_ROLES }, isActive: true }).select("_id").lean();
  for (const admin of admins) {
    await Notification.create({
      user: (admin as any)._id,
      title: `Report Generated: ${template.title}`,
      message: `${template.title} is ready for review.`,
      type: "info",
      link: "/dashboard/reports",
    });
  }

  return report;
}

/**
 * Get all generated reports.
 */
export async function getReports(limit: number = 50, type?: string): Promise<any[]> {
  await connectToDatabase();

  const filter: any = {};
  if (type) filter.type = type as any;

  return PmReport.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

/**
 * Get report by ID.
 */
export async function getReportById(id: string): Promise<any> {
  await connectToDatabase();
  return PmReport.findById(id).lean();
}
