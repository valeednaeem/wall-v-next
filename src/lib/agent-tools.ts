// Tool definition for OpenAI function calling
export interface AgentToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

// Tool implementations
export const AGENT_TOOL_DEFINITIONS: AgentToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "get_projects",
      description: "Get a list of projects. Can filter by status, client email, or project type. Use this to answer questions about project status, progress, or details.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filter by status: new, planning, in-progress, review, testing, completed, on-hold, cancelled" },
          clientEmail: { type: "string", description: "Filter by client email address" },
          projectType: { type: "string", description: "Filter by type: web-development, mobile-app, e-commerce, ai-solution, seo, graphic-design, logo-design, social-media, video, consultancy, hosting, other" },
          limit: { type: "number", description: "Max results to return (default 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_project",
      description: "Get detailed information about a specific project by its name or ID. Returns full project details including financials, stages, and progress.",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string", description: "The project ID" },
          projectName: { type: "string", description: "The project name (partial match)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_clients",
      description: "Get a list of clients. Can search by name, email, or company. Use this to look up client information.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Search by name, email, or company" },
          status: { type: "string", description: "Filter by status: active, inactive, prospect, archived" },
          limit: { type: "number", description: "Max results (default 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_client",
      description: "Get detailed information about a specific client including their projects and spending.",
      parameters: {
        type: "object",
        properties: {
          clientId: { type: "string", description: "The client ID" },
          email: { type: "string", description: "The client email" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_leads",
      description: "Get a list of leads (potential clients). Can filter by status or source.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filter by status: new, contacted, qualified, proposal, negotiation, won, lost" },
          search: { type: "string", description: "Search by name, email, or company" },
          limit: { type: "number", description: "Max results (default 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_invoices",
      description: "Get invoices for a project or client. Use this to check payment status, outstanding amounts, or invoice history.",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string", description: "Filter by project ID" },
          status: { type: "string", description: "Filter by status: draft, sent, paid, partially-paid, overdue, cancelled" },
          limit: { type: "number", description: "Max results (default 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_quotes",
      description: "Get quotations/quotes. Use this to check pricing, quote status, or quote history.",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string", description: "Filter by project ID" },
          status: { type: "string", description: "Filter by status: draft, sent, accepted, rejected, expired" },
          limit: { type: "number", description: "Max results (default 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_company_info",
      description: "Get Wall-V company information including services offered and pricing ranges. Use this when asked about services, pricing, or what the company does.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_project_requests",
      description: "Get AI-generated project requests from agent conversations. Use this to check pending project requests or their status.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filter by status: collecting, requirements-gathered, quoted, approved, project-created, rejected" },
          limit: { type: "number", description: "Max results (default 10)" },
        },
      },
    },
  },
  // WRITE TOOLS
  {
    type: "function",
    function: {
      name: "create_inquiry",
      description: "Create a new inquiry from a potential client. Use this when a visitor or lead expresses interest in services.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Contact name" },
          email: { type: "string", description: "Contact email" },
          phone: { type: "string", description: "Contact phone" },
          company: { type: "string", description: "Company name" },
          subject: { type: "string", description: "Inquiry subject" },
          message: { type: "string", description: "Inquiry message" },
          type: { type: "string", description: "Inquiry type: contact, support, sales, partnership" },
          estimatedBudget: { type: "number", description: "Budget estimate in USD" },
          estimatedTimeline: { type: "string", description: "Timeline estimate" },
        },
        required: ["name", "email", "subject", "message"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_lead",
      description: "Create a new sales lead from a potential client interaction.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Lead name" },
          email: { type: "string", description: "Lead email" },
          source: { type: "string", description: "Lead source: website, referral, chat, email, phone" },
          budget: { type: "number", description: "Budget estimate" },
          serviceInterest: { type: "array", items: { type: "string" }, description: "Services of interest" },
          notes: { type: "string", description: "Additional notes" },
        },
        required: ["name", "email", "source"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_project",
      description: "Update an existing project's details. Use this to modify project status, progress, or other fields.",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string", description: "The project ID" },
          status: { type: "string", description: "New status" },
          progress: { type: "number", description: "Progress percentage (0-100)" },
          priority: { type: "string", description: "New priority: low, medium, high, urgent" },
          description: { type: "string", description: "Updated description" },
        },
        required: ["projectId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_notification",
      description: "Create a notification for a user or admin. Use this to alert staff about important events.",
      parameters: {
        type: "object",
        properties: {
          userId: { type: "string", description: "Target user ID (optional, defaults to admins)" },
          title: { type: "string", description: "Notification title" },
          message: { type: "string", description: "Notification message" },
          type: { type: "string", description: "Notification type: info, success, warning, error" },
          link: { type: "string", description: "Link to related page" },
        },
        required: ["title", "message"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_skill",
      description: "Execute a specific skill by its slug. Use this to invoke a reusable capability like generating an SEO audit or preparing a proposal.",
      parameters: {
        type: "object",
        properties: {
          skillSlug: { type: "string", description: "The skill slug to execute" },
          input: { type: "object", description: "Input parameters for the skill" },
          context: { type: "object", description: "Execution context (projectId, clientId, etc.)" },
        },
        required: ["skillSlug"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delegate_to_agent",
      description: "Delegate a task to another specialized agent. Use this when the master agent needs to invoke a specialized agent for domain-specific work.",
      parameters: {
        type: "object",
        properties: {
          agentId: { type: "string", description: "The target agent ID or slug" },
          message: { type: "string", description: "The message/task to delegate" },
          context: { type: "object", description: "Context to pass (projectId, clientId, etc.)" },
        },
        required: ["agentId", "message"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_invoice",
      description: "Get detailed invoice information including payment status, amount due, and line items. Use when a client asks about a specific invoice.",
      parameters: {
        type: "object",
        properties: {
          invoiceId: { type: "string", description: "Invoice ID or invoice number (e.g., INV-20250101-ABC123)" },
        },
        required: ["invoiceId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_customer_balance",
      description: "Get the outstanding balance and payment history for a customer. Use when a client asks about their balance, outstanding amount, or payment history.",
      parameters: {
        type: "object",
        properties: {
          customerEmail: { type: "string", description: "Customer email address" },
        },
        required: ["customerEmail"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_project_balance",
      description: "Get the payment status and balance for a specific project including deposits, milestones, and total paid/owed.",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string", description: "Project ID or slug" },
        },
        required: ["projectId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_payment_request",
      description: "Create a payment request/invoice for a project or service. This prepares an invoice that can be sent to the client. Requires permission for financial operations.",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string", description: "Project ID to invoice" },
          amount: { type: "number", description: "Amount to invoice" },
          description: { type: "string", description: "Description of the charge" },
          type: { type: "string", description: "Type: deposit, milestone, final, standard" },
        },
        required: ["amount", "description"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_transaction",
      description: "Get payment transaction details including status, gateway reference, and associated invoice/project.",
      parameters: {
        type: "object",
        properties: {
          paymentId: { type: "string", description: "Payment ID or payment number" },
        },
        required: ["paymentId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_payment_status",
      description: "Check the payment status of an invoice or order. Returns whether payment was confirmed by the gateway.",
      parameters: {
        type: "object",
        properties: {
          invoiceId: { type: "string", description: "Invoice ID" },
          orderId: { type: "string", description: "Order ID" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "prepare_refund_request",
      description: "Prepare a refund request for a payment. This creates a pending refund that requires admin approval before processing.",
      parameters: {
        type: "object",
        properties: {
          paymentId: { type: "string", description: "Payment ID to refund" },
          amount: { type: "number", description: "Refund amount" },
          reason: { type: "string", description: "Reason for refund" },
        },
        required: ["paymentId", "amount", "reason"],
      },
    },
  },
];

const COMPANY_INFO = `
Wall-V is a leading digital agency offering:
- Web Development: $2,000 - $25,000 (business websites, custom web apps)
- E-commerce: $3,000 - $10,000 (online stores, payment integration)
- Mobile Apps: $5,000 - $20,000 (iOS, Android, cross-platform)
- AI Solutions: $2,000 - $50,000 (chatbots, automation, custom AI)
- SEO: $500 - $3,000/month (search engine optimization)
- Digital Marketing: $500 - $3,000/month (social media, ads, content)
- Graphic Design: $500 - $5,000 (branding, UI/UX)
- Hosting: $6.99 - $16.99/month (WordPress, Cloud, Business)
- ERP/CRM: Custom pricing (enterprise solutions)

Contact: admin@wall-v.com | Website: wall-v.com
`;

async function executeGetProjects(args: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Project = (await import("@/models/project")).default as any;
  const query: Record<string, unknown> = {};
  if (args.status) query.status = args.status;
  if (args.projectType) query.projectType = args.projectType;
  if (args.clientEmail) query["client.email"] = args.clientEmail;
  const limit = (args.limit as number) || 10;

  const projects = await Project.find(query)
    .select("name status lifecycleStatus projectType progress budget currency paymentStatus financial client deadline createdAt")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return projects.map((p: Record<string, unknown>) => ({
    id: p._id,
    name: p.name,
    status: p.status,
    lifecycleStatus: p.lifecycleStatus,
    type: p.projectType,
    progress: p.progress,
    budget: p.budget,
    currency: p.currency,
    paymentStatus: p.paymentStatus,
    financial: p.financial,
    deadline: p.deadline,
  }));
}

async function executeGetProject(args: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Project = (await import("@/models/project")).default as any;
  let project;
  if (args.projectId) {
    project = await Project.findById(args.projectId).lean();
  } else if (args.projectName) {
    project = await Project.findOne({ name: { $regex: args.projectName, $options: "i" } }).lean();
  }
  if (!project) return { error: "Project not found" };
  return {
    id: project._id,
    name: project.name,
    status: project.status,
    lifecycleStatus: project.lifecycleStatus,
    type: project.projectType,
    progress: project.progress,
    budget: project.budget,
    currency: project.currency,
    paymentStatus: project.paymentStatus,
    financial: project.financial,
    deadline: project.deadline,
    priority: project.priority,
    startDate: project.startDate,
    endDate: project.endDate,
    tags: project.tags,
  };
}

async function executeGetClients(args: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Client = (await import("@/models/client")).default as any;
  const query: Record<string, unknown> = {};
  if (args.status) query.status = args.status;
  if (args.search) {
    const s = args.search as string;
    query.$or = [
      { name: { $regex: s, $options: "i" } },
      { email: { $regex: s, $options: "i" } },
      { company: { $regex: s, $options: "i" } },
    ];
  }
  const limit = (args.limit as number) || 10;
  const clients = await Client.find(query)
    .select("name email phone company type status totalProjects totalSpent createdAt")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return clients.map((c: Record<string, unknown>) => ({
    id: c._id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    company: c.company,
    type: c.type,
    status: c.status,
    totalProjects: c.totalProjects,
    totalSpent: c.totalSpent,
  }));
}

async function executeGetClient(args: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Client = (await import("@/models/client")).default as any;
  let client;
  if (args.clientId) {
    client = await Client.findById(args.clientId).lean();
  } else if (args.email) {
    client = await Client.findOne({ email: { $regex: args.email, $options: "i" } }).lean();
  }
  if (!client) return { error: "Client not found" };
  return {
    id: client._id,
    name: client.name,
    email: client.email,
    phone: client.phone,
    company: client.company,
    type: client.type,
    status: client.status,
    totalProjects: client.totalProjects,
    totalSpent: client.totalSpent,
    source: client.source,
    tags: client.tags,
  };
}

async function executeGetLeads(args: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Lead = (await import("@/models/lead")).default as any;
  const query: Record<string, unknown> = {};
  if (args.status) query.status = args.status;
  if (args.search) {
    const s = args.search as string;
    query.$or = [
      { name: { $regex: s, $options: "i" } },
      { email: { $regex: s, $options: "i" } },
      { company: { $regex: s, $options: "i" } },
    ];
  }
  const limit = (args.limit as number) || 10;
  const leads = await Lead.find(query)
    .select("name email phone company source status score budget serviceInterest createdAt")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return leads.map((l: Record<string, unknown>) => ({
    id: l._id,
    name: l.name,
    email: l.email,
    phone: l.phone,
    company: l.company,
    source: l.source,
    status: l.status,
    score: l.score,
    budget: l.budget,
    serviceInterest: l.serviceInterest,
  }));
}

async function executeGetInvoices(args: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Invoice = (await import("@/models/invoice")).default as any;
  const query: Record<string, unknown> = {};
  if (args.projectId) query.project = args.projectId;
  if (args.status) query.status = args.status;
  const limit = (args.limit as number) || 10;
  const invoices = await Invoice.find(query)
    .select("invoiceNumber status type total amountPaid amountDue currency dueDate createdAt")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return invoices.map((i: Record<string, unknown>) => ({
    id: i._id,
    invoiceNumber: i.invoiceNumber,
    status: i.status,
    type: i.type,
    total: i.total,
    amountPaid: i.amountPaid,
    amountDue: i.amountDue,
    currency: i.currency,
    dueDate: i.dueDate,
  }));
}

async function executeGetQuotes(args: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Quote = (await import("@/models/quote")).default as any;
  const query: Record<string, unknown> = {};
  if (args.projectId) query.project = args.projectId;
  if (args.status) query.status = args.status;
  const limit = (args.limit as number) || 10;
  const quotes = await Quote.find(query)
    .select("reference status total currency validUntil createdAt")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return quotes.map((q: Record<string, unknown>) => ({
    id: q._id,
    reference: q.reference,
    status: q.status,
    total: q.total,
    currency: q.currency,
    validUntil: q.validUntil,
  }));
}

async function executeGetProjectRequests(args: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ProjectRequest = (await import("@/models/project-request")).default as any;
  const query: Record<string, unknown> = {};
  if (args.status) query.status = args.status;
  const limit = (args.limit as number) || 10;
  const requests = await ProjectRequest.find(query)
    .select("client requirements status approvalStatus createdAt")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return requests.map((r: Record<string, unknown>) => {
    const requirements = r.requirements as Record<string, unknown> | undefined;
    return {
      id: r._id,
      client: r.client,
      projectType: requirements?.projectType,
      objective: requirements?.objective,
      budget: requirements?.budget,
      status: r.status,
      approvalStatus: r.approvalStatus,
    };
  });
}

// WRITE TOOL IMPLEMENTATIONS

async function executeCreateInquiry(args: Record<string, unknown>) {
  const Inquiry = (await import("@/models/inquiry")).default as any;
  const inquiry = await Inquiry.create({
    name: args.name,
    email: args.email,
    phone: args.phone || undefined,
    company: args.company || undefined,
    subject: args.subject,
    message: args.message,
    type: args.type || "sales",
    status: "new",
    priority: "medium",
    source: "ai-agent",
    estimatedBudget: args.estimatedBudget || undefined,
    estimatedTimeline: args.estimatedTimeline || undefined,
  });
  return { id: inquiry._id, status: inquiry.status, message: "Inquiry created successfully" };
}

async function executeCreateLead(args: Record<string, unknown>) {
  const Lead = (await import("@/models/lead")).default as any;
  const lead = await Lead.create({
    name: args.name,
    email: args.email,
    source: args.source,
    status: "new",
    budget: args.budget || undefined,
    serviceInterest: args.serviceInterest || [],
    notes: args.notes || undefined,
  });
  return { id: lead._id, status: lead.status, message: "Lead created successfully" };
}

async function executeUpdateProject(args: Record<string, unknown>) {
  const Project = (await import("@/models/project")).default as any;
  const update: Record<string, unknown> = {};
  if (args.status) update.status = args.status;
  if (args.progress !== undefined) update.progress = args.progress;
  if (args.priority) update.priority = args.priority;
  if (args.description) update.description = args.description;
  const project = await Project.findByIdAndUpdate(args.projectId, update, { new: true }).lean();
  if (!project) return { error: "Project not found" };
  return { id: project._id, name: project.name, status: project.status, message: "Project updated" };
}

async function executeCreateNotification(args: Record<string, unknown>) {
  // Store notification in a simple format — actual notification delivery handled by caller
  return {
    notification: {
      userId: args.userId || "admins",
      title: args.title,
      message: args.message,
      type: args.type || "info",
      link: args.link || undefined,
      createdAt: new Date().toISOString(),
    },
    message: "Notification prepared",
  };
}

async function executeSkill(args: Record<string, unknown>) {
  const AgentSkill = (await import("@/models/agent-skill")).default as any;
  const skill = await AgentSkill.findOne({ slug: args.skillSlug, status: "active" }).lean();
  if (!skill) return { error: `Skill '${args.skillSlug}' not found or inactive` };
  // Track usage
  await AgentSkill.findByIdAndUpdate(skill._id, {
    $inc: { "usage.totalInvocations": 1 },
    $set: { "usage.lastUsed": new Date() },
  });
  return {
    skillId: skill._id,
    name: skill.name,
    instructions: skill.instructions,
    capabilities: skill.capabilities,
    message: "Skill located and ready for execution",
  };
}

async function executeDelegateToAgent(args: Record<string, unknown>) {
  const Agent = (await import("@/models/agent")).default as any;
  const agentId = String(args.agentId || "");
  let agent;
  if (agentId.match(/^[0-9a-fA-F]{24}$/)) {
    agent = await Agent.findById(agentId).lean();
  } else {
    agent = await Agent.findOne({ slug: agentId, status: "active" }).lean();
  }
  if (!agent) return { error: `Agent '${agentId}' not found or inactive` };
  return {
    agentId: agent._id,
    name: agent.name,
    type: agent.type,
    role: agent.role,
    message: `Delegation prepared to ${agent.name}`,
    delegatedMessage: args.message,
    context: args.context || {},
  };
}

async function executeGetInvoice(args: Record<string, unknown>) {
  const Invoice = (await import("@/models/invoice")).default;
  const invoiceId = args.invoiceId as string;
  if (!invoiceId) return { error: "invoiceId is required" };

  const invoice = await Invoice.findOne({
    $or: [{ _id: invoiceId }, { invoiceNumber: invoiceId }],
  }).populate("project", "name slug").lean();

  if (!invoice) return { error: "Invoice not found" };
  return { invoice };
}

async function executeGetCustomerBalance(args: Record<string, unknown>) {
  const Payment = (await import("@/models/payment")).default;
  const Invoice = (await import("@/models/invoice")).default;
  const email = args.customerEmail as string;
  if (!email) return { error: "customerEmail is required" };

  const payments = await Payment.find({ customerEmail: email, status: "completed" }).lean();
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  const invoices = await Invoice.find({ "client.email": email }).lean();
  const unpaid = invoices.filter((i: Record<string, unknown>) => i.status !== "paid" && i.status !== "cancelled");
  const totalOwed = unpaid.reduce((sum: number, i: Record<string, unknown>) => sum + ((i.amountDue as number) || (i.total as number) || 0), 0);

  return {
    customerEmail: email,
    totalPaid,
    totalOwed,
    balance: totalPaid - totalOwed,
    totalPayments: payments.length,
    totalInvoices: invoices.length,
    unpaidInvoices: unpaid.map((i: Record<string, unknown>) => ({
      invoiceNumber: i.invoiceNumber,
      total: i.total,
      amountDue: i.amountDue || i.total,
      status: i.status,
      dueDate: i.dueDate,
    })),
  };
}

async function executeGetProjectBalance(args: Record<string, unknown>) {
  const Payment = (await import("@/models/payment")).default;
  const Invoice = (await import("@/models/invoice")).default;
  const Project = (await import("@/models/project")).default;
  const projectId = args.projectId as string;
  if (!projectId) return { error: "projectId is required" };

  const project = await Project.findOne({
    $or: [{ _id: projectId }, { slug: projectId }],
  }).lean() as Record<string, unknown> | null;

  if (!project) return { error: "Project not found" };

  const payments = await Payment.find({ project: project._id, status: "completed" }).lean();
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  const invoices = await Invoice.find({ project: project._id }).lean();
  const totalInvoiced = invoices.reduce((sum: number, i: Record<string, unknown>) => sum + ((i.total as number) || 0), 0);
  const totalDue = invoices.reduce((sum: number, i: Record<string, unknown>) => sum + ((i.amountDue as number) || 0), 0);

  const financial = project.financial as Record<string, unknown> | undefined;

  return {
    projectId: project._id,
    name: project.name,
    totalPaid,
    totalInvoiced,
    totalDue,
    balance: totalPaid - totalInvoiced,
    depositAmount: financial?.depositAmount || 0,
    depositPaid: financial?.depositPaid || false,
    totalAmount: project.totalAmount || 0,
    payments: payments.length,
    invoices: invoices.length,
  };
}

async function executeCreatePaymentRequest(args: Record<string, unknown>) {
  const Invoice = (await import("@/models/invoice")).default;
  const amount = args.amount as number;
  const description = args.description as string;
  const projectId = args.projectId as string;
  const type = (args.type as string) || "standard";

  if (!amount || amount <= 0) return { error: "Valid amount is required" };
  if (!description) return { error: "Description is required" };

  const prefix = "INV";
  const date = new Date();
  const datePart = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const invoiceNumber = `${prefix}-${datePart}-${random}`;

  const invoice = await Invoice.create({
    invoiceNumber,
    project: projectId || undefined,
    items: [{ description, quantity: 1, unitPrice: amount, total: amount, category: type }],
    subtotal: amount,
    total: amount,
    amountDue: amount,
    currency: "USD",
    status: "draft",
    type: type === "deposit" ? "deposit" : type === "milestone" ? "milestone" : type === "final" ? "final" : "standard",
  });

  return {
    invoiceId: invoice._id,
    invoiceNumber,
    amount,
    description,
    type,
    status: "draft",
    message: "Invoice created as draft. An admin must issue it before the client can pay.",
  };
}

async function executeGetTransaction(args: Record<string, unknown>) {
  const Payment = (await import("@/models/payment")).default;
  const paymentId = args.paymentId as string;
  if (!paymentId) return { error: "paymentId is required" };

  const payment = await Payment.findOne({
    $or: [{ _id: paymentId }, { paymentNumber: paymentId }],
  }).populate("invoice", "invoiceNumber total").populate("order", "orderNumber total").populate("project", "name").lean();

  if (!payment) return { error: "Payment not found" };
  return { payment };
}

async function executeGetPaymentStatus(args: Record<string, unknown>) {
  const Payment = (await import("@/models/payment")).default;
  const Invoice = (await import("@/models/invoice")).default;

  if (args.invoiceId) {
    const invoice = await Invoice.findById(args.invoiceId).lean() as Record<string, unknown> | null;
    if (!invoice) return { error: "Invoice not found" };
    return {
      type: "invoice",
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      total: invoice.total,
      amountPaid: invoice.amountPaid || 0,
      amountDue: invoice.amountDue || invoice.total,
      paid: invoice.status === "paid",
    };
  }

  if (args.orderId) {
    const payment = await Payment.findOne({ order: args.orderId }).lean();
    return {
      type: "order",
      orderId: args.orderId,
      paymentStatus: payment?.status || "no payment found",
      paid: payment?.status === "completed",
    };
  }

  return { error: "invoiceId or orderId is required" };
}

async function executePrepareRefundRequest(args: Record<string, unknown>) {
  const Refund = (await import("@/models/refund")).default;
  const Payment = (await import("@/models/payment")).default;
  const PaymentAuditLog = (await import("@/models/payment-audit-log")).default;

  const paymentId = args.paymentId as string;
  const amount = args.amount as number;
  const reason = args.reason as string;

  if (!paymentId || !amount || !reason) {
    return { error: "paymentId, amount, and reason are required" };
  }

  const payment = await Payment.findById(paymentId);
  if (!payment) return { error: "Payment not found" };
  if (payment.status !== "completed") return { error: "Can only refund completed payments" };
  if (amount > payment.amount) return { error: "Refund exceeds payment amount" };

  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  const refundNumber = `REF-${ts}-${rand}`;

  const refund = await Refund.create({
    refundNumber,
    payment: paymentId,
    customer: payment.customer,
    customerEmail: payment.customerEmail,
    amount,
    currency: payment.currency,
    reason,
    status: "pending",
  });

  await PaymentAuditLog.create({
    action: "refund_requested",
    entity: "Refund",
    entityId: refund._id,
    payment: paymentId,
    gateway: payment.gateway,
    amount,
    currency: payment.currency,
    details: { refundNumber, reason },
  });

  return {
    refundId: refund._id,
    refundNumber,
    amount,
    reason,
    status: "pending",
    message: "Refund request created. Requires admin approval before processing.",
  };
}

// Main executor
export async function executeTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (toolName) {
    case "get_projects":
      return executeGetProjects(args);
    case "get_project":
      return executeGetProject(args);
    case "get_clients":
      return executeGetClients(args);
    case "get_client":
      return executeGetClient(args);
    case "get_leads":
      return executeGetLeads(args);
    case "get_invoices":
      return executeGetInvoices(args);
    case "get_quotes":
      return executeGetQuotes(args);
    case "get_company_info":
      return { info: COMPANY_INFO };
    case "get_project_requests":
      return executeGetProjectRequests(args);
    case "create_inquiry":
      return executeCreateInquiry(args);
    case "create_lead":
      return executeCreateLead(args);
    case "update_project":
      return executeUpdateProject(args);
    case "create_notification":
      return executeCreateNotification(args);
    case "execute_skill":
      return executeSkill(args);
    case "delegate_to_agent":
      return executeDelegateToAgent(args);
    case "get_invoice":
      return executeGetInvoice(args);
    case "get_customer_balance":
      return executeGetCustomerBalance(args);
    case "get_project_balance":
      return executeGetProjectBalance(args);
    case "create_payment_request":
      return executeCreatePaymentRequest(args);
    case "get_transaction":
      return executeGetTransaction(args);
    case "get_payment_status":
      return executeGetPaymentStatus(args);
    case "prepare_refund_request":
      return executePrepareRefundRequest(args);
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// Function-calling loop — sends messages to OpenAI, executes tools, repeats until final text response
export async function runAgentWithTools(opts: {
  systemPrompt: string;
  messages: { role: string; content: string }[];
  model: string;
  temperature: number;
  maxTokens: number;
  maxIterations?: number;
}): Promise<{ response: string; toolCalls: { name: string; args: unknown; result: unknown }[] }> {
  const { systemPrompt, messages, model, temperature, maxTokens, maxIterations = 5 } = opts;
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return { response: "AI service is not configured.", toolCalls: [] };
  }

  const allMessages: { role: string; content: string; tool_calls?: unknown[]; tool_call_id?: string; name?: string }[] = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];

  const toolCallsLog: { name: string; args: unknown; result: unknown }[] = [];

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const requestBody = {
      model,
      messages: allMessages,
      tools: AGENT_TOOL_DEFINITIONS,
      temperature,
      max_tokens: maxTokens,
    };

    console.log(`[Agent Tools] Iteration ${iteration + 1}, sending ${AGENT_TOOL_DEFINITIONS.length} tools to OpenAI`);

    const apiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!apiResponse.ok) {
      return { response: "AI API error. Please try again.", toolCalls: toolCallsLog };
    }

    const data = await apiResponse.json();
    const choice = data.choices?.[0];
    const assistantMessage = choice?.message;

    if (!assistantMessage) {
      return { response: "No response from AI.", toolCalls: toolCallsLog };
    }

    // If no tool calls, return the text response
    if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
      console.log(`[Agent Tools] No tool calls, returning text response`);
      return { response: assistantMessage.content || "", toolCalls: toolCallsLog };
    }

    console.log(`[Agent Tools] ${assistantMessage.tool_calls.length} tool calls:`, assistantMessage.tool_calls.map((tc: { function: { name: string } }) => tc.function.name));

    // Add assistant message to history
    allMessages.push({
      role: "assistant",
      content: assistantMessage.content || "",
      tool_calls: assistantMessage.tool_calls,
    });

    // Execute each tool call
    for (const toolCall of assistantMessage.tool_calls) {
      const fnName = toolCall.function.name;
      let fnArgs: Record<string, unknown> = {};
      try {
        fnArgs = JSON.parse(toolCall.function.arguments);
      } catch {
        // Parse error
      }

      const result = await executeTool(fnName, fnArgs);
      toolCallsLog.push({ name: fnName, args: fnArgs, result });

      // Add tool result to messages
      allMessages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }
  }

  return { response: "I've gathered the information. Let me summarize what I found.", toolCalls: toolCallsLog };
}
