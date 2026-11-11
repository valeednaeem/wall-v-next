/**
 * Workforce Service — complete view of AI + Human resources.
 *
 * Provides:
 * - Agent capability tracking (skills, tools, workflows, model)
 * - Agent health scoring (execution success, failures, availability)
 * - Human workforce tracking (roles, skills, workload)
 * - Resource availability and capacity
 * - Gap analysis (missing skills/capabilities)
 */

import connectToDatabase from "@/lib/mongodb";
import Agent from "@/models/agent";
import AgentSkill from "@/models/agent-skill";
import AgentTool from "@/models/agent-tool";
import AgentWorkflow from "@/models/agent-workflow";
import AgentExecution from "@/models/agent-execution";
import User from "@/models/user";
import Task from "@/models/task";

export interface AgentCapability {
  agentId: string;
  name: string;
  slug: string;
  status: string;
  division: string;
  role: string;
  type: string;
  isClientFacing: boolean;
  isMasterAgent: boolean;
  model: string;
  skills: { name: string; category: string; status: string }[];
  tools: { name: string; category: string; type: string; riskLevel: string; status: string }[];
  workflows: { name: string; status: string; triggerType: string }[];
  channels: Record<string, boolean>;
  permissions: string[];
  healthScore: number;
  healthStatus: "healthy" | "degraded" | "unhealthy" | "offline";
  stats: {
    totalExecutions: number;
    successRate: number;
    failureRate: number;
    avgResponseTime: number;
    lastActive?: Date;
  };
  workload: {
    activeTasks: number;
    totalTasks: number;
    utilizationPercent: number;
    status: "available" | "near-capacity" | "at-capacity" | "overloaded";
  };
  configuration: {
    hasSystemPrompt: boolean;
    hasSkills: boolean;
    hasTools: boolean;
    hasWorkflows: boolean;
    hasChannels: boolean;
    isFullyConfigured: boolean;
    missingConfig: string[];
  };
}

export interface HumanCapability {
  userId: string;
  name: string;
  email: string;
  role: string;
  jobTitle: string;
  isActive: boolean;
  lastLogin?: Date;
  workload: {
    activeTasks: number;
    totalTasks: number;
    completedTasks: number;
    utilizationPercent: number;
    status: "available" | "near-capacity" | "at-capacity" | "overloaded";
  };
  recentActivity: {
    tasksCompletedLast7Days: number;
    tasksCompletedLast30Days: number;
    avgCompletionTime: number;
  };
}

export interface WorkforceSummary {
  ai: {
    total: number;
    active: number;
    inactive: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    available: number;
    overloaded: number;
    avgHealthScore: number;
  };
  human: {
    total: number;
    active: number;
    available: number;
    overloaded: number;
    avgUtilization: number;
  };
  gaps: {
    skillGaps: string[];
    overloadedResources: string[];
    unhealthyAgents: string[];
  };
}

/**
 * Get complete AI workforce with capabilities and health.
 */
export async function getAiWorkforce(): Promise<AgentCapability[]> {
  await connectToDatabase();

  const agents = await Agent.find()
    .populate("skills", "name slug category status")
    .populate("tools", "name slug category type riskLevel status")
    .populate("workflows", "name slug status trigger")
    .lean();

  const capabilities: AgentCapability[] = [];

  for (const agent of agents) {
    const a = agent as any;

    // Calculate health score
    const healthScore = calculateAgentHealth(a);
    const healthStatus = healthScore >= 80 ? "healthy" : healthScore >= 50 ? "degraded" : healthScore > 0 ? "unhealthy" : "offline";

    // Get workload
    const activeTasks = await Task.countDocuments({
      assignee: a._id,
      status: { $in: ["in-progress", "review"] },
    });
    const totalTasks = await Task.countDocuments({ assignee: a._id });
    const utilizationPercent = totalTasks > 0 ? Math.round((activeTasks / Math.max(totalTasks, 1)) * 100) : 0;
    const workloadStatus = activeTasks > 5 ? "overloaded" : activeTasks > 3 ? "near-capacity" : "available";

    // Check configuration completeness
    const missingConfig: string[] = [];
    if (!a.systemPrompt) missingConfig.push("system-prompt");
    if (!a.skills?.length) missingConfig.push("skills");
    if (!a.tools?.length) missingConfig.push("tools");
    if (!a.workflows?.length) missingConfig.push("workflows");
    if (!Object.values(a.channels || {}).some(Boolean)) missingConfig.push("channels");

    capabilities.push({
      agentId: a._id.toString(),
      name: a.name,
      slug: a.slug,
      status: a.status,
      division: a.division || "unassigned",
      role: a.role,
      type: a.type,
      isClientFacing: a.isClientFacing,
      isMasterAgent: a.isMasterAgent,
      model: a.aiModel || "unknown",
      skills: (a.skills || []).map((s: any) => ({ name: s.name, category: s.category, status: s.status })),
      tools: (a.tools || []).map((t: any) => ({ name: t.name, category: t.category, type: t.type, riskLevel: t.riskLevel, status: t.status })),
      workflows: (a.workflows || []).map((w: any) => ({ name: w.name, status: w.status, triggerType: w.trigger?.type || "manual" })),
      channels: a.channels || {},
      permissions: a.permissions || [],
      healthScore,
      healthStatus,
      stats: {
        totalExecutions: a.stats?.totalExecutions || 0,
        successRate: a.stats?.totalExecutions > 0
          ? Math.round(((a.stats?.successfulExecutions || 0) / a.stats.totalExecutions) * 100)
          : 0,
        failureRate: a.stats?.totalExecutions > 0
          ? Math.round(((a.stats?.failedExecutions || 0) / a.stats.totalExecutions) * 100)
          : 0,
        avgResponseTime: a.stats?.avgResponseTime || 0,
        lastActive: a.stats?.lastActive,
      },
      workload: {
        activeTasks,
        totalTasks,
        utilizationPercent,
        status: workloadStatus,
      },
      configuration: {
        hasSystemPrompt: !!a.systemPrompt,
        hasSkills: (a.skills?.length || 0) > 0,
        hasTools: (a.tools?.length || 0) > 0,
        hasWorkflows: (a.workflows?.length || 0) > 0,
        hasChannels: Object.values(a.channels || {}).some(Boolean),
        isFullyConfigured: missingConfig.length === 0,
        missingConfig,
      },
    });
  }

  return capabilities;
}

/**
 * Get complete human workforce with workload data.
 */
export async function getHumanWorkforce(): Promise<HumanCapability[]> {
  await connectToDatabase();

  const users = await User.find({ isActive: true })
    .select("name email role jobTitle isActive lastLogin")
    .lean();

  const capabilities: HumanCapability[] = [];

  for (const user of users) {
    const u = user as any;

    const activeTasks = await Task.countDocuments({
      assignee: u._id,
      status: { $in: ["in-progress", "review"] },
    });
    const totalTasks = await Task.countDocuments({ assignee: u._id });
    const completedTasks = await Task.countDocuments({ assignee: u._id, status: "done" });
    const utilizationPercent = totalTasks > 0 ? Math.round((activeTasks / Math.max(totalTasks, 1)) * 100) : 0;
    const workloadStatus = activeTasks > 8 ? "overloaded" : activeTasks > 5 ? "near-capacity" : "available";

    // Recent activity (last 7 and 30 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [tasksCompleted7d, tasksCompleted30d] = await Promise.all([
      Task.countDocuments({ assignee: u._id, status: "done", updatedAt: { $gte: sevenDaysAgo } }),
      Task.countDocuments({ assignee: u._id, status: "done", updatedAt: { $gte: thirtyDaysAgo } }),
    ]);

    capabilities.push({
      userId: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      jobTitle: u.jobTitle || "",
      isActive: u.isActive,
      lastLogin: u.lastLogin,
      workload: {
        activeTasks,
        totalTasks,
        completedTasks,
        utilizationPercent,
        status: workloadStatus,
      },
      recentActivity: {
        tasksCompletedLast7Days: tasksCompleted7d,
        tasksCompletedLast30Days: tasksCompleted30d,
        avgCompletionTime: 0,
      },
    });
  }

  return capabilities;
}

/**
 * Get workforce summary with gaps.
 */
export async function getWorkforceSummary(): Promise<WorkforceSummary> {
  await connectToDatabase();

  const agents = await getAiWorkforce();
  const humans = await getHumanWorkforce();

  const healthyAgents = agents.filter((a) => a.healthStatus === "healthy").length;
  const degradedAgents = agents.filter((a) => a.healthStatus === "degraded").length;
  const unhealthyAgents = agents.filter((a) => a.healthStatus === "unhealthy").length;
  const availableAgents = agents.filter((a) => a.workload.status === "available").length;
  const overloadedAgents = agents.filter((a) => a.workload.status === "overloaded").length;
  const avgHealth = agents.length > 0 ? Math.round(agents.reduce((s, a) => s + a.healthScore, 0) / agents.length) : 0;

  const activeHumans = humans.filter((h) => h.isActive).length;
  const availableHumans = humans.filter((h) => h.workload.status === "available").length;
  const overloadedHumans = humans.filter((h) => h.workload.status === "overloaded").length;
  const avgUtilization = humans.length > 0 ? Math.round(humans.reduce((s, h) => s + h.workload.utilizationPercent, 0) / humans.length) : 0;

  // Detect gaps
  const skillGaps: string[] = [];
  const allSkills = new Set<string>();
  const requiredSkills = ["development", "design", "client-communication", "project-management", "seo", "content", "marketing", "sales", "finance", "support"];

  for (const agent of agents) {
    for (const skill of agent.skills) allSkills.add(skill.category);
  }
  for (const skill of requiredSkills) {
    if (!allSkills.has(skill)) skillGaps.push(skill);
  }

  return {
    ai: {
      total: agents.length,
      active: agents.filter((a) => a.status === "active").length,
      inactive: agents.filter((a) => a.status === "inactive").length,
      healthy: healthyAgents,
      degraded: degradedAgents,
      unhealthy: unhealthyAgents,
      available: availableAgents,
      overloaded: overloadedAgents,
      avgHealthScore: avgHealth,
    },
    human: {
      total: humans.length,
      active: activeHumans,
      available: availableHumans,
      overloaded: overloadedHumans,
      avgUtilization,
    },
    gaps: {
      skillGaps,
      overloadedResources: [
        ...agents.filter((a) => a.workload.status === "overloaded").map((a) => `AI: ${a.name}`),
        ...humans.filter((h) => h.workload.status === "overloaded").map((h) => `Human: ${h.name}`),
      ],
      unhealthyAgents: agents.filter((a) => a.healthStatus === "unhealthy" || a.healthStatus === "offline").map((a) => a.name),
    },
  };
}

/**
 * Find resources capable of performing a specific skill.
 */
export async function findCapableResources(skill: string): Promise<{
  agents: AgentCapability[];
  humans: HumanCapability[];
}> {
  const agents = await getAiWorkforce();
  const humans = await getHumanWorkforce();

  return {
    agents: agents.filter((a) =>
      a.status === "active" &&
      a.workload.status !== "overloaded" &&
      (a.skills.some((s) => s.category === skill || s.name.toLowerCase().includes(skill.toLowerCase())) ||
       a.division?.toLowerCase().includes(skill.toLowerCase()))
    ),
    humans: humans.filter((h) =>
      h.isActive &&
      h.workload.status !== "overloaded" &&
      (h.role.toLowerCase().includes(skill.toLowerCase()) ||
       h.jobTitle.toLowerCase().includes(skill.toLowerCase()))
    ),
  };
}

/**
 * Calculate agent health score (0-100).
 */
function calculateAgentHealth(agent: any): number {
  let score = 0;

  // Status contribution (30 points)
  if (agent.status === "active") score += 30;
  else if (agent.status === "testing") score += 20;
  else if (agent.status === "draft") score += 10;
  // inactive = 0

  // Configuration contribution (30 points)
  if (agent.systemPrompt) score += 5;
  if (agent.skills?.length > 0) score += 5;
  if (agent.tools?.length > 0) score += 5;
  if (agent.workflows?.length > 0) score += 5;
  if (Object.values(agent.channels || {}).some(Boolean)) score += 5;
  if (agent.aiModel) score += 5;

  // Execution history contribution (40 points)
  const totalExec = agent.stats?.totalExecutions || 0;
  const successExec = agent.stats?.successfulExecutions || 0;
  const failedExec = agent.stats?.failedExecutions || 0;

  if (totalExec > 0) {
    const successRate = successExec / totalExec;
    score += Math.round(successRate * 25);

    // Recent activity
    if (agent.stats?.lastActive) {
      const daysSinceActive = (Date.now() - new Date(agent.stats.lastActive).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceActive < 1) score += 10;
      else if (daysSinceActive < 7) score += 7;
      else if (daysSinceActive < 30) score += 3;
    }
  } else {
    // No executions — configured but untested
    score += 15;
  }

  // Penalty for failures
  if (failedExec > 5) score -= 10;
  if (failedExec > 20) score -= 20;

  return Math.max(0, Math.min(100, score));
}
