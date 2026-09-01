/**
 * Tool Registry — defines tools available to the conversation agent.
 *
 * Each tool schema matches the backend API contract exactly.
 * No field name mismatches. No phantom tools.
 */

import type { ConversationToolDefinition } from "./types";

/**
 * Tools available to the conversation agent.
 * These are passed to the LLM so it can make structured tool calls.
 */
export const CONVERSATION_TOOLS: ConversationToolDefinition[] = [
  {
    name: "lookup_user",
    description: "Look up an existing user by email or phone. Use this BEFORE creating a new user to prevent duplicates.",
    parameters: {
      type: "object",
      properties: {
        email: { type: "string", description: "User's email address" },
        phone: { type: "string", description: "User's phone number" },
      },
      required: [],
    },
  },
  {
    name: "create_user",
    description: "Create a new Wall-V user account. Only call this AFTER lookup_user confirms no existing account. Requires name AND (email OR phone).",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Full name of the user" },
        email: { type: "string", description: "Email address" },
        phone: { type: "string", description: "Phone number" },
        company: { type: "string", description: "Company name if provided" },
        source: { type: "string", description: "How they found us (chat, voice, website)" },
      },
      required: ["name"],
    },
  },
  {
    name: "lookup_client",
    description: "Look up an existing client record by email or phone.",
    parameters: {
      type: "object",
      properties: {
        email: { type: "string", description: "Client's email address" },
        phone: { type: "string", description: "Client's phone number" },
      },
      required: [],
    },
  },
  {
    name: "create_client",
    description: "Create a new client record. Only call AFTER lookup_client confirms no existing record.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Client's full name" },
        email: { type: "string", description: "Client's email" },
        phone: { type: "string", description: "Client's phone" },
        company: { type: "string", description: "Company name" },
        source: { type: "string", description: "Source channel (chat, voice, website)" },
        userId: { type: "string", description: "Linked User ID if available" },
      },
      required: ["name", "email"],
    },
  },
  {
    name: "create_inquiry",
    description: "Create a sales/support inquiry from the conversation. Use when the user has described what they need but isn't ready for a full project.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Contact name" },
        email: { type: "string", description: "Contact email" },
        phone: { type: "string", description: "Contact phone" },
        company: { type: "string", description: "Company name" },
        subject: { type: "string", description: "Brief subject line" },
        message: { type: "string", description: "Summary of what they need" },
        type: { type: "string", description: "Type of inquiry", enum: ["contact", "support", "sales", "partnership", "other"] },
        source: { type: "string", description: "Source channel" },
        estimatedBudget: { type: "string", description: "Budget range if mentioned" },
        estimatedTimeline: { type: "string", description: "Timeline if mentioned" },
      },
      required: ["name", "email", "subject", "message"],
    },
  },
  {
    name: "create_lead",
    description: "Create a sales lead from the conversation.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Lead name" },
        email: { type: "string", description: "Lead email" },
        phone: { type: "string", description: "Lead phone" },
        company: { type: "string", description: "Company" },
        source: { type: "string", description: "Source channel" },
        budget: { type: "string", description: "Budget range" },
        requirements: { type: "string", description: "Summary of requirements" },
        serviceInterest: { type: "string", description: "Services they're interested in" },
      },
      required: ["name", "email", "source"],
    },
  },
  {
    name: "create_project_request",
    description: "Create a structured project request with requirements. Use when the user has clearly described a project they want built.",
    parameters: {
      type: "object",
      properties: {
        clientName: { type: "string", description: "Client's full name" },
        clientEmail: { type: "string", description: "Client's email" },
        clientPhone: { type: "string", description: "Client's phone" },
        clientCompany: { type: "string", description: "Client's company" },
        projectType: { type: "string", description: "Type of project (website, e-commerce, mobile-app, ai-solution, etc.)" },
        objective: { type: "string", description: "What the project should achieve" },
        features: { type: "string", description: "Comma-separated list of features" },
        budget: { type: "string", description: "Budget range" },
        timeline: { type: "string", description: "Timeline" },
        industry: { type: "string", description: "Industry sector" },
        targetAudience: { type: "string", description: "Target audience" },
        designStyle: { type: "string", description: "Design preferences" },
        integrations: { type: "string", description: "Comma-separated integrations needed" },
      },
      required: ["clientName", "clientEmail", "projectType", "objective"],
    },
  },
  {
    name: "get_service_info",
    description: "Get information about Wall-V services and pricing. Use when the user asks about what we offer.",
    parameters: {
      type: "object",
      properties: {
        service: { type: "string", description: "Specific service to get info about (website, ecommerce, mobile, ai, hosting, marketing)" },
      },
      required: [],
    },
  },
  {
    name: "create_notification",
    description: "Create a notification for admin users. Use this to alert staff about new inquiries, project requests, or important events.",
    parameters: {
      type: "object",
      properties: {
        userId: { type: "string", description: "Target user ID (optional, defaults to all admins)" },
        title: { type: "string", description: "Notification title" },
        message: { type: "string", description: "Notification message" },
        type: { type: "string", description: "Notification type", enum: ["info", "success", "warning", "error"] },
        link: { type: "string", description: "Link to related page" },
      },
      required: ["title", "message"],
    },
  },
  {
    name: "create_invoice",
    description: "Create an invoice for a billable project or service. Use when a project has been confirmed and billing is required. Creates milestone-based invoice and sends email to client.",
    parameters: {
      type: "object",
      properties: {
        clientEmail: { type: "string", description: "Client's email address" },
        clientName: { type: "string", description: "Client's name" },
        projectId: { type: "string", description: "Related project ID if available" },
        amount: { type: "number", description: "Total invoice amount in USD" },
        description: { type: "string", description: "Description of what the invoice covers" },
        projectName: { type: "string", description: "Name of the project" },
      },
      required: ["clientEmail", "clientName", "amount", "description"],
    },
  },
  {
    name: "delegate_to_agent",
    description: "Delegate a task to a specialized AI agent. Use when a task requires domain-specific expertise beyond your capabilities. The delegated agent will execute the task and return a result.",
    parameters: {
      type: "object",
      properties: {
        agentId: { type: "string", description: "The target agent's ID or slug" },
        message: { type: "string", description: "The task or question to delegate" },
        context: { type: "object", description: "Additional context to pass (projectId, clientId, etc.)" },
      },
      required: ["agentId", "message"],
    },
  },
];

/**
 * Get tool definitions as OpenAI function-calling format.
 */
export function getOpenAITools(): { type: "function"; function: { name: string; description: string; parameters: Record<string, unknown> } }[] {
  return CONVERSATION_TOOLS.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

/**
 * Validate that a tool call has all required parameters.
 */
export function validateToolArgs(
  toolName: string,
  args: Record<string, unknown>
): { valid: boolean; missing: string[]; sanitized: Record<string, unknown> } {
  const tool = CONVERSATION_TOOLS.find((t) => t.name === toolName);
  if (!tool) {
    return { valid: false, missing: [`Unknown tool: ${toolName}`], sanitized: {} };
  }

  const missing: string[] = [];
  for (const required of tool.parameters.required) {
    if (!args[required] || (typeof args[required] === "string" && !(args[required] as string).trim())) {
      missing.push(required);
    }
  }

  // Sanitize string inputs
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    if (typeof value === "string") {
      sanitized[key] = value.trim().slice(0, 1000);
    } else {
      sanitized[key] = value;
    }
  }

  return { valid: missing.length === 0, missing, sanitized };
}
