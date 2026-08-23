export const PERMISSIONS = {
  // Users
  USERS_VIEW: "users:view",
  USERS_CREATE: "users:create",
  USERS_EDIT: "users:edit",
  USERS_DELETE: "users:delete",

  // Roles
  ROLES_VIEW: "roles:view",
  ROLES_CREATE: "roles:create",
  ROLES_EDIT: "roles:edit",
  ROLES_DELETE: "roles:delete",

  // Products
  PRODUCTS_VIEW: "products:view",
  PRODUCTS_CREATE: "products:create",
  PRODUCTS_EDIT: "products:edit",
  PRODUCTS_DELETE: "products:delete",

  // Categories
  CATEGORIES_VIEW: "categories:view",
  CATEGORIES_CREATE: "categories:create",
  CATEGORIES_EDIT: "categories:edit",
  CATEGORIES_DELETE: "categories:delete",

  // Blog
  BLOG_VIEW: "blog:view",
  BLOG_CREATE: "blog:create",
  BLOG_EDIT: "blog:edit",
  BLOG_DELETE: "blog:delete",
  BLOG_PUBLISH: "blog:publish",

  // Orders
  ORDERS_VIEW: "orders:view",
  ORDERS_MANAGE: "orders:manage",

  // Invoices
  INVOICES_VIEW: "invoices:view",
  INVOICES_CREATE: "invoices:create",
  INVOICES_MANAGE: "invoices:manage",

  // Projects
  PROJECTS_VIEW: "projects:view",
  PROJECTS_CREATE: "projects:create",
  PROJECTS_EDIT: "projects:edit",
  PROJECTS_DELETE: "projects:delete",

  // CRM
  CRM_VIEW: "crm:view",
  CRM_LEADS: "crm:leads",
  CRM_CLIENTS: "crm:clients",
  CRM_INQUIRIES: "crm:inquiries",

  // Hosting
  HOSTING_VIEW: "hosting:view",
  HOSTING_MANAGE: "hosting:manage",

  // Domains
  DOMAINS_VIEW: "domains:view",
  DOMAINS_MANAGE: "domains:manage",

  // Support
  SUPPORT_VIEW: "support:view",
  SUPPORT_MANAGE: "support:manage",

  // Settings
  SETTINGS_VIEW: "settings:view",
  SETTINGS_MANAGE: "settings:manage",

  // Analytics
  ANALYTICS_VIEW: "analytics:view",

  // Marketing - Google
  MARKETING_VIEW: "marketing:view",
  MARKETING_MANAGE: "marketing:manage",
  GOOGLE_ANALYTICS_VIEW: "google:analytics:view",
  GOOGLE_ANALYTICS_MANAGE: "google:analytics:manage",
  GOOGLE_SEARCH_CONSOLE_VIEW: "google:search_console:view",
  GOOGLE_SEARCH_CONSOLE_MANAGE: "google:search_console:manage",
  GOOGLE_BUSINESS_PROFILE_VIEW: "google:business_profile:view",
  GOOGLE_BUSINESS_PROFILE_MANAGE: "google:business_profile:manage",
  GOOGLE_MERCHANT_VIEW: "google:merchant:view",
  GOOGLE_MERCHANT_MANAGE: "google:merchant:manage",
  GOOGLE_ADS_VIEW: "google:ads:view",
  GOOGLE_ADS_MANAGE: "google:ads:manage",

  // SEO
  SEO_VIEW: "seo:view",
  SEO_MANAGE: "seo:manage",
  SEO_SITEMAP_MANAGE: "seo:sitemap:manage",
  SEO_ROBOTS_MANAGE: "seo:robots:manage",

  // Tracking
  TRACKING_VIEW: "tracking:view",
  TRACKING_MANAGE: "tracking:manage",

  // AI
  AI_ACCESS: "ai:access",
  AI_MANAGE: "ai:manage",

  // Agents
  AGENTS_VIEW: "agents:view",
  AGENTS_CREATE: "agents:create",
  AGENTS_EDIT: "agents:edit",
  AGENTS_DELETE: "agents:delete",
  AGENTS_EXECUTE: "agents:execute",
  AGENTS_APPROVE: "agents:approve",
  AGENTS_MONITOR: "agents:monitor",
  AGENTS_CONFIGURE: "agents:configure",
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
