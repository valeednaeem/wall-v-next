/**
 * State Manager — extracts structured data from conversation messages
 * and maintains the VisitorState across turns.
 *
 * This is the bridge between raw conversation and structured tool arguments.
 */

import type { VisitorState } from "./types";
import { createVisitorState } from "./types";

// ─── Extraction Patterns ────────────────────────────────────────────────────

const EMAIL_REGEX = /[\w.+-]+@[\w-]+\.[\w.]+/i;
const PHONE_REGEX = /(?:phone|tel|mobile|number|call me on)[:\s]*([+\d\s\-().]{7,20})/i;
const PHONE_BARE_REGEX = /(\+?\d[\d\s\-()]{6,18}\d)/;

const NAME_PATTERNS = [
  /(?:my name is|i'?m|this is|i am|name'?s? is|called|you can call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
];
const NAME_EXCLUDE = new Set([
  "yes", "no", "sure", "okay", "ok", "thanks", "hello", "hi", "hey",
  "website", "web", "app", "project", "need", "want", "looking", "building",
  "create", "build", "help", "price", "pricing", "cost", "quote", "budget",
  "ecommerce", "e-commerce", "mobile", "ai", "automation", "hosting",
  "domain", "design", "logo", "brand", "marketing", "seo",
]);

const COMPANY_PATTERNS = [
  /(?:company|business|firm|organization|org|work at|working at|from)\s+(?:is\s+)?([A-Z][\w\s&.,]+?)(?:\.|,|\s+(?:and|but|so|which|who|I|we|they)|\s*$)/i,
];

const OBJECTIVE_PATTERNS = [
  /(?:i need|we need|i want|we want|i'?m looking|we'?re looking|need a|need an|want a|want an|looking for a|looking for an)\s+(.{10,200}?)(?:\.|,|\s+and\s+(?:my|i)|\s+my\s)/i,
  /(?:objective|goal|purpose|aim|trying to|want to|looking to)\s+(?:is\s+)?(?:to\s+)?(.{10,200}?)(?:\.|,|$)/i,
];

const PROJECT_TYPE_KEYWORDS: Record<string, string> = {
  "website": "website",
  "web app": "web-application",
  "web application": "web-application",
  "ecommerce": "e-commerce",
  "e-commerce": "e-commerce",
  "online store": "e-commerce",
  "mobile app": "mobile-app",
  "ios app": "mobile-app",
  "android app": "mobile-app",
  "ai solution": "ai-solution",
  "ai chatbot": "ai-solution",
  "chatbot": "ai-solution",
  "automation": "automation",
  "hosting": "hosting",
  "domain": "domain",
  "logo": "design",
  "branding": "design",
  "seo": "seo",
  "marketing": "marketing",
};

const FEATURE_KEYWORDS = [
  "login", "signup", "registration", "payment", "checkout", "dashboard",
  "admin", "search", "filter", "cart", "blog", "contact form", "newsletter",
  "analytics", "notification", "chat", "api", "integration", "database",
  "user management", "role", "permission", "upload", "gallery", "video",
  "map", "review", "rating", "wishlist", "inventory", "report", "export",
  "import", " cms", "seo", "social media", "email", "sms", "push notification",
  "booking", "scheduling", "subscription", "membership", "forum", "catalog",
  "product", "order", "shipping", "tax", "coupon", "discount", "loyalty",
];

const INTENT_KEYWORDS: Record<string, string> = {
  "need a": "creation",
  "need an": "creation",
  "want a": "creation",
  "want an": "creation",
  "looking for": "creation",
  "build": "creation",
  "create": "creation",
  "develop": "creation",
  "make": "creation",
  "how much": "pricing",
  "price": "pricing",
  "pricing": "pricing",
  "cost": "pricing",
  "quote": "pricing",
  "estimate": "pricing",
  "budget": "pricing",
  "help me": "assistance",
  "help with": "assistance",
  "support": "assistance",
  "fix": "assistance",
  "repair": "assistance",
  "update": "modification",
  "change": "modification",
  "modify": "modification",
  "improve": "modification",
};

// ─── Required Fields per Intent ─────────────────────────────────────────────

const REQUIRED_FIELDS_FOR_CREATION = ["name", "email"] as const;
const REQUIRED_FIELDS_FOR_PROJECT = ["name", "email", "projectType", "objective"] as const;

// ─── Extraction Functions ───────────────────────────────────────────────────

function extractEmail(text: string): string | null {
  const match = text.match(EMAIL_REGEX);
  return match ? match[0].toLowerCase() : null;
}

function extractPhone(text: string): string | null {
  const match = text.match(PHONE_REGEX) || text.match(PHONE_BARE_REGEX);
  if (!match) return null;
  const phone = (match[1] || match[0]).replace(/[^\d+\-()]/g, "");
  return phone.length >= 7 ? phone : null;
}

function extractName(text: string): string | null {
  for (const pattern of NAME_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const name = match[1].trim();
      if (!NAME_EXCLUDE.has(name.toLowerCase()) && name.length > 1 && name.length < 60) {
        return name;
      }
    }
  }
  // Check for bare name (single line, capitalized, no other content)
  const lines = text.trim().split("\n");
  if (lines.length === 1) {
    const line = lines[0].trim();
    if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}$/.test(line) && !NAME_EXCLUDE.has(line.toLowerCase())) {
      return line;
    }
  }
  return null;
}

function extractCompany(text: string): string | null {
  for (const pattern of COMPANY_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const company = match[1].trim();
      if (company.length > 1 && company.length < 100) {
        return company;
      }
    }
  }
  return null;
}

function extractProjectType(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [keyword, type] of Object.entries(PROJECT_TYPE_KEYWORDS)) {
    if (lower.includes(keyword)) return type;
  }
  return null;
}

function extractFeatures(text: string): string[] {
  const lower = text.toLowerCase();
  return FEATURE_KEYWORDS.filter((f) => lower.includes(f.trim()));
}

function extractObjective(text: string): string | null {
  for (const pattern of OBJECTIVE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const obj = match[1].trim();
      if (obj.length > 5 && obj.length < 500) {
        return obj;
      }
    }
  }
  return null;
}

function extractIntent(text: string): string | null {
  const lower = text.toLowerCase();
  let bestIntent: string | null = null;
  let bestScore = 0;
  for (const [keyword, intent] of Object.entries(INTENT_KEYWORDS)) {
    if (lower.includes(keyword) && keyword.length > bestScore) {
      bestIntent = intent;
      bestScore = keyword.length;
    }
  }
  return bestIntent;
}

function extractBudget(text: string): string | null {
  const match = text.match(/\$[\d,]+(?:\s*[-–]\s*\$[\d,]+)?/);
  return match ? match[0] : null;
}

function extractTimeline(text: string): string | null {
  const lower = text.toLowerCase();
  if (lower.includes("urgent") || lower.includes("asap") || lower.includes("immediately")) return "urgent";
  const weekMatch = lower.match(/(\d+)\s*week/);
  if (weekMatch) return `${weekMatch[1]} weeks`;
  const monthMatch = lower.match(/(\d+)\s*month/);
  if (monthMatch) return `${monthMatch[1]} months`;
  return null;
}

// ─── Main Extraction ────────────────────────────────────────────────────────

/**
 * Extract structured data from a user message and merge into existing state.
 * Does NOT overwrite existing non-null values (unless the new value is more specific).
 */
export function extractFromMessage(
  message: string,
  currentState: VisitorState
): VisitorState {
  const state = { ...currentState };
  state.turnCount++;

  // Extract each field only if not already set
  const email = extractEmail(message);
  if (email && !state.email) state.email = email;

  const phone = extractPhone(message);
  if (phone && !state.phone) state.phone = phone;

  const name = extractName(message);
  if (name && !state.name) state.name = name;

  const company = extractCompany(message);
  if (company && !state.company) state.company = company;

  const projectType = extractProjectType(message);
  if (projectType && !state.projectType) state.projectType = projectType;

  const objective = extractObjective(message);
  if (objective && !state.objective) state.objective = objective;

  const intent = extractIntent(message);
  if (intent) state.intent = intent;

  const budget = extractBudget(message);
  if (budget && !state.budget) state.budget = budget;

  const timeline = extractTimeline(message);
  if (timeline && !state.timeline) state.timeline = timeline;

  // Features are additive
  const newFeatures = extractFeatures(message);
  if (newFeatures.length > 0) {
    const existing = new Set(state.features.map((f) => f.toLowerCase()));
    for (const f of newFeatures) {
      if (!existing.has(f.toLowerCase())) {
        state.features.push(f);
      }
    }
  }

  // Compute missing required fields based on intent
  state.missingRequiredFields = computeMissingFields(state);

  return state;
}

function computeMissingFields(state: VisitorState): string[] {
  const missing: string[] = [];

  if (state.intent === "creation" || state.projectType) {
    for (const field of REQUIRED_FIELDS_FOR_PROJECT) {
      if (!state[field]) missing.push(field);
    }
  } else if (state.intent === "pricing" || state.intent === "assistance") {
    for (const field of REQUIRED_FIELDS_FOR_CREATION) {
      if (!state[field]) missing.push(field);
    }
  }

  return missing;
}

/**
 * Determine what actions are needed based on the current state.
 */
export function determineRequiredActions(state: VisitorState): string[] {
  const actions: string[] = [];

  // Always need to check if user exists if we have email/phone
  if (state.email || state.phone) {
    actions.push("lookup_user");
  }

  // Need user creation if no userId and we have enough info
  if (!state.userId && state.name && (state.email || state.phone)) {
    actions.push("create_user");
  }

  // Need client record
  if (!state.clientId && (state.email || state.phone)) {
    actions.push("lookup_client");
  }
  if (!state.clientId && state.name && (state.email || state.phone)) {
    actions.push("create_client");
  }

  // Need project/inquiry if intent is creation and we have enough info
  if (state.projectType && state.objective && state.name && state.email) {
    if (!state.projectRequestId) {
      actions.push("create_project_request");
    }
  }

  return actions;
}
