import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import TrackingEvent from "@/models/tracking-event";
import { requirePermission } from "@/lib/api-middleware";

const SYSTEM_EVENTS = [
  {
    eventName: "generate_lead",
    displayName: "Generate Lead",
    description: "User submits a contact form or requests contact",
    category: "conversion",
    parameters: [
      { name: "form_type", type: "string", required: true, description: "contact, demo, quote, newsletter" },
      { name: "source_page", type: "string", required: false, description: "Page where form was submitted" },
      { name: "lead_value", type: "number", required: false, description: "Estimated lead value" },
    ],
    triggers: [{ type: "auto" }],
    isActive: true,
    isSystem: true,
    ga4EventName: "generate_lead",
  },
  {
    eventName: "contact_form_submit",
    displayName: "Contact Form Submit",
    description: "General contact form submission",
    category: "form_submit",
    parameters: [
      { name: "form_id", type: "string", required: true, description: "Form identifier" },
      { name: "form_type", type: "string", required: true, description: "contact, support, sales" },
    ],
    triggers: [{ type: "auto" }],
    isActive: true,
    isSystem: true,
    ga4EventName: "contact_form_submit",
  },
  {
    eventName: "demo_requested",
    displayName: "Demo Requested",
    description: "User requests a product/service demo",
    category: "conversion",
    parameters: [
      { name: "product_id", type: "string", required: false, description: "Product/service requested" },
      { name: "source_page", type: "string", required: false, description: "Page where demo was requested" },
    ],
    triggers: [{ type: "auto" }],
    isActive: true,
    isSystem: true,
    ga4EventName: "demo_requested",
  },
  {
    eventName: "sign_up",
    displayName: "Sign Up",
    description: "User creates an account",
    category: "conversion",
    parameters: [
      { name: "method", type: "string", required: false, description: "email, google, microsoft" },
      { name: "plan", type: "string", required: false, description: "Selected plan if any" },
    ],
    triggers: [{ type: "auto" }],
    isActive: true,
    isSystem: true,
    ga4EventName: "sign_up",
  },
  {
    eventName: "login",
    displayName: "Login",
    description: "User logs into their account",
    category: "engagement",
    parameters: [
      { name: "method", type: "string", required: false, description: "email, google, microsoft" },
    ],
    triggers: [{ type: "auto" }],
    isActive: true,
    isSystem: true,
    ga4EventName: "login",
  },
  {
    eventName: "begin_checkout",
    displayName: "Begin Checkout",
    description: "User starts the checkout process",
    category: "ecommerce",
    parameters: [
      { name: "currency", type: "string", required: true, description: "USD" },
      { name: "value", type: "number", required: true, description: "Cart value" },
      { name: "items", type: "json", required: true, description: "Cart items array" },
    ],
    triggers: [{ type: "auto" }],
    isActive: true,
    isSystem: true,
    ga4EventName: "begin_checkout",
  },
  {
    eventName: "add_to_cart",
    displayName: "Add to Cart",
    description: "User adds a product to cart",
    category: "ecommerce",
    parameters: [
      { name: "item_id", type: "string", required: true, description: "Product SKU/slug" },
      { name: "item_name", type: "string", required: true, description: "Product name" },
      { name: "price", type: "number", required: true, description: "Product price" },
      { name: "quantity", type: "number", required: true, description: "Quantity added" },
    ],
    triggers: [{ type: "auto" }],
    isActive: true,
    isSystem: true,
    ga4EventName: "add_to_cart",
  },
  {
    eventName: "purchase",
    displayName: "Purchase",
    description: "User completes a purchase",
    category: "ecommerce",
    parameters: [
      { name: "transaction_id", type: "string", required: true, description: "Order ID" },
      { name: "currency", type: "string", required: true, description: "USD" },
      { name: "value", type: "number", required: true, description: "Order total" },
      { name: "items", type: "json", required: true, description: "Purchased items" },
    ],
    triggers: [{ type: "auto" }],
    isActive: true,
    isSystem: true,
    ga4EventName: "purchase",
  },
  {
    eventName: "project_created",
    displayName: "Project Created",
    description: "Client creates a new project",
    category: "conversion",
    parameters: [
      { name: "project_type", type: "string", required: true, description: "web, mobile, ai, hosting" },
      { name: "estimated_value", type: "number", required: false, description: "Estimated project value" },
    ],
    triggers: [{ type: "auto" }],
    isActive: true,
    isSystem: true,
    ga4EventName: "project_created",
  },
  {
    eventName: "ai_conversation_started",
    displayName: "AI Conversation Started",
    description: "User starts an AI chat conversation",
    category: "engagement",
    parameters: [
      { name: "agent_type", type: "string", required: false, description: "sales, support, technical" },
    ],
    triggers: [{ type: "auto" }],
    isActive: true,
    isSystem: true,
    ga4EventName: "ai_conversation_started",
  },
  {
    eventName: "voice_call_started",
    displayName: "Voice Call Started",
    description: "User initiates a voice agent call",
    category: "engagement",
    parameters: [
      { name: "agent_type", type: "string", required: false, description: "sales, support" },
    ],
    triggers: [{ type: "auto" }],
    isActive: true,
    isSystem: true,
    ga4EventName: "voice_call_started",
  },
  {
    eventName: "file_download",
    displayName: "File Download",
    description: "User downloads a file/resource",
    category: "download",
    parameters: [
      { name: "file_name", type: "string", required: true, description: "Downloaded file name" },
      { name: "file_type", type: "string", required: false, description: "pdf, zip, docx, etc." },
      { name: "resource_type", type: "string", required: false, description: "whitepaper, case_study, brochure" },
    ],
    triggers: [{ type: "auto" }],
    isActive: true,
    isSystem: true,
    ga4EventName: "file_download",
  },
  {
    eventName: "video_play",
    displayName: "Video Play",
    description: "User plays a video",
    category: "video_play",
    parameters: [
      { name: "video_id", type: "string", required: true, description: "Video identifier" },
      { name: "video_title", type: "string", required: false, description: "Video title" },
      { name: "video_duration", type: "number", required: false, description: "Video duration in seconds" },
    ],
    triggers: [{ type: "auto" }],
    isActive: true,
    isSystem: true,
    ga4EventName: "video_play",
  },
  {
    eventName: "scroll_depth",
    displayName: "Scroll Depth",
    description: "User reaches a scroll depth threshold",
    category: "scroll",
    parameters: [
      { name: "depth_percentage", type: "number", required: true, description: "25, 50, 75, 90, 100" },
      { name: "page_path", type: "string", required: true, description: "Page where scroll occurred" },
    ],
    triggers: [{ type: "auto" }],
    isActive: true,
    isSystem: true,
    ga4EventName: "scroll",
  },
  {
    eventName: "cta_click",
    displayName: "CTA Click",
    description: "User clicks a call-to-action button",
    category: "click",
    parameters: [
      { name: "cta_text", type: "string", required: true, description: "Button/link text" },
      { name: "cta_location", type: "string", required: false, description: "hero, sidebar, footer, inline" },
      { name: "destination_url", type: "string", required: false, description: "Where the CTA links to" },
    ],
    triggers: [{ type: "auto" }],
    isActive: true,
    isSystem: true,
    ga4EventName: "cta_click",
  },
];

async function ensureSystemEvents() {
  await connectToDatabase();
  for (const sysEvent of SYSTEM_EVENTS) {
    await TrackingEvent.findOneAndUpdate(
      { eventName: sysEvent.eventName },
      { $setOnInsert: sysEvent },
      { upsert: true, new: true }
    );
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED", message: "Your session has expired. Please sign in again." }, { status: 401 });
    }

    // Convert NextAuth user to JWTPayload for permission check
    const jwtUser = {
      userId: session.user.id,
      email: session.user.email || null,
      role: (session.user as { role?: string }).role || "customer",
      permissions: (session.user as { permissions?: string[] }).permissions || [],
    };

    const permError = await requirePermission(jwtUser, "tracking:view");
    if (permError) return permError;

    await ensureSystemEvents();
    const events = await TrackingEvent.find().sort({ isSystem: -1, displayName: 1 }).lean();

    return NextResponse.json({ success: true, data: events });
  } catch (error) {
    console.error("Tracking events GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED", message: "Your session has expired. Please sign in again." }, { status: 401 });
    }

    // Convert NextAuth user to JWTPayload for permission check
    const jwtUser = {
      userId: session.user.id,
      email: session.user.email || null,
      role: (session.user as { role?: string }).role || "customer",
      permissions: (session.user as { permissions?: string[] }).permissions || [],
    };

    const permError = await requirePermission(jwtUser, "tracking:manage");
    if (permError) return permError;

    await ensureSystemEvents();
    const body = await request.json();

    // Validate required fields
    if (!body.eventName || !body.displayName) {
      return NextResponse.json({ success: false, error: "Event name and display name are required" }, { status: 400 });
    }

    // Check if event name already exists
    const existing = await TrackingEvent.findOne({ eventName: body.eventName });
    if (existing) {
      return NextResponse.json({ success: false, error: "Event name already exists" }, { status: 400 });
    }

    const event = await TrackingEvent.create({
      ...body,
      isSystem: false,
    });

    return NextResponse.json({ success: true, data: event });
  } catch (error) {
    console.error("Tracking event POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}