import nodemailer from "nodemailer";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendEmail({ to, subject, html, text }: EmailOptions): Promise<boolean> {
  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_FROM || "noreply@wall-v.com",
      to,
      subject,
      html,
      text,
    });
    console.log("Email sent:", { to, subject });
    return true;
  } catch (error) {
    console.error("Email error:", error);
    return false;
  }
}

export function generatePasswordResetEmail(resetUrl: string): { subject: string; html: string } {
  return {
    subject: "Reset Your Password - Wall-V",
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #7c3aed;">Reset Your Password</h1>
        <p>You requested a password reset. Click the button below to reset your password.</p>
        <a href="${resetUrl}" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 16px 0;">Reset Password</a>
        <p style="color: #666; font-size: 14px;">This link will expire in 1 hour. If you didn't request this, please ignore this email.</p>
      </div>
    `,
  };
}

export function generateWelcomeEmail(name: string): { subject: string; html: string } {
  return {
    subject: "Welcome to Wall-V!",
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #7c3aed;">Welcome to Wall-V, ${name}!</h1>
        <p>Thank you for joining Wall-V. We're excited to have you on board.</p>
        <p>You can now access our AI-powered tools, manage your projects, and much more.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 16px 0;">Go to Dashboard</a>
      </div>
    `,
  };
}

export function generateProjectStageEmail(opts: {
  clientName: string;
  projectName: string;
  stageName: string;
  status: "started" | "completed";
}): { subject: string; html: string } {
  const action = opts.status === "completed" ? "completed" : "started";
  return {
    subject: `Project ${action.charAt(0).toUpperCase() + action.slice(1)}: ${opts.stageName} - ${opts.projectName}`,
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <div style="background: linear-gradient(135deg, #7c3aed, #6366f1); padding: 24px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">Wall-V Project Update</h1>
        </div>
        <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="color: #374151; font-size: 16px;">Hi ${opts.clientName},</p>
          <p style="color: #374151;">
            The stage <strong>${opts.stageName}</strong> for your project <strong>${opts.projectName}</strong> has been <strong>${action}</strong>.
          </p>
          ${opts.status === "completed"
            ? `<p style="color: #059669; font-weight: bold;">✅ Stage Completed</p>`
            : `<p style="color: #2563eb; font-weight: bold;">🔄 Stage In Progress</p>`
          }
          <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
            You can track progress in your <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/projects" style="color: #7c3aed;">Client Portal</a>.
          </p>
        </div>
        <div style="text-align: center; padding: 16px; color: #9ca3af; font-size: 12px;">
          Wall-V Digital Agency
        </div>
      </div>
    `,
  };
}

export function generateInvoiceEmail(opts: {
  clientName: string;
  projectName: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  dueDate?: string;
  invoiceId: string;
}): { subject: string; html: string } {
  return {
    subject: `Invoice ${opts.invoiceNumber} - ${opts.projectName}`,
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <div style="background: linear-gradient(135deg, #7c3aed, #6366f1); padding: 24px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">New Invoice</h1>
        </div>
        <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="color: #374151; font-size: 16px;">Hi ${opts.clientName},</p>
          <p style="color: #374151;">
            A new invoice has been generated for your project <strong>${opts.projectName}</strong>.
          </p>
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Invoice Number:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold;">${opts.invoiceNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Amount Due:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #7c3aed; font-size: 20px;">
                  ${opts.currency} ${opts.amount.toLocaleString()}
                </td>
              </tr>
              ${opts.dueDate ? `
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Due Date:</td>
                <td style="padding: 8px 0; text-align: right;">${opts.dueDate}</td>
              </tr>
              ` : ""}
            </table>
          </div>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/projects" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 16px 0;">
            View in Portal
          </a>
        </div>
        <div style="text-align: center; padding: 16px; color: #9ca3af; font-size: 12px;">
          Wall-V Digital Agency
        </div>
      </div>
    `,
  };
}

export function generateQuotationEmail(opts: {
  clientName: string;
  projectName: string;
  quoteNumber: string;
  amount: number;
  currency: string;
  validUntil?: string;
}): { subject: string; html: string } {
  return {
    subject: `Quotation ${opts.quoteNumber} - ${opts.projectName}`,
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <div style="background: linear-gradient(135deg, #7c3aed, #6366f1); padding: 24px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">Your Project Quotation</h1>
        </div>
        <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="color: #374151; font-size: 16px;">Hi ${opts.clientName},</p>
          <p style="color: #374151;">
            Here's your quotation for <strong>${opts.projectName}</strong>.
          </p>
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Quote Number:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold;">${opts.quoteNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Total Amount:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #7c3aed; font-size: 20px;">
                  ${opts.currency} ${opts.amount.toLocaleString()}
                </td>
              </tr>
              ${opts.validUntil ? `
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Valid Until:</td>
                <td style="padding: 8px 0; text-align: right;">${opts.validUntil}</td>
              </tr>
              ` : ""}
            </table>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            Please review the quotation and let us know if you have any questions.
            You can approve or discuss changes through your <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/projects" style="color: #7c3aed;">Client Portal</a>.
          </p>
        </div>
        <div style="text-align: center; padding: 16px; color: #9ca3af; font-size: 12px;">
          Wall-V Digital Agency
        </div>
      </div>
    `,
  };
}

export function generatePaymentConfirmationEmail(opts: {
  clientName: string;
  projectName: string;
  amount: number;
  currency: string;
  paymentId: string;
}): { subject: string; html: string } {
  return {
    subject: `Payment Confirmed - ${opts.projectName}`,
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 24px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">Payment Received</h1>
        </div>
        <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="color: #374151; font-size: 16px;">Hi ${opts.clientName},</p>
          <p style="color: #374151;">
            We've received your payment for <strong>${opts.projectName}</strong>.
          </p>
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Amount Paid:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #059669; font-size: 20px;">
                  ${opts.currency} ${opts.amount.toLocaleString()}
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Payment ID:</td>
                <td style="padding: 8px 0; text-align: right; font-size: 12px; color: #6b7280;">${opts.paymentId}</td>
              </tr>
            </table>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            Thank you for your payment! You can view your payment history in the <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/projects" style="color: #7c3aed;">Client Portal</a>.
          </p>
        </div>
        <div style="text-align: center; padding: 16px; color: #9ca3af; font-size: 12px;">
          Wall-V Digital Agency
        </div>
      </div>
    `,
  };
}

export function generateChangeRequestEmail(opts: {
  clientName: string;
  projectName: string;
  changeTitle: string;
  changeType: string;
  status: "submitted" | "approved" | "rejected";
}): { subject: string; html: string } {
  const statusColors: Record<string, string> = {
    submitted: "#2563eb",
    approved: "#059669",
    rejected: "#dc2626",
  };
  return {
    subject: `Change Request ${opts.status.charAt(0).toUpperCase() + opts.status.slice(1)}: ${opts.changeTitle}`,
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <div style="background: linear-gradient(135deg, ${statusColors[opts.status]}, #6366f1); padding: 24px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">Change Request Update</h1>
        </div>
        <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="color: #374151; font-size: 16px;">Hi ${opts.clientName},</p>
          <p style="color: #374151;">
            A change request for <strong>${opts.projectName}</strong> has been <strong style="color: ${statusColors[opts.status]}">${opts.status}</strong>.
          </p>
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0; color: #6b7280;">Change: <strong>${opts.changeTitle}</strong></p>
            <p style="margin: 4px 0 0; color: #6b7280; font-size: 13px;">Type: ${opts.changeType}</p>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            View details in your <a href="${process.env.NEXT_PUBLIC_APP_URL}/client/projects" style="color: #7c3aed;">Client Portal</a>.
          </p>
        </div>
        <div style="text-align: center; padding: 16px; color: #9ca3af; font-size: 12px;">
          Wall-V Digital Agency
        </div>
      </div>
    `,
  };
}

export function generateAccountCreatedEmail(opts: {
  name: string;
  email: string;
}): { subject: string; html: string } {
  return {
    subject: "Welcome to Wall-V — Account Created",
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <div style="background: linear-gradient(135deg, #7c3aed, #6366f1); padding: 24px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">Welcome to Wall-V</h1>
        </div>
        <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="color: #374151; font-size: 16px;">Hi ${opts.name},</p>
          <p style="color: #374151;">Your Wall-V account has been created successfully.</p>
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0; color: #6b7280;">Email: <strong>${opts.email}</strong></p>
          </div>
          <p style="color: #374151;">You can now log in, explore our services, and start projects.</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://www.wall-v.com"}/login" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 16px 0;">Log In to Your Account</a>
        </div>
        <div style="text-align: center; padding: 16px; color: #9ca3af; font-size: 12px;">
          Wall-V Digital Agency
        </div>
      </div>
    `,
  };
}

export function generateProjectCreatedEmail(opts: {
  clientName: string;
  projectName: string;
  projectType?: string;
  budget?: string;
}): { subject: string; html: string } {
  return {
    subject: `Your Project "${opts.projectName}" Has Been Created`,
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 24px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">Project Created</h1>
        </div>
        <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="color: #374151; font-size: 16px;">Hi ${opts.clientName},</p>
          <p style="color: #374151;">Your project has been created and our team will review it shortly.</p>
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Project:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold;">${opts.projectName}</td>
              </tr>
              ${opts.projectType ? `<tr><td style="padding: 8px 0; color: #6b7280;">Type:</td><td style="padding: 8px 0; text-align: right;">${opts.projectType}</td></tr>` : ""}
              ${opts.budget ? `<tr><td style="padding: 8px 0; color: #6b7280;">Budget:</td><td style="padding: 8px 0; text-align: right;">${opts.budget}</td></tr>` : ""}
            </table>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            Track progress in your <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://www.wall-v.com"}/client/projects" style="color: #7c3aed;">Client Portal</a>.
          </p>
        </div>
        <div style="text-align: center; padding: 16px; color: #9ca3af; font-size: 12px;">
          Wall-V Digital Agency
        </div>
      </div>
    `,
  };
}

export function generateInquiryReceivedEmail(opts: {
  clientName: string;
  subject: string;
  service?: string;
}): { subject: string; html: string } {
  return {
    subject: `We Received Your Inquiry — ${opts.subject}`,
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <div style="background: linear-gradient(135deg, #2563eb, #6366f1); padding: 24px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">Inquiry Received</h1>
        </div>
        <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="color: #374151; font-size: 16px;">Hi ${opts.clientName},</p>
          <p style="color: #374151;">Thank you for reaching out. We've received your inquiry and our team will get back to you within 24 hours.</p>
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0; color: #6b7280;">Subject: <strong>${opts.subject}</strong></p>
            ${opts.service ? `<p style="margin: 4px 0 0; color: #6b7280;">Service: <strong>${opts.service}</strong></p>` : ""}
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            You can also view your inquiries in the <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://www.wall-v.com"}/client" style="color: #7c3aed;">Client Portal</a>.
          </p>
        </div>
        <div style="text-align: center; padding: 16px; color: #9ca3af; font-size: 12px;">
          Wall-V Digital Agency
        </div>
      </div>
    `,
  };
}

export function generateProjectStatusEmail(opts: {
  clientName: string;
  projectName: string;
  oldStatus: string;
  newStatus: string;
}): { subject: string; html: string } {
  return {
    subject: `Project Status Updated: ${opts.projectName} → ${opts.newStatus}`,
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <div style="background: linear-gradient(135deg, #7c3aed, #6366f1); padding: 24px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">Project Status Update</h1>
        </div>
        <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="color: #374151; font-size: 16px;">Hi ${opts.clientName},</p>
          <p style="color: #374151;">The status of your project <strong>${opts.projectName}</strong> has been updated.</p>
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0; text-align: center;">
            <span style="color: #6b7280; text-decoration: line-through;">${opts.oldStatus}</span>
            <span style="margin: 0 12px; color: #6b7280;">→</span>
            <span style="font-weight: bold; color: #7c3aed; text-transform: capitalize;">${opts.newStatus}</span>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            View details in your <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://www.wall-v.com"}/client/projects" style="color: #7c3aed;">Client Portal</a>.
          </p>
        </div>
        <div style="text-align: center; padding: 16px; color: #9ca3af; font-size: 12px;">
          Wall-V Digital Agency
        </div>
      </div>
    `,
  };
}
