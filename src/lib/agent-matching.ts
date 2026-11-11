import connectToDatabase from "@/lib/mongodb";
import Agent from "@/models/agent";

export interface MatchInput {
  requirement: string;
  projectType?: string;
  requiredSkills?: string[];
  requiredTools?: string[];
  complexity?: "low" | "medium" | "high";
  context?: "visitor" | "lead" | "customer" | "client" | "admin" | "staff" | "system";
  channel?: "website" | "whatsapp" | "email" | "api" | "dashboard" | "voice";
  excludeAgentIds?: string[];
  limit?: number;
}

export interface MatchResult {
  agentId: string;
  name: string;
  slug: string;
  description: string;
  role: string;
  division?: string;
  status: string;
  score: number;
  reasons: string[];
  skillMatch: number;
  toolMatch: number;
  contextMatch: boolean;
  channelMatch: boolean;
  availability: "available" | "busy" | "unavailable";
}

const DIVISION_KEYWORDS: Record<string, string[]> = {
  engineering: ["development", "code", "api", "backend", "frontend", "database", "architecture", "bug", "fix", "deploy", "infrastructure", "devops", "software", "programming", "integration"],
  design: ["design", "ui", "ux", "interface", "mockup", "wireframe", "prototype", "visual", "layout", "branding", "logo", "graphic"],
  marketing: ["marketing", "campaign", "social media", "content", "seo", "advertising", "promotion", "brand", "audience", "growth", "traffic"],
  sales: ["sales", "lead", "proposal", "quotation", "pricing", "deal", "conversion", "pipeline", "prospect", "follow-up", "negotiation"],
  support: ["support", "help", "issue", "bug", "problem", "ticket", "customer service", "troubleshoot", "escalation", "faq"],
  finance: ["invoice", "payment", "billing", "financial", "accounting", "revenue", "budget", "cost", "tax", "refund"],
  security: ["security", "vulnerability", "penetration", "audit", "compliance", "authentication", "authorization", "encryption", "threat"],
  testing: ["test", "qa", "quality", "automation", "regression", "integration test", "performance test", "bug"],
  "project-management": ["project", "plan", "milestone", "task", "timeline", "schedule", "resource", "capacity", "workflow", "kanban", "scrum"],
  "game-development": ["game", "unity", "unreal", "godot", "gameplay", "physics", "animation", "shader", "vfx"],
  gis: ["gis", "map", "geospatial", "spatial", "terrain", "coordinates", "geographic", "survey", "mapping"],
  "paid-media": ["ppc", "google ads", "facebook ads", "paid", "campaign", "roas", "cpa", "impression", "click"],
  product: ["product", "feature", "roadmap", "backlog", "sprint", "user story", "acceptance criteria"],
  academic: ["research", "academic", "paper", "study", "analysis", "methodology", "literature"],
  healthcare: ["health", "medical", "patient", "clinical", "healthcare", "hipaa"],
  "spatial-computing": ["ar", "vr", "xr", "spatial", "3d", "immersive", "reality", "headset"],
  specialized: ["specialized", "niche", "custom", "specific", "expert"],
};

function calculateSkillMatch(agentSkills: { name: string; category: string }[], requiredSkills: string[]): number {
  if (requiredSkills.length === 0) return 1;
  const agentSkillNames = agentSkills.map((s) => s.name.toLowerCase());
  const agentSkillCategories = agentSkills.map((s) => s.category.toLowerCase());
  let matches = 0;
  for (const skill of requiredSkills) {
    const lower = skill.toLowerCase();
    if (agentSkillNames.some((n) => n.includes(lower) || lower.includes(n))) matches++;
    else if (agentSkillCategories.some((c) => c.includes(lower) || lower.includes(c))) matches += 0.5;
  }
  return matches / requiredSkills.length;
}

function calculateToolMatch(agentTools: { name: string; category: string }[], requiredTools: string[]): number {
  if (requiredTools.length === 0) return 1;
  const agentToolNames = agentTools.map((t) => t.name.toLowerCase());
  let matches = 0;
  for (const tool of requiredTools) {
    if (agentToolNames.some((n) => n.includes(tool.toLowerCase()) || tool.toLowerCase().includes(n))) matches++;
  }
  return matches / requiredTools.length;
}

function calculateTextRelevance(agentDescription: string, requirement: string): number {
  const descWords = agentDescription.toLowerCase().split(/\s+/);
  const reqWords = requirement.toLowerCase().split(/\s+/);
  let matches = 0;
  for (const word of reqWords) {
    if (word.length > 2 && descWords.some((dw) => dw.includes(word) || word.includes(dw))) matches++;
  }
  return reqWords.length > 0 ? matches / reqWords.length : 0;
}

export async function matchAgents(input: MatchInput): Promise<MatchResult[]> {
  await connectToDatabase();

  const query: Record<string, unknown> = { status: "active" };
  if (input.excludeAgentIds?.length) {
    query._id = { $nin: input.excludeAgentIds };
  }

  const agents = await Agent.find(query)
    .populate("skills", "name slug category")
    .populate("tools", "name slug category")
    .lean();

  const results: MatchResult[] = [];

  for (const agent of agents) {
    let score = 0;
    const reasons: string[] = [];

    // Text relevance (40%)
    const textScore = calculateTextRelevance(agent.description || "", input.requirement);
    score += textScore * 40;
    if (textScore > 0.3) reasons.push("description match");

    // Division match (25%)
    if (agent.division) {
      const keywords = DIVISION_KEYWORDS[agent.division] || [];
      const reqLower = input.requirement.toLowerCase();
      const divisionMatch = keywords.some((kw) => reqLower.includes(kw));
      if (divisionMatch) {
        score += 25;
        reasons.push(`division: ${agent.division}`);
      }
    }

    // Skill match (20%)
    const skills = (agent.skills || []) as { name: string; category: string }[];
    const skillScore = calculateSkillMatch(skills, input.requiredSkills || []);
    score += skillScore * 20;
    if (skillScore > 0.5) reasons.push(`${Math.round(skillScore * 100)}% skill match`);

    // Tool match (10%)
    const tools = (agent.tools || []) as { name: string; category: string }[];
    const toolScore = calculateToolMatch(tools, input.requiredTools || []);
    score += toolScore * 10;
    if (toolScore > 0.5) reasons.push(`${Math.round(toolScore * 100)}% tool match`);

    // Context match (5%)
    const contexts = (agent.contexts || {}) as Record<string, boolean>;
    const contextMatch = !input.context || contexts[input.context] !== false;
    if (contextMatch) score += 5;
    else reasons.push("context not supported");

    // Channel match
    const channels = (agent.channels || {}) as Record<string, boolean>;
    const channelMatch = !input.channel || channels[input.channel] !== false;

    // Availability
    const totalExecutions = (agent.stats?.totalExecutions as number) || 0;
    const failedExecutions = (agent.stats?.failedExecutions as number) || 0;
    const failRate = totalExecutions > 0 ? failedExecutions / totalExecutions : 0;
    let availability: "available" | "busy" | "unavailable" = "available";
    if (failRate > 0.5) availability = "unavailable";
    else if (failRate > 0.2) availability = "busy";

    if (score > 10) {
      results.push({
        agentId: (agent._id as unknown as string).toString(),
        name: agent.name as string,
        slug: agent.slug as string,
        description: (agent.description as string) || "",
        role: agent.role as string,
        division: agent.division as string | undefined,
        status: agent.status as string,
        score: Math.round(score * 100) / 100,
        reasons,
        skillMatch: Math.round(skillScore * 100),
        toolMatch: Math.round(toolScore * 100),
        contextMatch,
        channelMatch,
        availability,
      });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, input.limit || 20);
}
