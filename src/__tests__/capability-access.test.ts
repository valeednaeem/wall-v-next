/**
 * Regression tests for the capability access policy (public/client/staff).
 *
 * These guard the Phase 4 security invariant: anonymous visitors get an
 * EXPLICIT allow-list only — default is DENY — across both assistant
 * executors, and the public capability projection never leaks internal
 * routing fields.
 */
import {
  PUBLIC_ASSISTANT_TOOLS,
  isAssistantToolAllowed,
  capabilityAudience,
  isCapabilityAvailableTo,
  toPublicCapabilityView,
} from "@/lib/capability-access";
import type { CapabilityDefinition } from "@/lib/capability-registry";

describe("isAssistantToolAllowed (visitor default-deny)", () => {
  it("allows exactly the public allow-list for anonymous callers", () => {
    const anonymous: Array<string | null | undefined> = [undefined, null, ""];
    for (const role of anonymous) {
      expect(isAssistantToolAllowed("get_service_info", role)).toBe(true);
      expect(isAssistantToolAllowed("get_company_info", role)).toBe(true);
      expect(isAssistantToolAllowed("create_inquiry", role)).toBe(true);
      expect(isAssistantToolAllowed("create_lead", role)).toBe(true);
      expect(isAssistantToolAllowed("create_project_request", role)).toBe(true);
    }
  });

  it("denies account, CRM, financial, and internal tools for anonymous callers", () => {
    const denied = [
      // account / private-client domain
      "lookup_user",
      "create_user",
      "lookup_client",
      "create_client",
      // CRM / financial reads
      "get_projects",
      "get_project",
      "get_clients",
      "get_leads",
      "get_invoices",
      "get_quotes",
      "get_invoice",
      "get_customer_balance",
      "get_transaction",
      // mutations and internal side effects
      "update_project",
      "create_invoice",
      "create_notification",
      "delegate_to_agent",
      "execute_skill",
      "prepare_refund_request",
      "create_payment_request",
      "approve_content_plan",
      "publish_content_item",
      // management / unknown
      "create_blog_post",
      "run_security_scan",
      "totally_unknown_tool",
    ];
    for (const tool of denied) {
      expect(isAssistantToolAllowed(tool)).toBe(false);
      expect(isAssistantToolAllowed(tool, "")).toBe(false);
      expect(isAssistantToolAllowed(tool, null)).toBe(false);
    }
  });

  it("allows any authenticated role through (existing RBAC applies downstream)", () => {
    for (const role of ["customer", "manager", "admin", "staff", "super-admin"]) {
      expect(isAssistantToolAllowed("lookup_user", role)).toBe(true);
      expect(isAssistantToolAllowed("get_invoices", role)).toBe(true);
      expect(isAssistantToolAllowed("any_unknown_tool", role)).toBe(true);
    }
  });

  it("allow-list contains no privileged tools", () => {
    expect(PUBLIC_ASSISTANT_TOOLS).not.toContain("lookup_user");
    expect(PUBLIC_ASSISTANT_TOOLS).not.toContain("create_user");
    expect(PUBLIC_ASSISTANT_TOOLS).not.toContain("create_invoice");
    expect(PUBLIC_ASSISTANT_TOOLS).not.toContain("create_notification");
    expect(PUBLIC_ASSISTANT_TOOLS).not.toContain("delegate_to_agent");
    expect(PUBLIC_ASSISTANT_TOOLS).not.toContain("get_projects");
    expect(PUBLIC_ASSISTANT_TOOLS.size).toBe(5);
  });
});

describe("capabilityAudience (derives from registry auth fields)", () => {
  it("maps requiresAuth:false to public", () => {
    expect(capabilityAudience({ requiresAuth: false, minUserRole: "customer" })).toBe("public");
  });

  it("maps customer-type minUserRole to client", () => {
    expect(capabilityAudience({ requiresAuth: true, minUserRole: "customer" })).toBe("client");
    expect(capabilityAudience({ requiresAuth: true, minUserRole: "client" })).toBe("client");
  });

  it("maps staff minUserRole to staff", () => {
    expect(capabilityAudience({ requiresAuth: true, minUserRole: "admin" })).toBe("staff");
    expect(capabilityAudience({ requiresAuth: true, minUserRole: "super-admin" })).toBe("staff");
    expect(capabilityAudience({ requiresAuth: true, minUserRole: "manager" })).toBe("staff");
  });
});

describe("isCapabilityAvailableTo (visibility matrix)", () => {
  const publicCap = { requiresAuth: false, minUserRole: "customer" };
  const clientCap = { requiresAuth: true, minUserRole: "customer" };
  const staffCap = { requiresAuth: true, minUserRole: "admin" };

  it("public capabilities are visible to everyone, including anonymous", () => {
    expect(isCapabilityAvailableTo(publicCap)).toBe(true);
    expect(isCapabilityAvailableTo(publicCap, null)).toBe(true);
    expect(isCapabilityAvailableTo(publicCap, "customer")).toBe(true);
  });

  it("client capabilities are hidden from anonymous callers", () => {
    expect(isCapabilityAvailableTo(clientCap)).toBe(false);
    expect(isCapabilityAvailableTo(clientCap, null)).toBe(false);
    expect(isCapabilityAvailableTo(clientCap, "")).toBe(false);
  });

  it("client capabilities are visible to authenticated callers", () => {
    expect(isCapabilityAvailableTo(clientCap, "customer")).toBe(true);
    expect(isCapabilityAvailableTo(clientCap, "admin")).toBe(true);
  });

  it("staff capabilities are hidden from anonymous and customer roles", () => {
    expect(isCapabilityAvailableTo(staffCap)).toBe(false);
    expect(isCapabilityAvailableTo(staffCap, "customer")).toBe(false);
    expect(isCapabilityAvailableTo(staffCap, "client")).toBe(false);
    expect(isCapabilityAvailableTo(staffCap, "admin")).toBe(true);
    expect(isCapabilityAvailableTo(staffCap, "super-admin")).toBe(true);
  });
});

describe("toPublicCapabilityView (safe projection)", () => {
  const fixture: CapabilityDefinition = {
    id: "web-development",
    name: "Web Development",
    description: "Custom websites and web applications.",
    requestTypes: ["website-development"],
    requiredSkills: ["react", "nextjs"],
    requiredTools: ["get_clients", "create_invoice"],
    category: "Development",
    minUserRole: "admin",
    requiresAuth: true,
    requiresProject: true,
    estimatedDuration: "2-6 weeks",
    icon: "Globe",
  };

  it("keeps public-safe marketing fields", () => {
    const view = toPublicCapabilityView(fixture);
    expect(view.id).toBe("web-development");
    expect(view.name).toBe("Web Development");
    expect(view.description).toBe("Custom websites and web applications.");
    expect(view.category).toBe("Development");
    expect(view.icon).toBe("Globe");
    expect(view.estimatedDuration).toBe("2-6 weeks");
    expect(view.requiresProject).toBe(true);
    expect(view.audience).toBe("staff");
  });

  it("never exposes internal routing fields", () => {
    const view = toPublicCapabilityView(fixture) as unknown as Record<string, unknown>;
    expect(view).not.toHaveProperty("requiredTools");
    expect(view).not.toHaveProperty("requiredSkills");
    expect(view).not.toHaveProperty("minUserRole");
    expect(view).not.toHaveProperty("requiresAuth");
    expect(view).not.toHaveProperty("requestTypes");
    // Deep check: internal tool names must not leak anywhere in the payload
    const serialized = JSON.stringify(view);
    expect(serialized).not.toContain("get_clients");
    expect(serialized).not.toContain("create_invoice");
    expect(serialized).not.toContain("admin");
  });
});
