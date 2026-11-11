/**
 * PM Auto-Intake — creates PM intake records when projects are created.
 * Also wires into inquiry/project-request creation flows.
 */

import connectToDatabase from "@/lib/mongodb";
import PmIntake from "@/models/pm-intake";
import PmAlert from "@/models/pm-alert";

export interface CreateIntakeArgs {
  source: "inquiry" | "chat" | "voice" | "whatsapp" | "admin" | "client-dashboard" | "manual" | "lead" | "service-request" | "order";
  sourceRef?: string;
  client?: string;
  clientName?: string;
  clientEmail?: string;
  title: string;
  description: string;
  requirements?: string[];
  deliverables?: string[];
  requiredSkills?: string[];
  requiredTools?: string[];
  requiredWorkflows?: string[];
  requiredAgents?: string[];
  requiredHumanResources?: string[];
  priority?: "low" | "medium" | "high" | "urgent";
  estimatedEffort?: number;
  estimatedDuration?: string;
  targetDate?: string;
  estimatedBudget?: number;
  dependencies?: string[];
  constraints?: string[];
  assumptions?: string[];
  riskIndicators?: string[];
}

/**
 * Create a PM intake record from any source.
 */
export async function createPmIntake(args: CreateIntakeArgs) {
  await connectToDatabase();

  const intake = await PmIntake.create({
    source: args.source,
    sourceRef: args.sourceRef || undefined,
    client: args.client || undefined,
    clientName: args.clientName || "",
    clientEmail: args.clientEmail || "",
    title: args.title,
    description: args.description,
    requirements: args.requirements || [],
    deliverables: args.deliverables || [],
    requiredSkills: args.requiredSkills || [],
    requiredTools: args.requiredTools || [],
    requiredWorkflows: args.requiredWorkflows || [],
    requiredAgents: args.requiredAgents || [],
    requiredHumanResources: args.requiredHumanResources || [],
    priority: args.priority || "medium",
    estimatedEffort: args.estimatedEffort || 0,
    estimatedDuration: args.estimatedDuration || "",
    targetDate: args.targetDate ? new Date(args.targetDate) : undefined,
    estimatedBudget: args.estimatedBudget || 0,
    dependencies: args.dependencies || [],
    constraints: args.constraints || [],
    assumptions: args.assumptions || [],
    riskIndicators: args.riskIndicators || [],
    triageStatus: "pending",
  });

  // Create alert for new intake
  await PmAlert.create({
    title: "New Project Intake",
    message: `New project "${args.title}" requires triage. Source: ${args.source}`,
    category: "project-intake",
    severity: "info",
    status: "active",
    source: "pm",
    actionRequired: true,
  });

  return intake;
}

/**
 * Create intake from an inquiry.
 */
export async function createIntakeFromInquiry(inquiry: {
  _id: string;
  name: string;
  email: string;
  company?: string;
  subject: string;
  message: string;
  estimatedBudget?: number;
  estimatedTimeline?: string;
}) {
  return createPmIntake({
    source: "inquiry",
    sourceRef: inquiry._id,
    clientName: inquiry.name,
    clientEmail: inquiry.email,
    title: inquiry.subject,
    description: inquiry.message,
    estimatedBudget: inquiry.estimatedBudget || 0,
    priority: inquiry.estimatedBudget ? (inquiry.estimatedBudget > 10000 ? "high" : "medium") : "medium",
  });
}

/**
 * Create intake from a project request.
 */
export async function createIntakeFromProjectRequest(request: {
  _id: string;
  agent?: string;
  client?: { name?: string; email?: string; company?: string };
  requirements?: { description?: string; features?: string[] };
  extractedData?: { budget?: string; timeline?: string };
}) {
  return createPmIntake({
    source: "chat",
    sourceRef: request._id,
    clientName: request.client?.name || "",
    clientEmail: request.client?.email || "",
    title: `Project Request: ${request.requirements?.description?.slice(0, 80) || "Untitled"}`,
    description: request.requirements?.description || "",
    deliverables: request.requirements?.features || [],
    estimatedBudget: request.extractedData?.budget ? parseInt(request.extractedData.budget) || 0 : 0,
    priority: "medium",
  });
}
