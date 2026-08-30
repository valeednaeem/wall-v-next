/**
 * Structured types for the conversation agent system.
 *
 * Separates conversation state from structured data from action state.
 * This is the data model that flows through the orchestration pipeline.
 */

// ─── Structured Visitor State ───────────────────────────────────────────────

export interface VisitorState {
  // Identity
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  language: string;

  // Intent
  intent: string | null;
  service: string | null;
  projectType: string | null;

  // Project
  projectTitle: string | null;
  objective: string | null;
  features: string[];
  budget: string | null;
  timeline: string | null;
  designStyle: string | null;
  industry: string | null;
  targetAudience: string | null;
  integrations: string[];

  // IDs (populated after tool execution)
  userId: string | null;
  clientId: string | null;
  projectId: string | null;
  inquiryId: string | null;
  projectRequestId: string | null;

  // Tracking
  source: string;
  turnCount: number;
  missingRequiredFields: string[];
}

export function createVisitorState(overrides?: Partial<VisitorState>): VisitorState {
  return {
    name: null,
    email: null,
    phone: null,
    company: null,
    language: "en",
    intent: null,
    service: null,
    projectType: null,
    projectTitle: null,
    objective: null,
    features: [],
    budget: null,
    timeline: null,
    designStyle: null,
    industry: null,
    targetAudience: null,
    integrations: [],
    userId: null,
    clientId: null,
    projectId: null,
    inquiryId: null,
    projectRequestId: null,
    source: "chat",
    turnCount: 0,
    missingRequiredFields: [],
    ...overrides,
  };
}

// ─── Tool Execution Result ─────────────────────────────────────────────────

export interface ToolResult {
  success: boolean;
  toolName: string;
  data: Record<string, unknown> | null;
  error: string | null;
  errorCode: string | null;
}

// ─── Tool Definition ────────────────────────────────────────────────────────

export interface ConversationToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required: string[];
  };
}

// ─── Action Plan ────────────────────────────────────────────────────────────

export type ActionType =
  | "lookup_user"
  | "create_user"
  | "lookup_client"
  | "create_client"
  | "create_inquiry"
  | "create_lead"
  | "create_project_request"
  | "create_project"
  | "get_service_info"
  | "get_pricing"
  | "none";

export interface PlannedAction {
  type: ActionType;
  description: string;
  requiredParams: string[];
  dependsOn: ActionType[];
}

// ─── Orchestration Result ───────────────────────────────────────────────────

export interface OrchestrationResult {
  response: string;
  visitorState: VisitorState;
  toolCallsMade: ToolResult[];
  requiresProject: boolean;
  requiresConfirmation: boolean;
  conversationId: string;
  executionId: string | null;
  duration: number;
}
