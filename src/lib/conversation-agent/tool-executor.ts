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
