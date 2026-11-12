/**
 * Capability access policy — public / client / staff audiences.
 *
 * Central gate answering: "may THIS caller use THIS capability?" for the AI
 * assistant. Two layers are covered:
 *
 * 1. Conversation tools (tool-executor / orchestrator): anonymous visitors
 *    get an EXPLICIT allow-list only — default is DENY. Denied tools are also
 *    never offered to the model, and execution is re-checked centrally in
 *    `executeConversationTool` (defense in depth).
 * 2. Capability registry (capability-registry.ts): audience derives from the
 *    existing `requiresAuth` + `minUserRole` fields — no duplicate registry.
 *
 * Authenticated callers keep the pre-existing behavior (management tools
 * enforce their own RBAC internally), so staff/dashboard flows do not regress.
 * Nothing here ever returns secrets, credentials, or other users' data.
 */
import type { CapabilityDefinition } from "@/lib/capability-registry";

export type CapabilityAudience = "public" | "client" | "staff";

/**
 * Assistant tools approved for anonymous public visitors.
 * Anything not listed here is denied for callers without a role — this set
 * spans BOTH assistant executors (conversation-agent `tool-executor` and
 * `agent-tools`), so the same names resolve to the same audience everywhere.
 *
 * - `get_service_info` / `get_company_info` — read-only public service,
 *   pricing, and company information
 * - `create_inquiry` / `create_lead` / `create_project_request` — standard
 *   public contact intake (writes INTO the sales funnel; reads no other
 *   user's data, exposes no internal integrations)
 *
 * Explicitly NOT public (must stay denied for visitors): account/private
 * client domain (`lookup_user`, `create_user`, `lookup_client`,
 * `create_client`), CRM/financial reads (`get_projects`, `get_clients`,
 * `get_leads`, `get_invoices`, `get_quotes`, `get_invoice`,
 * `get_customer_balance`, `get_transaction`, ...), mutations
 * (`update_project`, `create_payment_request`, `prepare_refund_request`,
 * `publish_content_item`, `approve_content_plan`, ...), internal side effects
 * (`create_notification`, `delegate_to_agent`, `execute_skill`), all
 * management tools (blog/product/SEO/security/logging — RBAC-gated
 * internally), and any unknown tool.
 */
export const PUBLIC_ASSISTANT_TOOLS: ReadonlySet<string> = new Set([
  "get_service_info",
  "get_company_info",
  "create_inquiry",
  "create_lead",
  "create_project_request",
]);

/** Roles treated as end customers (never staff) for registry visibility. */
const CUSTOMER_ROLES: ReadonlySet<string> = new Set([
  "customer",
  "client",
  "user",
  "visitor",
  "guest",
]);

/**
 * May this caller execute this assistant tool?
 * Anonymous (no role) → explicit allow-list only. Any authenticated role →
 * allowed through (existing internal RBAC still applies downstream).
 */
export function isAssistantToolAllowed(toolName: string, role?: string | null): boolean {
  if (role && role.trim().length > 0) return true;
  return PUBLIC_ASSISTANT_TOOLS.has(toolName);
}

/** Derive an audience from the registry's existing auth fields. */
export function capabilityAudience(
  capability: Pick<CapabilityDefinition, "requiresAuth" | "minUserRole">
): CapabilityAudience {
  if (!capability.requiresAuth) return "public";
  const min = (capability.minUserRole || "").toLowerCase();
  if (CUSTOMER_ROLES.has(min)) return "client";
  return "staff";
}

/** Is this registry capability visible/usable by the given caller? */
export function isCapabilityAvailableTo(
  capability: Pick<CapabilityDefinition, "requiresAuth" | "minUserRole">,
  role?: string | null
): boolean {
  const audience = capabilityAudience(capability);
  if (audience === "public") return true;
  if (!role || role.trim().length === 0) return false;
  if (audience === "client") return true;
  // staff audience: any authenticated non-customer role
  return !CUSTOMER_ROLES.has(role.trim().toLowerCase());
}

/**
 * Public-safe projection of a capability for discovery responses.
 * Intentionally omits `requiredTools`, `requiredSkills`, `minUserRole`,
 * `requiresAuth`, and `requestTypes` — internal routing detail a visitor
 * must never see.
 */
export function toPublicCapabilityView(
  capability: CapabilityDefinition
): {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  estimatedDuration: string;
  requiresProject: boolean;
  audience: CapabilityAudience;
} {
  return {
    id: capability.id,
    name: capability.name,
    description: capability.description,
    category: capability.category,
    icon: capability.icon,
    estimatedDuration: capability.estimatedDuration,
    requiresProject: capability.requiresProject,
    audience: capabilityAudience(capability),
  };
}
