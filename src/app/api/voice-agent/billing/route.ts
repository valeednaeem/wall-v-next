import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Project from "@/models/project";
import Client from "@/models/client";
import Invoice from "@/models/invoice";
import { sendEmail, milestonePaidEmail } from "@/services/email";

function generateInvoiceNumber(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(2);
  const m = (now.getMonth() + 1).toString().padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `INV-${y}${m}-${rand}`;
}

function buildMilestones(budget: number, projectType: string) {
  const templates: Record<string, { name: string; description: string; pct: number }[]> = {
    website: [
      { name: "Discovery & Planning", description: "Requirements gathering, sitemap, wireframes", pct: 15 },
      { name: "Design", description: "UI/UX design, brand integration, responsive layouts", pct: 20 },
      { name: "Development", description: "Frontend and backend implementation", pct: 35 },
      { name: "Content & SEO", description: "Content creation, SEO optimization, meta tags", pct: 15 },
      { name: "Testing & Launch", description: "QA testing, bug fixes, deployment", pct: 15 },
    ],
    "mobile-app": [
      { name: "Discovery & Design", description: "Requirements, wireframes, UI/UX design", pct: 20 },
      { name: "Core Development", description: "App architecture, key features implementation", pct: 40 },
      { name: "Integration & Testing", description: "API integration, device testing, QA", pct: 25 },
      { name: "Launch", description: "Store submission, deployment, monitoring setup", pct: 15 },
    ],
    ecommerce: [
      { name: "Discovery & Design", description: "Product catalog design, user flow, branding", pct: 15 },
      { name: "Store Setup", description: "Product listings, categories, inventory system", pct: 25 },
      { name: "Payment & Checkout", description: "Payment gateway, cart, checkout flow", pct: 25 },
      { name: "Features & SEO", description: "Search, filters, SEO, analytics", pct: 20 },
      { name: "Testing & Launch", description: "QA, performance testing, deployment", pct: 15 },
    ],
    crm: [
      { name: "Requirements & Design", description: "CRM workflow mapping, UI design", pct: 15 },
      { name: "Core CRM Build", description: "Contact management, pipeline, dashboards", pct: 35 },
      { name: "Integrations", description: "Email, calendar, third-party integrations", pct: 25 },
      { name: "Training & Launch", description: "User training, data migration, deployment", pct: 25 },
    ],
    "ai-chatbot": [
      { name: "Discovery & Training Data", description: "Use case analysis, knowledge base setup", pct: 20 },
      { name: "Bot Development", description: "NLP configuration, conversation flows", pct: 35 },
      { name: "Integration", description: "Website/channel integration, testing", pct: 25 },
      { name: "Optimization & Launch", description: "Performance tuning, monitoring, deployment", pct: 20 },
    ],
    "ai-voice-agent": [
      { name: "Discovery & Design", description: "Voice flow design, script writing", pct: 15 },
      { name: "Agent Development", description: "Voice configuration, conversation logic", pct: 35 },
      { name: "Integration & Testing", description: "Telephony integration, call testing", pct: 25 },
      { name: "Optimization & Launch", description: "Performance tuning, monitoring, deployment", pct: 25 },
    ],
    default: [
      { name: "Discovery & Planning", description: "Requirements gathering and project planning", pct: 15 },
      { name: "Design", description: "UI/UX design and prototyping", pct: 20 },
      { name: "Development", description: "Core implementation", pct: 35 },
      { name: "Testing", description: "Quality assurance and bug fixes", pct: 15 },
      { name: "Launch", description: "Deployment and go-live", pct: 15 },
    ],
  };

  const template = templates[projectType] || templates.default;
  return template.map((t) => ({
    name: t.name,
    description: t.description,
    amount: Math.round(budget * (t.pct / 100)),
    status: "pending" as const,
  }));
}

// Dograh HTTP API Tool — calculates billing, creates invoice, returns summary for agent to read
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("[Billing] Received:", JSON.stringify(body).slice(0, 500));

    const {
      client_name,
      client_email,
      client_phone,
      project_id,
      project_type,
      features,
      total_budget,
      tax_rate,
      discount,
      notes,
    } = body;

    if (!client_name || !client_email || !total_budget) {
      return NextResponse.json(
        { error: "client_name, client_email, and total_budget are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Find or create client
    let client = await Client.findOne({ email: client_email.toLowerCase().trim() });
    if (!client) {
      client = await Client.create({
        name: client_name,
        email: client_email.toLowerCase().trim(),
        phone: client_phone || undefined,
        type: "individual",
        status: "prospect",
        source: "voice-agent",
        tags: ["voice-agent", "auto-created"],
        totalProjects: 0,
        totalSpent: 0,
        lastContact: new Date(),
      });
    }

    const budget = parseFloat(String(total_budget).replace(/[^0-9.]/g, "")) || 1000;
    const taxPct = parseFloat(String(tax_rate).replace(/[^0-9.]/g, "")) || 0;
    const discountAmt = parseFloat(String(discount).replace(/[^0-9.]/g, "")) || 0;

    // Build milestones with amounts
    const milestones = buildMilestones(budget, project_type || "website");

    // Find or create project
    let project = null;
    if (project_id) {
      project = await Project.findById(project_id);
    }
    if (!project) {
      const demoId = `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      project = await Project.create({
        name: `${(project_type || "Project").replace(/-/g, " ")} — ${client_name}`,
        slug: `${(project_type || "project").toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
        title: `${(project_type || "Project").replace(/-/g, " ")} — ${client_name}`,
        description: notes || `Project for ${client_name}`,
        client: {
          name: client_name,
          email: client_email.toLowerCase().trim(),
          phone: client_phone || "",
        },
        status: "demo",
        priority: "medium",
        budget,
        currency: "USD",
        progress: 0,
        milestones,
        requirements: {
          projectType: project_type || "website",
          features: features || [],
          budget: `$${budget.toLocaleString()}`,
        },
        demoId,
        tags: ["voice-agent", "dograh"],
      });
    } else {
      // Update existing project with milestones and budget
      project.milestones = milestones;
      project.budget = budget;
      project.quote = { min: budget, max: Math.round(budget * 1.5), currency: "USD" };
      await project.save();
    }

    // Calculate totals
    const subtotal = budget;
    const tax = Math.round(subtotal * (taxPct / 100));
    const total = subtotal + tax - discountAmt;

    // Build invoice items from milestones
    const items = milestones.map((m) => ({
      description: `${m.name} — ${m.description}`,
      quantity: 1,
      unitPrice: m.amount,
      total: m.amount,
    }));

    // Create invoice
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const invoice = await Invoice.create({
      invoiceNumber: generateInvoiceNumber(),
      client: client._id,
      project: project._id,
      items,
      subtotal,
      tax,
      taxRate: taxPct,
      discount: discountAmt,
      total,
      currency: "USD",
      status: "sent",
      dueDate,
      notes: notes || `Project: ${project.name}`,
      billingAddress: {
        name: client_name,
        email: client_email,
        address: "",
        city: "",
        country: "",
      },
    });

    // Update client
    client.totalProjects = (client.totalProjects || 0) + 1;
    client.lastContact = new Date();
    await client.save();

    // Build summary for the agent to read to the customer
    const milestoneSummary = milestones
      .map((m, i) => `Milestone ${i + 1}: ${m.name} — $${m.amount.toLocaleString()}`)
      .join(". ");

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://wall-v.com";

    const agentSummary = [
      `Here's the cost breakdown for your ${project_type || "project"}:`,
      milestoneSummary,
      `Subtotal: $${subtotal.toLocaleString()} USD.`,
      tax > 0 ? `Tax (${taxPct}%): $${tax.toLocaleString()} USD.` : null,
      discountAmt > 0 ? `Discount: -$${discountAmt.toLocaleString()} USD.` : null,
      `Total: $${total.toLocaleString()} USD.`,
      `Invoice number: ${invoice.invoiceNumber}.`,
      `You can proceed to checkout at: ${appUrl}/checkout/${project._id}`,
    ].filter(Boolean).join(" ");

    console.log("[Billing] Created:", {
      invoice: invoice.invoiceNumber,
      project: project._id,
      total,
    });

    // Send invoice email
    if (client_email.includes("@")) {
      sendEmail({
        to: client_email,
        subject: `Invoice ${invoice.invoiceNumber} — ${project.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Invoice ${invoice.invoiceNumber}</h2>
            <p>Hi ${client_name},</p>
            <p>Here's your project invoice:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <tr style="background: #f9f9f9;">
                <th style="padding: 8px; text-align: left; border-bottom: 1px solid #eee;">Milestone</th>
                <th style="padding: 8px; text-align: right; border-bottom: 1px solid #eee;">Amount</th>
              </tr>
              ${milestones.map((m) => `
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;">${m.name}</td>
                  <td style="padding: 8px; text-align: right; border-bottom: 1px solid #eee;">$${m.amount.toLocaleString()}</td>
                </tr>
              `).join("")}
              <tr style="font-weight: bold; border-top: 2px solid #333;">
                <td style="padding: 8px;">Total</td>
                <td style="padding: 8px; text-align: right;">$${total.toLocaleString()} USD</td>
              </tr>
            </table>
            <a href="${appUrl}/checkout/${project._id}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 16px 0;">Pay Now</a>
            <p style="color: #666; font-size: 14px;">Due by ${dueDate.toLocaleDateString()}. If you have questions, reply to this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
            <p style="color: #999; font-size: 12px;">Wall-V Digital Agency</p>
          </div>
        `,
      }).catch((err) => console.error("[Billing] Failed to send invoice email:", err));
    }

    return NextResponse.json({
      success: true,
      agent_summary: agentSummary,
      invoice: {
        number: invoice.invoiceNumber,
        subtotal,
        tax,
        discount: discountAmt,
        total,
        currency: "USD",
        dueDate: dueDate.toISOString(),
        status: "sent",
      },
      milestones: milestones.map((m) => ({
        name: m.name,
        description: m.description,
        amount: m.amount,
      })),
      project_id: project._id.toString(),
      checkout_url: `${appUrl}/checkout/${project._id}`,
      preview_url: project.demoId ? `${appUrl}/preview/${project._id}` : null,
    });
  } catch (error) {
    console.error("[Billing] Error:", error);
    return NextResponse.json({ error: "Failed to process billing" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok", endpoint: "voice-agent/billing" });
}
