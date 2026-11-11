/**
 * Project Planning Engine — timelines, scheduling, and WBS.
 *
 * Calculates:
 * - Task scheduling based on dependencies
 * - Timeline estimation
 * - Critical path
 * - Milestone dates
 * - Resource allocation suggestions
 */

import connectToDatabase from "@/lib/mongodb";
import Task from "@/models/task";
import Project from "@/models/project";

export interface ScheduledTask {
  taskId: string;
  title: string;
  startDate: Date;
  endDate: Date;
  duration: number;
  assignee?: string;
  priority: string;
  status: string;
  dependencies: string[];
  isOnCriticalPath: boolean;
}

export interface ProjectSchedule {
  projectId: string;
  projectName: string;
  startDate: Date;
  endDate: Date;
  totalDuration: number;
  tasks: ScheduledTask[];
  milestones: { name: string; date: Date; tasks: string[] }[];
  criticalPath: string[];
  utilizationByResource: Record<string, number>;
}

/**
 * Generate a project schedule based on tasks and dependencies.
 * Uses topological sort + forward pass for scheduling.
 */
export async function generateSchedule(projectId: string): Promise<ProjectSchedule> {
  await connectToDatabase();

  const project = await Project.findById(projectId).lean() as any;
  if (!project) throw new Error("Project not found");

  const tasks = await Task.find({ project: projectId })
    .populate("assignee", "name email")
    .sort({ order: 1 })
    .lean();

  if (tasks.length === 0) {
    return {
      projectId,
      projectName: project.name,
      startDate: new Date(),
      endDate: new Date(),
      totalDuration: 0,
      tasks: [],
      milestones: [],
      criticalPath: [],
      utilizationByResource: {},
    };
  }

  // Build dependency graph
  const taskMap = new Map<string, any>();
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const task of tasks) {
    const id = task._id.toString();
    taskMap.set(id, task);
    inDegree.set(id, task.dependencies?.length || 0);
    adjacency.set(id, []);

    for (const dep of task.dependencies || []) {
      const depId = dep.toString();
      if (adjacency.has(depId)) {
        adjacency.get(depId)!.push(id);
      }
    }
  }

  // Topological sort (Kahn's algorithm)
  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);
    for (const neighbor of adjacency.get(current) || []) {
      const newDegree = (inDegree.get(neighbor) || 1) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) queue.push(neighbor);
    }
  }

  // Forward pass — calculate earliest start/end
  const earliestStart = new Map<string, number>();
  const earliestEnd = new Map<string, number>();

  const workingHoursPerDay = 8;
  const projectStart = project.startDate ? new Date(project.startDate).getTime() : Date.now();

  for (const taskId of sorted) {
    const task = taskMap.get(taskId)!;
    const duration = task.estimatedHours || 8;

    let maxDepEnd = 0;
    for (const dep of task.dependencies || []) {
      const depEnd = earliestEnd.get(dep.toString()) || 0;
      maxDepEnd = Math.max(maxDepEnd, depEnd);
    }

    earliestStart.set(taskId, maxDepEnd);
    earliestEnd.set(taskId, maxDepEnd + duration);
  }

  // Find project end
  let projectEnd = 0;
  for (const [, end] of earliestEnd) {
    projectEnd = Math.max(projectEnd, end);
  }

  // Backward pass — find critical path
  const latestStart = new Map<string, number>();
  const latestEnd = new Map<string, number>();
  const slack = new Map<string, number>();

  for (const taskId of [...sorted].reverse()) {
    const task = taskMap.get(taskId)!;
    const duration = task.estimatedHours || 8;

    let minDepStart = projectEnd;
    for (const neighbor of adjacency.get(taskId) || []) {
      const neighborStart = latestStart.get(neighbor) || projectEnd;
      minDepStart = Math.min(minDepStart, neighborStart);
    }

    latestEnd.set(taskId, minDepStart);
    latestStart.set(taskId, minDepStart - duration);
    slack.set(taskId, (latestStart.get(taskId) || 0) - (earliestStart.get(taskId) || 0));
  }

  // Identify critical path
  const criticalPath: string[] = [];
  for (const taskId of sorted) {
    if ((slack.get(taskId) || 0) === 0) {
      criticalPath.push(taskMap.get(taskId)!.title);
    }
  }

  // Build scheduled tasks
  const scheduledTasks: ScheduledTask[] = sorted.map((taskId) => {
    const task = taskMap.get(taskId)!;
    const startMs = projectStart + (earliestStart.get(taskId) || 0) * 60 * 60 * 1000;
    const endMs = projectStart + (earliestEnd.get(taskId) || 0) * 60 * 60 * 1000;

    return {
      taskId,
      title: task.title,
      startDate: new Date(startMs),
      endDate: new Date(endMs),
      duration: task.estimatedHours || 8,
      assignee: task.assignee?.name || task.assignee?.email,
      priority: task.priority,
      status: task.status,
      dependencies: (task.dependencies || []).map((d: any) => d.toString()),
      isOnCriticalPath: (slack.get(taskId) || 0) === 0,
    };
  });

  // Resource utilization
  const utilizationByResource: Record<string, number> = {};
  for (const st of scheduledTasks) {
    if (st.assignee) {
      utilizationByResource[st.assignee] = (utilizationByResource[st.assignee] || 0) + st.duration;
    }
  }

  // Milestones from phases
  const milestones = [
    { name: "Discovery Complete", date: new Date(projectStart + 18 * 60 * 60 * 1000), tasks: [] },
    { name: "Design Complete", date: new Date(projectStart + 50 * 60 * 60 * 1000), tasks: [] },
    { name: "Development Complete", date: new Date(projectStart + (projectEnd - 16) * 60 * 60 * 1000), tasks: [] },
    { name: "Launch", date: new Date(projectStart + projectEnd * 60 * 60 * 1000), tasks: [] },
  ];

  return {
    projectId,
    projectName: project.name,
    startDate: new Date(projectStart),
    endDate: new Date(projectStart + projectEnd * 60 * 60 * 1000),
    totalDuration: projectEnd,
    tasks: scheduledTasks,
    milestones,
    criticalPath,
    utilizationByResource,
  };
}

/**
 * Get project health metrics.
 */
export async function getProjectHealth(projectId: string) {
  await connectToDatabase();

  const tasks = await Task.find({ project: projectId }).lean();

  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done").length;
  const inProgress = tasks.filter((t) => t.status === "in-progress").length;
  const blocked = tasks.filter((t) => t.status === "todo" && t.dependencies.length > 0).length;
  const overdue = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done").length;

  const totalEstimated = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
  const totalLogged = tasks.reduce((sum, t) => sum + (t.loggedHours || 0), 0);

  const progress = total > 0 ? Math.round((done / total) * 100) : 0;
  const effortProgress = totalEstimated > 0 ? Math.round((totalLogged / totalEstimated) * 100) : 0;

  return {
    totalTasks: total,
    completedTasks: done,
    inProgressTasks: inProgress,
    blockedTasks: blocked,
    overdueTasks: overdue,
    progress,
    effortProgress,
    totalEstimatedHours: totalEstimated,
    totalLoggedHours: totalLogged,
    health: overdue > 0 ? "at-risk" : blocked > 2 ? "blocked" : progress > 75 ? "on-track" : "in-progress",
  };
}
