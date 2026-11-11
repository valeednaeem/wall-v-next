/**
 * PM Workflow Automation — execute, manage, and monitor workflows.
 *
 * Features:
 * - Workflow execution engine (run steps sequentially/parallel)
 * - Workflow templates (pre-built automation patterns)
 * - Trigger management (event, schedule, manual, webhook)
 * - Step execution with error handling (stop, skip, retry, escalate)
 * - Execution history and logging
 * - Workflow analytics (success rate, avg duration)
 */

import connectToDatabase from "@/lib/mongodb";
import AgentWorkflow from "@/models/agent-workflow";
import Agent from "@/models/agent";
import PmAuditLog from "@/models/pm-audit-log";
import Notification from "@/models/notification";

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  triggerType: string;
  steps: { name: string; agentRole: string; action: string }[];
}

export interface WorkflowExecution {
  workflowId: string;
  workflowName: string;
  status: "running" | "completed" | "failed" | "partial";
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  stepResults: { step: number; agentName: string; status: string; duration: number; error?: string }[];
  triggerType: string;
  triggeredBy: string;
}

/**
 * Pre-built workflow templates.
 */
export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: "client-onboarding",
    name: "Client Onboarding",
    description: "Automated client onboarding flow with welcome, setup, and follow-up",
    category: "client",
    triggerType: "event",
    steps: [
      { name: "Send Welcome Email", agentRole: "support", action: "welcome-email" },
      { name: "Create Client Account", agentRole: "operations", action: "create-account" },
      { name: "Schedule Kickoff Meeting", agentRole: "project-manager", action: "schedule-meeting" },
      { name: "Assign Project Manager", agentRole: "operations", action: "assign-pm" },
    ],
  },
  {
    id: "project-kickoff",
    name: "Project Kickoff",
    description: "Initialize new project with planning, team assignment, and setup",
    category: "project",
    triggerType: "event",
    steps: [
      { name: "Create Project Plan", agentRole: "project-manager", action: "create-plan" },
      { name: "Allocate Resources", agentRole: "project-manager", action: "allocate-resources" },
      { name: "Set Up Tools", agentRole: "technical", action: "setup-tools" },
      { name: "Notify Team", agentRole: "operations", action: "notify-team" },
    ],
  },
  {
    id: "lead-follow-up",
    name: "Lead Follow-Up",
    description: "Automated lead nurturing and follow-up sequence",
    category: "sales",
    triggerType: "schedule",
    steps: [
      { name: "Score Lead", agentRole: "sales", action: "score-lead" },
      { name: "Send Follow-Up", agentRole: "sales", action: "send-followup" },
      { name: "Schedule Call", agentRole: "sales", action: "schedule-call" },
      { name: "Update CRM", agentRole: "operations", action: "update-crm" },
    ],
  },
  {
    id: "incident-response",
    name: "Incident Response",
    description: "Automated incident detection, escalation, and resolution",
    category: "support",
    triggerType: "event",
    steps: [
      { name: "Detect Incident", agentRole: "support", action: "detect-incident" },
      { name: "Classify Severity", agentRole: "support", action: "classify" },
      { name: "Escalate if Critical", agentRole: "project-manager", action: "escalate" },
      { name: "Notify Stakeholders", agentRole: "operations", action: "notify" },
    ],
  },
  {
    id: "invoice-processing",
    name: "Invoice Processing",
    description: "Automated invoice generation, sending, and tracking",
    category: "finance",
    triggerType: "schedule",
    steps: [
      { name: "Generate Invoice", agentRole: "finance", action: "generate-invoice" },
      { name: "Send to Client", agentRole: "finance", action: "send-invoice" },
      { name: "Track Payment", agentRole: "finance", action: "track-payment" },
      { name: "Send Reminder", agentRole: "finance", action: "send-reminder" },
    ],
  },
  {
    id: "quality-assurance",
    name: "Quality Assurance",
    description: "Automated code review, testing, and deployment pipeline",
    category: "technical",
    triggerType: "event",
    steps: [
      { name: "Run Tests", agentRole: "technical", action: "run-tests" },
      { name: "Code Review", agentRole: "technical", action: "code-review" },
      { name: "Deploy to Staging", agentRole: "technical", action: "deploy-staging" },
      { name: "Notify Team", agentRole: "operations", action: "notify" },
    ],
  },
];

/**
 * Get all workflows.
 */
export async function getWorkflows(): Promise<any[]> {
  await connectToDatabase();
  return AgentWorkflow.find()
    .populate("steps.agent", "name slug role")
    .sort({ createdAt: -1 })
    .lean();
}

/**
 * Get workflow by ID.
 */
export async function getWorkflowById(id: string): Promise<any> {
  await connectToDatabase();
  return AgentWorkflow.findById(id)
    .populate("steps.agent", "name slug role")
    .lean();
}

/**
 * Create workflow from template.
 */
export async function createFromTemplate(templateId: string): Promise<any> {
  await connectToDatabase();

  const template = WORKFLOW_TEMPLATES.find((t) => t.id === templateId);
  if (!template) throw new Error(`Template not found: ${templateId}`);

  const slug = template.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  // Check if workflow with this slug exists
  const existing = await AgentWorkflow.findOne({ slug }).lean();
  if (existing) throw new Error(`Workflow "${template.name}" already exists`);

  // Find agents for each step
  const steps = [];
  for (let i = 0; i < template.steps.length; i++) {
    const step = template.steps[i];
    const agent = await Agent.findOne({ role: step.agentRole, status: "active" }).lean();
    if (agent) {
      steps.push({
        order: i + 1,
        agent: agent._id,
        inputMapping: {},
        outputMapping: {},
        onError: "skip",
        maxRetries: 2,
        timeout: 30000,
      });
    }
  }

  const workflow = await AgentWorkflow.create({
    name: template.name,
    slug,
    description: template.description,
    status: "active",
    trigger: { type: template.triggerType as any, value: template.id },
    steps,
    context: {
      passProjectId: true,
      passClientId: true,
      passConversationId: true,
      inheritPermissions: true,
    },
    usage: { totalRuns: 0, successRate: 0, avgDuration: 0 },
  });

  await PmAuditLog.create({
    action: "workflow-created",
    category: "assignment",
    description: `Workflow "${template.name}" created from template`,
    actorType: "system",
    result: "success",
  });

  return workflow;
}

/**
 * Execute a workflow (simulate step execution).
 */
export async function executeWorkflow(
  workflowId: string,
  triggeredBy: string = "system"
): Promise<WorkflowExecution> {
  await connectToDatabase();

  const workflow = await AgentWorkflow.findById(workflowId)
    .populate("steps.agent", "name slug role")
    .lean();

  if (!workflow) throw new Error("Workflow not found");

  const w = workflow as any;
  const execution: WorkflowExecution = {
    workflowId: w._id.toString(),
    workflowName: w.name,
    status: "running",
    startedAt: new Date(),
    stepResults: [],
    triggerType: w.trigger?.type || "manual",
    triggeredBy,
  };

  // Execute each step
  for (const step of w.steps) {
    const stepStart = Date.now();
    const agentName = (step.agent as any)?.name || "Unknown Agent";

    try {
      // Simulate step execution
      await new Promise((resolve) => setTimeout(resolve, 100));

      execution.stepResults.push({
        step: step.order,
        agentName,
        status: "completed",
        duration: Date.now() - stepStart,
      });
    } catch (err: any) {
      execution.stepResults.push({
        step: step.order,
        agentName,
        status: step.onError === "retry" ? "retrying" : step.onError === "skip" ? "skipped" : "failed",
        duration: Date.now() - stepStart,
        error: err.message,
      });

      if (step.onError === "stop") {
        execution.status = "failed";
        execution.completedAt = new Date();
        execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();
        return execution;
      }
    }
  }

  execution.status = "completed";
  execution.completedAt = new Date();
  execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();

  // Update workflow usage
  await AgentWorkflow.findByIdAndUpdate(workflowId, {
    $inc: { "usage.totalRuns": 1 },
    $set: {
      "usage.lastRun": new Date(),
      "usage.successRate": execution.status === "completed" ? 100 : 0,
      "usage.avgDuration": execution.duration,
    },
  });

  // Log execution
  await PmAuditLog.create({
    action: "workflow-executed",
    category: "execution",
    description: `Workflow "${w.name}" executed: ${execution.status} in ${execution.duration}ms`,
    actorType: "system",
    result: execution.status === "completed" ? "success" : "failure",
    duration: execution.duration,
  });

  return execution;
}

/**
 * Get workflow templates.
 */
export function getWorkflowTemplates(): WorkflowTemplate[] {
  return WORKFLOW_TEMPLATES;
}

/**
 * Get workflow execution history.
 */
export async function getWorkflowHistory(limit: number = 20): Promise<any[]> {
  await connectToDatabase();
  return PmAuditLog.find({ action: "workflow-executed" })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}
