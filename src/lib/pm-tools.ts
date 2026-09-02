/**
 * PM Tools — executable tools for the Project Manager agent.
 * These tools allow the PM to interact with the PM system (risks, issues, alerts, capacity, intake).
 */

import connectToDatabase from "@/lib/mongodb";
import PmRisk from "@/models/pm-risk";
import PmIssue from "@/models/pm-issue";
import PmAlert from "@/models/pm-alert";
import PmIntake from "@/models/pm-intake";
import PmAuditLog from "@/models/pm-audit-log";
import Project from "@/models/project";
import Task from "@/models/task";
import Agent from "@/models/agent";
import User from "@/models/user";

export { decomposeProject } from "./pm-decomposition";
export { generateSchedule, getProjectHealth } from "./pm-planning";
export { getAiWorkforce, getHumanWorkforce, getWorkforceSummary, findCapableResources } from "./pm-workforce";
export { getSystemHealth, generateAlertsFromHealth, getMonitoringTimeline } from "./pm-monitoring";

export interface PmToolResult {
  success: boolean;
  data: unknown;
  error?: string;
}

// ─── Create Risk ───────────────────────────────────────────────────────────

export async function createRisk(args: {
  projectId?: string;
  title: string;
  description: string;
  category: string;
  severity?: string;
  probability?: string;
  impact?: string;
  mitigation?: string;
}): Promise<PmToolResult> {
  await connectToDatabase();

  const risk = await PmRisk.create({
    project: args.projectId || undefined,
    title: args.title,
    description: args.description,
    category: args.category as any,
    severity: (args.severity || "medium") as any,
    probability: (args.probability || "possible") as any,
    impact: (args.impact || "moderate") as any,
    mitigation: args.mitigation || "",
    status: "identified",
    identifiedByType: "ai",
  });

  return { success: true, data: risk };
}

// ─── Create Issue ──────────────────────────────────────────────────────────

export async function createIssue(args: {
  projectId?: string;
  title: string;
  description: string;
  category: string;
  severity?: string;
  priority?: string;
  affectedComponents?: string[];
}): Promise<PmToolResult> {
  await connectToDatabase();

  const issue = await PmIssue.create({
    project: args.projectId || undefined,
    title: args.title,
    description: args.description,
    category: args.category as any,
    severity: (args.severity || "bug") as any,
    priority: (args.priority || "medium") as any,
    status: "detected",
    source: "pm-scan",
    affectedComponents: args.affectedComponents || [],
    reportedByType: "ai",
  });

  return { success: true, data: issue };
}

// ─── Create Alert ──────────────────────────────────────────────────────────

export async function createAlert(args: {
  title: string;
  message: string;
  category: string;
  severity?: string;
  projectId?: string;
  actionRequired?: boolean;
  approvalRequired?: boolean;
}): Promise<PmToolResult> {
  await connectToDatabase();

  const alert = await PmAlert.create({
    title: args.title,
    message: args.message,
    category: args.category as any,
    severity: (args.severity || "warning") as any,
    project: args.projectId || undefined,
    status: "active",
    source: "pm",
    actionRequired: args.actionRequired || false,
    approvalRequired: args.approvalRequired || false,
  });

  return { success: true, data: alert };
}

// ─── Get Capacity ──────────────────────────────────────────────────────────

export async function getCapacity(): Promise<PmToolResult> {
  await connectToDatabase();

  const agents = await Agent.find({ status: "active" })
    .select("name slug status division skills stats")
    .populate("skills", "name category")
    .lean();

  const humans = await User.find({ isActive: true, role: { $in: ["developer", "designer", "staff", "project-manager"] } })
    .select("name email role jobTitle isActive")
    .lean();

  const agentCapacity = await Promise.all(
    agents.map(async (agent: any) => {
      const activeTasks = await Task.countDocuments({
        assignee: agent._id,
        status: { $in: ["in-progress", "review"] },
      });
      return {
        name: agent.name,
        division: agent.division,
        activeTasks,
        status: activeTasks > 5 ? "overloaded" : activeTasks > 3 ? "near-capacity" : "available",
      };
    })
  );

  const humanCapacity = await Promise.all(
    humans.map(async (human: any) => {
      const activeTasks = await Task.countDocuments({
        assignee: human._id,
        status: { $in: ["in-progress", "review"] },
      });
      return {
        name: human.name,
        role: human.role,
        activeTasks,
        status: activeTasks > 8 ? "overloaded" : activeTasks > 5 ? "near-capacity" : "available",
      };
    })
  );

  return {
    success: true,
    data: {
      agents: agentCapacity,
      humans: humanCapacity,
      summary: {
        totalAgents: agentCapacity.length,
        overloadedAgents: agentCapacity.filter((a) => a.status === "overloaded").length,
        totalHumans: humanCapacity.length,
        overloadedHumans: humanCapacity.filter((h) => h.status === "overloaded").length,
      },
    },
  };
}

// ─── Triage Project ────────────────────────────────────────────────────────

export async function triageProject(args: {
  intakeId: string;
  decision: string;
  reason: string;
}): Promise<PmToolResult> {
  await connectToDatabase();

  const intake = await PmIntake.findByIdAndUpdate(
    args.intakeId,
    {
      triageStatus: args.decision,
      triageReason: args.reason,
      triagedByType: "ai",
      triagedAt: new Date(),
    },
    { new: true }
  );

  if (!intake) {
    return { success: false, data: null, error: "Intake not found" };
  }

  return { success: true, data: intake };
}

// ─── Get Project Overview ──────────────────────────────────────────────────

export async function getProjectOverview(): Promise<PmToolResult> {
  await connectToDatabase();

  const [
    totalProjects,
    activeProjects,
    blockedProjects,
    completedProjects,
    totalTasks,
    overdueTasks,
    activeTasks,
    pendingIntakes,
    activeAlerts,
    criticalAlerts,
    openRisks,
    openIssues,
  ] = await Promise.all([
    Project.countDocuments(),
    Project.countDocuments({ status: "in-progress" }),
    Project.countDocuments({ status: "blocked" }),
    Project.countDocuments({ status: "completed" }),
    Task.countDocuments(),
    Task.countDocuments({ dueDate: { $lt: new Date() }, status: { $ne: "done" } }),
    Task.countDocuments({ status: "in-progress" }),
    PmIntake.countDocuments({ triageStatus: "pending" }),
    PmAlert.countDocuments({ status: "active" }),
    PmAlert.countDocuments({ status: "active", severity: "critical" }),
    PmRisk.countDocuments({ status: { $in: ["identified", "analyzing", "mitigating"] } }),
    PmIssue.countDocuments({ status: { $in: ["detected", "triaged", "assigned", "in-progress"] } }),
  ]);

  return {
    success: true,
    data: {
      projects: { total: totalProjects, active: activeProjects, blocked: blockedProjects, completed: completedProjects },
      tasks: { total: totalTasks, overdue: overdueTasks, active: activeTasks },
      intake: { pending: pendingIntakes },
      alerts: { active: activeAlerts, critical: criticalAlerts },
      risks: { open: openRisks },
      issues: { open: openIssues },
    },
  };
}

// ─── Get Risks ─────────────────────────────────────────────────────────────

export async function getRisks(args?: { status?: string; severity?: string; limit?: number }): Promise<PmToolResult> {
  await connectToDatabase();

  const query: Record<string, unknown> = {};
  if (args?.status) query.status = args.status;
  if (args?.severity) query.severity = args.severity;

  const risks = await PmRisk.find(query)
    .sort({ severity: 1, createdAt: -1 })
    .limit(args?.limit || 20)
    .populate("project", "name slug")
    .lean();

  return { success: true, data: risks };
}

// ─── Get Issues ────────────────────────────────────────────────────────────

export async function getIssues(args?: { status?: string; severity?: string; limit?: number }): Promise<PmToolResult> {
  await connectToDatabase();

  const query: Record<string, unknown> = {};
  if (args?.status) query.status = args.status;
  if (args?.severity) query.severity = args.severity;

  const issues = await PmIssue.find(query)
    .sort({ severity: 1, createdAt: -1 })
    .limit(args?.limit || 20)
    .populate("project", "name slug")
    .lean();

  return { success: true, data: issues };
}

// ─── Get Alerts ────────────────────────────────────────────────────────────

export async function getAlerts(args?: { status?: string; severity?: string; limit?: number }): Promise<PmToolResult> {
  await connectToDatabase();

  const query: Record<string, unknown> = {};
  if (args?.status) query.status = args.status;
  if (args?.severity) query.severity = args.severity;

  const alerts = await PmAlert.find(query)
    .sort({ severity: 1, createdAt: -1 })
    .limit(args?.limit || 20)
    .populate("project", "name slug")
    .lean();

  return { success: true, data: alerts };
}

// ─── Get Intake ────────────────────────────────────────────────────────────

export async function getIntake(args?: { status?: string; limit?: number }): Promise<PmToolResult> {
  await connectToDatabase();

  const query: Record<string, unknown> = {};
  if (args?.status) query.triageStatus = args.status;

  const intakes = await PmIntake.find(query)
    .sort({ createdAt: -1 })
    .limit(args?.limit || 20)
    .lean();

  return { success: true, data: intakes };
}

// ─── Log PM Action ─────────────────────────────────────────────────────────

export async function logPmAction(args: {
  action: string;
  category: string;
  description: string;
  projectId?: string;
  reasoning?: string;
  confidence?: number;
  result?: string;
}): Promise<PmToolResult> {
  await connectToDatabase();

  const log = await PmAuditLog.create({
    action: args.action,
    category: args.category as any,
    description: args.description,
    project: args.projectId || undefined,
    actorType: "ai",
    reasoning: args.reasoning || "",
    confidence: args.confidence || 1,
    result: (args.result || "success") as any,
  });

  return { success: true, data: log };
}
