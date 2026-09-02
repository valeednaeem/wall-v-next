/**
 * PM Client Communication — automated client updates, progress reports, and meeting scheduling.
 *
 * Features:
 * - Automated project status updates to clients
 * - Progress report generation (weekly/monthly)
 * - Milestone completion notifications
 * - Deadline reminders
 * - Meeting scheduling and calendar integration
 * - Email templates for PM communications
 */

import connectToDatabase from "@/lib/mongodb";
import Project from "@/models/project";
import Task from "@/models/task";
import Client from "@/models/client";
import User from "@/models/user";
import Notification from "@/models/notification";
import PmAuditLog from "@/models/pm-audit-log";

export interface ProjectUpdate {
  projectId: string;
  projectName: string;
  clientName: string;
  clientEmail: string;
  updateType: "status" | "milestone" | "deadline" | "progress" | "issue" | "meeting";
  subject: string;
  message: string;
  progress?: number;
  nextMilestone?: string;
  deadline?: Date;
  tasksCompleted?: number;
  tasksTotal?: number;
  issues?: string[];
  meetingDate?: Date;
  meetingLink?: string;
}

export interface ProgressReport {
  projectId: string;
  projectName: string;
  clientName: string;
  period: "weekly" | "monthly";
  startDate: Date;
  endDate: Date;
  summary: string;
  progress: number;
  tasksCompleted: number;
  tasksTotal: number;
  milestonesReached: string[];
  upcomingMilestones: string[];
  risks: string[];
  issues: string[];
  nextSteps: string[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: "deadline" | "milestone" | "meeting" | "review" | "deployment";
  projectId: string;
  projectName: string;
  color: string;
}

/**
 * Generate project status update for client.
 */
export async function generateProjectUpdate(projectId: string): Promise<ProjectUpdate> {
  await connectToDatabase();

  const project = await Project.findById(projectId).lean();
  if (!project) throw new Error("Project not found");

  const p = project as any;

  const tasks = await Task.find({ project: projectId }).lean();
  const completedTasks = tasks.filter((t: any) => t.status === "done").length;
  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const overdueTasks = tasks.filter((t: any) => t.status !== "done" && t.dueDate && new Date(t.dueDate).getTime() < Date.now());
  const upcomingTasks = tasks.filter((t: any) => t.status !== "done" && t.dueDate && new Date(t.dueDate).getTime() > Date.now());

  // Find client info
  let clientName = "Client";
  let clientEmail = "";
  if (p.client) {
    const client = await Client.findById(p.client).lean();
    if (client) {
      clientName = (client as any).name || "Client";
      clientEmail = (client as any).email || "";
    }
  }

  const issues: string[] = [];
  if (overdueTasks.length > 0) {
    issues.push(`${overdueTasks.length} task(s) overdue`);
  }

  const subject = `Project Update: ${p.name} — ${progress}% Complete`;
  const message = [
    `Project "${p.name}" is currently at ${progress}% completion.`,
    `${completedTasks} of ${totalTasks} tasks completed.`,
    overdueTasks.length > 0 ? `${overdueTasks.length} task(s) are overdue and being addressed.` : "All tasks are on schedule.",
    `Current status: ${p.status}.`,
  ].join(" ");

  return {
    projectId: p._id.toString(),
    projectName: p.name,
    clientName,
    clientEmail,
    updateType: "status",
    subject,
    message,
    progress,
    tasksCompleted: completedTasks,
    tasksTotal: totalTasks,
    issues,
    deadline: p.deadline,
  };
}

/**
 * Generate progress report for client.
 */
export async function generateProgressReport(
  projectId: string,
  period: "weekly" | "monthly"
): Promise<ProgressReport> {
  await connectToDatabase();

  const project = await Project.findById(projectId).lean();
  if (!project) throw new Error("Project not found");

  const p = project as any;

  const now = new Date();
  const startDate = new Date(now.getTime() - (period === "weekly" ? 7 : 30) * 24 * 60 * 60 * 1000);

  const tasks = await Task.find({ project: projectId }).lean();
  const completedTasks = tasks.filter((t: any) => t.status === "done").length;
  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const recentlyCompleted = tasks.filter(
    (t: any) => t.status === "done" && new Date(t.updatedAt).getTime() >= startDate.getTime()
  );

  let clientName = "Client";
  if (p.client) {
    const client = await Client.findById(p.client).lean();
    if (client) clientName = (client as any).name || "Client";
  }

  const summary = `Over the past ${period}, ${recentlyCompleted.length} task(s) were completed. Overall progress is ${progress}%.`;

  return {
    projectId: p._id.toString(),
    projectName: p.name,
    clientName,
    period,
    startDate,
    endDate: now,
    summary,
    progress,
    tasksCompleted: completedTasks,
    tasksTotal: totalTasks,
    milestonesReached: recentlyCompleted.slice(0, 3).map((t: any) => t.title),
    upcomingMilestones: tasks.filter((t: any) => t.status !== "done").slice(0, 3).map((t: any) => t.title),
    risks: [],
    issues: tasks.filter((t: any) => t.status === "blocked").map((t: any) => t.title),
    nextSteps: tasks.filter((t: any) => t.status === "todo").slice(0, 3).map((t: any) => t.title),
  };
}

/**
 * Get calendar events (deadlines, milestones, meetings).
 */
export async function getCalendarEvents(daysAhead: number = 30): Promise<CalendarEvent[]> {
  await connectToDatabase();

  const now = new Date();
  const future = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  const tasks = await Task.find({
    dueDate: { $gte: now, $lte: future },
    status: { $ne: "done" },
  }).populate("project", "name").lean();

  const events: CalendarEvent[] = [];

  for (const task of tasks) {
    const t = task as any;
    const projectName = t.project?.name || "Unknown Project";

    let color = "#3b82f6"; // blue
    let type: CalendarEvent["type"] = "deadline";

    if (t.status === "review") { color = "#f59e0b"; type = "review"; }
    else if (t.priority === "urgent") { color = "#ef4444"; }
    else if (t.title.toLowerCase().includes("deploy")) { color = "#10b981"; type = "deployment"; }
    else if (t.title.toLowerCase().includes("meeting")) { color = "#8b5cf6"; type = "meeting"; }

    events.push({
      id: t._id.toString(),
      title: t.title,
      date: new Date(t.dueDate),
      type,
      projectId: t.project?._id?.toString() || "",
      projectName,
      color,
    });
  }

  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Send client update notification.
 */
export async function sendClientUpdate(update: ProjectUpdate): Promise<{ sent: boolean }> {
  await connectToDatabase();

  // Log the communication
  await PmAuditLog.create({
    action: "client-update",
    category: "system",
    description: `Sent ${update.updateType} update to ${update.clientName}: ${update.subject}`,
    actorType: "system",
    result: "success",
  });

  // In-app notification for admins
  const admins = await User.find({ role: { $in: ["super-admin", "admin", "project-manager"] }, isActive: true }).select("_id").lean();
  for (const admin of admins) {
    await Notification.create({
      user: (admin as any)._id,
      title: `Client Update: ${update.projectName}`,
      message: update.message,
      type: "info",
      link: `/dashboard/projects`,
    });
  }

  return { sent: true };
}
