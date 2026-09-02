/**
 * PM Configuration Management — system settings, agent templates, and workflow presets.
 *
 * Features:
 * - System configuration (PM settings, thresholds, alerts)
 * - Agent templates (pre-configured agent blueprints)
 * - Workflow presets (common workflow patterns)
 * - Template deployment (create agents from templates)
 * - Configuration backup/restore
 */

import connectToDatabase from "@/lib/mongodb";
import SiteSettings from "@/models/site-settings";
import Agent from "@/models/agent";
import AgentSkill from "@/models/agent-skill";
import AgentTool from "@/models/agent-tool";
import AgentWorkflow from "@/models/agent-workflow";
import PmAuditLog from "@/models/pm-audit-log";

export interface PmConfig {
  projectManagement: {
    autoIntakeEnabled: boolean;
    triageAutoAssign: boolean;
    maxOverloadTasks: number;
    healthCheckInterval: number;
    alertRetentionDays: number;
    scanInterval: number;
  };
  notifications: {
    emailEnabled: boolean;
    webhookEnabled: boolean;
    digestEnabled: boolean;
    criticalOnly: boolean;
  };
  thresholds: {
    agentHealthWarning: number;
    agentHealthCritical: number;
    budgetWarningPercent: number;
    budgetCriticalPercent: number;
    overdueTaskAlertDays: number;
    stalledProjectDays: number;
  };
  automation: {
    autoGenerateReports: boolean;
    reportSchedule: string;
    autoCheckBudgets: boolean;
    autoScanEnabled: boolean;
  };
}

export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  role: string;
  type: string;
  division: string;
  personality: { tone: string; language: string; responseStyle: string };
  channels: Record<string, boolean>;
  contexts: Record<string, boolean>;
  suggestedSkills: string[];
  suggestedTools: string[];
  systemPrompt: string;
}

/**
 * Default PM configuration.
 */
const DEFAULT_PM_CONFIG: PmConfig = {
  projectManagement: {
    autoIntakeEnabled: true,
    triageAutoAssign: true,
    maxOverloadTasks: 5,
    healthCheckInterval: 300,
    alertRetentionDays: 90,
    scanInterval: 3600,
  },
  notifications: {
    emailEnabled: true,
    webhookEnabled: false,
    digestEnabled: true,
    criticalOnly: false,
  },
  thresholds: {
    agentHealthWarning: 50,
    agentHealthCritical: 20,
    budgetWarningPercent: 85,
    budgetCriticalPercent: 100,
    overdueTaskAlertDays: 1,
    stalledProjectDays: 7,
  },
  automation: {
    autoGenerateReports: false,
    reportSchedule: "weekly",
    autoCheckBudgets: true,
    autoScanEnabled: true,
  },
};

/**
 * Agent templates for quick deployment.
 */
export const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    id: "sales-rep",
    name: "Sales Representative",
    description: "Handles lead qualification, demos, and closing",
    category: "sales",
    role: "sales",
    type: "hybrid",
    division: "sales",
    personality: { tone: "professional", language: "en", responseStyle: "consultative" },
    channels: { web: true, voice: true },
    contexts: { lead: true, customer: true },
    suggestedSkills: ["lead-qualification", "demo-scheduling", "proposal-generation"],
    suggestedTools: ["create-client", "update-lead-status", "send-proposal"],
    systemPrompt: "You are a sales representative for Wall-V. Your role is to qualify leads, schedule demos, and help close deals.",
  },
  {
    id: "support-agent",
    name: "Customer Support Agent",
    description: "Handles customer inquiries, tickets, and issue resolution",
    category: "support",
    role: "support",
    type: "hybrid",
    division: "support",
    personality: { tone: "friendly", language: "en", responseStyle: "helpful" },
    channels: { web: true, voice: true },
    contexts: { customer: true, client: true },
    suggestedSkills: ["ticket-management", "issue-resolution", "knowledge-base"],
    suggestedTools: ["create-issue", "update-ticket", "escalate-issue"],
    systemPrompt: "You are a customer support agent for Wall-V. Help customers resolve issues quickly and professionally.",
  },
  {
    id: "project-manager",
    name: "Project Manager",
    description: "Manages project delivery, timelines, and resources",
    category: "project-management",
    role: "operations",
    type: "hybrid",
    division: "project-management",
    personality: { tone: "professional", language: "en", responseStyle: "structured" },
    channels: { dashboard: true },
    contexts: { admin: true, staff: true },
    suggestedSkills: ["project-planning", "resource-allocation", "risk-management"],
    suggestedTools: ["create-project", "create-task", "create-risk"],
    systemPrompt: "You are a project manager for Wall-V. Ensure projects are delivered on time and within budget.",
  },
  {
    id: "marketing-specialist",
    name: "Marketing Specialist",
    description: "Handles campaigns, content, and lead generation",
    category: "marketing",
    role: "marketing",
    type: "conversational",
    division: "marketing",
    personality: { tone: "friendly", language: "en", responseStyle: "creative" },
    channels: { web: true },
    contexts: { visitor: true, lead: true },
    suggestedSkills: ["content-creation", "campaign-management", "seo"],
    suggestedTools: ["create-campaign", "generate-content"],
    systemPrompt: "You are a marketing specialist for Wall-V. Create compelling content and manage marketing campaigns.",
  },
  {
    id: "technical-lead",
    name: "Technical Lead",
    description: "Handles technical architecture, code review, and deployment",
    category: "technical",
    role: "technical",
    type: "task",
    division: "engineering",
    personality: { tone: "technical", language: "en", responseStyle: "precise" },
    channels: { dashboard: true },
    contexts: { admin: true, staff: true },
    suggestedSkills: ["architecture", "code-review", "deployment"],
    suggestedTools: ["create-task", "review-code", "deploy"],
    systemPrompt: "You are a technical lead for Wall-V. Ensure code quality and technical excellence.",
  },
  {
    id: "finance-officer",
    name: "Finance Officer",
    description: "Handles invoicing, billing, and financial tracking",
    category: "finance",
    role: "operations",
    type: "task",
    division: "finance",
    personality: { tone: "formal", language: "en", responseStyle: "precise" },
    channels: { dashboard: true },
    contexts: { admin: true, client: true },
    suggestedSkills: ["invoicing", "budget-tracking", "financial-reporting"],
    suggestedTools: ["create-invoice", "check-budget", "generate-report"],
    systemPrompt: "You are a finance officer for Wall-V. Manage invoicing, billing, and financial tracking.",
  },
];

/**
 * Get PM configuration.
 */
export async function getPmConfig(): Promise<PmConfig> {
  await connectToDatabase();

  const settings = await SiteSettings.findOne({ key: "pm-config" }).lean();
  if (settings && (settings as any).value) {
    return { ...DEFAULT_PM_CONFIG, ...(settings as any).value };
  }
  return DEFAULT_PM_CONFIG;
}

/**
 * Update PM configuration.
 */
export async function updatePmConfig(updates: Partial<PmConfig>): Promise<PmConfig> {
  await connectToDatabase();

  const current = await getPmConfig();
  const merged = {
    projectManagement: { ...current.projectManagement, ...updates.projectManagement },
    notifications: { ...current.notifications, ...updates.notifications },
    thresholds: { ...current.thresholds, ...updates.thresholds },
    automation: { ...current.automation, ...updates.automation },
  };

  await SiteSettings.findOneAndUpdate(
    { key: "pm-config" },
    { key: "pm-config", value: merged, category: "pm", description: "PM system configuration" },
    { upsert: true }
  );

  await PmAuditLog.create({
    action: "config-updated",
    category: "config",
    description: "PM configuration updated",
    actorType: "system",
    result: "success",
  });

  return merged;
}

/**
 * Get agent templates.
 */
export function getAgentTemplates(): AgentTemplate[] {
  return AGENT_TEMPLATES;
}

/**
 * Deploy agent from template.
 */
export async function deployFromTemplate(templateId: string, customizations?: Partial<AgentTemplate>): Promise<any> {
  await connectToDatabase();

  const template = AGENT_TEMPLATES.find((t) => t.id === templateId);
  if (!template) throw new Error(`Template not found: ${templateId}`);

  const config = { ...template, ...customizations };

  // Check if agent with this slug already exists
  const slug = config.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const existing = await Agent.findOne({ slug }).lean();
  if (existing) throw new Error(`Agent with slug "${slug}" already exists`);

  // Create agent from template
  const agent = await Agent.create({
    name: config.name,
    slug,
    description: config.description,
    type: config.type,
    role: config.role,
    status: "draft",
    division: config.division,
    personality: config.personality,
    channels: config.channels,
    contexts: config.contexts,
    systemPrompt: config.systemPrompt,
    isClientFacing: true,
  });

  await PmAuditLog.create({
    action: "agent-deployed",
    category: "assignment",
    description: `Agent "${config.name}" deployed from template "${templateId}"`,
    actorType: "system",
    result: "success",
    agent: agent._id,
  });

  return agent;
}

/**
 * Get all system configuration categories.
 */
export async function getAllConfig(): Promise<{
  pm: PmConfig;
  site: Record<string, any>;
}> {
  await connectToDatabase();

  const pm = await getPmConfig();
  const siteSettings = await SiteSettings.find({ category: { $ne: "pm" } }).lean();
  const site: Record<string, any> = {};
  for (const s of siteSettings) {
    site[(s as any).key] = (s as any).value;
  }

  return { pm, site };
}
