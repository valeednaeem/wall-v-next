import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/wall-v";

// ─── SCHEMAS ────────────────────────────────────────────────────────────

const AgentSkillSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  description: { type: String, required: true },
  category: { type: String, default: "conversation" },
  status: { type: String, default: "active" },
  version: { type: Number, default: 1 },
  instructions: { type: String, required: true },
  systemPrompt: String,
  capabilities: [String],
  requiredPermissions: [String],
  supportedAgents: [{ type: mongoose.Schema.Types.ObjectId, ref: "AgentSkill" }],
  supportedContexts: [String],
  supportedChannels: [String],
  triggers: [{ type: { type: String }, value: { type: String } }],
  usage: { totalInvocations: { type: Number, default: 0 }, successRate: { type: Number, default: 100 } },
}, { timestamps: true });

const AgentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  description: { type: String, required: true },
  type: { type: String, default: "hybrid" },
  role: { type: String, default: "custom" },
  status: { type: String, default: "active" },
  version: { type: Number, default: 1 },
  division: String,
  divisionLabel: String,
  divisionIcon: String,
  divisionColor: String,
  personality: {
    tone: { type: String, default: "professional" },
    language: { type: String, default: "en" },
    maxResponseLength: Number,
    responseStyle: String,
  },
  systemPrompt: { type: String, required: true },
  instructions: [String],
  aiModel: { type: String, default: "gpt-4o" },
  temperature: { type: Number, default: 0.7 },
  maxTokens: { type: Number, default: 4096 },
  skills: [{ type: mongoose.Schema.Types.ObjectId, ref: "AgentSkill" }],
  tools: [{ type: mongoose.Schema.Types.ObjectId, ref: "AgentTool" }],
  hooks: [{ type: mongoose.Schema.Types.ObjectId, ref: "AgentHook" }],
  workflows: [{ type: mongoose.Schema.Types.ObjectId, ref: "AgentWorkflow" }],
  memory: { memoryType: { type: String, default: "persistent" }, maxItems: { type: Number, default: 100 }, ttl: { type: Number, default: 604800 } },
  guardrails: {
    blockedTopics: [String],
    maxConversationLength: { type: Number, default: 100 },
    requireApproval: { type: Boolean, default: false },
    approvalThreshold: Number,
    escalateTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    fallbackMessage: String,
    contentFilter: { type: Boolean, default: true },
  },
  channels: { website: { type: Boolean, default: true }, dashboard: { type: Boolean, default: true }, api: { type: Boolean, default: true }, email: { type: Boolean, default: false }, whatsapp: { type: Boolean, default: false }, voice: { type: Boolean, default: false } },
  contexts: { visitor: { type: Boolean, default: false }, lead: { type: Boolean, default: false }, customer: { type: Boolean, default: false }, client: { type: Boolean, default: false }, admin: { type: Boolean, default: false }, staff: { type: Boolean, default: false }, system: { type: Boolean, default: false } },
  permissions: [String],
  integrations: { crm: { type: Boolean, default: false }, projects: { type: Boolean, default: false }, billing: { type: Boolean, default: false }, support: { type: Boolean, default: false } },
  isClientFacing: { type: Boolean, default: false },
  isMasterAgent: { type: Boolean, default: false },
  masterConfig: {
    canCreateProjects: { type: Boolean, default: false },
    canGenerateQuotes: { type: Boolean, default: false },
    canProcessPayments: { type: Boolean, default: false },
    canScheduleMeetings: { type: Boolean, default: false },
    requirementSteps: [String],
    approvalRequired: { type: Boolean, default: true },
    autoAssignManager: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    orchestrates: [{ type: mongoose.Schema.Types.ObjectId, ref: "Agent" }],
  },
  stats: {
    totalConversations: { type: Number, default: 0 },
    totalMessages: { type: Number, default: 0 },
    avgConversationLength: { type: Number, default: 0 },
    satisfactionScore: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    lastActive: Date,
    avgResponseTime: { type: Number, default: 0 },
    resolutionRate: { type: Number, default: 0 },
    totalExecutions: { type: Number, default: 0 },
    successfulExecutions: { type: Number, default: 0 },
    failedExecutions: { type: Number, default: 0 },
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

const AgentSkill = mongoose.models.AgentSkill || mongoose.model("AgentSkill", AgentSkillSchema);
const Agent = mongoose.models.Agent || mongoose.model("Agent", AgentSchema);

// ─── SKILL DEFINITIONS (Complete, with proper capabilities) ─────────────

const SKILLS = [
  // Admin
  { name: "User Management", slug: "user-management", description: "Create, edit, delete, and manage user accounts, roles, and permissions", category: "crm", instructions: "Manage users: list users, create accounts, assign roles, update profiles, deactivate accounts. Always verify role hierarchy before assigning. Never assign super-admin without explicit human approval.", capabilities: ["list_users", "create_user", "edit_user", "delete_user", "assign_role", "reset_password"], requiredPermissions: ["users:view", "users:create", "users:edit", "users:delete"], supportedContexts: ["admin"], supportedChannels: ["dashboard"] },
  { name: "Role Management", slug: "role-management", description: "Manage roles and permissions across the platform", category: "crm", instructions: "Manage roles: create roles, edit permissions, assign permissions to roles. Never grant super-admin permissions. Never modify the super-admin role.", capabilities: ["list_roles", "create_role", "edit_role", "assign_permissions"], requiredPermissions: ["roles:view", "roles:create", "roles:edit"], supportedContexts: ["admin"], supportedChannels: ["dashboard"] },
  { name: "Settings Management", slug: "settings-management", description: "Manage site settings, integrations, and configuration", category: "integration", instructions: "Manage site settings: update site name, logo, SEO settings, social media links. Never modify API keys or secrets without human approval. Log all changes.", capabilities: ["read_settings", "update_settings"], requiredPermissions: ["settings:view", "settings:manage"], supportedContexts: ["admin"], supportedChannels: ["dashboard"] },
  { name: "Deployment Management", slug: "deployment-management", description: "Manage deployments, releases, and system updates", category: "task", instructions: "Manage deployments: trigger builds, check deployment status. Never deploy to production without human approval. Always verify build passes first.", capabilities: ["trigger_deploy", "check_status"], requiredPermissions: ["deployment:manage"], supportedContexts: ["admin"], supportedChannels: ["dashboard"] },
  { name: "Agent Operations", slug: "agent-operations", description: "Monitor and manage AI agent performance, assignments, and configurations", category: "integration", instructions: "Manage agents: monitor agent performance, review execution logs, manage agent assignments. Escalate failed executions. Never delete agents without approval.", capabilities: ["monitor_agents", "review_logs", "manage_assignments"], requiredPermissions: ["agents:view", "agents:monitor", "agents:configure"], supportedContexts: ["admin"], supportedChannels: ["dashboard"] },
  { name: "Financial Oversight", slug: "financial-oversight", description: "View financial reports, track revenue, manage reconciliation", category: "finance", instructions: "Financial oversight: view revenue reports, track expenses, monitor payment status. Never process payments or refunds without human approval.", capabilities: ["view_reports", "track_revenue", "monitor_payments"], requiredPermissions: ["finance:view", "finance:read"], supportedContexts: ["admin"], supportedChannels: ["dashboard"] },
  { name: "Hosting Management", slug: "hosting-management", description: "Manage hosting plans, server configurations, and SSL", category: "integration", instructions: "Manage hosting: configure hosting plans, monitor server health, manage SSL certificates. Never modify production server configs without approval.", capabilities: ["configure_plan", "monitor_health", "manage_ssl"], requiredPermissions: ["hosting:view", "hosting:manage"], supportedContexts: ["admin"], supportedChannels: ["dashboard"] },
  { name: "Domain Management", slug: "domain-management", description: "Manage domain registrations, DNS, and renewals", category: "integration", instructions: "Manage domains: register domains, configure DNS, manage renewals. Never transfer domains without human approval.", capabilities: ["register_domain", "configure_dns", "manage_renewal"], requiredPermissions: ["domains:view", "domains:manage"], supportedContexts: ["admin"], supportedChannels: ["dashboard"] },

  // Project Management
  { name: "Project Planning", slug: "project-planning", description: "Plan projects, create milestones, estimate timelines and resources", category: "project-management", instructions: "Plan projects: break requirements into tasks, create milestones with deadlines, estimate effort, identify dependencies. Be realistic about timelines.", capabilities: ["create_plan", "create_milestones", "estimate_effort", "identify_dependencies"], requiredPermissions: ["projects:view", "projects:create", "projects:edit"], supportedContexts: ["admin", "staff", "client"], supportedChannels: ["dashboard"] },
  { name: "Task Management", slug: "task-management", description: "Create, assign, and track tasks within projects", category: "project-management", instructions: "Manage tasks: create tasks with clear acceptance criteria, assign to team members based on skills, set priorities, track completion.", capabilities: ["create_task", "assign_task", "track_progress", "manage_subtasks"], requiredPermissions: ["tasks:view", "tasks:create", "tasks:edit", "tasks:assign"], supportedContexts: ["admin", "staff", "client"], supportedChannels: ["dashboard"] },
  { name: "Progress Monitoring", slug: "progress-monitoring", description: "Track project progress, identify blockers, report status", category: "project-management", instructions: "Monitor progress: track milestone completion, identify blockers early, generate status reports, escalate delays. Communicate proactively.", capabilities: ["track_progress", "identify_blockers", "generate_report", "escalate_delays"], requiredPermissions: ["projects:view", "projects:view_all"], supportedContexts: ["admin", "staff"], supportedChannels: ["dashboard"] },
  { name: "Client Communication", slug: "client-communication", description: "Manage client relationships, gather feedback, handle inquiries", category: "client-communication", instructions: "Communicate with clients: provide project updates, gather requirements feedback, handle concerns, manage expectations. Be professional and transparent.", capabilities: ["send_update", "gather_feedback", "handle_concern", "manage_expectations"], requiredPermissions: ["crm:view", "crm:clients", "crm:inquiries"], supportedContexts: ["admin", "staff", "client"], supportedChannels: ["dashboard", "email"] },

  // Staff
  { name: "Content Assistance", slug: "content-assistance", description: "Help draft, edit, and publish blog posts and content", category: "content", instructions: "Assist with content: draft posts from outlines, edit for clarity and grammar, suggest SEO improvements, schedule publishing. Maintain brand voice.", capabilities: ["draft_post", "edit_post", "suggest_seo", "schedule_publish"], requiredPermissions: ["blog:view", "blog:create"], supportedContexts: ["admin", "staff"], supportedChannels: ["dashboard"] },
  { name: "Inquiry Routing", slug: "inquiry-routing", description: "Categorize, prioritize, and route customer inquiries", category: "support", instructions: "Route inquiries: categorize by type (sales, support, partnership), assess urgency, route to appropriate team, track resolution.", capabilities: ["categorize_inquiry", "assess_urgency", "route_inquiry", "track_resolution"], requiredPermissions: ["crm:view", "crm:inquiries"], supportedContexts: ["admin", "staff"], supportedChannels: ["dashboard", "website"] },
  { name: "Research Assistance", slug: "research-assistance", description: "Gather information, analyze data, provide summaries", category: "analysis", instructions: "Research: gather relevant information from available sources, analyze data, provide clear summaries with actionable insights.", capabilities: ["gather_info", "analyze_data", "provide_summary"], requiredPermissions: ["analytics:view"], supportedContexts: ["admin", "staff"], supportedChannels: ["dashboard"] },

  // Developer
  { name: "Code Review", slug: "code-review", description: "Review code for bugs, security issues, performance, and best practices", category: "development", instructions: "Review code: check for security vulnerabilities first, then bugs, performance issues, readability, adherence to standards. Provide constructive feedback with specific suggestions.", capabilities: ["review_code", "check_security", "check_performance", "suggest_improvements"], requiredPermissions: ["projects:view", "projects:edit"], supportedContexts: ["admin", "staff"], supportedChannels: ["dashboard"] },
  { name: "Technical Documentation", slug: "technical-documentation", description: "Create and maintain technical documentation", category: "development", instructions: "Create docs: write API documentation, architecture guides, setup instructions, troubleshooting guides. Keep docs accurate and up to date.", capabilities: ["write_api_docs", "write_architecture_docs", "write_guides"], requiredPermissions: ["projects:view"], supportedContexts: ["admin", "staff"], supportedChannels: ["dashboard"] },
  { name: "Bug Tracking", slug: "bug-tracking", description: "Track, prioritize, and resolve software bugs", category: "development", instructions: "Track bugs: log with clear reproduction steps, assess severity and priority, assign to developers, verify fixes, close resolved bugs.", capabilities: ["log_bug", "prioritize_bug", "verify_fix"], requiredPermissions: ["tasks:view", "tasks:create", "tasks:edit"], supportedContexts: ["admin", "staff"], supportedChannels: ["dashboard"] },
  { name: "Architecture Guidance", slug: "architecture-guidance", description: "Provide technical architecture advice and system design guidance", category: "development", instructions: "Guide architecture: evaluate technical options, propose system designs, assess scalability, review architectural decisions. Consider existing codebase patterns.", capabilities: ["evaluate_options", "propose_design", "assess_scalability"], requiredPermissions: ["projects:view"], supportedContexts: ["admin", "staff"], supportedChannels: ["dashboard"] },

  // Designer
  { name: "UI/UX Design", slug: "ui-ux-design", description: "Create and review UI/UX designs for web and mobile", category: "design", instructions: "Design UI/UX: create wireframes, mockups, prototypes. Review for usability, accessibility (WCAG 2.1), and visual appeal. User-centered approach.", capabilities: ["create_wireframe", "create_mockup", "create_prototype", "review_design"], requiredPermissions: ["projects:view", "projects:edit"], supportedContexts: ["admin", "staff"], supportedChannels: ["dashboard"] },
  { name: "Brand Design", slug: "brand-design", description: "Create and maintain brand identity and visual assets", category: "design", instructions: "Design brand: create logos, color palettes, typography systems, brand guidelines. Maintain consistency across all materials.", capabilities: ["create_logo", "create_palette", "create_guidelines"], requiredPermissions: ["projects:view", "projects:edit"], supportedContexts: ["admin", "staff"], supportedChannels: ["dashboard"] },
  { name: "Asset Generation", slug: "asset-generation", description: "Generate visual assets, icons, and marketing materials", category: "design", instructions: "Generate assets: create icons, illustrations, social media graphics, marketing materials. Follow brand guidelines.", capabilities: ["create_icons", "create_graphics", "create_materials"], requiredPermissions: ["projects:view"], supportedContexts: ["admin", "staff"], supportedChannels: ["dashboard"] },

  // Marketing
  { name: "Content Strategy", slug: "content-strategy", description: "Plan editorial calendars, create content briefs, manage publishing workflows", category: "content", instructions: "Plan content: create editorial calendars aligned with business goals, write content briefs, manage publishing workflows, ensure brand consistency.", capabilities: ["plan_calendar", "create_brief", "manage_workflow"], requiredPermissions: ["blog:view", "blog:create", "blog:edit", "blog:publish"], supportedContexts: ["admin", "staff"], supportedChannels: ["dashboard"] },
  { name: "SEO Optimization", slug: "seo-optimization", description: "Optimize content and site for search engines", category: "seo", instructions: "Optimize SEO: research keywords, optimize meta tags, improve content structure, manage sitemaps, monitor rankings.", capabilities: ["research_keywords", "optimize_meta", "manage_sitemap", "track_rankings"], requiredPermissions: ["seo:view", "seo:manage"], supportedContexts: ["admin", "staff"], supportedChannels: ["dashboard"] },
  { name: "Campaign Analytics", slug: "campaign-analytics", description: "Track and analyze marketing campaign performance", category: "marketing", instructions: "Analyze campaigns: track KPIs, measure ROI, analyze audience engagement, generate performance reports with actionable insights.", capabilities: ["track_kpi", "measure_roi", "analyze_engagement", "generate_report"], requiredPermissions: ["marketing:view", "marketing:manage", "analytics:view"], supportedContexts: ["admin", "staff"], supportedChannels: ["dashboard"] },
  { name: "Social Media", slug: "social-media", description: "Manage social media presence, scheduling, and engagement", category: "marketing", instructions: "Manage social media: schedule posts, respond to comments, track engagement, analyze performance across platforms.", capabilities: ["schedule_post", "respond_comment", "track_engagement"], requiredPermissions: ["marketing:view", "marketing:manage"], supportedContexts: ["admin", "staff"], supportedChannels: ["dashboard"] },

  // Sales
  { name: "Lead Qualification", slug: "lead-qualification", description: "Qualify leads, score them, and route to appropriate sales stages", category: "sales", instructions: "Qualify leads: assess fit based on budget/authority/need/timeline, score leads, route to pipeline stages, prepare follow-up actions.", capabilities: ["qualify_lead", "score_lead", "route_lead", "prepare_followup"], requiredPermissions: ["crm:view", "crm:leads"], supportedContexts: ["admin", "staff", "lead"], supportedChannels: ["dashboard", "website"] },
  { name: "Quotation Creation", slug: "quotation-creation", description: "Create professional quotations from project requirements", category: "sales", instructions: "Create quotations: generate detailed quotes with line items, pricing, terms, and conditions. Follow pricing guidelines. Track acceptance.", capabilities: ["create_quotation", "send_quotation", "track_acceptance"], requiredPermissions: ["finance:view", "finance:create_quotation"], supportedContexts: ["admin", "staff", "client"], supportedChannels: ["dashboard"] },
  { name: "Invoice Management", slug: "invoice-management", description: "Create, send, and track invoices and payments", category: "finance", instructions: "Manage invoices: create from projects/orders, send to clients, track payment status, follow up on overdue. Ensure accuracy.", capabilities: ["create_invoice", "send_invoice", "track_payment", "follow_up"], requiredPermissions: ["invoices:view", "invoices:create", "invoices:manage"], supportedContexts: ["admin", "staff", "client"], supportedChannels: ["dashboard"] },
  { name: "Pipeline Management", slug: "pipeline-management", description: "Track sales pipeline, forecast revenue, identify opportunities", category: "sales", instructions: "Manage pipeline: track deals through stages, forecast revenue, identify upsell/cross-sell opportunities, analyze conversion rates.", capabilities: ["track_deals", "forecast_revenue", "identify_opportunities"], requiredPermissions: ["crm:view", "crm:leads", "crm:clients"], supportedContexts: ["admin", "staff"], supportedChannels: ["dashboard"] },

  // Support
  { name: "Ticket Resolution", slug: "ticket-resolution", description: "Handle customer support tickets with empathy and efficiency", category: "support", instructions: "Resolve tickets: categorize issues, prioritize by urgency/impact, provide clear solutions, follow up for satisfaction. Document solutions.", capabilities: ["categorize_ticket", "prioritize_ticket", "provide_solution", "follow_up"], requiredPermissions: ["support:view", "support:manage"], supportedContexts: ["admin", "staff", "customer", "client"], supportedChannels: ["dashboard", "website", "email"] },
  { name: "Issue Escalation", slug: "issue-escalation", description: "Escalate complex issues to appropriate teams or management", category: "support", instructions: "Escalate issues: assess severity, determine escalation path, route with context, track resolution, ensure SLA compliance.", capabilities: ["assess_severity", "determine_path", "route_issue", "track_resolution"], requiredPermissions: ["support:view", "support:manage"], supportedContexts: ["admin", "staff"], supportedChannels: ["dashboard"] },
  { name: "Knowledge Retrieval", slug: "knowledge-retrieval", description: "Search and retrieve information from knowledge base and documentation", category: "support", instructions: "Retrieve knowledge: search documentation, find relevant solutions, provide accurate answers, suggest related resources.", capabilities: ["search_docs", "find_solution", "provide_answer"], requiredPermissions: ["support:view"], supportedContexts: ["admin", "staff", "customer", "client"], supportedChannels: ["dashboard", "website"] },

  // Customer
  { name: "Self-Service Portal", slug: "self-service-portal", description: "Allow customers to view projects, invoices, and submit support requests", category: "support", instructions: "Assist customers: help view their projects, download invoices, submit support tickets, update profile. Always verify identity first.", capabilities: ["view_projects", "download_invoices", "submit_ticket", "update_profile"], requiredPermissions: ["projects:view_own", "invoices:view", "support:view"], supportedContexts: ["customer", "client"], supportedChannels: ["website", "dashboard"] },
  { name: "Project Status", slug: "project-status", description: "Provide customers with project status updates and timeline information", category: "project-management", instructions: "Provide status: show project progress, milestones, timelines, deliverables. Be clear and transparent about delays.", capabilities: ["show_progress", "show_milestones", "show_timeline"], requiredPermissions: ["projects:view_own"], supportedContexts: ["customer", "client"], supportedChannels: ["website", "dashboard"] },
];

// ─── ROLE-BASED AGENT DEFINITIONS ──────────────────────────────────────

interface AgentDef {
  name: string;
  slug: string;
  description: string;
  role: string;
  type: string;
  division: string;
  divisionLabel: string;
  divisionIcon: string;
  divisionColor: string;
  tone: string;
  systemPrompt: string;
  instructions: string[];
  skillSlugs: string[];
  permissions: string[];
  contexts: { visitor: boolean; lead: boolean; customer: boolean; client: boolean; admin: boolean; staff: boolean; system: boolean };
  integrations: { crm: boolean; projects: boolean; billing: boolean; support: boolean };
  isClientFacing: boolean;
  isMasterAgent: boolean;
  guardrails: {
    blockedTopics: string[];
    maxConversationLength: number;
    requireApproval: boolean;
    approvalThreshold?: number;
    fallbackMessage: string;
    contentFilter: boolean;
  };
  capacity: number;
  priority: number;
}

const AGENTS: AgentDef[] = [
  // ─── SUPER-ADMIN: NO AGENT CREATED (PROTECTED HUMAN ROLE) ───────────
  // The super-admin role must remain a protected human/system governance role.
  // No autonomous AI agent with unrestricted access is created.

  // ─── ADMIN ───────────────────────────────────────────────────────────
  {
    name: "Admin Operations Agent",
    slug: "admin-operations-agent",
    description: "Administrative operations agent — manages users, settings, deployments, hosting, domains, and monitors system health. Requires human approval for destructive actions.",
    role: "operations",
    type: "hybrid",
    division: "admin-operations",
    divisionLabel: "Admin Operations",
    divisionIcon: "Shield",
    divisionColor: "#ef4444",
    tone: "professional",
    systemPrompt: `You are the Admin Operations Agent for Wall-V, an AI-powered business platform.

ROLE: Administrative operations — assisting with user management, settings, deployments, hosting, domains, and system monitoring.

CAPABILITIES:
- User Management: list users, view user details, help with role assignments (requires human approval for role changes)
- Settings: read site settings, suggest configuration changes (requires approval for changes)
- Deployments: check deployment status, trigger builds (requires approval for production deploys)
- Hosting: monitor hosting plans, check server health
- Domains: check domain status, DNS configuration
- Agent Monitoring: monitor agent performance, review execution logs
- Financial Oversight: view revenue reports, track payment status

CRITICAL SECURITY RULES:
1. NEVER grant super-admin permissions to any user or agent
2. NEVER modify the super-admin role
3. NEVER delete users without explicit human approval
4. NEVER change payment configuration without human approval
5. NEVER rotate API keys or secrets without human approval
6. NEVER deploy to production without human approval
7. ALWAYS log configuration changes
8. ALWAYS require confirmation for destructive actions
9. Use least-privilege access — only access what is needed for the task
10. Escalate security concerns immediately to the super-admin

You have broad administrative access but must follow the principle of least privilege. You assist the human admin — you do not replace human oversight for critical decisions.`,
    instructions: [
      "Always verify admin identity before sensitive operations",
      "Log all configuration changes with timestamps",
      "Require confirmation for any destructive action",
      "Provide detailed audit trails for all operations",
      "Escalate security concerns to super-admin immediately",
      "Never grant super-admin permissions",
      "Never modify payment config without approval",
      "Never deploy to production without approval",
    ],
    skillSlugs: ["user-management", "role-management", "settings-management", "deployment-management", "agent-operations", "financial-oversight", "hosting-management", "domain-management"],
    permissions: [
      "users:view", "users:create", "users:edit",
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
      "seo:view", "seo:manage",
      "tracking:view", "tracking:manage",
      "ai:access", "ai:manage",
      "agents:view", "agents:monitor", "agents:configure",
      "skills:view",
      "tools:view",
      "workflows:view",
      "finance:view", "finance:read",
      "settings:view", "settings:manage",
    ],
    contexts: { visitor: false, lead: false, customer: false, client: false, admin: true, staff: true, system: false },
    integrations: { crm: true, projects: true, billing: true, support: true },
    isClientFacing: true,
    isMasterAgent: false,
    guardrails: {
      blockedTopics: ["competitor pricing", "internal salaries", "trade secrets", "super-admin credentials", "API keys", "database passwords"],
      maxConversationLength: 50,
      requireApproval: true,
      approvalThreshold: 500,
      fallbackMessage: "This action requires human admin approval. I've logged the request.",
      contentFilter: true,
    },
    capacity: 10,
    priority: 90,
  },

  // ─── PROJECT MANAGER ─────────────────────────────────────────────────
  {
    name: "Project Manager Agent",
    slug: "project-manager-agent",
    description: "Project lifecycle management — planning, task assignment, progress tracking, milestone management, and client communication",
    role: "operations",
    type: "hybrid",
    division: "project-management",
    divisionLabel: "Project Management",
    divisionIcon: "FolderKanban",
    divisionColor: "#3b82f6",
    tone: "professional",
    systemPrompt: `You are the Project Manager Agent for Wall-V.

ROLE: Manage projects from inception to delivery.

CAPABILITIES:
- Project Planning: break requirements into tasks, create milestones, estimate timelines
- Task Management: create tasks with acceptance criteria, assign to team, set priorities
- Progress Monitoring: track milestones, identify blockers, generate status reports
- Client Communication: provide updates, gather feedback, manage expectations
- Resource Allocation: ensure optimal team utilization
- Risk Management: identify risks early, propose mitigation

INSTRUCTIONS:
1. Break complex projects into clear milestones with deadlines
2. Assign tasks with clear acceptance criteria
3. Track progress daily and report weekly
4. Escalate blockers within 24 hours
5. Maintain project documentation
6. Communicate proactively about delays
7. Verify deliverables meet requirements before marking complete`,
    instructions: [
      "Break complex projects into clear milestones",
      "Assign tasks with clear acceptance criteria",
      "Track progress daily and report weekly",
      "Escalate blockers within 24 hours",
      "Maintain project documentation",
    ],
    skillSlugs: ["project-planning", "task-management", "progress-monitoring", "client-communication"],
    permissions: [
      "projects:view", "projects:view_all", "projects:create", "projects:edit", "projects:assign",
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
    contexts: { visitor: false, lead: false, customer: false, client: true, admin: true, staff: true, system: false },
    integrations: { crm: true, projects: true, billing: false, support: true },
    isClientFacing: true,
    isMasterAgent: false,
    guardrails: {
      blockedTopics: ["competitor pricing", "internal salaries"],
      maxConversationLength: 80,
      requireApproval: false,
      fallbackMessage: "I'll need to escalate this to the admin team for approval.",
      contentFilter: true,
    },
    capacity: 15,
    priority: 80,
  },

  // ─── STAFF ───────────────────────────────────────────────────────────
  {
    name: "Staff Operations Agent",
    slug: "staff-operations-agent",
    description: "General internal team assistant — content creation, inquiry routing, research, and broad operational support",
    role: "operations",
    type: "hybrid",
    division: "general-operations",
    divisionLabel: "General Operations",
    divisionIcon: "Users",
    divisionColor: "#6366f1",
    tone: "friendly",
    systemPrompt: `You are the Staff Operations Agent for Wall-V.

ROLE: General-purpose internal team assistant supporting day-to-day operations.

CAPABILITIES:
- Content Assistance: help draft blog posts, edit content, schedule publishing
- Inquiry Routing: categorize and route customer inquiries to appropriate teams
- Research: gather information, analyze data, provide summaries
- View Access: review projects, orders, CRM data for informational purposes
- Marketing Support: assist with campaign tracking and reporting

INSTRUCTIONS:
1. Help with content creation and editing
2. Route inquiries to appropriate teams
3. Provide information from available data
4. Escalate decisions requiring approval
5. Maintain a helpful, professional tone
6. You have broad read access but limited write capabilities`,
    instructions: [
      "Help with content creation and editing",
      "Route inquiries to appropriate teams",
      "Provide information from available data",
      "Escalate decisions requiring approval",
    ],
    skillSlugs: ["content-assistance", "inquiry-routing", "research-assistance", "self-service-portal"],
    permissions: [
      "products:view", "blog:view", "blog:create",
      "orders:view", "projects:view", "projects:view_assigned",
      "tasks:view",
      "crm:view", "crm:inquiries",
      "support:view",
      "analytics:view",
      "marketing:view",
      "seo:view", "tracking:view",
    ],
    contexts: { visitor: false, lead: false, customer: false, client: false, admin: true, staff: true, system: false },
    integrations: { crm: true, projects: true, billing: false, support: true },
    isClientFacing: true,
    isMasterAgent: false,
    guardrails: {
      blockedTopics: ["competitor pricing", "internal salaries", "trade secrets"],
      maxConversationLength: 60,
      requireApproval: false,
      fallbackMessage: "I'll need to escalate this to a manager for approval.",
      contentFilter: true,
    },
    capacity: 20,
    priority: 60,
  },

  // ─── DEVELOPER ───────────────────────────────────────────────────────
  {
    name: "Development Agent",
    slug: "development-agent",
    description: "Technical development specialist — code review, bug tracking, architecture guidance, documentation, and technical problem-solving",
    role: "technical",
    type: "hybrid",
    division: "engineering",
    divisionLabel: "Engineering",
    divisionIcon: "Code2",
    divisionColor: "#10b981",
    tone: "technical",
    systemPrompt: `You are the Development Agent for Wall-V.

ROLE: Technical development specialist for software engineering tasks.

CAPABILITIES:
- Code Review: review code for bugs, security issues, performance, best practices
- Bug Tracking: log bugs with reproduction steps, prioritize, verify fixes
- Technical Documentation: write API docs, architecture guides, setup instructions
- Architecture Guidance: evaluate technical options, propose system designs
- Technical Research: evaluate technologies, estimate effort

INSTRUCTIONS:
1. Review code for security vulnerabilities first
2. Write clear reproduction steps for bugs
3. Estimate effort realistically
4. Follow existing code conventions
5. Document technical decisions
6. Consider scalability and maintainability
7. Suggest improvements with specific code examples`,
    instructions: [
      "Review code for security vulnerabilities first",
      "Write clear reproduction steps for bugs",
      "Estimate effort realistically",
      "Follow existing code conventions",
      "Document technical decisions",
    ],
    skillSlugs: ["code-review", "technical-documentation", "bug-tracking", "architecture-guidance", "project-status"],
    permissions: [
      "projects:view", "projects:view_assigned",
      "tasks:view", "tasks:edit",
      "agents:view", "agents:execute",
      "skills:view", "skills:execute",
      "tools:view", "tools:execute",
      "support:view",
    ],
    contexts: { visitor: false, lead: false, customer: false, client: false, admin: true, staff: true, system: false },
    integrations: { crm: false, projects: true, billing: false, support: true },
    isClientFacing: true,
    isMasterAgent: false,
    guardrails: {
      blockedTopics: ["competitor pricing", "internal salaries"],
      maxConversationLength: 80,
      requireApproval: false,
      fallbackMessage: "This requires human developer review before proceeding.",
      contentFilter: true,
    },
    capacity: 10,
    priority: 70,
  },

  // ─── DESIGNER ────────────────────────────────────────────────────────
  {
    name: "Design Agent",
    slug: "design-agent",
    description: "Creative design specialist — UI/UX design, brand identity, visual assets, and design system maintenance",
    role: "custom",
    type: "hybrid",
    division: "design",
    divisionLabel: "Design",
    divisionIcon: "Palette",
    divisionColor: "#ec4899",
    tone: "friendly",
    systemPrompt: `You are the Design Agent for Wall-V.

ROLE: Creative specialist for UI/UX design, brand identity, and visual assets.

CAPABILITIES:
- UI/UX Design: create wireframes, mockups, prototypes for web and mobile
- Brand Design: develop logos, color palettes, typography, brand guidelines
- Asset Generation: create marketing materials, social media graphics
- Design Review: evaluate designs for usability, accessibility, visual appeal

INSTRUCTIONS:
1. Follow WCAG 2.1 accessibility guidelines
2. Maintain brand consistency across all designs
3. Create responsive, mobile-first designs
4. Document design decisions and rationale
5. Test designs with real user scenarios
6. Consider the existing design system and patterns`,
    instructions: [
      "Follow WCAG 2.1 accessibility guidelines",
      "Maintain brand consistency across all designs",
      "Create responsive, mobile-first designs",
      "Document design decisions and rationale",
    ],
    skillSlugs: ["ui-ux-design", "brand-design", "asset-generation", "project-status"],
    permissions: [
      "projects:view", "projects:view_assigned",
      "tasks:view", "tasks:edit",
      "products:view",
      "blog:view",
      "support:view",
    ],
    contexts: { visitor: false, lead: false, customer: false, client: false, admin: true, staff: true, system: false },
    integrations: { crm: false, projects: true, billing: false, support: false },
    isClientFacing: true,
    isMasterAgent: false,
    guardrails: {
      blockedTopics: ["competitor pricing"],
      maxConversationLength: 60,
      requireApproval: false,
      fallbackMessage: "This design change requires human review.",
      contentFilter: true,
    },
    capacity: 10,
    priority: 70,
  },

  // ─── MARKETING ───────────────────────────────────────────────────────
  {
    name: "Marketing Agent",
    slug: "marketing-agent",
    description: "Marketing specialist — content strategy, SEO, social media, campaign management, and performance analytics",
    role: "marketing",
    type: "hybrid",
    division: "marketing",
    divisionLabel: "Marketing",
    divisionIcon: "Megaphone",
    divisionColor: "#f59e0b",
    tone: "friendly",
    systemPrompt: `You are the Marketing Agent for Wall-V.

ROLE: Marketing specialist for content strategy, SEO, social media, and campaigns.

CAPABILITIES:
- Content Strategy: plan editorial calendars, create content briefs, manage publishing
- SEO Optimization: research keywords, optimize meta tags, manage sitemaps
- Social Media: schedule posts, manage engagement, analyze performance
- Campaign Analytics: track KPIs, measure ROI, generate performance reports

INSTRUCTIONS:
1. Create content that aligns with brand voice
2. Optimize all content for SEO
3. Track campaign performance rigorously
4. Engage authentically on social media
5. Report results with actionable insights
6. Align marketing with business goals`,
    instructions: [
      "Create content that aligns with brand voice",
      "Optimize all content for SEO",
      "Track campaign performance rigorously",
      "Report results with actionable insights",
    ],
    skillSlugs: ["content-strategy", "seo-optimization", "campaign-analytics", "social-media", "project-status"],
    permissions: [
      "projects:view", "projects:view_assigned",
      "tasks:view",
      "blog:view", "blog:create", "blog:edit", "blog:publish",
      "marketing:view", "marketing:manage",
      "seo:view", "seo:manage",
      "tracking:view", "tracking:manage",
      "crm:view", "crm:leads",
      "analytics:view",
    ],
    contexts: { visitor: false, lead: false, customer: false, client: false, admin: true, staff: true, system: false },
    integrations: { crm: true, projects: false, billing: false, support: false },
    isClientFacing: true,
    isMasterAgent: false,
    guardrails: {
      blockedTopics: ["competitor pricing", "internal salaries"],
      maxConversationLength: 60,
      requireApproval: false,
      fallbackMessage: "This marketing action requires human review.",
      contentFilter: true,
    },
    capacity: 15,
    priority: 70,
  },

  // ─── SALES ───────────────────────────────────────────────────────────
  {
    name: "Sales Agent",
    slug: "sales-agent",
    description: "Sales specialist — lead qualification, quotations, invoicing, pipeline management, and client relations",
    role: "sales",
    type: "hybrid",
    division: "sales",
    divisionLabel: "Sales",
    divisionIcon: "TrendingUp",
    divisionColor: "#8b5cf6",
    tone: "professional",
    systemPrompt: `You are the Sales Agent for Wall-V.

ROLE: Sales specialist for lead management, quotations, invoicing, and client relations.

CAPABILITIES:
- Lead Qualification: qualify leads, score them, route to pipeline stages
- Quotation Creation: create professional quotations from requirements
- Invoice Management: create invoices, track payments, follow up on overdue
- Pipeline Management: track deals, forecast revenue, identify opportunities
- Client Relations: build relationships, handle objections, close deals

INSTRUCTIONS:
1. Qualify leads before entering pipeline
2. Create accurate quotations with clear terms
3. Follow up on proposals within 48 hours
4. Track all interactions in CRM
5. Forecast revenue accurately
6. Be consultative, not pushy
7. Understand client needs first`,
    instructions: [
      "Qualify leads before entering pipeline",
      "Create accurate quotations with clear terms",
      "Follow up on proposals within 48 hours",
      "Track all interactions in CRM",
    ],
    skillSlugs: ["lead-qualification", "quotation-creation", "invoice-management", "pipeline-management", "client-communication"],
    permissions: [
      "projects:view", "projects:view_assigned",
      "crm:view", "crm:leads", "crm:clients", "crm:inquiries",
      "invoices:view", "invoices:create",
      "orders:view",
      "products:view",
      "support:view",
      "analytics:view",
      "marketing:view",
    ],
    contexts: { visitor: false, lead: true, customer: false, client: true, admin: true, staff: true, system: false },
    integrations: { crm: true, projects: false, billing: true, support: true },
    isClientFacing: true,
    isMasterAgent: false,
    guardrails: {
      blockedTopics: ["competitor pricing", "internal salaries", "discount authorization"],
      maxConversationLength: 80,
      requireApproval: false,
      fallbackMessage: "I'll need to escalate this to a sales manager for approval.",
      contentFilter: true,
    },
    capacity: 20,
    priority: 75,
  },

  // ─── SUPPORT ─────────────────────────────────────────────────────────
  {
    name: "Support Agent",
    slug: "support-agent",
    description: "Customer support specialist — ticket resolution, issue escalation, knowledge retrieval, and customer satisfaction",
    role: "support",
    type: "hybrid",
    division: "support",
    divisionLabel: "Support",
    divisionIcon: "HeadphonesIcon",
    divisionColor: "#06b6d4",
    tone: "friendly",
    systemPrompt: `You are the Support Agent for Wall-V.

ROLE: Customer support specialist for ticket resolution, escalation, and knowledge retrieval.

CAPABILITIES:
- Ticket Resolution: categorize issues, prioritize, provide solutions, follow up
- Issue Escalation: assess severity, route to appropriate teams, track resolution
- Knowledge Retrieval: search documentation, find solutions, provide answers
- Customer Satisfaction: ensure issues are resolved, follow up for satisfaction

INSTRUCTIONS:
1. Respond to tickets within SLA timeframe
2. Categorize issues accurately for routing
3. Escalate urgent issues immediately
4. Follow up after resolution
5. Document solutions for knowledge base
6. Be empathetic and solution-focused`,
    instructions: [
      "Respond to tickets within SLA timeframe",
      "Categorize issues accurately for routing",
      "Escalate urgent issues immediately",
      "Document solutions for knowledge base",
    ],
    skillSlugs: ["ticket-resolution", "issue-escalation", "knowledge-retrieval", "project-status"],
    permissions: [
      "projects:view", "projects:view_assigned",
      "tasks:view",
      "crm:view", "crm:inquiries",
      "support:view", "support:manage",
      "orders:view",
      "analytics:view",
    ],
    contexts: { visitor: false, lead: false, customer: true, client: true, admin: true, staff: true, system: false },
    integrations: { crm: true, projects: false, billing: false, support: true },
    isClientFacing: true,
    isMasterAgent: false,
    guardrails: {
      blockedTopics: ["competitor pricing", "internal salaries"],
      maxConversationLength: 60,
      requireApproval: false,
      fallbackMessage: "I'll escalate this to a human support agent for resolution.",
      contentFilter: true,
    },
    capacity: 25,
    priority: 65,
  },

  // ─── CUSTOMER ────────────────────────────────────────────────────────
  {
    name: "Customer Assistance Agent",
    slug: "customer-assistance-agent",
    description: "Customer self-service assistant — project status, invoice access, support requests, and service guidance",
    role: "support",
    type: "hybrid",
    division: "customer-service",
    divisionLabel: "Customer Service",
    divisionIcon: "User",
    divisionColor: "#84cc16",
    tone: "casual",
    systemPrompt: `You are the Customer Assistance Agent for Wall-V.

ROLE: Friendly self-service assistant for customers to access their data and get help.

CAPABILITIES:
- Project Status: show project progress, milestones, timelines, deliverables
- Invoice Access: provide invoice details, payment status, download links
- Support Requests: help submit support tickets and track status
- Service Information: explain available services, pricing, processes
- Profile Management: assist with updating customer profile

CRITICAL RULES:
1. ALWAYS verify customer identity before showing any data
2. NEVER show other customers' data
3. Only access the authenticated customer's own data
4. Guide to self-service options first
5. Be patient and explain clearly
6. Escalate complex issues to human support`,
    instructions: [
      "Verify customer identity before showing data",
      "Guide to self-service options first",
      "Be patient and explain clearly",
      "Escalate complex issues to support",
      "Never share other customers' data",
    ],
    skillSlugs: ["self-service-portal", "project-status", "ticket-resolution"],
    permissions: [
      "orders:view",
      "projects:view_own",
      "tasks:view",
      "invoices:view",
      "support:view",
    ],
    contexts: { visitor: false, lead: false, customer: true, client: true, admin: false, staff: false, system: false },
    integrations: { crm: false, projects: true, billing: true, support: true },
    isClientFacing: true,
    isMasterAgent: false,
    guardrails: {
      blockedTopics: ["other customers", "internal data", "admin operations"],
      maxConversationLength: 40,
      requireApproval: false,
      fallbackMessage: "Let me connect you with a human support agent for further assistance.",
      contentFilter: true,
    },
    capacity: 50,
    priority: 50,
  },
];

// ─── SEED FUNCTION ──────────────────────────────────────────────────────

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // 1. Create/update all skills
    console.log("\n═══ SKILLS ═══");
    const skillMap = new Map<string, mongoose.Document>();

    for (const skillData of SKILLS) {
      let skill = await AgentSkill.findOne({ slug: skillData.slug });
      if (!skill) {
        skill = await AgentSkill.create(skillData);
        console.log(`  + ${skillData.name} (${skillData.slug})`);
      } else {
        // Update instructions and capabilities
        await AgentSkill.updateOne({ slug: skillData.slug }, { $set: { instructions: skillData.instructions, capabilities: skillData.capabilities, requiredPermissions: skillData.requiredPermissions } });
        console.log(`  ~ ${skillData.name} (updated)`);
      }
      skillMap.set(skillData.slug, skill);
    }

    // 2. Create/update agents
    console.log("\n═══ AGENTS ═══");
    let created = 0;
    let updated = 0;

    for (const agentDef of AGENTS) {
      const skillIds = agentDef.skillSlugs.map((slug) => skillMap.get(slug)?._id).filter(Boolean);

      const updateData = {
        name: agentDef.name,
        description: agentDef.description,
        type: agentDef.type,
        role: agentDef.role,
        status: "active",
        version: 1,
        division: agentDef.division,
        divisionLabel: agentDef.divisionLabel,
        divisionIcon: agentDef.divisionIcon,
        divisionColor: agentDef.divisionColor,
        personality: { tone: agentDef.tone, language: "en", maxResponseLength: 4096, responseStyle: "detailed" },
        systemPrompt: agentDef.systemPrompt,
        instructions: agentDef.instructions,
        aiModel: "gpt-4o",
        temperature: 0.7,
        maxTokens: 4096,
        skills: skillIds,
        memory: { memoryType: "persistent", maxItems: 100, ttl: 604800 },
        guardrails: agentDef.guardrails,
        channels: { website: true, dashboard: true, api: true, email: false, whatsapp: false, voice: false },
        contexts: agentDef.contexts,
        permissions: agentDef.permissions,
        integrations: agentDef.integrations,
        isClientFacing: agentDef.isClientFacing,
        isMasterAgent: agentDef.isMasterAgent,
      };

      const existing = await Agent.findOne({ slug: agentDef.slug });
      if (!existing) {
        // Get a createdBy user (first admin found)
        const adminUser = await mongoose.connection.db!.collection("users").findOne({ role: { $in: ["super-admin", "admin"] } });
        await Agent.create({ ...updateData, slug: agentDef.slug, createdBy: adminUser?._id || new mongoose.Types.ObjectId() });
        console.log(`  + ${agentDef.name} (${skillIds.length} skills, capacity: ${agentDef.capacity})`);
        created++;
      } else {
        await Agent.updateOne({ slug: agentDef.slug }, { $set: updateData });
        console.log(`  ~ ${agentDef.name} (upgraded)`);
        updated++;
      }
    }

    // 3. Link skills to agents
    console.log("\n═══ SKILL-AGENT LINKS ═══");
    for (const [slug, skill] of skillMap) {
      const agents = await Agent.find({ skills: skill._id }).lean();
      await AgentSkill.updateOne({ slug }, { $set: { supportedAgents: agents.map((a) => a._id) } });
    }
    console.log("  Linked all skills to agents");

    // 4. Summary
    console.log("\n═══ SUMMARY ═══");
    console.log(`  Skills: ${SKILLS.length} total`);
    console.log(`  Agents: ${created} created, ${updated} upgraded`);
    console.log(`  Super-Admin: NO AI AGENT (protected human role)`);
    console.log(`  Role → Agent mapping: 9 agents for 9 roles (super-admin excluded)`);

    await mongoose.disconnect();
  } catch (error) {
    console.error("Seed error:", error);
    process.exit(1);
  }
}

seed();
