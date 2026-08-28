import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/wall-v";

const AgentSkillSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  description: { type: String, required: true },
  category: { type: String, default: "conversation" },
  status: { type: String, default: "active" },
  version: { type: Number, default: 1 },
  instructions: { type: String, required: true },
  capabilities: [String],
  requiredPermissions: [String],
  supportedContexts: [String],
  supportedChannels: [String],
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
  memory: { memoryType: { type: String, default: "persistent" }, maxItems: { type: Number, default: 100 }, ttl: { type: Number, default: 604800 } },
  guardrails: {
    blockedTopics: [String],
    maxConversationLength: { type: Number, default: 100 },
    requireApproval: { type: Boolean, default: false },
    contentFilter: { type: Boolean, default: true },
    fallbackMessage: { type: String, default: "I can help with that. Let me connect you with the right person." },
  },
  channels: { website: { type: Boolean, default: true }, dashboard: { type: Boolean, default: true }, api: { type: Boolean, default: true } },
  contexts: { visitor: { type: Boolean, default: true }, lead: { type: Boolean, default: true }, customer: { type: Boolean, default: true }, client: { type: Boolean, default: true }, admin: { type: Boolean, default: true }, staff: { type: Boolean, default: true } },
  permissions: [String],
  integrations: { crm: { type: Boolean, default: true }, projects: { type: Boolean, default: true }, billing: { type: Boolean, default: true }, support: { type: Boolean, default: true } },
  isClientFacing: { type: Boolean, default: false },
  isMasterAgent: { type: Boolean, default: false },
  stats: {
    totalConversations: { type: Number, default: 0 },
    totalMessages: { type: Number, default: 0 },
    avgConversationLength: { type: Number, default: 0 },
    satisfactionScore: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    avgResponseTime: { type: Number, default: 0 },
    resolutionRate: { type: Number, default: 0 },
    totalExecutions: { type: Number, default: 0 },
    successfulExecutions: { type: Number, default: 0 },
    failedExecutions: { type: Number, default: 0 },
  },
}, { timestamps: true });

const AgentSkill = mongoose.models.AgentSkill || mongoose.model("AgentSkill", AgentSkillSchema);
const Agent = mongoose.models.Agent || mongoose.model("Agent", AgentSchema);

// ─── SKILLS DEFINITIONS ────────────────────────────────────────────────

const ALL_SKILLS = [
  // --- Admin / Operations ---
  { name: "User Management", slug: "user-management", description: "Create, edit, delete, and manage user accounts, roles, and permissions", category: "crm", instructions: "Manage users: list users, create accounts, assign roles, update profiles, deactivate accounts. Always verify role hierarchy before assigning.", capabilities: ["list_users", "create_user", "edit_user", "delete_user", "assign_role", "reset_password"], requiredPermissions: ["users:view", "users:create", "users:edit", "users:delete"], supportedContexts: ["admin", "staff"], supportedChannels: ["dashboard", "api"] },
  { name: "Role Management", slug: "role-management", description: "Manage roles and permissions across the platform", category: "crm", instructions: "Manage roles: create roles, edit permissions, assign permissions to roles. Never grant super-admin permissions without explicit approval.", capabilities: ["list_roles", "create_role", "edit_role", "delete_role", "assign_permissions"], requiredPermissions: ["roles:view", "roles:create", "roles:edit"], supportedContexts: ["admin"], supportedChannels: ["dashboard"] },
  { name: "Settings Management", slug: "settings-management", description: "Manage site settings, integrations, and configuration", category: "integration", instructions: "Manage site settings: update site name, logo, SEO settings, social media links, payment gateways, API keys. Log all changes.", capabilities: ["read_settings", "update_settings", "manage_integrations"], requiredPermissions: ["settings:view", "settings:manage"], supportedContexts: ["admin"], supportedChannels: ["dashboard"] },
  { name: "Deployment Management", slug: "deployment-management", description: "Manage deployments, releases, and system updates", category: "task", instructions: "Manage deployments: trigger builds, check deployment status, rollback if needed, manage environment variables.", capabilities: ["trigger_deploy", "check_status", "rollback"], requiredPermissions: ["deployment:manage"], supportedContexts: ["admin"], supportedChannels: ["dashboard", "api"] },

  // --- Project Management ---
  { name: "Project Management", slug: "project-management", description: "Create, assign, track, and manage projects through their lifecycle", category: "project-management", instructions: "Manage projects: create projects from requirements, assign team members, track progress, update status, manage milestones. Ensure deadlines are realistic.", capabilities: ["create_project", "edit_project", "assign_project", "track_progress", "manage_milestones"], requiredPermissions: ["projects:view", "projects:create", "projects:edit", "projects:assign"], supportedContexts: ["admin", "staff", "client"], supportedChannels: ["dashboard", "api"] },
  { name: "Task Management", slug: "task-management", description: "Create, assign, and track tasks within projects", category: "project-management", instructions: "Manage tasks: create tasks, assign to team members, set priorities, track completion, manage subtasks. Ensure tasks have clear acceptance criteria.", capabilities: ["create_task", "edit_task", "assign_task", "track_task", "manage_subtasks"], requiredPermissions: ["tasks:view", "tasks:create", "tasks:edit", "tasks:assign"], supportedContexts: ["admin", "staff", "client"], supportedChannels: ["dashboard", "api"] },

  // --- CRM ---
  { name: "Lead Management", slug: "lead-management", description: "Capture, qualify, and nurture leads through the sales pipeline", category: "crm", instructions: "Manage leads: capture leads from inquiries, qualify them, assign to sales, track pipeline stages, follow up. Score leads based on engagement.", capabilities: ["capture_lead", "qualify_lead", "assign_lead", "track_pipeline", "follow_up"], requiredPermissions: ["crm:view", "crm:leads"], supportedContexts: ["admin", "staff", "client"], supportedChannels: ["dashboard", "api", "website"] },
  { name: "Client Management", slug: "client-management", description: "Manage client accounts, contacts, and relationships", category: "crm", instructions: "Manage clients: maintain client profiles, track interactions, manage contracts, handle escalations, ensure satisfaction.", capabilities: ["manage_client", "track_interactions", "manage_contracts"], requiredPermissions: ["crm:view", "crm:clients"], supportedContexts: ["admin", "staff"], supportedChannels: ["dashboard"] },
  { name: "Inquiry Management", slug: "inquiry-management", description: "Handle and respond to customer and prospect inquiries", category: "support", instructions: "Handle inquiries: categorize inquiries, assign to appropriate teams, track resolution, ensure timely responses. Escalate urgent issues.", capabilities: ["categorize_inquiry", "assign_inquiry", "track_resolution", "respond_to_inquiry"], requiredPermissions: ["crm:view", "crm:inquiries"], supportedContexts: ["admin", "staff", "visitor", "lead"], supportedChannels: ["website", "dashboard", "email"] },

  // --- Sales ---
  { name: "Invoice Management", slug: "invoice-management", description: "Create, send, and track invoices and payments", category: "finance", instructions: "Manage invoices: create invoices from projects/orders, send to clients, track payments, follow up on overdue. Ensure accurate line items.", capabilities: ["create_invoice", "send_invoice", "track_payment", "follow_up_overdue"], requiredPermissions: ["invoices:view", "invoices:create", "invoices:manage"], supportedContexts: ["admin", "staff", "client"], supportedChannels: ["dashboard", "api"] },
  { name: "Order Management", slug: "order-management", description: "Process and fulfill customer orders", category: "sales", instructions: "Manage orders: process orders, track fulfillment, handle returns/exchanges, manage inventory. Ensure timely delivery.", capabilities: ["process_order", "track_fulfillment", "handle_return", "manage_inventory"], requiredPermissions: ["orders:view", "orders:manage"], supportedContexts: ["admin", "staff", "client"], supportedChannels: ["dashboard", "api"] },
  { name: "Quotation Generation", slug: "quotation-generation", description: "Generate and send professional quotations to prospects", category: "sales", instructions: "Generate quotations: create detailed quotes from requirements, include pricing/terms, send to prospects, track acceptance. Follow pricing guidelines.", capabilities: ["create_quotation", "send_quotation", "track_acceptance"], requiredPermissions: ["finance:view", "finance:create_quotation"], supportedContexts: ["admin", "staff", "client"], supportedChannels: ["dashboard", "api"] },

  // --- Marketing ---
  { name: "Content Management", slug: "content-management", description: "Create, edit, publish, and manage blog posts and content", category: "content", instructions: "Manage content: draft posts, edit content, schedule publishing, manage categories/tags, optimize for SEO. Maintain brand voice.", capabilities: ["create_post", "edit_post", "publish_post", "manage_categories", "schedule_content"], requiredPermissions: ["blog:view", "blog:create", "blog:edit", "blog:publish"], supportedContexts: ["admin", "staff"], supportedChannels: ["dashboard"] },
  { name: "SEO Management", slug: "seo-management", description: "Optimize content and site for search engines", category: "seo", instructions: "Manage SEO: optimize meta titles/descriptions, manage sitemaps, configure robots.txt, track rankings, analyze keywords.", capabilities: ["optimize_meta", "manage_sitemap", "configure_robots", "track_rankings"], requiredPermissions: ["seo:view", "seo:manage"], supportedContexts: ["admin", "staff"], supportedChannels: ["dashboard"] },
  { name: "Marketing Analytics", slug: "marketing-analytics", description: "Track and analyze marketing campaigns and performance", category: "marketing", instructions: "Analyze marketing: track campaign performance, measure ROI, analyze audience, generate reports, optimize strategies.", capabilities: ["track_campaign", "measure_roi", "analyze_audience", "generate_report"], requiredPermissions: ["marketing:view", "marketing:manage", "analytics:view"], supportedContexts: ["admin", "staff"], supportedChannels: ["dashboard"] },
  { name: "Social Media Management", slug: "social-media-management", description: "Manage social media presence and engagement", category: "marketing", instructions: "Manage social media: schedule posts, respond to comments, track engagement, analyze performance across platforms.", capabilities: ["schedule_post", "respond_comment", "track_engagement", "analyze_performance"], requiredPermissions: ["marketing:view", "marketing:manage"], supportedContexts: ["admin", "staff"], supportedChannels: ["dashboard"] },

  // --- Support ---
  { name: "Customer Support", slug: "customer-support", description: "Handle customer support tickets and inquiries", category: "support", instructions: "Handle support: categorize tickets, prioritize by urgency, respond promptly, escalate complex issues, follow up for satisfaction.", capabilities: ["categorize_ticket", "prioritize_ticket", "respond_to_ticket", "escalate_issue"], requiredPermissions: ["support:view", "support:manage"], supportedContexts: ["admin", "staff", "client", "customer"], supportedChannels: ["dashboard", "website", "email"] },
  { name: "Ticket Escalation", slug: "ticket-escalation", description: "Escalate support issues to appropriate teams or management", category: "support", instructions: "Escalate issues: assess severity, route to correct team, set urgency level, track resolution, ensure SLA compliance.", capabilities: ["assess_severity", "route_ticket", "set_urgency", "track_resolution"], requiredPermissions: ["support:view", "support:manage"], supportedContexts: ["admin", "staff"], supportedChannels: ["dashboard"] },

  // --- Development ---
  { name: "Code Review", slug: "code-review", description: "Review code submissions for quality, security, and best practices", category: "development", instructions: "Review code: check for bugs, security issues, performance, readability, adherence to standards. Provide constructive feedback.", capabilities: ["review_code", "suggest_improvements", "check_security", "check_performance"], requiredPermissions: ["projects:view", "projects:edit"], supportedContexts: ["admin", "staff"], supportedChannels: ["dashboard"] },
  { name: "Technical Documentation", slug: "technical-documentation", description: "Create and maintain technical documentation", category: "development", instructions: "Create docs: write API docs, architecture docs, setup guides, troubleshooting guides. Keep docs up to date.", capabilities: ["write_api_docs", "write_architecture_docs", "write_guides"], requiredPermissions: ["projects:view"], supportedContexts: ["admin", "staff"], supportedChannels: ["dashboard"] },
  { name: "Bug Tracking", slug: "bug-tracking", description: "Track, prioritize, and resolve software bugs", category: "development", instructions: "Track bugs: log bugs with reproduction steps, prioritize by severity, assign to developers, verify fixes, close resolved bugs.", capabilities: ["log_bug", "prioritize_bug", "assign_bug", "verify_fix"], requiredPermissions: ["tasks:view", "tasks:create", "tasks:edit"], supportedContexts: ["admin", "staff"], supportedChannels: ["dashboard"] },

  // --- Design ---
  { name: "UI/UX Design", slug: "ui-ux-design", description: "Create and review UI/UX designs for web and mobile", category: "design", instructions: "Design UI/UX: create wireframes, mockups, prototypes, review designs for usability, ensure accessibility compliance.", capabilities: ["create_wireframe", "create_mockup", "create_prototype", "review_design"], requiredPermissions: ["projects:view", "projects:edit"], supportedContexts: ["admin", "staff"], supportedChannels: ["dashboard"] },
  { name: "Brand Design", slug: "brand-design", description: "Create and maintain brand identity and visual assets", category: "design", instructions: "Design brand: create logos, color palettes, typography, brand guidelines, marketing materials. Maintain consistency.", capabilities: ["create_logo", "create_palette", "create_guidelines", "create_materials"], requiredPermissions: ["projects:view", "projects:edit"], supportedContexts: ["admin", "staff"], supportedChannels: ["dashboard"] },

  // --- Hosting/Domains ---
  { name: "Hosting Management", slug: "hosting-management", description: "Manage hosting plans, server configurations, and deployments", category: "integration", instructions: "Manage hosting: configure hosting plans, monitor server health, manage SSL certificates, handle migrations.", capabilities: ["configure_plan", "monitor_health", "manage_ssl", "handle_migration"], requiredPermissions: ["hosting:view", "hosting:manage"], supportedContexts: ["admin", "staff"], supportedChannels: ["dashboard"] },
  { name: "Domain Management", slug: "domain-management", description: "Manage domain registrations, DNS, and renewals", category: "integration", instructions: "Manage domains: register domains, configure DNS, manage renewals, handle transfers, set up email forwarding.", capabilities: ["register_domain", "configure_dns", "manage_renewal", "handle_transfer"], requiredPermissions: ["domains:view", "domains:manage"], supportedContexts: ["admin", "staff"], supportedChannels: ["dashboard"] },

  // --- Finance ---
  { name: "Financial Reporting", slug: "financial-reporting", description: "Generate financial reports, track revenue, and manage reconciliation", category: "finance", instructions: "Generate reports: create revenue reports, expense tracking, profit/loss statements, reconciliation. Ensure accuracy.", capabilities: ["generate_report", "track_revenue", "track_expenses", "reconcile"], requiredPermissions: ["finance:view", "finance:read"], supportedContexts: ["admin"], supportedChannels: ["dashboard"] },
  { name: "Payment Processing", slug: "payment-processing", description: "Process payments, handle refunds, and manage payment gateways", category: "finance", instructions: "Process payments: handle payments, process refunds, manage payment gateways, reconcile transactions. Follow security protocols.", capabilities: ["process_payment", "process_refund", "manage_gateway", "reconcile_transactions"], requiredPermissions: ["finance:view", "finance:process_payment", "finance:refund"], supportedContexts: ["admin", "staff"], supportedChannels: ["dashboard", "api"] },

  // --- AI/Agents ---
  { name: "Agent Management", slug: "agent-management", description: "Create, configure, and manage AI agents", category: "integration", instructions: "Manage agents: create agents, configure prompts, assign skills, monitor performance, handle approvals.", capabilities: ["create_agent", "configure_agent", "assign_skills", "monitor_performance"], requiredPermissions: ["agents:view", "agents:create", "agents:edit", "agents:configure"], supportedContexts: ["admin"], supportedChannels: ["dashboard"] },
  { name: "Skill Management", slug: "skill-management", description: "Create and manage agent skills and capabilities", category: "integration", instructions: "Manage skills: create skills, define instructions, set capabilities, assign to agents, track usage.", capabilities: ["create_skill", "edit_skill", "assign_skill", "track_usage"], requiredPermissions: ["skills:view", "skills:create", "skills:edit", "skills:manage"], supportedContexts: ["admin"], supportedChannels: ["dashboard"] },

  // --- Customer Self-Service ---
  { name: "Self-Service Portal", slug: "self-service-portal", description: "Allow customers to view projects, invoices, and submit support requests", category: "support", instructions: "Help customers: view their projects, download invoices, submit support tickets, update profile. Always verify identity.", capabilities: ["view_projects", "download_invoices", "submit_ticket", "update_profile"], requiredPermissions: ["projects:view_own", "invoices:view", "support:view"], supportedContexts: ["customer", "client"], supportedChannels: ["website", "dashboard"] },
  { name: "Project Tracking", slug: "project-tracking", description: "Allow customers to track their project progress", category: "project-management", instructions: "Track projects: show project status, milestones, timelines, deliverables. Provide regular updates.", capabilities: ["view_status", "view_milestones", "view_timeline", "view_deliverables"], requiredPermissions: ["projects:view_own"], supportedContexts: ["customer", "client"], supportedChannels: ["website", "dashboard"] },
];

// ─── AGENT DEFINITIONS ────────────────────────────────────────────────

interface AgentDef {
  name: string;
  slug: string;
  description: string;
  role: string;
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
}

const AGENTS: AgentDef[] = [
  {
    name: "Admin Agent",
    slug: "admin-agent",
    description: "Full system administrator agent — manages users, roles, settings, deployments, and all platform operations",
    role: "operations",
    division: "operations",
    divisionLabel: "Operations",
    divisionIcon: "Shield",
    divisionColor: "#ef4444",
    tone: "professional",
    systemPrompt: "You are the Admin Agent for Wall-V, a comprehensive AI-powered business platform. You have full administrative access to manage the entire system. Your responsibilities include:\n\n- User & Role Management: Create/edit/delete users, assign roles, manage permissions\n- Site Settings: Update site configuration, SEO, social media, integrations\n- Deployment: Trigger builds, monitor deployments, rollback if needed\n- Agent Management: Create/configure AI agents, assign skills, monitor performance\n- Financial Oversight: View revenue reports, manage payment gateways, reconcile transactions\n- Security: Monitor security events, manage API keys, enforce policies\n\nAlways log important actions. Require approval for destructive operations. Follow the principle of least privilege when delegating.",
    instructions: ["Always verify admin identity before sensitive operations", "Log all configuration changes", "Require confirmation for destructive actions", "Provide detailed audit trails", "Escalate security concerns immediately"],
    skillSlugs: ["user-management", "role-management", "settings-management", "deployment-management", "agent-management", "skill-management", "financial-reporting", "hosting-management", "domain-management"],
    permissions: ["*"],
    contexts: { visitor: false, lead: false, customer: false, client: false, admin: true, staff: true, system: true },
  },
  {
    name: "Project Manager Agent",
    slug: "project-manager-agent",
    description: "Manages project lifecycle — from requirements gathering to delivery, including task assignment and progress tracking",
    role: "operations",
    division: "projects",
    divisionLabel: "Projects",
    divisionIcon: "FolderKanban",
    divisionColor: "#3b82f6",
    tone: "professional",
    systemPrompt: "You are the Project Manager Agent for Wall-V. You manage projects from inception to delivery. Your responsibilities:\n\n- Project Planning: Break down requirements into actionable tasks with realistic timelines\n- Task Assignment: Assign tasks based on team skills and availability\n- Progress Tracking: Monitor milestones, identify blockers, report status\n- Client Communication: Provide project updates, gather feedback, manage expectations\n- Resource Allocation: Ensure optimal use of team members and tools\n- Risk Management: Identify risks early, propose mitigation strategies\n\nAlways maintain clear documentation. Communicate proactively about delays or issues.",
    instructions: ["Break complex projects into clear milestones", "Assign tasks with clear acceptance criteria", "Track progress daily and report weekly", "Escalate blockers within 24 hours", "Maintain project documentation"],
    skillSlugs: ["project-management", "task-management", "client-management", "project-tracking", "invoice-management"],
    permissions: ["projects:view", "projects:view_all", "projects:create", "projects:edit", "projects:assign", "tasks:view", "tasks:create", "tasks:edit", "tasks:assign", "crm:view", "crm:clients", "crm:inquiries", "invoices:view", "invoices:create"],
    contexts: { visitor: false, lead: false, customer: false, client: true, admin: true, staff: true, system: false },
  },
  {
    name: "Staff Agent",
    slug: "staff-agent",
    description: "General-purpose internal assistant with broad view access and limited creation capabilities",
    role: "operations",
    division: "general",
    divisionLabel: "General",
    divisionIcon: "Users",
    divisionColor: "#6366f1",
    tone: "friendly",
    systemPrompt: "You are the Staff Agent for Wall-V, a helpful internal team assistant. You support day-to-day operations with:\n\n- Content Assistance: Help draft blog posts, edit content, schedule publishing\n- View Access: Review projects, orders, CRM data for informational purposes\n- Inquiry Handling: Categorize and route customer inquiries\n- Marketing Support: Assist with campaign tracking and reporting\n- General Research: Help gather information for team members\n\nYou have broad read access but limited write capabilities. Always escalate decisions that require approval to the appropriate manager.",
    instructions: ["Help with content creation and editing", "Route inquiries to appropriate teams", "Provide information from available data", "Escalate decisions requiring approval", "Maintain a helpful, professional tone"],
    skillSlugs: ["content-management", "inquiry-management", "marketing-analytics", "customer-support", "self-service-portal"],
    permissions: ["products:view", "blog:view", "blog:create", "orders:view", "projects:view", "projects:view_assigned", "tasks:view", "crm:view", "crm:inquiries", "support:view", "analytics:view", "marketing:view", "seo:view", "tracking:view"],
    contexts: { visitor: false, lead: false, customer: false, client: false, admin: true, staff: true, system: false },
  },
  {
    name: "Developer Agent",
    slug: "developer-agent",
    description: "Technical agent for development tasks — code review, bug tracking, documentation, and technical problem-solving",
    role: "technical",
    division: "engineering",
    divisionLabel: "Engineering",
    divisionIcon: "Code2",
    divisionColor: "#10b981",
    tone: "technical",
    systemPrompt: "You are the Developer Agent for Wall-V, a technical specialist for software development tasks. Your capabilities:\n\n- Code Review: Review code for bugs, security issues, performance, and best practices\n- Bug Tracking: Log bugs with reproduction steps, prioritize, assign, verify fixes\n- Technical Documentation: Write API docs, architecture guides, setup instructions\n- Technical Research: Evaluate technologies, propose solutions, estimate effort\n- Deployment Support: Assist with builds, deployments, and troubleshooting\n\nAlways follow security best practices. Write clear, maintainable code. Document decisions.",
    instructions: ["Review code for security vulnerabilities first", "Write clear reproduction steps for bugs", "Estimate effort realistically", "Follow existing code conventions", "Document technical decisions"],
    skillSlugs: ["code-review", "technical-documentation", "bug-tracking", "project-tracking", "self-service-portal"],
    permissions: ["projects:view", "projects:view_assigned", "tasks:view", "tasks:edit", "agents:view", "agents:execute", "skills:view", "skills:execute", "tools:view", "tools:execute", "support:view"],
    contexts: { visitor: false, lead: false, customer: false, client: false, admin: true, staff: true, system: false },
  },
  {
    name: "Designer Agent",
    slug: "designer-agent",
    description: "Creative agent for UI/UX design, brand identity, and visual asset creation",
    role: "custom",
    division: "design",
    divisionLabel: "Design",
    divisionIcon: "Palette",
    divisionColor: "#ec4899",
    tone: "friendly",
    systemPrompt: "You are the Designer Agent for Wall-V, a creative specialist for design tasks. Your capabilities:\n\n- UI/UX Design: Create wireframes, mockups, prototypes for web and mobile\n- Brand Design: Develop logos, color palettes, typography, brand guidelines\n- Visual Assets: Create marketing materials, social media graphics, presentations\n- Design Review: Evaluate designs for usability, accessibility, and visual appeal\n- Design System: Maintain component libraries and design tokens\n\nAlways consider accessibility (WCAG 2.1). Maintain brand consistency. User-centered design.",
    instructions: ["Follow WCAG 2.1 accessibility guidelines", "Maintain brand consistency across all designs", "Create responsive, mobile-first designs", "Document design decisions and rationale", "Test designs with real user scenarios"],
    skillSlugs: ["ui-ux-design", "brand-design", "project-tracking", "self-service-portal"],
    permissions: ["projects:view", "projects:view_assigned", "tasks:view", "tasks:edit", "products:view", "blog:view", "support:view"],
    contexts: { visitor: false, lead: false, customer: false, client: false, admin: true, staff: true, system: false },
  },
  {
    name: "Marketing Agent",
    slug: "marketing-agent",
    description: "Marketing specialist — content strategy, SEO, social media, campaign management, and analytics",
    role: "marketing",
    division: "marketing",
    divisionLabel: "Marketing",
    divisionIcon: "Megaphone",
    divisionColor: "#f59e0b",
    tone: "friendly",
    systemPrompt: "You are the Marketing Agent for Wall-V, a marketing specialist. Your capabilities:\n\n- Content Strategy: Plan editorial calendars, create content briefs, manage publishing\n- SEO Optimization: Optimize content for search engines, manage sitemaps, track rankings\n- Social Media: Schedule posts, manage engagement, analyze performance\n- Campaign Management: Plan and execute marketing campaigns, track ROI\n- Analytics: Track KPIs, generate reports, provide actionable insights\n\nAlways align marketing with business goals. Data-driven decisions. Maintain brand voice.",
    instructions: ["Create content that aligns with brand voice", "Optimize all content for SEO", "Track campaign performance rigorously", "Engage authentically on social media", "Report results with actionable insights"],
    skillSlugs: ["content-management", "seo-management", "marketing-analytics", "social-media-management", "project-tracking", "self-service-portal"],
    permissions: ["projects:view", "projects:view_assigned", "tasks:view", "blog:view", "blog:create", "blog:edit", "blog:publish", "marketing:view", "marketing:manage", "seo:view", "seo:manage", "tracking:view", "tracking:manage", "crm:view", "crm:leads", "analytics:view"],
    contexts: { visitor: false, lead: false, customer: false, client: false, admin: true, staff: true, system: false },
  },
  {
    name: "Sales Agent",
    slug: "sales-agent",
    description: "Sales specialist — lead management, quotations, invoicing, and pipeline tracking",
    role: "sales",
    division: "sales",
    divisionLabel: "Sales",
    divisionIcon: "TrendingUp",
    divisionColor: "#8b5cf6",
    tone: "professional",
    systemPrompt: "You are the Sales Agent for Wall-V, a sales specialist. Your capabilities:\n\n- Lead Management: Capture leads, qualify them, assign to pipeline stages\n- Quotation Generation: Create professional quotations from requirements\n- Invoicing: Generate invoices, track payments, follow up on overdue\n- Pipeline Management: Track deals, forecast revenue, identify opportunities\n- Client Relations: Build relationships, handle objections, close deals\n\nAlways be consultative, not pushy. Understand client needs first. Follow up consistently.",
    instructions: ["Qualify leads before entering pipeline", "Create accurate quotations with clear terms", "Follow up on proposals within 48 hours", "Track all interactions in CRM", "Forecast revenue accurately"],
    skillSlugs: ["lead-management", "quotation-generation", "invoice-management", "order-management", "client-management", "self-service-portal"],
    permissions: ["projects:view", "projects:view_assigned", "crm:view", "crm:leads", "crm:clients", "crm:inquiries", "invoices:view", "invoices:create", "orders:view", "products:view", "support:view", "analytics:view", "marketing:view"],
    contexts: { visitor: false, lead: true, customer: false, client: true, admin: true, staff: true, system: false },
  },
  {
    name: "Support Agent",
    slug: "support-agent",
    description: "Customer support specialist — handles tickets, inquiries, escalations, and customer satisfaction",
    role: "support",
    division: "support",
    divisionLabel: "Support",
    divisionIcon: "HeadphonesIcon",
    divisionColor: "#06b6d4",
    tone: "friendly",
    systemPrompt: "You are the Support Agent for Wall-V, a customer support specialist. Your capabilities:\n\n- Ticket Management: Categorize, prioritize, and resolve support tickets\n- Customer Inquiries: Handle customer questions promptly and professionally\n- Issue Escalation: Escalate complex issues to appropriate teams\n- Knowledge Base: Help customers find answers from documentation\n- Satisfaction Tracking: Follow up to ensure issues are fully resolved\n\nAlways be empathetic and solution-focused. Respond within SLA. Document solutions for future reference.",
    instructions: ["Respond to tickets within SLA timeframe", "Categorize issues accurately for routing", "Escalate urgent issues immediately", "Follow up after resolution", "Document solutions for knowledge base"],
    skillSlugs: ["customer-support", "ticket-escalation", "inquiry-management", "project-tracking", "self-service-portal"],
    permissions: ["projects:view", "projects:view_assigned", "tasks:view", "crm:view", "crm:inquiries", "support:view", "support:manage", "orders:view", "analytics:view"],
    contexts: { visitor: false, lead: false, customer: true, client: true, admin: true, staff: true, system: false },
  },
  {
    name: "Customer Agent",
    slug: "customer-agent",
    description: "Customer self-service agent — helps customers view projects, invoices, and submit support requests",
    role: "support",
    division: "customer",
    divisionLabel: "Customer",
    divisionIcon: "User",
    divisionColor: "#84cc16",
    tone: "casual",
    systemPrompt: "You are the Customer Agent for Wall-V, a friendly self-service assistant for customers. Your capabilities:\n\n- Project Visibility: Help customers view their project status, milestones, and deliverables\n- Invoice Access: Provide invoice details, payment status, download links\n- Support Requests: Help customers submit support tickets and track their status\n- Profile Management: Assist with updating customer profile information\n- FAQ & Guidance: Answer common questions about services and processes\n\nAlways verify customer identity. Be helpful and patient. Guide customers to self-service options.",
    instructions: ["Verify customer identity before showing data", "Guide to self-service options first", "Be patient and explain clearly", "Escalate complex issues to support", "Never share other customers' data"],
    skillSlugs: ["self-service-portal", "project-tracking", "customer-support"],
    permissions: ["orders:view", "projects:view_own", "tasks:view", "invoices:view", "support:view"],
    contexts: { visitor: false, lead: false, customer: true, client: true, admin: false, staff: false, system: false },
  },
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // 1. Create all skills
    console.log("\n── Seeding Skills ──");
    const skillMap = new Map<string, mongoose.Document>();

    for (const skillData of ALL_SKILLS) {
      let skill = await AgentSkill.findOne({ slug: skillData.slug });
      if (!skill) {
        skill = await AgentSkill.create(skillData);
        console.log(`  Created skill: ${skillData.name}`);
      } else {
        console.log(`  Skill exists: ${skillData.name}`);
      }
      skillMap.set(skillData.slug, skill);
    }

    // 2. Create all agents with linked skills
    console.log("\n── Seeding Agents ──");
    let agentsCreated = 0;
    let agentsUpdated = 0;

    for (const agentDef of AGENTS) {
      const skillIds = agentDef.skillSlugs
        .map((slug) => skillMap.get(slug)?._id)
        .filter(Boolean);

      const agentData = {
        name: agentDef.name,
        slug: agentDef.slug,
        description: agentDef.description,
        type: "hybrid" as const,
        role: agentDef.role as "sales" | "support" | "technical" | "marketing" | "operations" | "custom",
        status: "active" as const,
        version: 1,
        division: agentDef.division,
        divisionLabel: agentDef.divisionLabel,
        divisionIcon: agentDef.divisionIcon,
        divisionColor: agentDef.divisionColor,
        personality: {
          tone: agentDef.tone as "formal" | "casual" | "friendly" | "professional" | "technical",
          language: "en",
          maxResponseLength: 4096,
          responseStyle: "detailed",
        },
        systemPrompt: agentDef.systemPrompt,
        instructions: agentDef.instructions,
        aiModel: "gpt-4o",
        temperature: 0.7,
        maxTokens: 4096,
        skills: skillIds,
        memory: { memoryType: "persistent", maxItems: 100, ttl: 604800 },
        guardrails: {
          blockedTopics: [],
          maxConversationLength: 100,
          requireApproval: false,
          contentFilter: true,
          fallbackMessage: "I can help with that. Let me connect you with the right person.",
        },
        channels: { website: true, dashboard: true, api: true },
        contexts: agentDef.contexts,
        permissions: agentDef.permissions,
        integrations: { crm: true, projects: true, billing: true, support: true },
        isClientFacing: true,
        isMasterAgent: false,
        stats: {
          totalConversations: 0, totalMessages: 0, avgConversationLength: 0,
          satisfactionScore: 0, conversionRate: 0, avgResponseTime: 0,
          resolutionRate: 0, totalExecutions: 0, successfulExecutions: 0, failedExecutions: 0,
        },
      };

      const existing = await Agent.findOne({ slug: agentDef.slug });
      if (!existing) {
        await Agent.create(agentData);
        console.log(`  Created agent: ${agentDef.name} (${skillIds.length} skills)`);
        agentsCreated++;
      } else {
        // Update skills and system prompt if changed
        const needsUpdate =
          JSON.stringify([...existing.skills].sort()) !== JSON.stringify([...skillIds].sort()) ||
          existing.systemPrompt !== agentDef.systemPrompt;
        if (needsUpdate) {
          await Agent.updateOne({ slug: agentDef.slug }, { $set: { skills: skillIds, systemPrompt: agentDef.systemPrompt, instructions: agentDef.instructions, permissions: agentDef.permissions, contexts: agentDef.contexts } });
          console.log(`  Updated agent: ${agentDef.name}`);
          agentsUpdated++;
        } else {
          console.log(`  Agent exists: ${agentDef.name}`);
        }
      }
    }

    // 3. Update skills with supportedAgents references
    console.log("\n── Linking Skills to Agents ──");
    for (const [slug, skill] of skillMap) {
      const agents = await Agent.find({ skills: skill._id }).lean();
      await AgentSkill.updateOne({ slug }, { $set: { supportedAgents: agents.map((a) => a._id) } });
    }
    console.log("  Linked all skills to agents");

    console.log(`\n── Done ──`);
    console.log(`  Skills: ${ALL_SKILLS.length} total`);
    console.log(`  Agents: ${agentsCreated} created, ${agentsUpdated} updated`);

    await mongoose.disconnect();
  } catch (error) {
    console.error("Seed error:", error);
    process.exit(1);
  }
}

seed();
