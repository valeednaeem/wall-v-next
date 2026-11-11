import Agent from "@/models/agent";
import AgentSkill from "@/models/agent-skill";
import connectToDatabase from "@/lib/mongodb";
import type { ClassifiedRequest, CapabilityDefinition } from "@/lib/capability-registry";

export interface ResolvedAgent {
  agentId: string;
  name: string;
  slug: string;
  description: string;
  role: string;
  division: string;
  avatar: string;
  score: number;
  reasons: string[];
  skills: string[];
  tools: string[];
  capacity: number;
  status: string;
}

export interface ResolutionResult {
  success: boolean;
  primaryAgent: ResolvedAgent | null;
  supportingAgents: ResolvedAgent[];
  totalQualified: number;
  requestType: string;
  capabilityId: string;
  requiresAuth: boolean;
  requiresProject: boolean;
  estimatedDuration: string;
  error?: string;
}

const ROLE_LEVELS: Record<string, number> = {
  "super-admin": 100,
  "admin": 80,
  "project-manager": 60,
  "developer": 40,
  "designer": 40,
  "marketing": 40,
  "sales": 40,
  "support": 40,
  "staff": 40,
  "customer": 10,
};

const DIVISION_KEYWORDS: Record<string, string[]> = {
  engineering: ["development", "frontend", "backend", "fullstack", "api", "database", "devops", "infrastructure", "mobile", "saas", "architecture"],
  design: ["design", "ui", "ux", "branding", "visual", "graphic", "creative", "logo", "illustration"],
  marketing: ["marketing", "seo", "social", "content", "email", "ppc", "advertising", "campaign", "analytics"],
  sales: ["sales", "crm", "lead", "conversion", "pricing", "proposal"],
  support: ["support", "help", "troubleshoot", "customer-service"],
  finance: ["finance", "accounting", "billing", "invoicing", "payment"],
  security: ["security", "compliance", "audit", "penetration", "vulnerability"],
  testing: ["testing", "qa", "quality", "automation", "regression"],
  "project-management": ["project", "agile", "scrum", "planning", "management"],
  specialized: ["custom", "specialized", "niche"],
};

function scoreAgent(agent: any, classified: ClassifiedRequest, capability: CapabilityDefinition): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  if (agent.status === "active") { score += 20; reasons.push("Active status"); }

  const divisionKeys = DIVISION_KEYWORDS[agent.division] || [];
  const hasDivisionMatch = classified.keywords.some((kw) =>
    divisionKeys.some((dk) => kw.toLowerCase().includes(dk) || dk.includes(kw.toLowerCase()))
  );
  if (hasDivisionMatch) { score += 15; reasons.push("Division match"); }

  const agentSkills = (agent.skills || []).map((s: any) => {
    if (typeof s === "object" && s.name) return s.name.toLowerCase();
    if (typeof s === "string") return s.toLowerCase();
    return "";
  }).filter(Boolean);

    const skillOverlap = capability.requiredSkills.filter((rs) =>
      agentSkills.some((as: string) => as.includes(rs) || rs.includes(as))
    );
  if (skillOverlap.length > 0) {
    score += skillOverlap.length * 10;
    reasons.push(`Skills: ${skillOverlap.join(", ")}`);
  }

  const agentTools = (agent.tools || []).map((t: any) => {
    if (typeof t === "object" && t.name) return t.name.toLowerCase();
    if (typeof t === "string") return t.toLowerCase();
    return "";
  }).filter(Boolean);

    const toolOverlap = capability.requiredTools.filter((rt) =>
      agentTools.some((at: string) => at.includes(rt) || rt.includes(at))
    );
  if (toolOverlap.length > 0) {
    score += toolOverlap.length * 8;
    reasons.push(`Tools: ${toolOverlap.join(", ")}`);
  }

  const contexts = agent.contexts || {};
  if (classified.requiresProject && contexts.client) { score += 5; reasons.push("Client context available"); }
  if (!classified.requiresProject && contexts.visitor) { score += 5; reasons.push("Visitor context available"); }

  const channels = agent.channels || {};
  if (channels.website) { score += 3; reasons.push("Website channel"); }
  if (channels.dashboard) { score += 2; reasons.push("Dashboard channel"); }

  if (agent.isMasterAgent) { score += 10; reasons.push("Master agent"); }
  if (agent.isClientFacing) { score += 5; reasons.push("Client-facing"); }

  const stats = agent.stats || {};
  if (stats.satisfactionScore > 80) { score += 5; reasons.push("High satisfaction"); }
  if (stats.totalConversations > 10) { score += 3; reasons.push("Experienced"); }

  if (agent.guardrails?.requireApproval) { score -= 3; reasons.push("Requires approval"); }

  return { score, reasons };
}

function getRoleLevel(role: string): number {
  return ROLE_LEVELS[role] || 0;
}

export async function resolveAgents(
  classified: ClassifiedRequest,
  capability: CapabilityDefinition,
  userRole?: string,
  excludeAgentIds: string[] = [],
  limit = 5
): Promise<ResolutionResult> {
  try {
    await connectToDatabase();

    const query: any = { status: "active" };
    if (excludeAgentIds.length > 0) {
      query._id = { $nin: excludeAgentIds };
    }

    const agents = await Agent.find(query)
      .populate("skills", "name slug category capabilities")
      .populate("tools", "name slug category type")
      .lean();

    if (agents.length === 0) {
      return {
        success: false,
        primaryAgent: null,
        supportingAgents: [],
        totalQualified: 0,
        requestType: classified.requestType,
        capabilityId: capability.id,
        requiresAuth: capability.requiresAuth,
        requiresProject: capability.requiresProject,
        estimatedDuration: capability.estimatedDuration,
        error: "No active agents found",
      };
    }

    const scoredAgents: ResolvedAgent[] = [];

    for (const agent of agents) {
      const { score, reasons } = scoreAgent(agent, classified, capability);

      if (score < 10) continue;

      const minLevel = getRoleLevel(capability.minUserRole);
      const userLevel = userRole ? getRoleLevel(userRole) : 0;
      if (capability.requiresAuth && userLevel < minLevel) continue;

      scoredAgents.push({
        agentId: agent._id.toString(),
        name: agent.name,
        slug: agent.slug,
        description: agent.description || "",
        role: agent.role || "custom",
        division: agent.division || "",
        avatar: agent.avatar || "🤖",
        score,
        reasons,
        skills: (agent.skills || []).map((s: any) => s.name || s).filter(Boolean),
        tools: (agent.tools || []).map((t: any) => t.name || t).filter(Boolean),
        capacity: agent.capacity || 100,
        status: agent.status,
      });
    }

    scoredAgents.sort((a, b) => b.score - a.score);

    const primary = scoredAgents[0] || null;
    const supporting = scoredAgents.slice(1, limit);

    return {
      success: !!primary,
      primaryAgent: primary,
      supportingAgents: supporting,
      totalQualified: scoredAgents.length,
      requestType: classified.requestType,
      capabilityId: capability.id,
      requiresAuth: capability.requiresAuth,
      requiresProject: capability.requiresProject,
      estimatedDuration: capability.estimatedDuration,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Resolution failed";
    return {
      success: false,
      primaryAgent: null,
      supportingAgents: [],
      totalQualified: 0,
      requestType: classified.requestType,
      capabilityId: capability.id,
      requiresAuth: capability.requiresAuth,
      requiresProject: capability.requiresProject,
      estimatedDuration: capability.estimatedDuration,
      error: msg,
    };
  }
}
