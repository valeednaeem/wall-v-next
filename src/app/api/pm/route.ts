import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import Project from "@/models/project";
import Task from "@/models/task";
import Agent from "@/models/agent";
import User from "@/models/user";
import PmRisk from "@/models/pm-risk";
import PmIssue from "@/models/pm-issue";
import PmAlert from "@/models/pm-alert";
import PmIntake from "@/models/pm-intake";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const section = searchParams.get("section") || "overview";

    if (section === "overview") {
      const [
        totalProjects,
        activeProjects,
        blockedProjects,
        atRiskProjects,
        completedProjects,
        totalTasks,
        overdueTasks,
        activeTasks,
        totalAgents,
        activeAgents,
        failedAgents,
        totalUsers,
        activeUsers,
        pendingApprovals,
        activeAlerts,
        criticalAlerts,
        openRisks,
        criticalRisks,
        openIssues,
        criticalIssues,
        pendingIntakes,
        recentIntakes,
      ] = await Promise.all([
        Project.countDocuments(),
        Project.countDocuments({ status: "in-progress" }),
        Project.countDocuments({ status: "blocked" }),
        Project.countDocuments({ status: "at-risk" }),
        Project.countDocuments({ status: "completed" }),
        Task.countDocuments(),
        Task.countDocuments({ dueDate: { $lt: new Date() }, status: { $ne: "done" } }),
        Task.countDocuments({ status: "in-progress" }),
        Agent.countDocuments({ isClientFacing: true }),
        Agent.countDocuments({ status: "active" }),
        Agent.countDocuments({ status: "inactive" }),
        User.countDocuments({ isActive: true }),
        User.countDocuments({ isActive: true, role: { $in: ["developer", "designer", "staff"] } }),
        (await import("@/models/agent-approval")).default ? await (await import("@/models/agent-approval")).default.countDocuments({ status: "pending" }) : 0,
        PmAlert.countDocuments({ status: "active" }),
        PmAlert.countDocuments({ status: "active", severity: "critical" }),
        PmRisk.countDocuments({ status: { $in: ["identified", "analyzing", "mitigating"] } }),
        PmRisk.countDocuments({ status: { $in: ["identified", "analyzing", "mitigating"] }, severity: { $in: ["high", "critical"] } }),
        PmIssue.countDocuments({ status: { $in: ["detected", "triaged", "assigned", "in-progress"] } }),
        PmIssue.countDocuments({ status: { $in: ["detected", "triaged", "assigned", "in-progress"] }, severity: { $in: ["critical", "blocker"] } }),
        PmIntake.countDocuments({ triageStatus: "pending" }),
        PmIntake.find().sort({ createdAt: -1 }).limit(5).lean(),
      ]);

      return NextResponse.json({
        overview: {
          projects: { total: totalProjects, active: activeProjects, blocked: blockedProjects, atRisk: atRiskProjects, completed: completedProjects },
          tasks: { total: totalTasks, overdue: overdueTasks, active: activeTasks },
          agents: { total: totalAgents, active: activeAgents, failed: failedAgents },
          humans: { total: totalUsers, active: activeUsers },
          approvals: { pending: pendingApprovals },
          alerts: { active: activeAlerts, critical: criticalAlerts },
          risks: { open: openRisks, critical: criticalRisks },
          issues: { open: openIssues, critical: criticalIssues },
          intake: { pending: pendingIntakes, recent: recentIntakes },
        },
      });
    }

    if (section === "capacity") {
      const agents = await Agent.find({ status: "active" })
        .select("name slug status division skills stats")
        .populate("skills", "name category")
        .lean();

      const users = await User.find({ isActive: true, role: { $in: ["developer", "designer", "staff"] } })
        .select("name email role jobTitle isActive")
        .lean();

      return NextResponse.json({ agents, users });
    }

    if (section === "projects") {
      const projects = await Project.find()
        .sort({ createdAt: -1 })
        .limit(50)
        .select("name slug status priority budget spent startDate endDate deadline client projectType")
        .lean();

      return NextResponse.json({ projects });
    }

    if (section === "tasks") {
      const tasks = await Task.find()
        .sort({ createdAt: -1 })
        .limit(100)
        .populate("project", "name slug")
        .populate("assignee", "name email")
        .lean();

      return NextResponse.json({ tasks });
    }

    return NextResponse.json({ error: "Invalid section" }, { status: 400 });
  } catch (error) {
    console.error("PM API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
