import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import Agent from "@/models/agent";
import AgentTool from "@/models/agent-tool";
import AgentSkill from "@/models/agent-skill";
import AgentHook from "@/models/agent-hook";
import connectToDatabase from "@/lib/mongodb";

void AgentTool;
void AgentSkill;
void AgentHook;

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const role = searchParams.get("role");
    const type = searchParams.get("type");
    const division = searchParams.get("division");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const sort = searchParams.get("sort") || "createdAt";
    const order = searchParams.get("order") || "desc";
    const statsOnly = searchParams.get("statsOnly") === "true";

    const query: Record<string, unknown> = {};
    if (status) query.status = status;
    if (role) query.role = role;
    if (type) query.type = type;
    if (division) query.division = division;

    const hideDeprecated = searchParams.get("hideDeprecated") !== "false";
    if (hideDeprecated) {
      const DEPRECATED_SLUGS = ["admin-agent", "staff-agent", "developer-agent", "designer-agent", "customer-agent"];
      query.slug = { $nin: DEPRECATED_SLUGS };
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { division: { $regex: search, $options: "i" } },
      ];
    }

    if (statsOnly) {
      const statsQuery: Record<string, unknown> = {};
      if (hideDeprecated) {
        statsQuery.slug = { $nin: ["admin-agent", "staff-agent", "developer-agent", "designer-agent", "customer-agent"] };
      }

      const [total, active, inactive, draft, testing, clientFacing, masterAgent, divisions] = await Promise.all([
        Agent.countDocuments(statsQuery),
        Agent.countDocuments({ ...statsQuery, status: "active" }),
        Agent.countDocuments({ ...statsQuery, status: "inactive" }),
        Agent.countDocuments({ ...statsQuery, status: "draft" }),
        Agent.countDocuments({ ...statsQuery, status: "testing" }),
        Agent.countDocuments({ ...statsQuery, isClientFacing: true }),
        Agent.countDocuments({ ...statsQuery, isMasterAgent: true }),
        Agent.distinct("division", statsQuery),
      ]);

      const divisionMatch = hideDeprecated
        ? [{ $match: { slug: { $nin: ["admin-agent", "staff-agent", "developer-agent", "designer-agent", "customer-agent"] } } }]
        : [];
      const divisionCounts = await Agent.aggregate([
        ...divisionMatch,
        { $group: { _id: "$division", count: { $sum: 1 }, active: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } } } },
        { $sort: { count: -1 } },
      ]);

      return NextResponse.json({
        stats: { total, active, inactive, draft, testing, clientFacing, masterAgent, divisions: divisions.filter(Boolean).length, divisionCounts },
      });
    }

    const [agents, total] = await Promise.all([
      Agent.find(query)
        .populate("skills", "name slug category")
        .populate("tools", "name slug category type")
        .populate("createdBy", "name email")
        .sort({ [sort]: order === "asc" ? 1 : -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Agent.countDocuments(query),
    ]);

    return NextResponse.json({
      agents,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch agents";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    const body = await request.json();
    const {
      name, description, type, role, systemPrompt, instructions,
      model, temperature, maxTokens, personality, memory, guardrails,
      channels, integrations, skills, tools, isClientFacing, isMasterAgent, masterConfig, division,
    } = body;

    if (!name || !systemPrompt) {
      return NextResponse.json({ error: "Name and system prompt are required" }, { status: 400 });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const existing = await Agent.findOne({ slug });
    if (existing) {
      return NextResponse.json({ error: "An agent with this name already exists" }, { status: 409 });
    }

    const agent = await Agent.create({
      name,
      slug,
      description: description || "",
      type: type || "conversational",
      role: role || "custom",
      division: division || "",
      systemPrompt,
      instructions: instructions || [],
      aiModel: model || "gpt-4o",
      temperature: temperature ?? 0.7,
      maxTokens: maxTokens ?? 2048,
      personality,
      memory: memory || { type: "conversation", maxItems: 50 },
      guardrails: guardrails || { maxConversationLength: 100, contentFilter: true },
      channels: channels || { website: true, dashboard: true },
      integrations: integrations || { crm: true, projects: true },
      skills: skills || [],
      tools: tools || [],
      isClientFacing: isClientFacing ?? false,
      isMasterAgent: isMasterAgent ?? false,
      masterConfig,
      createdBy: user.userId,
    });

    return NextResponse.json({ agent }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create agent";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
