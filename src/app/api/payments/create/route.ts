import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Project from "@/models/project";
import Invoice from "@/models/invoice";
import { sendEmail, milestonePaidEmail } from "@/services/email";
import { notifyAdmins } from "@/lib/notify";
import { getAuthUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, milestoneIndex, amount, currency, method, billingDetails } = body;

    if (!projectId || !amount || !method) {
      return NextResponse.json(
        { error: "Project ID, amount, and payment method are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Ownership check: non-admin users can only create payments for their own projects
    const adminRoles = ["super-admin", "admin", "manager"];
    if (!adminRoles.includes(user.role)) {
      const clientEmail = project.client?.email;
      if (!clientEmail || clientEmail !== user.email) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
    }

    // Generate invoice number
    const invoiceCount = await Invoice.countDocuments();
    const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(5, "0")}`;

    // If milestone payment, update milestone status
    if (milestoneIndex !== null && milestoneIndex !== undefined) {
      const milestones = project.milestones;
      if (milestones[milestoneIndex]) {
        milestones[milestoneIndex].status = "in-progress";
        project.status = "in-progress";
      }
    } else {
      // Full project payment
      project.status = "in-progress";
    }

    await project.save();

    // Create invoice
    const invoice = await Invoice.create({
      invoiceNumber,
      client: project.client,
      project: project._id,
      items: [
        {
          description: milestoneIndex !== null
            ? `Milestone: ${project.milestones[milestoneIndex]?.name || "Project Phase"}`
            : `Project: ${project.name}`,
          quantity: 1,
          unitPrice: amount,
          total: amount,
        },
      ],
      subtotal: amount,
      tax: 0,
      discount: 0,
      total: amount,
      currency: currency || "USD",
      status: "sent",
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      paymentMethod: method,
      billingAddress: billingDetails ? {
        name: billingDetails.cardName || "",
        address: billingDetails.address || "",
        city: billingDetails.city || "",
        country: billingDetails.country || "",
        zip: billingDetails.zip || "",
      } : undefined,
    });

    // Send email notifications (non-blocking)
    const milestoneName = milestoneIndex !== null
      ? project.milestones[milestoneIndex]?.name || "Project Phase"
      : project.name;
    if (project.client?.email) {
      const emailData = milestonePaidEmail(project.name, milestoneName, amount, invoiceNumber);
      sendEmail({ ...emailData, to: project.client.email }).catch(() => {});
    }
    notifyAdmins("Payment Received", `${project.client?.name || "Client"} paid $${amount} for "${project.name}" — ${milestoneName}`, "success", `/dashboard/projects`).catch(() => {});

    let redirectUrl = "";

    switch (method) {
      case "stripe":
        redirectUrl = `/checkout/${projectId}/success?method=stripe&amount=${amount}&invoice=${invoiceNumber}&milestone=${milestoneIndex ?? "full"}`;
        break;
      case "paypal":
        redirectUrl = `/checkout/${projectId}/success?method=paypal&amount=${amount}&invoice=${invoiceNumber}&milestone=${milestoneIndex ?? "full"}`;
        break;
      case "2checkout":
        redirectUrl = `/checkout/${projectId}/success?method=2checkout&amount=${amount}&invoice=${invoiceNumber}&milestone=${milestoneIndex ?? "full"}`;
        break;
      default:
        return NextResponse.json({ error: "Unsupported payment method" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        redirectUrl,
        paymentId: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        invoiceNumber,
        method,
        amount,
        currency: currency || "USD",
      },
    });
  } catch (error) {
    console.error("Payment creation error:", error);
    return NextResponse.json({ error: "Payment processing failed" }, { status: 500 });
  }
}
