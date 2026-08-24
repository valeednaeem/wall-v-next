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
 * Checks keywords and intent triggers against the message text.
 */
export async function findMatchingSkills(
  agentId: string,
  userMessage: string
): Promise<SkillMatch[]> {
  await connectToDatabase();
  const AgentSkill = (await import("@/models/agent-skill")).default;

  const messageLower = userMessage.toLowerCase();
  const matches: SkillMatch[] = [];

  // Get all active skills for this agent (or global skills)
  const skills = await AgentSkill.find({
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
        // Intent matching is a simple keyword lookup for now
        // In production, this would use a proper intent classifier
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
        instructions: skill.instructions,
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

    const total = skill.usage.totalInvocations + 1;
    const prevSuccesses = skill.usage.successRate * skill.usage.totalInvocations;
    const newSuccesses = prevSuccesses + (success ? 1 : 0);
    const newSuccessRate = Math.round((newSuccesses / total) * 100);

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
