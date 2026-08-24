import connectToDatabase from "@/lib/mongodb";

// ─── TASK 4: CONVERSATION SUMMARIES ─────────────────────────

/**
 * Generate a summary of the conversation using keyword extraction.
 * In production, this would use an LLM call.
 */
export function generateConversationSummary(
  messages: { role: string; content: string }[]
): string {
  const userMessages = messages.filter((m) => m.role === "user");
  const assistantMessages = messages.filter((m) => m.role === "assistant");

  // Extract key topics from user messages
  const topics: string[] = [];
  const topicKeywords: Record<string, string[]> = {
    "project inquiry": ["build", "create", "develop", "need", "want", "project"],
    pricing: ["price", "cost", "how much", "budget", "quote"],
    support: ["help", "issue", "problem", "bug", "error", "fix"],
    technical: ["technology", "framework", "database", "architecture", "api"],
    timeline: ["deadline", "timeline", "urgent", "asap", "weeks", "months"],
    features: ["feature", "functionality", "need", "require", "must have"],
  };

  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    const allText = userMessages.map((m) => m.content.toLowerCase()).join(" ");
    if (keywords.some((kw) => allText.includes(kw))) {
      topics.push(topic);
    }
  }

  // Extract mentioned entities
  const entities: string[] = [];
  const entityPatterns = [
    /(?:website|web app|mobile app|e-commerce|store)/gi,
    /(?:react|next\.?js|node\.?js|python|mongodb|postgresql)/gi,
    /(?:stripe|paypal|2checkout|google|facebook)/gi,
  ];
  for (const pattern of entityPatterns) {
    const matches = messages
      .map((m) => m.content.match(pattern))
      .flat()
      .filter(Boolean);
    entities.push(...(matches as string[]));
  }

  const uniqueEntities = [...new Set(entities)].slice(0, 5);

  return `Conversation Summary:
- Messages: ${messages.length} total (${userMessages.length} user, ${assistantMessages.length} assistant)
- Topics discussed: ${topics.length > 0 ? topics.join(", ") : "general inquiry"}
- Entities mentioned: ${uniqueEntities.length > 0 ? uniqueEntities.join(", ") : "none"}
- Outcome: ${userMessages.length > 3 ? "engaged conversation" : "initial contact"}`;
}

// ─── TASK 5: SENTIMENT ANALYSIS ─────────────────────────────

const POSITIVE_WORDS = [
  "great", "excellent", "amazing", "awesome", "perfect", "love", "fantastic",
  "wonderful", "happy", "pleased", "satisfied", "thank", "thanks", "good",
  "nice", "best", "impressive", "outstanding", "brilliant", "superb",
];

const NEGATIVE_WORDS = [
  "bad", "terrible", "awful", "horrible", "hate", "worst", "poor",
  "disappointed", "frustrated", "angry", "annoyed", "unacceptable",
  "waste", "broken", "useless", "slow", "expensive", "overpriced",
  "problem", "issue", "error", "bug", "fail", "failed", "failure",
];

/**
 * Analyze sentiment of a message.
 * Returns a score from -1 (negative) to 1 (positive).
 */
export function analyzeSentiment(message: string): {
  score: number;
  label: "positive" | "neutral" | "negative";
  confidence: number;
} {
  const lower = message.toLowerCase();
  const words = lower.split(/\s+/);

  let positiveCount = 0;
  let negativeCount = 0;

  for (const word of words) {
    if (POSITIVE_WORDS.some((pw) => word.includes(pw))) positiveCount++;
    if (NEGATIVE_WORDS.some((nw) => word.includes(nw))) negativeCount++;
  }

  const total = positiveCount + negativeCount;
  if (total === 0) {
    return { score: 0, label: "neutral", confidence: 0.5 };
  }

  const score = (positiveCount - negativeCount) / total;
  const confidence = Math.min(1, total / words.length + 0.3);

  let label: "positive" | "neutral" | "negative";
  if (score > 0.2) label = "positive";
  else if (score < -0.2) label = "negative";
  else label = "neutral";

  return { score, label, confidence };
}

/**
 * Analyze overall conversation sentiment.
 */
export function analyzeConversationSentiment(
  messages: { role: string; content: string }[]
): {
  score: number;
  label: "positive" | "neutral" | "negative";
  trend: "improving" | "stable" | "declining";
} {
  const userMessages = messages.filter((m) => m.role === "user");
  if (userMessages.length === 0) {
    return { score: 0, label: "neutral", trend: "stable" };
  }

  const sentiments = userMessages.map((m) => analyzeSentiment(m.content));
  const avgScore = sentiments.reduce((sum, s) => sum + s.score, 0) / sentiments.length;

  // Calculate trend (compare first half vs second half)
  const mid = Math.floor(sentiments.length / 2);
  const firstHalf = sentiments.slice(0, mid);
  const secondHalf = sentiments.slice(mid);

  let trend: "improving" | "stable" | "declining";
  if (firstHalf.length > 0 && secondHalf.length > 0) {
    const firstAvg = firstHalf.reduce((sum, s) => sum + s.score, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, s) => sum + s.score, 0) / secondHalf.length;
    if (secondAvg - firstAvg > 0.2) trend = "improving";
    else if (firstAvg - secondAvg > 0.2) trend = "declining";
    else trend = "stable";
  } else {
    trend = "stable";
  }

  let label: "positive" | "neutral" | "negative";
  if (avgScore > 0.2) label = "positive";
  else if (avgScore < -0.2) label = "negative";
  else label = "neutral";

  return { score: avgScore, label, trend };
}

// ─── TASK 6: TOKEN USAGE TRACKING ───────────────────────────

const TOKEN_PRICES: Record<string, { input: number; output: number }> = {
  "gpt-4o": { input: 2.5 / 1000000, output: 10 / 1000000 },
  "gpt-4o-mini": { input: 0.15 / 1000000, output: 0.6 / 1000000 },
  "gpt-4-turbo": { input: 10 / 1000000, output: 30 / 1000000 },
  "claude-sonnet-4-20250514": { input: 3 / 1000000, output: 15 / 1000000 },
  "claude-3-haiku-20240307": { input: 0.25 / 1000000, output: 1.25 / 1000000 },
};

/**
 * Estimate token count from text (rough approximation: 1 token ≈ 4 chars).
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Calculate token usage and cost for an API call.
 */
export function calculateTokenUsage(
  model: string,
  promptText: string,
  completionText: string,
  promptTokens?: number,
  completionTokens?: number
): {
  prompt: number;
  completion: number;
  total: number;
  cost: number;
} {
  const prompt = promptTokens || estimateTokens(promptText);
  const completion = completionTokens || estimateTokens(completionText);
  const total = prompt + completion;

  const prices = TOKEN_PRICES[model] || TOKEN_PRICES["gpt-4o"];
  const cost = prompt * prices.input + completion * prices.output;

  return { prompt, completion, total, cost: Math.round(cost * 10000) / 10000 };
}

// ─── TASK 7: RATE LIMITING FOR TOOLS ────────────────────────

const toolUsageMap = new Map<string, { count: number; resetAt: number }>();

/**
 * Check if a tool call is within rate limits.
 */
export function checkToolRateLimit(
  toolName: string,
  maxCallsPerMinute: number = 30
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute

  const usage = toolUsageMap.get(toolName);

  if (!usage || now > usage.resetAt) {
    toolUsageMap.set(toolName, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (usage.count >= maxCallsPerMinute) {
    const retryAfter = Math.ceil((usage.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  usage.count++;
  return { allowed: true };
}

/**
 * Reset rate limit for a tool.
 */
export function resetToolRateLimit(toolName: string): void {
  toolUsageMap.delete(toolName);
}

// ─── TASK 8: BLOCKED TOPICS ENFORCEMENT ─────────────────────

/**
 * Check if a message contains blocked topics.
 */
export function checkBlockedTopics(
  message: string,
  blockedTopics: string[]
): { blocked: boolean; matchedTopic?: string } {
  const lower = message.toLowerCase();

  for (const topic of blockedTopics) {
    const topicLower = topic.toLowerCase();
    if (lower.includes(topicLower)) {
      return { blocked: true, matchedTopic: topic };
    }
  }

  return { blocked: false };
}

// ─── TASK 9: CONVERSATION ESCALATION ────────────────────────

/**
 * Determine if a conversation should be escalated to a human.
 */
export function shouldEscalate(params: {
  message: string;
  sentiment?: { score: number; label: string; trend: string };
  blockedTopic?: boolean;
  toolErrors?: number;
  conversationLength?: number;
  userFrustration?: number;
}): {
  escalate: boolean;
  reason: string;
  priority: "low" | "medium" | "high" | "urgent";
} {
  const {
    message,
    sentiment,
    blockedTopic,
    toolErrors = 0,
    conversationLength = 0,
    userFrustration = 0,
  } = params;

  // Escalation triggers
  const triggers: { reason: string; priority: "low" | "medium" | "high" | "urgent" }[] = [];

  // 1. Blocked topic
  if (blockedTopic) {
    triggers.push({ reason: "Blocked topic detected", priority: "high" });
  }

  // 2. Strong negative sentiment
  if (sentiment && sentiment.score < -0.5) {
    triggers.push({ reason: "Strong negative sentiment", priority: "high" });
  }

  // 3. Declining sentiment trend
  if (sentiment && sentiment.trend === "declining") {
    triggers.push({ reason: "Declining sentiment trend", priority: "medium" });
  }

  // 4. Multiple tool errors
  if (toolErrors >= 3) {
    triggers.push({ reason: "Multiple tool failures", priority: "medium" });
  }

  // 5. Long conversation without resolution
  if (conversationLength > 20) {
    triggers.push({ reason: "Long conversation without resolution", priority: "low" });
  }

  // 6. Explicit escalation requests
  const escalationPhrases = [
    "speak to a human",
    "talk to a person",
    "real person",
    "manager",
    "supervisor",
    "escalate",
    "complaint",
  ];
  if (escalationPhrases.some((phrase) => message.toLowerCase().includes(phrase))) {
    triggers.push({ reason: "Explicit escalation request", priority: "urgent" });
  }

  // 7. User frustration signals
  if (userFrustration >= 3) {
    triggers.push({ reason: "Multiple frustration signals", priority: "high" });
  }

  if (triggers.length === 0) {
    return { escalate: false, reason: "", priority: "low" };
  }

  // Return highest priority trigger
  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
  triggers.sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );

  return {
    escalate: true,
    reason: triggers[0].reason,
    priority: triggers[0].priority,
  };
}

// ─── TASK 10: SATISFACTION COLLECTION ───────────────────────

/**
 * Generate a satisfaction survey message.
 */
export function getSatisfactionSurvey(): string {
  return `How was your experience today? Please rate us:
1 - Poor
2 - Fair
3 - Good
4 - Very Good
5 - Excellent

You can also share any feedback to help us improve.`;
}

/**
 * Parse satisfaction response from user.
 */
export function parseSatisfactionResponse(
  message: string
): { score?: number; feedback?: string } {
  const lower = message.trim().toLowerCase();

  // Check for numeric rating
  const ratingMatch = lower.match(/^(\d)$/);
  if (ratingMatch) {
    const score = parseInt(ratingMatch[1]);
    if (score >= 1 && score <= 5) {
      // Check if there's additional feedback after the number
      const remaining = lower.replace(/^\d\s*/, "").trim();
      return {
        score,
        feedback: remaining || undefined,
      };
    }
  }

  // Check for word-based ratings
  const wordRatings: Record<number, string[]> = {
    1: ["poor", "bad", "terrible", "awful", "worst"],
    2: ["fair", "okay", "mediocre", "not great"],
    3: ["good", "fine", "decent", "alright"],
    4: ["very good", "great", "nice", "impressed"],
    5: ["excellent", "amazing", "perfect", "outstanding", "fantastic"],
  };

  for (const [score, words] of Object.entries(wordRatings)) {
    if (words.some((w) => lower.includes(w))) {
      return { score: parseInt(score), feedback: lower };
    }
  }

  // Just feedback
  return { feedback: lower };
}

/**
 * Save satisfaction data to conversation.
 */
export async function saveSatisfaction(
  conversationId: string,
  score: number,
  feedback?: string
): Promise<void> {
  await connectToDatabase();
  const AgentConversation = (await import("@/models/agent-conversation")).default;

  await AgentConversation.updateOne(
    { _id: conversationId },
    {
      $set: {
        "satisfaction.score": score,
        "satisfaction.feedback": feedback,
        "satisfaction.submittedAt": new Date(),
      },
    }
  );
}
