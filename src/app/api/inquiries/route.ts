import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Inquiry from "@/models/inquiry";
import Lead from "@/models/lead";
import { getAuthUser } from "@/lib/auth";
import { checkRateLimit, getClientIp, logSecurityEvent, sanitizeString, validateEmail } from "@/lib/security";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user || !["super-admin", "admin", "manager", "staff"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();
    const inquiries = await Inquiry.find({}).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: inquiries });
  } catch (error) {
    console.error("Inquiries GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/inquiries
 * Public inquiry submission. Creates Inquiry + Lead for CRM tracking.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);

  try {
    // Rate limit: 5 per hour per IP
    const rl = checkRateLimit("inquiry:" + ip, 5, 60 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    await connectToDatabase();
    const body = await request.json();
    const { name, email, phone, company, subject, message, type, serviceInterest, estimatedBudget, estimatedTimeline } = body;

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Name, email, and message are required" }, { status: 400 });
    }

    if (!validateEmail(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    const safeName = sanitizeString(name, 100);
    const safeSubject = sanitizeString(subject || "Inquiry", 200);
    const safeMessage = sanitizeString(message, 5000);
    const safeCompany = sanitizeString(company || "", 200);

    // Create Inquiry
    const inquiry = await Inquiry.create({
      name: safeName,
      email: email.toLowerCase(),
      phone: phone || "",
      company: safeCompany,
      subject: safeSubject,
      message: safeMessage,
      type: type || "sales",
      status: "new",
      priority: "medium",
      source: "website",
      estimatedBudget: estimatedBudget || undefined,
      estimatedTimeline: estimatedTimeline || undefined,
      tags: serviceInterest ? [serviceInterest] : [],
    });

    // Also create Lead for CRM
    await Lead.create({
      name: safeName,
      email: email.toLowerCase(),
      phone: phone || "",
      company: safeCompany,
      source: "website-inquiry",
      status: "new",
      budget: estimatedBudget || undefined,
      serviceInterest: serviceInterest || undefined,
      requirements: safeMessage,
      notes: `Inquiry subject: ${safeSubject}`,
    });

    await logSecurityEvent({
      type: "signup_success",
      severity: "low",
      email: email.toLowerCase(),
      ip,
      path: "/api/inquiries",
      method: "POST",
      details: { type: "inquiry", serviceInterest },
    });

    return NextResponse.json({
      success: true,
      message: "Your inquiry has been submitted. Our team will contact you within 24 hours.",
      data: { id: inquiry._id },
    }, { status: 201 });
  } catch (error) {
    console.error("Inquiries POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
