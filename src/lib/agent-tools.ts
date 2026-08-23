import mongoose from "mongoose";

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
  return requests.map((r: Record<string, unknown>) => ({
    id: r._id,
    client: r.client,
    projectType: r.requirements?.projectType,
    objective: r.requirements?.objective,
    budget: r.requirements?.budget,
    status: r.status,
    approvalStatus: r.approvalStatus,
  }));
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
    const apiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: allMessages,
        tools: AGENT_TOOL_DEFINITIONS,
        temperature,
        max_tokens: maxTokens,
      }),
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
      return { response: assistantMessage.content || "", toolCalls: toolCallsLog };
    }

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
