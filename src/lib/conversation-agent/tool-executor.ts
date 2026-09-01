/**
 * Tool Executor — runs conversation tools against the database.
 *
 * Every tool call returns a verified ToolResult.
 * No fabricated IDs. No assumed success.
 */

import connectToDatabase from "@/lib/mongodb";
import User from "@/models/user";
import Client from "@/models/client";
import Inquiry from "@/models/inquiry";
import Lead from "@/models/lead";
import ProjectRequest from "@/models/project-request";
import type { ToolResult } from "./types";
import { validateToolArgs } from "./tool-registry";
import { sendEmail, generateInquiryReceivedEmail } from "@/lib/mail";

function success(toolName: string, data: Record<string, unknown>): ToolResult {
  return { success: true, toolName, data, error: null, errorCode: null };
}

function failure(toolName: string, error: string, errorCode: string): ToolResult {
  return { success: false, toolName, data: null, error, errorCode };
}

async function lookupUser(args: Record<string, unknown>): Promise<ToolResult> {
  const { valid, missing, sanitized } = validateToolArgs("lookup_user", args);
  if (!valid) return failure("lookup_user", `Missing: ${missing.join(", ")}`, "VALIDATION_ERROR");

  const { email, phone } = sanitized as { email?: string; phone?: string };
  if (!email && !phone) return failure("lookup_user", "Email or phone required", "VALIDATION_ERROR");

  await connectToDatabase();

  const query: Record<string, unknown> = {};
  if (email) query.email = (email as string).toLowerCase();
  if (phone) query.phone = phone;

  // Try email first, then phone
  let user = email ? await User.findOne({ email: (email as string).toLowerCase() }).select("-password").lean() : null;
  if (!user && phone) {
    user = await User.findOne({ phone }).select("-password").lean();
  }

  if (user) {
    return success("lookup_user", {
      found: true,
      userId: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    });
  }

  return success("lookup_user", { found: false });
}

async function createUser(args: Record<string, unknown>): Promise<ToolResult> {
  const { valid, missing, sanitized } = validateToolArgs("create_user", args);
  if (!valid) return failure("create_user", `Missing required fields: ${missing.join(", ")}`, "VALIDATION_ERROR");

  const { name, email, phone, company, source } = sanitized as {
    name: string; email?: string; phone?: string; company?: string; source?: string;
  };

  if (!name) return failure("create_user", "Name is required", "VALIDATION_ERROR");
  if (!email && !phone) return failure("create_user", "Email or phone is required", "VALIDATION_ERROR");

  await connectToDatabase();

  // Duplicate detection
  if (email) {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return success("create_user", {
        created: false,
        existed: true,
        userId: existing._id.toString(),
        name: existing.name,
        email: existing.email,
      });
    }
  }

  // Create slug
  const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  // Generate temp password
  const bcrypt = (await import("bcryptjs")).default;
  const tempPassword = await bcrypt.hash("WallV@" + Date.now(), 12);

  const user = await User.create({
    name: name.trim(),
    email: email ? email.toLowerCase().trim() : undefined,
    phone: phone || undefined,
    company: company || undefined,
    password: tempPassword,
    slug: `${baseSlug}-${Date.now()}`,
    role: "customer",
    isActive: true,
    isEmailVerified: false,
    provider: "conversation-agent",
  });

  return success("create_user", {
    created: true,
    userId: user._id.toString(),
    name: user.name,
    email: user.email,
  });
}

async function lookupClient(args: Record<string, unknown>): Promise<ToolResult> {
  const { valid, missing, sanitized } = validateToolArgs("lookup_client", args);
  if (!valid) return failure("lookup_client", `Missing: ${missing.join(", ")}`, "VALIDATION_ERROR");

  const { email, phone } = sanitized as { email?: string; phone?: string };
  if (!email && !phone) return failure("lookup_client", "Email or phone required", "VALIDATION_ERROR");

  await connectToDatabase();

  let client = email ? await Client.findOne({ email: email.toLowerCase() }).lean() : null;
  if (!client && phone) {
    client = await Client.findOne({ phone }).lean();
  }

  if (client) {
    return success("lookup_client", {
      found: true,
      clientId: client._id.toString(),
      name: client.name,
      email: client.email,
      type: client.type,
      status: client.status,
      totalProjects: client.totalProjects,
    });
  }

  return success("lookup_client", { found: false });
}

async function createClient(args: Record<string, unknown>): Promise<ToolResult> {
  const { valid, missing, sanitized } = validateToolArgs("create_client", args);
  if (!valid) return failure("create_client", `Missing: ${missing.join(", ")}`, "VALIDATION_ERROR");

  const { name, email, phone, company, source, userId } = sanitized as {
    name: string; email: string; phone?: string; company?: string; source?: string; userId?: string;
  };

  await connectToDatabase();

  // Duplicate detection
  const existing = await Client.findOne({ email: email.toLowerCase() });
  if (existing) {
    // Link to user if not already linked
    if (userId && !existing.user) {
      existing.user = userId;
      await existing.save();
    }
    return success("create_client", {
      created: false,
      existed: true,
      clientId: existing._id.toString(),
      name: existing.name,
      email: existing.email,
    });
  }

  const client = await Client.create({
    user: userId || undefined,
    name: name.trim(),
    email: email.toLowerCase().trim(),
    phone: phone || undefined,
    company: company || undefined,
    source: source || "conversation-agent",
    status: "prospect",
    type: company ? "business" : "individual",
    lastContact: new Date(),
  });

  return success("create_client", {
    created: true,
    clientId: client._id.toString(),
    name: client.name,
    email: client.email,
  });
}

async function createInquiry(args: Record<string, unknown>): Promise<ToolResult> {
  const { valid, missing, sanitized } = validateToolArgs("create_inquiry", args);
  if (!valid) return failure("create_inquiry", `Missing: ${missing.join(", ")}`, "VALIDATION_ERROR");

  const { name, email, phone, company, subject, message, type, source, estimatedBudget, estimatedTimeline } = sanitized as {
    name: string; email: string; phone?: string; company?: string;
    subject: string; message: string; type?: string; source?: string;
    estimatedBudget?: string; estimatedTimeline?: string;
  };

  await connectToDatabase();

  const inquiry = await Inquiry.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    phone: phone || undefined,
    company: company || undefined,
    subject: subject.trim(),
    message: message.trim(),
    type: type || "sales",
    status: "new",
    source: source || "conversation-agent",
    estimatedBudget: estimatedBudget ? parseInt(estimatedBudget.replace(/[^0-9]/g, "")) || undefined : undefined,
    estimatedTimeline: estimatedTimeline || undefined,
  });

  // Also create a lead if we have email
  let leadId = null;
  if (email && email !== "pending@wall-v.com") {
    const lead = await Lead.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone || undefined,
      company: company || undefined,
      source: source || "conversation-agent",
      status: "new",
      requirements: message.slice(0, 500),
      serviceInterest: type ? [type] : [],
    });
    leadId = lead._id.toString();
    inquiry.lead = lead._id;
    await inquiry.save();
  }

  // Send confirmation email to the user
  if (email && email !== "pending@wall-v.com") {
    const emailContent = generateInquiryReceivedEmail({
      clientName: name,
      subject: subject || "Your Inquiry",
      service: type || undefined,
    });
    sendEmail({ to: email, ...emailContent, template: "inquiry-received" }).catch(() => {});
  }

  return success("create_inquiry", {
    created: true,
    inquiryId: inquiry._id.toString(),
    leadId,
    status: inquiry.status,
  });
}

async function createLead(args: Record<string, unknown>): Promise<ToolResult> {
  const { valid, missing, sanitized } = validateToolArgs("create_lead", args);
  if (!valid) return failure("create_lead", `Missing: ${missing.join(", ")}`, "VALIDATION_ERROR");

  const { name, email, phone, company, source, budget, requirements, serviceInterest } = sanitized as {
    name: string; email: string; phone?: string; company?: string;
    source: string; budget?: string; requirements?: string; serviceInterest?: string;
  };

  await connectToDatabase();

  const lead = await Lead.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    phone: phone || undefined,
    company: company || undefined,
    source,
    status: "new",
    budget: budget ? parseInt(budget.replace(/[^0-9]/g, "")) || undefined : undefined,
    requirements: requirements || undefined,
    serviceInterest: serviceInterest ? serviceInterest.split(",").map((s) => s.trim()) : [],
  });

  return success("create_lead", {
    created: true,
    leadId: lead._id.toString(),
    name: lead.name,
    email: lead.email,
  });
}

async function createProjectRequest(args: Record<string, unknown>): Promise<ToolResult> {
  const { valid, missing, sanitized } = validateToolArgs("create_project_request", args);
  if (!valid) return failure("create_project_request", `Missing: ${missing.join(", ")}`, "VALIDATION_ERROR");

  const {
    clientName, clientEmail, clientPhone, clientCompany,
    projectType, objective, features, budget, timeline,
    industry, targetAudience, designStyle, integrations,
  } = sanitized as {
    clientName: string; clientEmail: string; clientPhone?: string; clientCompany?: string;
    projectType: string; objective: string; features?: string; budget?: string; timeline?: string;
    industry?: string; targetAudience?: string; designStyle?: string; integrations?: string;
  };

  await connectToDatabase();

  // Parse comma-separated features
  const featuresList = features ? features.split(",").map((f) => f.trim()).filter(Boolean) : [];
  const integrationsList = integrations ? integrations.split(",").map((i) => i.trim()).filter(Boolean) : [];

  // Parse budget
  let budgetObj = { min: 0, max: 0, currency: "USD" as string };
  if (budget) {
    const nums = budget.replace(/[^0-9\-–]/g, "").split(/[-–]/).map(Number).filter((n) => !isNaN(n) && n > 0);
    if (nums.length >= 2) {
      budgetObj = { min: Math.min(...nums), max: Math.max(...nums), currency: "USD" };
    } else if (nums.length === 1) {
      budgetObj = { min: nums[0], max: nums[0], currency: "USD" };
    }
  }

  const projectRequest = await ProjectRequest.create({
    client: {
      name: clientName.trim(),
      email: clientEmail.toLowerCase().trim(),
      phone: clientPhone || "",
      company: clientCompany || "",
    },
    requirements: {
      projectType,
      objective: objective.trim(),
      features: featuresList,
      designStyle: designStyle || "",
      industry: industry || "",
      targetAudience: targetAudience || "",
      integrations: integrationsList,
      budget: budgetObj,
      timeline: timeline || "",
      pages: [],
      techStack: [],
      specialRequirements: "",
    },
    extractedData: {
      rawConversation: "",
      keyDecisions: featuresList,
      missingInformation: [],
      confidenceScore: 80,
    },
    status: "collecting",
  });

  return success("create_project_request", {
    created: true,
    projectRequestId: projectRequest._id.toString(),
    clientEmail: clientEmail.toLowerCase().trim(),
    projectType,
  });
}

async function getServiceInfo(args: Record<string, unknown>): Promise<ToolResult> {
  const { sanitized } = validateToolArgs("get_service_info", args);
  const service = (sanitized.service as string) || "general";

  const services: Record<string, { name: string; description: string; priceRange: string; features: string[] }> = {
    website: {
      name: "Business Website",
      description: "Professional website built with modern technologies",
      priceRange: "$2,000 - $5,000",
      features: ["Responsive design", "SEO optimized", "CMS integration", "Contact forms", "Analytics"],
    },
    ecommerce: {
      name: "E-commerce Store",
      description: "Full-featured online store with payment processing",
      priceRange: "$3,000 - $10,000",
      features: ["Product catalog", "Shopping cart", "Payment gateway", "Order management", "Inventory tracking"],
    },
    mobile: {
      name: "Mobile App",
      description: "Native or cross-platform mobile application",
      priceRange: "$5,000 - $20,000",
      features: ["iOS & Android", "Push notifications", "Offline support", "User authentication", "API integration"],
    },
    ai: {
      name: "AI Solution",
      description: "Custom AI-powered tools and automation",
      priceRange: "$5,000 - $50,000",
      features: ["Chatbots", "Data analysis", "Process automation", "Machine learning", "Custom models"],
    },
    hosting: {
      name: "Hosting & Domain",
      description: "Reliable hosting and domain management",
      priceRange: "$10 - $100/month",
      features: ["99.9% uptime", "SSL certificates", "Daily backups", "CDN", "24/7 support"],
    },
    marketing: {
      name: "Digital Marketing",
      description: "SEO, social media, and paid advertising",
      priceRange: "$500 - $3,000/month",
      features: ["SEO optimization", "Social media management", "PPC campaigns", "Content marketing", "Analytics reporting"],
    },
  };

  const info = services[service] || services.website;
  return success("get_service_info", info);
}

async function createNotificationTool(args: Record<string, unknown>): Promise<ToolResult> {
  const { valid, missing, sanitized } = validateToolArgs("create_notification", args);
  if (!valid) return failure("create_notification", `Missing: ${missing.join(", ")}`, "VALIDATION_ERROR");

  const { userId, title, message, type, link } = sanitized as {
    userId?: string; title: string; message: string; type?: string; link?: string;
  };

  await connectToDatabase();

  const Notification = (await import("@/models/notification")).default;
  const UserModel = (await import("@/models/user")).default;

  let targetUserIds: string[] = [];
  if (userId) {
    targetUserIds = [userId];
  } else {
    const admins = await UserModel.find({ role: { $in: ["super-admin", "admin"] }, isActive: true }).select("_id").lean();
    targetUserIds = admins.map((a: { _id: { toString(): string } }) => a._id.toString());
  }

  if (targetUserIds.length === 0) {
    return success("create_notification", { created: false, count: 0, message: "No target users found" });
  }

  const notifications = await Notification.insertMany(
    targetUserIds.map((uid) => ({
      user: uid,
      title,
      message,
      type: type || "info",
      link: link || undefined,
      read: false,
    }))
  );

  return success("create_notification", {
    created: true,
    count: notifications.length,
    title,
    message,
  });
}

async function createInvoiceTool(args: Record<string, unknown>): Promise<ToolResult> {
  const { valid, missing, sanitized } = validateToolArgs("create_invoice", args);
  if (!valid) return failure("create_invoice", `Missing: ${missing.join(", ")}`, "VALIDATION_ERROR");

  const { clientEmail, clientName, projectId, amount, description, projectName } = sanitized as {
    clientEmail: string; clientName: string; projectId?: string;
    amount: number; description: string; projectName?: string;
  };

  if (!amount || amount <= 0) return failure("create_invoice", "Amount must be positive", "VALIDATION_ERROR");

  await connectToDatabase();

  const Invoice = (await import("@/models/invoice")).default;
  const Project = (await import("@/models/project")).default;

  // Generate invoice number
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const invoiceNumber = `INV-${datePart}-${random}`;

  // Build milestone-based items
  const milestones = [
    { name: "Discovery & Planning", description: "Requirements gathering, sitemap, wireframes", pct: 15 },
    { name: "Design", description: "UI/UX design, brand integration, responsive layouts", pct: 20 },
    { name: "Development", description: "Frontend and backend implementation", pct: 35 },
    { name: "Content & SEO", description: "Content creation, SEO optimization, meta tags", pct: 15 },
    { name: "Testing & Launch", description: "QA testing, bug fixes, deployment", pct: 15 },
  ];

  const items = milestones.map((m) => ({
    description: `${m.name} — ${m.description}`,
    quantity: 1,
    unitPrice: Math.round(amount * (m.pct / 100)),
    total: Math.round(amount * (m.pct / 100)),
  }));

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  // Find or link project
  let linkedProject = null;
  if (projectId) {
    linkedProject = await Project.findById(projectId).lean();
  }

  const invoice = await Invoice.create({
    invoiceNumber,
    project: linkedProject?._id || undefined,
    client: undefined, // Will be linked if client record exists
    items,
    subtotal: amount,
    total: amount,
    amountDue: amount,
    currency: "USD",
    status: "sent",
    dueDate,
    notes: description || `${projectName || "Project"} invoice`,
    billingAddress: {
      name: clientName,
      email: clientEmail.toLowerCase().trim(),
    },
  });

  // Try to link to client record
  const clientDoc = await Client.findOne({ email: clientEmail.toLowerCase() });
  if (clientDoc) {
    invoice.client = clientDoc._id;
    await invoice.save();
  }

  // Send invoice email
  if (clientEmail && clientEmail.includes("@")) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://wall-v.com";
    sendEmail({
      to: clientEmail,
      subject: `Invoice ${invoiceNumber} — ${projectName || "Wall-V Project"}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Invoice ${invoiceNumber}</h2>
          <p>Hi ${clientName},</p>
          <p>Here's your project invoice:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr style="background: #f9f9f9;">
              <th style="padding: 8px; text-align: left; border-bottom: 1px solid #eee;">Description</th>
              <th style="padding: 8px; text-align: right; border-bottom: 1px solid #eee;">Amount</th>
            </tr>
            ${items.map((item) => `
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.description}</td>
                <td style="padding: 8px; text-align: right; border-bottom: 1px solid #eee;">$${item.total.toLocaleString()}</td>
              </tr>
            `).join("")}
            <tr style="font-weight: bold; border-top: 2px solid #333;">
              <td style="padding: 8px;">Total</td>
              <td style="padding: 8px; text-align: right;">$${amount.toLocaleString()} USD</td>
            </tr>
          </table>
          <a href="${appUrl}/client/invoices" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 16px 0;">View Invoice</a>
          <p style="color: #666; font-size: 14px;">Due by ${dueDate.toLocaleDateString()}. If you have questions, reply to this email.</p>
        </div>
      `,
      template: "invoice-created",
    }).catch(() => {});
  }

  return success("create_invoice", {
    created: true,
    invoiceId: invoice._id.toString(),
    invoiceNumber,
    amount,
    currency: "USD",
    status: "sent",
    dueDate: dueDate.toISOString(),
    clientEmail: clientEmail.toLowerCase().trim(),
    milestoneCount: milestones.length,
  });
}

async function delegateToAgent(args: Record<string, unknown>): Promise<ToolResult> {
  const { valid, missing, sanitized } = validateToolArgs("delegate_to_agent", args);
  if (!valid) return failure("delegate_to_agent", `Missing: ${missing.join(", ")}`, "VALIDATION_ERROR");

  const { agentId, message, context } = sanitized as {
    agentId: string; message: string; context?: Record<string, unknown>;
  };

  await connectToDatabase();

  const AgentModel = (await import("@/models/agent")).default;
  let agent;
  if (agentId.match(/^[0-9a-fA-F]{24}$/)) {
    agent = await AgentModel.findById(agentId).lean();
  } else {
    agent = await AgentModel.findOne({ slug: agentId, status: "active" }).lean();
  }

  if (!agent) return failure("delegate_to_agent", `Agent '${agentId}' not found`, "AGENT_NOT_FOUND");

  // Use the AI provider adapter to call the agent
  const { detectProvider, validateProviderConfig, getProviderAdapter } = await import("@/lib/ai-provider-adapter");
  const model = agent.aiModel || "gpt-4o";
  const provider = detectProvider(model);
  const providerCheck = validateProviderConfig(provider);

  if (!providerCheck.valid) {
    return failure("delegate_to_agent", `Provider not available for model ${model}`, "PROVIDER_UNAVAILABLE");
  }

  const adapter = getProviderAdapter(model);
  const contextStr = context ? `\n\nContext: ${JSON.stringify(context)}` : "";

  try {
    const result = await adapter.chat({
      model,
      messages: [
        { role: "system", content: agent.systemPrompt || `You are ${agent.name}, a ${agent.role} agent for Wall-V.` },
        { role: "user", content: message + contextStr },
      ],
      temperature: agent.temperature || 0.7,
      maxTokens: agent.maxTokens || 2048,
    });

    return success("delegate_to_agent", {
      delegated: true,
      agentId: agent._id.toString(),
      agentName: agent.name,
      agentRole: agent.role,
      response: result.content,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Delegation failed";
    return failure("delegate_to_agent", msg, "EXECUTION_ERROR");
  }
}

// ─── Tool Dispatcher ────────────────────────────────────────────────────────

const TOOL_MAP: Record<string, (args: Record<string, unknown>) => Promise<ToolResult>> = {
  lookup_user: lookupUser,
  create_user: createUser,
  lookup_client: lookupClient,
  create_client: createClient,
  create_inquiry: createInquiry,
  create_lead: createLead,
  create_project_request: createProjectRequest,
  get_service_info: getServiceInfo,
  create_notification: createNotificationTool,
  create_invoice: createInvoiceTool,
  delegate_to_agent: delegateToAgent,
};

/**
 * Execute a conversation tool by name.
 * Returns a verified ToolResult — never assumes success.
 */
export async function executeConversationTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const handler = TOOL_MAP[toolName];
  if (!handler) {
    return failure(toolName, `Unknown tool: ${toolName}`, "UNKNOWN_TOOL");
  }

  try {
    return await handler(args);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Tool execution failed";
    const code = msg.includes("duplicate") ? "DUPLICATE_ERROR"
      : msg.includes("validation") ? "VALIDATION_ERROR"
      : msg.includes("timeout") ? "TIMEOUT"
      : "EXECUTION_ERROR";
    return failure(toolName, msg, code);
  }
}
