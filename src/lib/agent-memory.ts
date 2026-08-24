import connectToDatabase from "@/lib/mongodb";

interface MemoryExtraction {
  category: "user-preference" | "fact" | "interaction" | "context";
  key: string;
  value: Record<string, unknown>;
  type: "short-term" | "long-term" | "episodic" | "semantic";
  relevance: number;
  ttl?: number; // seconds
}

/**
 * Extract memories from a conversation message.
 * Analyzes the message for user preferences, facts, and context.
 */
export function extractMemoriesFromMessage(
  message: string,
  role: string
): MemoryExtraction[] {
  const memories: MemoryExtraction[] = [];
  const lower = message.toLowerCase();

  if (role !== "user") return memories;

  // ─── Extract Name ──────────────────────────────────────────
  const namePatterns = [
    /my name is ([a-zA-Z\s]+)/i,
    /i'm ([a-zA-Z\s]+)/i,
    /i am ([a-zA-Z\s]+)/i,
    /call me ([a-zA-Z\s]+)/i,
    /this is ([a-zA-Z\s]+)/i,
  ];
  for (const pattern of namePatterns) {
    const match = message.match(pattern);
    if (match) {
      memories.push({
        category: "fact",
        key: "user.name",
        value: { name: match[1].trim() },
        type: "long-term",
        relevance: 0.9,
      });
      break;
    }
  }

  // ─── Extract Email ─────────────────────────────────────────
  const emailMatch = message.match(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
  );
  if (emailMatch) {
    memories.push({
      category: "fact",
      key: "user.email",
      value: { email: emailMatch[0] },
      type: "long-term",
      relevance: 0.95,
    });
  }

  // ─── Extract Phone ─────────────────────────────────────────
  const phoneMatch = message.match(
    /(\+?[\d\s\-().]{7,15})/
  );
  if (phoneMatch && phoneMatch[0].replace(/\D/g, "").length >= 7) {
    memories.push({
      category: "fact",
      key: "user.phone",
      value: { phone: phoneMatch[0].trim() },
      type: "long-term",
      relevance: 0.8,
    });
  }

  // ─── Extract Company ───────────────────────────────────────
  const companyPatterns = [
    /(?:company|business|organization|firm|corp|llc|ltd)\s+(?:is|called|named)\s+([a-zA-Z\s&.]+)/i,
    /(?:i work at|i'm from|we are|we're)\s+([a-zA-Z\s&.]+)/i,
    /(?:my company|our company)\s+(?:is|called|named)\s+([a-zA-Z\s&.]+)/i,
  ];
  for (const pattern of companyPatterns) {
    const match = message.match(pattern);
    if (match) {
      memories.push({
        category: "fact",
        key: "user.company",
        value: { company: match[1].trim() },
        type: "long-term",
        relevance: 0.85,
      });
      break;
    }
  }

  // ─── Extract Budget ────────────────────────────────────────
  const budgetPatterns = [
    /budget\s+(?:is|of|around|about)?\s*\$?([\d,]+)/i,
    /\$([\d,]+)\s*(?:budget|to spend|available)/i,
    /(?:spend|invest|pay)\s+(?:up to\s+)?\$?([\d,]+)/i,
    /([\d,]+)\s*(?:dollars|usd)/i,
  ];
  for (const pattern of budgetPatterns) {
    const match = message.match(pattern);
    if (match) {
      const amount = parseInt(match[1].replace(/,/g, ""));
      if (amount > 0) {
        memories.push({
          category: "context",
          key: "project.budget",
          value: { amount, currency: "USD" },
          type: "episodic",
          relevance: 0.7,
          ttl: 86400 * 30, // 30 days
        });
        break;
      }
    }
  }

  // ─── Extract Timeline ──────────────────────────────────────
  const timelinePatterns = [
    /(?:need|want|deadline)\s+(?:it\s+)?(?:in\s+)?(\d+)\s*(days?|weeks?|months?)/i,
    /(?:by|before|until)\s+([a-zA-Z]+\s+\d{1,2})/i,
    /(asap|urgently|urgent|quickly|immediately)/i,
  ];
  for (const pattern of timelinePatterns) {
    const match = message.match(pattern);
    if (match) {
      memories.push({
        category: "context",
        key: "project.timeline",
        value: { timeline: match[0] },
        type: "episodic",
        relevance: 0.6,
        ttl: 86400 * 30,
      });
      break;
    }
  }

  // ─── Extract Project Type ──────────────────────────────────
  const projectTypeKeywords: Record<string, string[]> = {
    website: ["website", "web page", "landing page", "site"],
    "e-commerce": ["e-commerce", "ecommerce", "online store", "shop", "store"],
    "web-application": ["web app", "webapp", "application", "platform"],
    "mobile-app": ["mobile app", "ios app", "android app", "react native"],
    "ai-solution": ["ai", "chatbot", "machine learning", "automation"],
    crm: ["crm", "customer relationship"],
    erp: ["erp", "enterprise resource"],
  };
  for (const [type, keywords] of Object.entries(projectTypeKeywords)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      memories.push({
        category: "context",
        key: "project.type",
        value: { type },
        type: "episodic",
        relevance: 0.8,
        ttl: 86400 * 30,
      });
      break;
    }
  }

  // ─── Extract Design Preferences ────────────────────────────
  const designKeywords = [
    "modern",
    "minimal",
    "clean",
    "professional",
    "bold",
    "colorful",
    "elegant",
    "simple",
    "sleek",
    "futuristic",
    "classic",
    "custom",
  ];
  const mentionedDesign = designKeywords.filter((kw) => lower.includes(kw));
  if (mentionedDesign.length > 0) {
    memories.push({
      category: "user-preference",
      key: "design.style",
      value: { styles: mentionedDesign },
      type: "long-term",
      relevance: 0.6,
    });
  }

  // ─── Extract Industry ──────────────────────────────────────
  const industryPatterns = [
    /(?:in the|our|my)\s+(healthcare|finance|education|technology|retail|restaurant|real estate|legal|marketing|manufacturing|logistics|travel|entertainment|fitness|beauty|automotive|agriculture)\s+(?:industry|sector|business)/i,
    /(?:healthcare|finance|education|technology|retail|restaurant|real estate|legal|marketing|manufacturing|logistics|travel|entertainment|fitness|beauty|automotive|agriculture)\s+(?:company|business|firm)/i,
  ];
  for (const pattern of industryPatterns) {
    const match = message.match(pattern);
    if (match) {
      memories.push({
        category: "fact",
        key: "industry",
        value: { industry: match[1].toLowerCase() },
        type: "long-term",
        relevance: 0.7,
      });
      break;
    }
  }

  return memories;
}

/**
 * Save extracted memories to the database.
 * Deduplicates by agent + key, updating relevance and value.
 */
export async function saveMemories(
  agentId: string,
  memories: MemoryExtraction[],
  conversationId?: string,
  sessionId?: string
): Promise<number> {
  await connectToDatabase();
  const AgentMemory = (await import("@/models/agent-memory")).default;

  let saved = 0;

  for (const memory of memories) {
    try {
      // Check if a memory with this agent + key already exists
      const existing = await AgentMemory.findOne({
        agent: agentId,
        key: memory.key,
      });

      if (existing) {
        // Update existing memory — merge values and boost relevance
        const mergedValue = { ...existing.value, ...memory.value };
        await AgentMemory.updateOne(
          { _id: existing._id },
          {
            $set: {
              value: mergedValue,
              relevance: Math.min(1, Math.max(existing.relevance, memory.relevance)),
              lastAccessedAt: new Date(),
              conversation: conversationId || existing.conversation,
            },
            $inc: { accessCount: 1 },
          }
        );
      } else {
        // Create new memory
        const createData: Record<string, unknown> = {
          agent: agentId,
          type: memory.type,
          category: memory.category,
          key: memory.key,
          value: memory.value,
          relevance: memory.relevance,
          accessCount: 0,
          lastAccessedAt: new Date(),
          sessionId,
        };
        if (conversationId) createData.conversation = conversationId;
        if (memory.ttl) {
          createData.expiresAt = new Date(Date.now() + memory.ttl * 1000);
        }
        await AgentMemory.create(createData);
      }
      saved++;
    } catch {
      // Skip failed memories — don't break the chat
    }
  }

  return saved;
}

/**
 * Extract and save memories from a conversation message.
 * This is the main entry point to call after each user message.
 */
export async function captureMemoriesFromMessage(
  agentId: string,
  message: string,
  conversationId?: string,
  sessionId?: string
): Promise<number> {
  const extracted = extractMemoriesFromMessage(message, "user");
  if (extracted.length === 0) return 0;
  return saveMemories(agentId, extracted, conversationId, sessionId);
}

/**
 * Get relevant memories for context injection.
 */
export async function getRelevantMemories(
  agentId: string,
  limit: number = 10
): Promise<{ key: string; value: Record<string, unknown>; category: string }[]> {
  await connectToDatabase();
  const AgentMemory = (await import("@/models/agent-memory")).default;

  const memories = await AgentMemory.find({
    agent: agentId,
    type: { $in: ["long-term", "semantic"] },
  })
    .sort({ relevance: -1, accessCount: -1 })
    .limit(limit)
    .lean();

  return memories.map((m) => ({
    key: m.key,
    value: m.value,
    category: m.category,
  }));
}
