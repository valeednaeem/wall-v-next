import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";

interface HookSeedData {
  name: string;
  slug: string;
  description: string;
  type: "website-chat" | "form-handler" | "api-endpoint" | "webhook" | "email-trigger" | "event-listener";
  config: Record<string, unknown>;
  conditions: { field: string; operator: string; value: string }[];
  actions: { type: string; config: Record<string, unknown> }[];
  isGlobal: boolean;
  priority: number;
}

const defaultHooks: HookSeedData[] = [
  // ─── WEBSITE CHAT HOOKS ───────────────────────────────────
  {
    name: "Website Chat Widget",
    slug: "website-chat-widget",
    description: "Default chat widget configuration for the website",
    type: "website-chat",
    config: {
      widgetPosition: "bottom-right",
      widgetColor: "#7c3aed",
      widgetTitle: "Wall-V Assistant",
      welcomeMessage: "Hello! I'm your AI assistant. How can I help you today?",
      offlineMessage: "We're currently offline. Please leave a message and we'll get back to you.",
    },
    conditions: [],
    actions: [
      {
        type: "route-to-agent",
        config: { agentRole: "sales", fallbackToMaster: true },
      },
    ],
    isGlobal: true,
    priority: 100,
  },
  {
    name: "After-Hours Chat Handler",
    slug: "after-hours-chat",
    description: "Routes chat to voicemail/leave-message mode outside business hours",
    type: "website-chat",
    config: {
      offlineMessage: "Thanks for reaching out! Our team is currently offline. Please leave your details and we'll respond within 24 hours.",
    },
    conditions: [
      { field: "time.hour", operator: "less-than", value: "9" },
    ],
    actions: [
      {
        type: "send-notification",
        config: { channel: "email", template: "missed-chat", priority: "low" },
      },
    ],
    isGlobal: true,
    priority: 50,
  },

  // ─── FORM HANDLER HOOKS ──────────────────────────────────
  {
    name: "Contact Form to Lead",
    slug: "contact-form-to-lead",
    description: "Automatically creates a lead from contact form submissions",
    type: "form-handler",
    config: {
      formSelector: "form[data-form='contact']",
      formAction: "create-lead",
    },
    conditions: [
      { field: "form.type", operator: "equals", value: "contact" },
    ],
    actions: [
      {
        type: "create-record",
        config: {
          model: "lead",
          fields: {
            name: "{{form.name}}",
            email: "{{form.email}}",
            phone: "{{form.phone}}",
            company: "{{form.company}}",
            source: "website-contact-form",
            status: "new",
            notes: "{{form.message}}",
          },
        },
      },
      {
        type: "send-notification",
        config: { channel: "email", template: "new-lead", priority: "normal" },
      },
    ],
    isGlobal: true,
    priority: 100,
  },
  {
    name: "Quote Request Form",
    slug: "quote-request-form",
    description: "Creates an inquiry and routes to sales agent for quote requests",
    type: "form-handler",
    config: {
      formSelector: "form[data-form='quote']",
      formAction: "create-inquiry",
    },
    conditions: [
      { field: "form.type", operator: "equals", value: "quote" },
    ],
    actions: [
      {
        type: "create-record",
        config: {
          model: "inquiry",
          fields: {
            name: "{{form.name}}",
            email: "{{form.email}}",
            type: "sales",
            subject: "Quote Request",
            message: "{{form.details}}",
            priority: "high",
            status: "new",
          },
        },
      },
      {
        type: "route-to-agent",
        config: { agentRole: "sales", priority: "high" },
      },
    ],
    isGlobal: true,
    priority: 90,
  },
  {
    name: "Support Ticket Form",
    slug: "support-ticket-form",
    description: "Creates a support ticket from support form submissions",
    type: "form-handler",
    config: {
      formSelector: "form[data-form='support']",
      formAction: "create-inquiry",
    },
    conditions: [
      { field: "form.type", operator: "equals", value: "support" },
    ],
    actions: [
      {
        type: "create-record",
        config: {
          model: "support-ticket",
          fields: {
            subject: "{{form.subject}}",
            description: "{{form.message}}",
            priority: "{{form.priority}}",
            status: "open",
            clientEmail: "{{form.email}}",
            clientName: "{{form.name}}",
          },
        },
      },
      {
        type: "send-notification",
        config: { channel: "email", template: "new-ticket", priority: "normal" },
      },
    ],
    isGlobal: true,
    priority: 80,
  },

  // ─── EVENT LISTENER HOOKS ────────────────────────────────
  {
    name: "New Project Created Notification",
    slug: "new-project-notification",
    description: "Sends notification when a new project is created",
    type: "event-listener",
    config: {
      eventType: "project.created",
    },
    conditions: [],
    actions: [
      {
        type: "send-notification",
        config: { channel: "email", template: "project-created", priority: "normal" },
      },
      {
        type: "send-notification",
        config: { channel: "in-app", template: "project-created", priority: "normal" },
      },
    ],
    isGlobal: true,
    priority: 70,
  },
  {
    name: "Payment Received Notification",
    slug: "payment-received-notification",
    description: "Sends notification when a payment is received",
    type: "event-listener",
    config: {
      eventType: "payment.received",
    },
    conditions: [],
    actions: [
      {
        type: "send-notification",
        config: { channel: "email", template: "payment-received", priority: "high" },
      },
      {
        type: "update-record",
        config: {
          model: "project",
          filter: { _id: "{{payment.projectId}}" },
          updates: { paymentStatus: "paid" },
        },
      },
    ],
    isGlobal: true,
    priority: 80,
  },

  // ─── WEBHOOK HOOKS ───────────────────────────────────────
  {
    name: "2Checkout Payment Webhook",
    slug: "2checkout-webhook",
    description: "Processes 2Checkout payment notifications",
    type: "webhook",
    config: {
      webhookUrl: "/api/webhooks/2checkout",
      webhookSecret: "{{env.CHECKOUT_2CO_SECRET}}",
    },
    conditions: [
      { field: "body.LISSIONID", operator: "not-equals", value: "" },
    ],
    actions: [
      {
        type: "run-tool",
        config: { tool: "process-2co-payment", args: "{{body}}" },
      },
    ],
    isGlobal: true,
    priority: 60,
  },
];

export async function POST() {
  try {
    await connectToDatabase();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AgentHook = (await import("@/models/agent-hook")).default as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Agent = (await import("@/models/agent")).default as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const User = (await import("@/models/user")).default as any;

    const adminUser = await User.findOne({ email: "admin@wall-v.com" });
    if (!adminUser) {
      return NextResponse.json({ error: "Admin user not found. Run seed.ts first." }, { status: 400 });
    }

    // Find or use the first active agent
    let agent = await Agent.findOne({ isMasterAgent: true });
    if (!agent) {
      agent = await Agent.findOne({ status: "active" });
    }
    if (!agent) {
      return NextResponse.json({ error: "No active agent found. Create an agent first." }, { status: 400 });
    }

    let created = 0;
    let skipped = 0;
    const results: string[] = [];

    for (const hookData of defaultHooks) {
      const existing = await AgentHook.findOne({ slug: hookData.slug });
      if (existing) {
        results.push(`Skipped "${hookData.name}" (already exists)`);
        skipped++;
        continue;
      }

      await AgentHook.create({
        ...hookData,
        agent: agent._id,
        status: "active",
        usage: { totalTriggers: 0, successRate: 100 },
        createdBy: adminUser._id,
      });
      results.push(`Created: ${hookData.name}`);
      created++;
    }

    return NextResponse.json({
      message: `Seeding complete: ${created} created, ${skipped} skipped`,
      results,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to seed hooks";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
