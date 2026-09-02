import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Contact from "@/models/contact";
import { getAuthUser } from "@/lib/auth";
import { sendEmail, generateContactAdminEmail, generateContactConfirmationEmail } from "@/lib/mail";
import { notifyAdmins } from "@/lib/notify";

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { name, email, subject, message, phone, type } = body;

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "Name, email, subject, and message are required" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    const contact = await Contact.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim() || undefined,
      subject: subject.trim(),
      message: message.trim(),
      type: type || "general",
      status: "new",
      source: "contact-form",
      emailStatus: {
        admin: "pending",
        related: "not_applicable",
        user: "pending",
      },
    });

    const contactId = contact._id.toString();
    const submittedAt = new Date().toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const notifications: Record<string, string> = {};
    let lastError = "";

    // ── Admin notification (TOP PRIORITY) ──────────────────────────────
    try {
      const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER || "admin@wall-v.com";
      const adminTemplate = generateContactAdminEmail({
        contactId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone?.trim(),
        subject: subject.trim(),
        message: message.trim(),
        type: type || "general",
        submittedAt,
      });
      const adminSent = await sendEmail({
        to: adminEmail,
        subject: adminTemplate.subject,
        html: adminTemplate.html,
        text: `New contact from ${name.trim()}: ${subject.trim()}`,
        template: "contact-admin",
      });
      notifications.admin = adminSent ? "sent" : "failed";
      if (!adminSent) lastError = "Admin email delivery failed";
    } catch (err) {
      notifications.admin = "failed";
      lastError = err instanceof Error ? err.message : "Admin email error";
      console.error("[Contact] Admin email error:", err);
    }

    // ── User acknowledgement ───────────────────────────────────────────
    try {
      const userTemplate = generateContactConfirmationEmail({
        name: name.trim(),
        subject: subject.trim(),
        contactId,
      });
      const userSent = await sendEmail({
        to: email.toLowerCase().trim(),
        subject: userTemplate.subject,
        html: userTemplate.html,
        text: `Thank you ${name.trim()}, we received your message: ${subject.trim()}`,
        template: "contact-confirmation",
      });
      notifications.user = userSent ? "sent" : "failed";
      if (!userSent && !lastError) lastError = "User confirmation email failed";
    } catch (err) {
      notifications.user = "failed";
      if (!lastError) lastError = err instanceof Error ? err.message : "User email error";
      console.error("[Contact] User email error:", err);
    }

    // ── In-app notification to admins ──────────────────────────────────
    try {
      await notifyAdmins(
        "New Contact Form Submission",
        `${name.trim()} (${email.toLowerCase().trim()}) submitted: ${subject.trim()}`,
        "info",
        "/dashboard/contacts"
      );
    } catch (err) {
      console.error("[Contact] In-app notification error:", err);
    }

    // ── Update contact with email delivery status ──────────────────────
    const allFailed = notifications.admin === "failed" && notifications.user === "failed";
    const someFailed = notifications.admin === "failed" || notifications.user === "failed";

    await Contact.updateOne(
      { _id: contact._id },
      {
        $set: {
          "emailStatus.admin": notifications.admin || "not_applicable",
          "emailStatus.related": notifications.related || "not_applicable",
          "emailStatus.user": notifications.user || "not_applicable",
          "emailStatus.lastError": lastError,
          "emailStatus.lastAttemptAt": new Date(),
        },
      }
    );

    // ── Response ───────────────────────────────────────────────────────
    if (allFailed) {
      return NextResponse.json({
        success: true,
        saved: true,
        notifications,
        warning: "Your message was saved, but email notifications could not be delivered. Our team has been notified in-app.",
      }, { status: 201 });
    }

    if (someFailed) {
      return NextResponse.json({
        success: true,
        saved: true,
        notifications,
        warning: "Your message was received, but one or more email notifications could not be delivered.",
      }, { status: 201 });
    }

    return NextResponse.json({
      success: true,
      saved: true,
      notifications,
      message: "Your message has been sent successfully. We'll get back to you soon.",
    }, { status: 201 });
  } catch (error) {
    console.error("Contact POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user || !["super-admin", "admin", "manager", "staff"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");

    const query: Record<string, unknown> = {};
    if (status) query.status = status;

    const total = await Contact.countDocuments(query);
    const contacts = await Contact.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      data: contacts,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Contact GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
