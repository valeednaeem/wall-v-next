import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import Agent from "@/models/agent";
import User from "@/models/user";
import Task from "@/models/task";
import Project from "@/models/project";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();

    const agents = await Agent.find({ status: "active" })
      .select("name slug status division skills stats isClientFacing isMasterAgent")
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
        const totalTasks = await Task.countDocuments({ assignee: agent._id });
        return {
          ...agent,
          activeTasks,
          totalTasks,
          utilizationPercent: totalTasks > 0 ? Math.round((activeTasks / Math.max(totalTasks, 1)) * 100) : 0,
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
        const totalTasks = await Task.countDocuments({ assignee: human._id });
        return {
          ...human,
          activeTasks,
          totalTasks,
          utilizationPercent: totalTasks > 0 ? Math.round((activeTasks / Math.max(totalTasks, 1)) * 100) : 0,
          status: activeTasks > 8 ? "overloaded" : activeTasks > 5 ? "near-capacity" : "available",
        };
      })
    );

    return NextResponse.json({ agents: agentCapacity, humans: humanCapacity });
  } catch (error) {
    console.error("PM Capacity GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
