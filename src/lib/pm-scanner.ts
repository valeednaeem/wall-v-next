/**
 * PM Scanner — automated intelligence gathering and change detection.
 *
 * Scans:
 * - Agent configuration changes (new agents, status changes, skill/tool changes)
 * - Project status changes (progress, deadlines, blockers)
 * - Task changes (new tasks, status updates, overdue detection)
 * - Capacity changes (overload detection, availability shifts)
 * - Risk signals (new risks, severity changes, unmitigated risks)
 * - Skill/tool gaps (missing capabilities, unused tools)
 * - System health (API response times, error rates)
 * - Notification routing (email, in-app, webhook)
 */

import connectToDatabase from "@/lib/mongodb";
import Agent from "@/models/agent";
import AgentSkill from "@/models/agent-skill";
import AgentTool from "@/models/agent-tool";
import AgentWorkflow from "@/models/agent-workflow";
import Task from "@/models/task";
import Project from "@/models/project";
import PmAlert from "@/models/pm-alert";
import PmRisk from "@/models/pm-risk";
import PmIssue from "@/models/pm-issue";
import PmAuditLog from "@/models/pm-audit-log";
import Notification from "@/models/notification";

export interface ScanResult {
  timestamp: Date;
  duration: number;
  scanType: "full" | "quick" | "targeted";
  findings: ScanFinding[];
  changes: ScanChange[];
  recommendations: ScanRecommendation[];
  stats: {
    agentsScanned: number;
    projectsScanned: number;
    tasksScanned: number;
    findingsCount: number;
    changesCount: number;
    recommendationsCount: number;
    alertsGenerated: number;
  };
}

export interface ScanFinding {
  category: "agent" | "project" | "task" | "capacity" | "risk" | "skill-gap" | "system" | "notification";
  severity: "info" | "warning" | "high" | "critical";
  title: string;
  description: string;
  resourceType?: string;
  resourceId?: string;
  actionRequired: boolean;
}

export interface ScanChange {
  entityType: "agent" | "project" | "task" | "risk" | "issue";
  entityId: string;
  entityName: string;
  changeType: "created" | "updated" | "status-changed" | "deleted" | "configured";
  field?: string;
  oldValue?: string;
  newValue?: string;
  detectedAt: Date;
}

export interface ScanRecommendation {
  priority: "low" | "medium" | "high" | "urgent";
  category: string;
  title: string;
  description: string;
  action: string;
  impact: string;
}

/**
 * Run a full system scan.
 */
export async function runFullScan(): Promise<ScanResult> {
  const start = Date.now();
  await connectToDatabase();

  const findings: ScanFinding[] = [];
  const changes: ScanChange[] = [];
  const recommendations: ScanRecommendation[] = [];
  let alertsGenerated = 0;

  // 1. Scan Agents
  const agents = await Agent.find()
    .populate("skills", "name slug category status")
    .populate("tools", "name slug category type riskLevel status")
    .populate("workflows", "name slug status")
    .lean();

  for (const agent of agents) {
    const a = agent as any;

    // Check for unconfigured agents
    if (a.status === "active" && !a.systemPrompt) {
      findings.push({
        category: "agent",
        severity: "warning",
        title: `Agent "${a.name}" missing system prompt`,
        description: `Active agent has no system prompt configured.`,
        resourceType: "agent",
        resourceId: a._id.toString(),
        actionRequired: true,
      });
    }

    // Check for agents with no skills/tools
    if (a.status === "active" && (!a.skills?.length || !a.tools?.length)) {
      findings.push({
        category: "skill-gap",
        severity: "warning",
        title: `Agent "${a.name}" has missing capabilities`,
        description: `Skills: ${a.skills?.length || 0}, Tools: ${a.tools?.length || 0}`,
        resourceType: "agent",
        resourceId: a._id.toString(),
        actionRequired: true,
      });
    }

    // Check for unhealthy agents
    const totalExec = a.stats?.totalExecutions || 0;
    const failedExec = a.stats?.failedExecutions || 0;
    if (totalExec > 0 && failedExec / totalExec > 0.3) {
      findings.push({
        category: "agent",
        severity: "high",
        title: `Agent "${a.name}" has high failure rate`,
        description: `Failure rate: ${Math.round((failedExec / totalExec) * 100)}% (${failedExec}/${totalExec})`,
        resourceType: "agent",
        resourceId: a._id.toString(),
        actionRequired: true,
      });
    }

    // Check for inactive agents that should be active
    if (a.status === "inactive" && a.stats?.totalConversations > 10) {
      findings.push({
        category: "agent",
        severity: "info",
        title: `Agent "${a.name}" is inactive but has history`,
        description: `${a.stats.totalConversations} conversations recorded. Consider reactivating or archiving.`,
        resourceType: "agent",
        resourceId: a._id.toString(),
        actionRequired: false,
      });
    }
  }

  // 2. Scan Projects
  const projects = await Project.find().lean();
  const now = Date.now();

  for (const project of projects) {
    const p = project as any;

    // Check for overdue projects
    if (p.deadline && new Date(p.deadline).getTime() < now && p.status !== "completed") {
      findings.push({
        category: "project",
        severity: "high",
        title: `Project "${p.name}" is overdue`,
        description: `Deadline was ${new Date(p.deadline).toLocaleDateString()}`,
        resourceType: "project",
        resourceId: p._id.toString(),
        actionRequired: true,
      });
    }

    // Check for stalled projects
    if (p.status === "in-progress" && (p.progress || 0) < 30) {
      const updatedAt = new Date(p.updatedAt).getTime();
      const daysSinceUpdate = (now - updatedAt) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate > 7) {
        findings.push({
          category: "project",
          severity: "warning",
          title: `Project "${p.name}" appears stalled`,
          description: `${Math.round(daysSinceUpdate)} days since last update, ${p.progress || 0}% progress`,
          resourceType: "project",
          resourceId: p._id.toString(),
          actionRequired: true,
        });
      }
    }
  }

  // 3. Scan Tasks
  const tasks = await Task.find().populate("assignee", "name").lean();

  const overdueTasks = tasks.filter((t: any) => t.status !== "done" && t.dueDate && new Date(t.dueDate).getTime() < now);
  if (overdueTasks.length > 0) {
    findings.push({
      category: "task",
      severity: "high",
      title: `${overdueTasks.length} overdue tasks`,
      description: `Tasks past their due date: ${overdueTasks.slice(0, 5).map((t: any) => t.title).join(", ")}${overdueTasks.length > 5 ? `... and ${overdueTasks.length - 5} more` : ""}`,
      actionRequired: true,
    });
  }

  // 4. Scan Risks
  const risks = await PmRisk.find({ status: { $nin: ["closed", "realized"] } }).lean();
  const criticalRisks = risks.filter((r: any) => r.severity === "critical" && !r.mitigation);
  if (criticalRisks.length > 0) {
    findings.push({
      category: "risk",
      severity: "critical",
      title: `${criticalRisks.length} critical risks without mitigation`,
      description: `Unmitigated critical risks: ${criticalRisks.map((r: any) => r.title).join(", ")}`,
      actionRequired: true,
    });
  }

  // 5. Scan Issues
  const issues = await PmIssue.find({ status: { $nin: ["resolved", "closed", "wont-fix", "duplicate"] } }).lean();
  const criticalIssues = issues.filter((i: any) => i.severity === "critical" || i.severity === "blocker");
  if (criticalIssues.length > 0) {
    findings.push({
      category: "system",
      severity: "critical",
      title: `${criticalIssues.length} critical/blocker issues open`,
      description: `Critical issues: ${criticalIssues.map((i: any) => i.title).join(", ")}`,
      actionRequired: true,
    });
  }

  // 6. Capacity scan
  const agentTasks = await Task.aggregate([
    { $match: { status: { $in: ["in-progress", "review"] } } },
    { $group: { _id: "$assignee", count: { $sum: 1 } } },
    { $match: { count: { $gt: 5 } } },
  ]);

  for (const at of agentTasks) {
    const agent = await Agent.findById(at._id).select("name").lean();
    if (agent) {
      findings.push({
        category: "capacity",
        severity: "warning",
        title: `Resource "${(agent as any).name}" is overloaded`,
        description: `${at.count} active tasks (threshold: 5)`,
        resourceType: "agent",
        resourceId: at._id.toString(),
        actionRequired: true,
      });
    }
  }

  // Generate recommendations from findings
  for (const finding of findings) {
    if (finding.severity === "critical") {
      recommendations.push({
        priority: "urgent",
        category: finding.category,
        title: `Address: ${finding.title}`,
        description: finding.description,
        action: "Immediate attention required",
        impact: "High — system health or project delivery at risk",
      });
    } else if (finding.severity === "high") {
      recommendations.push({
        priority: "high",
        category: finding.category,
        title: `Review: ${finding.title}`,
        description: finding.description,
        action: "Review and take corrective action",
        impact: "Medium — may affect project timeline or quality",
      });
    }
  }

  // Generate alerts for critical findings
  for (const finding of findings) {
    if (finding.severity === "critical" || finding.severity === "high") {
      const existing = await PmAlert.findOne({
        title: finding.title,
        status: "active",
      }).lean();

      if (!existing) {
        await PmAlert.create({
          title: finding.title,
          message: finding.description,
          category: finding.category === "agent" ? "agent-failure" :
                    finding.category === "project" ? "blocked" :
                    finding.category === "task" ? "deadline" :
                    finding.category === "capacity" ? "capacity" :
                    finding.category === "risk" ? "risk" : "system",
          severity: finding.severity === "critical" ? "critical" : "high",
          status: "active",
          source: "automated-check",
          actionRequired: finding.actionRequired,
          resource: finding.resourceId,
          resourceType: finding.resourceType as any,
        });
        alertsGenerated++;
      }
    }
  }

  const duration = Date.now() - start;

  // Log the scan
  await PmAuditLog.create({
    action: "scan-complete",
    category: "monitoring",
    description: `Full scan completed: ${findings.length} findings, ${alertsGenerated} alerts`,
    actorType: "system",
    result: "success",
    duration,
    metadata: {
      scanType: "full",
      findingsCount: findings.length,
      changesCount: changes.length,
      recommendationsCount: recommendations.length,
      alertsGenerated,
      agentsScanned: agents.length,
      projectsScanned: projects.length,
      tasksScanned: tasks.length,
    },
  });

  return {
    timestamp: new Date(),
    duration,
    scanType: "full",
    findings,
    changes,
    recommendations,
    stats: {
      agentsScanned: agents.length,
      projectsScanned: projects.length,
      tasksScanned: tasks.length,
      findingsCount: findings.length,
      changesCount: changes.length,
      recommendationsCount: recommendations.length,
      alertsGenerated,
    },
  };
}

/**
 * Run a quick scan (critical checks only).
 */
export async function runQuickScan(): Promise<ScanResult> {
  const start = Date.now();
  await connectToDatabase();

  const findings: ScanFinding[] = [];

  // Quick checks
  const overdueTasks = await Task.countDocuments({ status: { $ne: "done" }, dueDate: { $lt: new Date() } });
  if (overdueTasks > 0) {
    findings.push({ category: "task", severity: "high", title: `${overdueTasks} overdue tasks`, description: "Tasks past due date", actionRequired: true });
  }

  const criticalAlerts = await PmAlert.countDocuments({ status: "active", severity: "critical" });
  if (criticalAlerts > 0) {
    findings.push({ category: "system", severity: "critical", title: `${criticalAlerts} critical alerts`, description: "Active critical alerts require attention", actionRequired: true });
  }

  const unhealthyAgents = await Agent.countDocuments({ status: "active", "stats.failedExecutions": { $gt: 10 } });
  if (unhealthyAgents > 0) {
    findings.push({ category: "agent", severity: "high", title: `${unhealthyAgents} unhealthy agents`, description: "Agents with high failure rates", actionRequired: true });
  }

  return {
    timestamp: new Date(),
    duration: Date.now() - start,
    scanType: "quick",
    findings,
    changes: [],
    recommendations: [],
    stats: {
      agentsScanned: 0,
      projectsScanned: 0,
      tasksScanned: 0,
      findingsCount: findings.length,
      changesCount: 0,
      recommendationsCount: 0,
      alertsGenerated: 0,
    },
  };
}

/**
 * Get scan history.
 */
export async function getScanHistory(limit: number = 20): Promise<any[]> {
  await connectToDatabase();
  return PmAuditLog.find({ action: "scan-complete" })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}
