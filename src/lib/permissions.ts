// ─── Complete Permission Constants ────────────────────────────────────────────
// Organized by resource group. Each permission follows "resource:action" pattern.
// Resource scopes (view_all, view_assigned, view_own) control data visibility.

export const PERMISSIONS = {
  // ─── Users ──────────────────────────────────────────────────────────────────
  USERS_VIEW: "users:view",
  USERS_CREATE: "users:create",
  USERS_EDIT: "users:edit",
  USERS_DELETE: "users:delete",

  // ─── Roles ──────────────────────────────────────────────────────────────────
  ROLES_VIEW: "roles:view",
  ROLES_CREATE: "roles:create",
  ROLES_EDIT: "roles:edit",
  ROLES_DELETE: "roles:delete",

  // ─── Products ───────────────────────────────────────────────────────────────
  PRODUCTS_VIEW: "products:view",
  PRODUCTS_CREATE: "products:create",
  PRODUCTS_EDIT: "products:edit",
  PRODUCTS_DELETE: "products:delete",

  // ─── Categories ─────────────────────────────────────────────────────────────
  CATEGORIES_VIEW: "categories:view",
  CATEGORIES_CREATE: "categories:create",
  CATEGORIES_EDIT: "categories:edit",
  CATEGORIES_DELETE: "categories:delete",

  // ─── Blog ───────────────────────────────────────────────────────────────────
  BLOG_VIEW: "blog:view",
  BLOG_CREATE: "blog:create",
  BLOG_EDIT: "blog:edit",
  BLOG_DELETE: "blog:delete",
  BLOG_PUBLISH: "blog:publish",

  // ─── Orders ─────────────────────────────────────────────────────────────────
  ORDERS_VIEW: "orders:view",
  ORDERS_MANAGE: "orders:manage",

  // ─── Invoices ───────────────────────────────────────────────────────────────
  INVOICES_VIEW: "invoices:view",
  INVOICES_CREATE: "invoices:create",
  INVOICES_MANAGE: "invoices:manage",

  // ─── Projects ───────────────────────────────────────────────────────────────
  PROJECTS_VIEW: "projects:view",
  PROJECTS_VIEW_ALL: "projects:view_all",
  PROJECTS_VIEW_ASSIGNED: "projects:view_assigned",
  PROJECTS_VIEW_OWN: "projects:view_own",
  PROJECTS_CREATE: "projects:create",
  PROJECTS_EDIT: "projects:edit",
  PROJECTS_DELETE: "projects:delete",
  PROJECTS_ASSIGN: "projects:assign",

  // ─── Tasks ──────────────────────────────────────────────────────────────────
  TASKS_VIEW: "tasks:view",
  TASKS_CREATE: "tasks:create",
  TASKS_EDIT: "tasks:edit",
  TASKS_ASSIGN: "tasks:assign",

  // ─── CRM ────────────────────────────────────────────────────────────────────
  CRM_VIEW: "crm:view",
  CRM_LEADS: "crm:leads",
  CRM_CLIENTS: "crm:clients",
  CRM_INQUIRIES: "crm:inquiries",

  // ─── Hosting ────────────────────────────────────────────────────────────────
  HOSTING_VIEW: "hosting:view",
  HOSTING_MANAGE: "hosting:manage",

  // ─── Domains ────────────────────────────────────────────────────────────────
  DOMAINS_VIEW: "domains:view",
  DOMAINS_MANAGE: "domains:manage",

  // ─── Support ────────────────────────────────────────────────────────────────
  SUPPORT_VIEW: "support:view",
  SUPPORT_MANAGE: "support:manage",

  // ─── Settings ───────────────────────────────────────────────────────────────
  SETTINGS_VIEW: "settings:view",
  SETTINGS_MANAGE: "settings:manage",
  SETTINGS_EDIT: "settings:edit",

  // ─── Analytics ──────────────────────────────────────────────────────────────
  ANALYTICS_VIEW: "analytics:view",

  // ─── Marketing - Google ─────────────────────────────────────────────────────
  MARKETING_VIEW: "marketing:view",
  MARKETING_MANAGE: "marketing:manage",
  GOOGLE_ANALYTICS_VIEW: "google:analytics:view",
  GOOGLE_ANALYTICS_MANAGE: "google:analytics:manage",
  GOOGLE_SEARCH_CONSOLE_VIEW: "google:search_console:view",
  GOOGLE_SEARCH_CONSOLE_MANAGE: "google:search_console:manage",

  // ─── SEO ────────────────────────────────────────────────────────────────────
  SEO_VIEW: "seo:view",
  SEO_MANAGE: "seo:manage",
  SEO_SITEMAP_MANAGE: "seo:sitemap:manage",
  SEO_ROBOTS_MANAGE: "seo:robots:manage",

  // ─── Tracking ───────────────────────────────────────────────────────────────
  TRACKING_VIEW: "tracking:view",
  TRACKING_MANAGE: "tracking:manage",

  // ─── AI ─────────────────────────────────────────────────────────────────────
  AI_ACCESS: "ai:access",
  AI_MANAGE: "ai:manage",

  // ─── Agents ─────────────────────────────────────────────────────────────────
  AGENTS_VIEW: "agents:view",
  AGENTS_CREATE: "agents:create",
  AGENTS_EDIT: "agents:edit",
  AGENTS_DELETE: "agents:delete",
  AGENTS_EXECUTE: "agents:execute",
  AGENTS_APPROVE: "agents:approve",
  AGENTS_MONITOR: "agents:monitor",
  AGENTS_CONFIGURE: "agents:configure",

  // ─── Skills ─────────────────────────────────────────────────────────────────
  SKILLS_VIEW: "skills:view",
  SKILLS_CREATE: "skills:create",
  SKILLS_EDIT: "skills:edit",
  SKILLS_DELETE: "skills:delete",
  SKILLS_EXECUTE: "skills:execute",
  SKILLS_MANAGE: "skills:manage",

  // ─── Tools ──────────────────────────────────────────────────────────────────
  TOOLS_VIEW: "tools:view",
  TOOLS_CREATE: "tools:create",
  TOOLS_EDIT: "tools:edit",
  TOOLS_DELETE: "tools:delete",
  TOOLS_EXECUTE: "tools:execute",

  // ─── Workflows ──────────────────────────────────────────────────────────────
  WORKFLOWS_VIEW: "workflows:view",
  WORKFLOWS_CREATE: "workflows:create",
  WORKFLOWS_EDIT: "workflows:edit",
  WORKFLOWS_DELETE: "workflows:delete",
  WORKFLOWS_EXECUTE: "workflows:execute",

  // ─── Finance ────────────────────────────────────────────────────────────────
  FINANCE_VIEW: "finance:view",
  FINANCE_READ: "finance:read",
  FINANCE_EDIT: "finance:edit",
  FINANCE_CREATE_INVOICE: "finance:create_invoice",
  FINANCE_CREATE_QUOTATION: "finance:create_quotation",
  FINANCE_PROCESS_PAYMENT: "finance:process_payment",
  FINANCE_REFUND: "finance:refund",
  FINANCE_RECONCILE: "finance:reconcile",

  // ─── Communications ─────────────────────────────────────────────────────────
  COMMUNICATIONS_PREPARE: "communications:prepare",
  COMMUNICATIONS_SEND: "communications:send",

  // ─── Deployment ─────────────────────────────────────────────────────────────
  DEPLOYMENT_MANAGE: "deployment:manage",

  // ─── System ─────────────────────────────────────────────────────────────────
  SYSTEM_MANAGE: "system:manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export function hasPermission(userPermissions: string[], required: string): boolean {
  if (userPermissions.includes("*")) return true;
  return userPermissions.includes(required);
}

export function hasAnyPermission(userPermissions: string[], required: string[]): boolean {
  if (userPermissions.includes("*")) return true;
  return required.some((perm) => userPermissions.includes(perm));
}

// ─── Role Hierarchy ──────────────────────────────────────────────────────────
// Roles listed from highest to lowest privilege. A higher role includes all
// permissions of roles below it.

export const ROLE_HIERARCHY: Record<string, string[]> = {
  "super-admin": ["*"],
  "admin": [
    "users:view", "users:create", "users:edit", "users:delete",
    "roles:view", "roles:create", "roles:edit",
    "products:view", "products:create", "products:edit", "products:delete",
    "categories:view", "categories:create", "categories:edit", "categories:delete",
    "blog:view", "blog:create", "blog:edit", "blog:delete", "blog:publish",
    "orders:view", "orders:manage",
    "invoices:view", "invoices:create", "invoices:manage",
    "projects:view", "projects:view_all", "projects:create", "projects:edit", "projects:delete", "projects:assign",
    "tasks:view", "tasks:create", "tasks:edit", "tasks:assign",
    "crm:view", "crm:leads", "crm:clients", "crm:inquiries",
    "hosting:view", "hosting:manage",
    "domains:view", "domains:manage",
    "support:view", "support:manage",
    "analytics:view",
    "marketing:view", "marketing:manage",
    "google:analytics:view", "google:analytics:manage",
    "google:search_console:view", "google:search_console:manage",
    "seo:view", "seo:manage", "seo:sitemap:manage", "seo:robots:manage",
    "tracking:view", "tracking:manage",
    "ai:access", "ai:manage",
    "agents:view", "agents:create", "agents:edit", "agents:delete", "agents:approve", "agents:monitor", "agents:configure",
    "skills:view", "skills:create", "skills:edit", "skills:manage",
    "tools:view", "tools:create", "tools:edit",
    "workflows:view", "workflows:create", "workflows:edit",
    "finance:view", "finance:read", "finance:edit", "finance:create_invoice", "finance:create_quotation", "finance:process_payment", "finance:refund", "finance:reconcile",
    "communications:prepare", "communications:send",
    "settings:view", "settings:manage", "settings:edit",
    "deployment:manage",
  ],
  "project-manager": [
    "projects:view", "projects:view_assigned", "projects:create", "projects:edit", "projects:assign",
    "tasks:view", "tasks:create", "tasks:edit", "tasks:assign",
    "crm:view", "crm:clients", "crm:inquiries",
    "invoices:view", "invoices:create",
    "support:view", "support:manage",
    "analytics:view",
    "agents:view", "agents:execute",
    "skills:view", "skills:execute",
    "tools:view", "tools:execute",
    "workflows:view", "workflows:execute",
  ],
  "staff": [
    "products:view", "blog:view", "blog:create",
    "orders:view", "projects:view", "projects:view_assigned",
    "tasks:view",
    "crm:view", "crm:inquiries",
    "support:view",
    "analytics:view",
    "marketing:view",
    "google:analytics:view",
    "seo:view", "tracking:view",
  ],
  "developer": [
    "projects:view", "projects:view_assigned",
    "tasks:view", "tasks:edit",
    "agents:view", "agents:execute",
    "skills:view", "skills:execute",
    "tools:view", "tools:execute",
    "support:view",
  ],
  "designer": [
    "projects:view", "projects:view_assigned",
    "tasks:view", "tasks:edit",
    "products:view",
    "blog:view",
    "support:view",
  ],
  "marketing": [
    "projects:view", "projects:view_assigned",
    "tasks:view",
    "blog:view", "blog:create", "blog:edit", "blog:publish",
    "marketing:view", "marketing:manage",
    "google:analytics:view", "google:analytics:manage",
    "google:search_console:view", "google:search_console:manage",
    "seo:view", "seo:manage",
    "tracking:view", "tracking:manage",
    "crm:view", "crm:leads",
    "analytics:view",
  ],
  "sales": [
    "projects:view", "projects:view_assigned",
    "crm:view", "crm:leads", "crm:clients", "crm:inquiries",
    "invoices:view", "invoices:create",
    "orders:view",
    "products:view",
    "support:view",
    "analytics:view",
    "marketing:view",
  ],
  "support": [
    "projects:view", "projects:view_assigned",
    "tasks:view",
    "crm:view", "crm:inquiries",
    "support:view", "support:manage",
    "orders:view",
    "analytics:view",
  ],
  "customer": [
    "orders:view",
    "projects:view_own",
    "tasks:view",
    "invoices:view",
    "support:view",
  ],
};

// ─── Helper: Get permissions for a role ──────────────────────────────────────
export function getRolePermissions(role: string): string[] {
  if (role === "super-admin") return ["*"];
  return ROLE_HIERARCHY[role] || [];
}

// ─── Helper: Check if a role is at or above a certain level ──────────────────
const ROLE_LEVELS: Record<string, number> = {
  "super-admin": 100,
  "admin": 80,
  "project-manager": 60,
  "staff": 40,
  "developer": 40,
  "designer": 40,
  "marketing": 40,
  "sales": 40,
  "support": 40,
  "customer": 10,
};

export function isRoleAtLeast(role: string, minLevel: number): boolean {
  return (ROLE_LEVELS[role] ?? 0) >= minLevel;
}

export function isInternalRole(role: string): boolean {
  return role !== "customer" && role !== "super-admin";
}

export function isPrivilegedRole(role: string): boolean {
  return ["super-admin", "admin"].includes(role);
}

// ─── Safe roles for public registration ──────────────────────────────────────
export const PUBLIC_ASSIGNABLE_ROLES: string[] = ["customer"];

// ─── Roles that admins can assign ────────────────────────────────────────────
export const ADMIN_ASSIGNABLE_ROLES: string[] = [
  "admin", "project-manager", "staff", "developer", "designer",
  "marketing", "sales", "support", "customer",
];

// ─── Roles that super-admins can assign ──────────────────────────────────────
export const SUPER_ADMIN_ASSIGNABLE_ROLES: string[] = [
  "super-admin", "admin", "project-manager", "staff", "developer", "designer",
  "marketing", "sales", "support", "customer",
];
