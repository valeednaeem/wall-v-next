import connectToDatabase from "@/lib/mongodb";

export interface SkillMatch {
  skillId: string;
  name: string;
  slug: string;
  instructions: string;
  systemPrompt?: string;
  confidence: number;
  matchedBy: "keyword" | "intent" | "manual";
}

/**
 * Find skills that match the current user message.
 * Filters by agentId — only returns skills assigned to the given agent.
 */
export async function findMatchingSkills(
  agentId: string,
  userMessage: string
): Promise<SkillMatch[]> {
  await connectToDatabase();
  const AgentSkill = (await import("@/models/agent-skill")).default;
  const Agent = (await import("@/models/agent")).default;

  // Get the agent's assigned skill IDs
  const agent = await Agent.findById(agentId).populate("skills", "_id").lean();
  if (!agent || !agent.skills || (agent.skills as unknown[]).length === 0) {
    return [];
  }

  const skillIds = (agent.skills as unknown[]).map((s: unknown) => {
    if (typeof s === "object" && s !== null && "_id" in s) {
      return (s as { _id: unknown })._id;
    }
    return s;
  });

  const messageLower = userMessage.toLowerCase();
  const matches: SkillMatch[] = [];

  // Get active skills assigned to this agent
  const skills = await AgentSkill.find({
    _id: { $in: skillIds },
    status: "active",
  }).lean();

  for (const skill of skills) {
    let matched = false;
    let matchedBy: "keyword" | "intent" | "manual" = "keyword";
    let confidence = 0;

    for (const trigger of skill.triggers || []) {
      if (trigger.type === "keyword") {
        const keywords = trigger.value.split(",").map((k: string) => k.trim().toLowerCase());
        const matchCount = keywords.filter((kw: string) => messageLower.includes(kw)).length;
        if (matchCount > 0) {
          matched = true;
          matchedBy = "keyword";
          confidence = Math.min(100, (matchCount / keywords.length) * 100);
          break;
        }
      } else if (trigger.type === "intent") {
        const intentKeywords = trigger.value.split("-").map((k: string) => k.trim().toLowerCase());
        const matchCount = intentKeywords.filter((kw: string) => messageLower.includes(kw)).length;
        if (matchCount > 0) {
          matched = true;
          matchedBy = "intent";
          confidence = Math.min(100, (matchCount / intentKeywords.length) * 100);
          break;
        }
      }
    }

    if (matched) {
      matches.push({
        skillId: skill._id.toString(),
        name: skill.name,
        slug: skill.slug,
        instructions: Array.isArray(skill.instructions) ? skill.instructions.join("\n") : (skill.instructions || ""),
        systemPrompt: skill.systemPrompt,
        confidence,
        matchedBy,
      });
    }
  }

  // Sort by confidence descending, take top 3
  matches.sort((a, b) => b.confidence - a.confidence);
  return matches.slice(0, 3);
}

/**
 * Build skill context string to inject into the system prompt.
 */
export function buildSkillContext(skills: SkillMatch[]): string {
  if (skills.length === 0) return "";

  const skillBlocks = skills.map(
    (s) => `### Active Skill: ${s.name} (confidence: ${s.confidence}%)\n${s.instructions}`
  );

  return `## Active Skills\nThe following skills have been activated for this conversation:\n\n${skillBlocks.join("\n\n")}`;
}

/**
 * Update skill usage stats after a successful invocation.
 */
export async function trackSkillUsage(skillId: string, success: boolean): Promise<void> {
  try {
    await connectToDatabase();
    const AgentSkill = (await import("@/models/agent-skill")).default;

    const skill = await AgentSkill.findById(skillId).lean();
    if (!skill) return;

    const total = (skill.usage?.totalInvocations || 0) + 1;
    const prevRate = skill.usage?.successRate || 0;
    const prevSuccesses = (prevRate / 100) * (total - 1);
    const newSuccesses = prevSuccesses + (success ? 1 : 0);
    const newSuccessRate = Math.round((newSuccesses / total) * 100 * 10) / 10;

    await AgentSkill.updateOne(
      { _id: skillId },
      {
        $inc: { "usage.totalInvocations": 1 },
        $set: {
          "usage.lastUsed": new Date(),
          "usage.successRate": newSuccessRate,
        },
      }
    );
  } catch {
    // Non-critical — don't fail the chat if tracking fails
  }
}
