import { NextRequest, NextResponse } from "next/server";
import Agent from "@/models/agent";
import AgentConversation from "@/models/agent-conversation";
import AgentExecution from "@/models/agent-execution";
import Task from "@/models/task";
import Project from "@/models/project";
import User from "@/models/user";
import connectToDatabase from "@/lib/mongodb";
import { executeAIRequest } from "@/lib/ai-execution-engine";
import { requireAuthFromCookie, ADMIN_ROLES } from "@/lib/api-middleware";
import { executeContentTool } from "@/lib/content-agent-tools";

const MASTER_AGENT_SLUG = "project-manager";

// ─── Internal Tool Handlers ─────────────────────────────────────────────────

async function handleGetWorkforceOverview() {
  await connectToDatabase();
  const agents = await Agent.find({}).select("name slug role status division isClientFacing agentMode stats").lean();
  const total = agents.length;
  const active = agents.filter((a) => a.status === "active").length;
  const clientFacing = agents.filter((a) => a.isClientFacing || a.agentMode === "client-facing" || a.agentMode === "dual").length;
  const internal = agents.filter((a) => !a.isClientFacing && a.agentMode !== "client-facing").length;

  const byDivision: Record<string, { total: number; active: number }> = {};
  for (const agent of agents) {
    const div = agent.division || "unassigned";
    if (!byDivision[div]) byDivision[div] = { total: 0, active: 0 };
    byDivision[div].total++;
    if (agent.status === "active") byDivision[div].active++;
  }

  const topPerformers = agents
    .filter((a) => a.stats?.totalConversations > 0)
    .sort((a, b) => (b.stats?.satisfactionScore || 0) - (a.stats?.satisfactionScore || 0))
    .slice(0, 5)
    .map((a) => ({ name: a.name, slug: a.slug, conversations: a.stats?.totalConversations, satisfaction: a.stats?.satisfactionScore }));

  return {
    summary: { total, active, clientFacing, internal, draft: agents.filter((a) => a.status === "draft").length },
    byDivision,
    topPerformers,
  };
}

async function handleGetAgentStatus(agentId: string) {
  await connectToDatabase();
  const agent = await Agent.findOne({ $or: [{ slug: agentId }, { _id: agentId.length === 24 ? agentId : undefined }] })
    .select("name slug role status division isClientFacing agentMode stats guardrails permissions")
    .lean();
  if (!agent) return { error: "Agent not found" };

  const recentConversations = await AgentConversation.countDocuments({ agent: agent._id, createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } });
  const recentExecutions = await AgentExecution.countDocuments({ agent: agent._id, createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } });
  const failedExecutions = await AgentExecution.countDocuments({ agent: agent._id, status: "failed", createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } });

  return {
    agent,
    last7Days: { conversations: recentConversations, executions: recentExecutions, failed: failedExecutions, successRate: recentExecutions > 0 ? Math.round(((recentExecutions - failedExecutions) / recentExecutions) * 100) : 100 },
  };
}

async function handleGetProjectOverview(status?: string, limit = 10) {
  await connectToDatabase();
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;

  const projects = await Project.find(filter)
    .select("name slug status priority budget projectType client createdAt")
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean();
  const total = await Project.countDocuments(filter);

  const statusCounts = await Project.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  return { total, projects, statusCounts: statusCounts.map((s: { _id: string; count: number }) => ({ status: s._id, count: s.count })) };
}

async function handleCreateInternalTask(params: { title: string; description: string; projectId?: string; priority?: string; assigneeId?: string; dueDate?: string }) {
  await connectToDatabase();

  let reporter = await User.findOne({ role: { $in: ["super-admin", "admin"] } }).select("_id");
  if (!reporter) reporter = await User.findOne({}).select("_id");

  let projectId = params.projectId;
  if (!projectId) {
    const fallbackProject = await Project.findOne({}).lean();
    if (!fallbackProject) return { error: "No projects found. Create a project first." };
    projectId = fallbackProject._id.toString();
  }

  const taskData: Record<string, unknown> = {
    title: params.title,
    description: params.description,
    project: projectId,
    reporter: reporter?._id,
    priority: params.priority || "medium",
    status: "todo",
    tags: ["master-agent", "internal"],
  };

  if (params.assigneeId) taskData.assignee = params.assigneeId;
  if (params.dueDate) taskData.dueDate = new Date(params.dueDate);

  const task = await Task.create(taskData);
  return { task: { id: task._id, title: task.title, status: task.status, priority: task.priority } };
}

async function handleGetPendingApprovals() {
  await connectToDatabase();
  const tasks = await Task.find({ status: "review", tags: "needs-approval" })
    .select("title description project priority createdAt")
    .populate("project", "name")
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  const executions = await AgentExecution.find({ status: "pending-approval" })
    .select("agent type input output createdAt")
    .populate("agent", "name slug")
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  return { tasks, agentExecutions: executions, total: tasks.length + executions.length };
}

async function handleGetSystemHealth() {
  await connectToDatabase();
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const recentExecutions = await AgentExecution.find({ createdAt: { $gte: oneDayAgo } }).select("status type cost createdAt").lean();
  const failedToday = recentExecutions.filter((e) => e.status === "failed").length;
  const totalToday = recentExecutions.length;
  const totalCostToday = recentExecutions.reduce((sum, e) => sum + (e.cost || 0), 0);

  const activeConversations = await AgentConversation.countDocuments({ status: "active", createdAt: { $gte: oneHourAgo } });

  const agentsWithErrors = await Agent.find({ "stats.failedExecutions": { $gt: 0 } })
    .select("name slug stats.failedExecutions")
    .sort({ "stats.failedExecutions": -1 })
    .limit(5)
    .lean();

  return {
    status: failedToday / Math.max(totalToday, 1) < 0.1 ? "healthy" : "degraded",
    last24Hours: { totalExecutions: totalToday, failedExecutions: failedToday, successRate: totalToday > 0 ? Math.round(((totalToday - failedToday) / totalToday) * 100) : 100, totalCost: Math.round(totalCostToday * 100) / 100 },
    activeConversations,
    agentsWithErrors: agentsWithErrors.map((a) => ({ name: a.name, failed: a.stats?.failedExecutions })),
  };
}

async function handleGetTaskList(status?: string, projectId?: string, limit = 20) {
  await connectToDatabase();
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (projectId) filter.project = projectId;

  const tasks = await Task.find(filter)
    .select("title status priority assignee project dueDate createdAt")
    .populate("assignee", "name email")
    .populate("project", "name")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return { tasks, total: tasks.length };
}

async function handleGenerateReport(type: string, dateRange = "week") {
  await connectToDatabase();
  const rangeMs = dateRange === "today" ? 86400000 : dateRange === "month" ? 30 * 86400000 : 7 * 86400000;
  const since = new Date(Date.now() - rangeMs);

  const baseFilter = { createdAt: { $gte: since } };

  const executionStats = await AgentExecution.aggregate([
    { $match: baseFilter },
    { $group: { _id: "$status", count: { $sum: 1 }, totalCost: { $sum: "$cost" } } },
  ]);

  const projectStats = await Project.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  const taskStats = await Task.aggregate([
    { $match: baseFilter },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  return {
    type,
    dateRange,
    generatedAt: new Date().toISOString(),
    executions: executionStats,
    projects: projectStats,
    tasks: taskStats,
  };
}

// ─── Tool Router ────────────────────────────────────────────────────────────

async function executeInternalTool(toolName: string, args: Record<string, unknown>) {
  switch (toolName) {
    case "get_workforce_overview": return handleGetWorkforceOverview();
    case "get_agent_status": return handleGetAgentStatus(args.agentId as string);
    case "get_project_overview": return handleGetProjectOverview(args.status as string, args.limit as number);
    case "create_internal_task": return handleCreateInternalTask(args as { title: string; description: string; projectId?: string; priority?: string; assigneeId?: string; dueDate?: string });
    case "get_pending_approvals": return handleGetPendingApprovals();
    case "get_system_health": return handleGetSystemHealth();
    case "get_task_list": return handleGetTaskList(args.status as string, args.projectId as string, args.limit as number);
    case "generate_report": return handleGenerateReport(args.type as string, args.dateRange as string);
    // Content Orchestrator tools
    case "create_content_campaign":
    case "generate_weekly_plan":
    case "approve_content_plan":
    case "execute_content_plan":
    case "get_content_status":
    case "pause_content_campaign":
    case "get_content_performance":
    case "check_content_duplicates":
    case "get_connection_status":
    case "publish_content_item":
    case "get_content_schedule":
    case "execute_daily_content":
    case "repurpose_content":
    case "batch_repurpose":
    case "find_content_duplicates":
    case "merge_content_duplicates":
      return await executeContentTool(toolName, args);
    default: return { error: `Unknown tool: ${toolName}` };
  }
}

// ─── POST ───────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { auth, error } = await requireAuthFromCookie(request);
    if (error) return error;

    if (!ADMIN_ROLES.includes(auth.user.role)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    await connectToDatabase();
    const { message, sessionId } = await request.json();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Find or create master agent
    let masterAgent = await Agent.findOne({ slug: MASTER_AGENT_SLUG });
    if (!masterAgent) {
      masterAgent = await Agent.findOne({ isMasterAgent: true });
    }
    if (!masterAgent) {
      return NextResponse.json({ error: "Master agent not configured" }, { status: 500 });
    }

    const chatSessionId = sessionId || `admin-master-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // Find or create conversation
    let conversation = await AgentConversation.findOne({
      agent: masterAgent._id,
      sessionId: chatSessionId,
      status: "active",
    });

    if (!conversation) {
      conversation = await AgentConversation.create({
        agent: masterAgent._id,
        sessionId: chatSessionId,
        channel: "dashboard",
        visitor: { userId: auth.user.userId, name: auth.user.email, role: auth.user.role },
        context: { page: "/dashboard/master-agent", mode: "internal" },
        startedAt: new Date(),
        messageCount: 0,
        tokenUsage: { prompt: 0, completion: 0, total: 0 },
        cost: 0,
      });
    }

    // Add user message
    conversation.messages.push({ role: "user", content: message, timestamp: new Date() });
    conversation.messageCount += 1;
    await conversation.save();

    const conversationHistory = conversation.messages.slice(-20).map(
      (m: { role: string; content: string }) => ({ role: m.role as "user" | "assistant", content: m.content })
    );

    const startTime = Date.now();

    // Execute with AI — include internal tool definitions in system context
    const internalToolContext = `
You are the Admin Master Agent for Wall-V. You have access to internal workforce management tools.
When the Admin asks about operations, workforce, projects, tasks, or system health, use the appropriate tool.

Available internal tools:
- get_workforce_overview: Get summary of all AI agents
- get_agent_status: Get detailed status of a specific agent
- get_project_overview: Get project status overview
- create_internal_task: Create a task for the workforce
- get_pending_approvals: Check items needing approval
- get_system_health: Check system health
- get_task_list: List internal tasks
- generate_report: Generate operational reports

You also have access to Content Orchestrator tools:
- create_content_campaign: Create a new content campaign
- generate_weekly_plan: Generate a weekly content plan for a campaign
- approve_content_plan: Approve a pending content plan
- execute_content_plan: Execute an approved content plan
- get_content_status: Get current content status
- pause_content_campaign: Pause a campaign
- get_content_performance: Get content analytics
- check_content_duplicates: Check for duplicate content
- get_connection_status: Check social media connections
- publish_content_item: Publish content to platforms
- get_content_schedule: View upcoming schedule
- execute_daily_content: Trigger daily content execution
- repurpose_content: Repurpose content into other formats
- find_content_duplicates: Scan for duplicates
- merge_content_duplicates: Merge duplicate content

When a tool is needed, respond with a JSON block:
\`\`\`json
{"tool": "tool_name", "args": {...}}
\`\`\`

After receiving tool results, synthesize them into a clear, actionable response for the Admin.
Always respond in a professional, concise manner suitable for an operations dashboard.`;

    const result = await executeAIRequest({
      message,
      context: {
        userId: auth.user.userId,
        userRole: auth.user.role,
        visitorId: auth.user.userId,
        visitorName: auth.user.email || "Admin",
        visitorEmail: auth.user.email || "",
        channel: "dashboard",
        conversationId: conversation._id.toString(),
        page: "/dashboard/master-agent",
      },
      conversationHistory,
      agentId: masterAgent._id.toString(),
    });

    let responseText = result.response || "";

    // Check if the AI wants to call an internal tool
    const toolMatch = responseText.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    if (toolMatch) {
      try {
        const toolCall = JSON.parse(toolMatch[1]);
        if (toolCall.tool) {
          const toolResult = await executeInternalTool(toolCall.tool, toolCall.args || {});
          responseText = `**${toolCall.tool}** result:\n\n${JSON.stringify(toolResult, null, 2)}`;
        }
      } catch {
        // Not a valid tool call, use as-is
      }
    }

    // Add assistant response
    conversation.messages.push({ role: "assistant", content: responseText, timestamp: new Date() });
    conversation.messageCount += 1;
    await conversation.save();

    // Log execution
    await AgentExecution.create({
      agent: masterAgent._id,
      conversation: conversation._id,
      type: "chat",
      status: "completed",
      input: { message },
      output: { response: responseText },
      tokens: result.tokenUsage || { prompt: 0, completion: 0, total: 0 },
      cost: result.cost || 0,
      duration: Date.now() - startTime,
      retryCount: 0,
      maxRetries: 3,
      startedAt: new Date(Date.now() - (Date.now() - startTime)),
      completedAt: new Date(),
    });

    // Update stats (use updateOne to bypass validation on legacy fields)
    await Agent.updateOne(
      { _id: masterAgent._id },
      {
        $set: { "stats.lastActive": new Date() },
        $inc: {
          "stats.totalMessages": 1,
          ...(conversation.messageCount <= 2 ? { "stats.totalConversations": 1 } : {}),
        },
      }
    );

    return NextResponse.json({
      response: responseText,
      conversationId: conversation._id,
      sessionId: chatSessionId,
      messageCount: conversation.messageCount,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Master agent chat failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
