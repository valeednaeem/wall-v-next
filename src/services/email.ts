import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    if (!process.env.SMTP_USER) {
      console.log("[Email] SMTP not configured, skipping email:", options.subject);
      return false;
    }

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    console.log("[Email] Sent:", options.subject, "to", options.to);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send:", error);
    return false;
  }
}

// ─── Email Templates ────────────────────────────────────────────────────────

export function projectCreatedEmail(projectName: string, clientName: string, previewUrl: string): EmailOptions & { subject: string } {
  return {
    to: "",
    subject: `Your project "${projectName}" has been created`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Project Created</h2>
        <p>Hi ${clientName},</p>
        <p>Your project <strong>"${projectName}"</strong> has been created successfully.</p>
        <p>You can preview your project demo using the link below:</p>
        <a href="${previewUrl}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 16px 0;">View Demo</a>
        <p style="color: #666; font-size: 14px;">If you have any questions, reply to this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">Wall-V Digital Agency</p>
      </div>
    `,
  };
}

export function milestonePaidEmail(projectName: string, milestoneName: string, amount: number, invoiceNumber: string): EmailOptions & { subject: string } {
  return {
    to: "",
    subject: `Payment received for "${projectName}" — ${milestoneName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Payment Confirmed</h2>
        <p>Thank you for your payment!</p>
        <div style="background: #f9f9f9; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p><strong>Project:</strong> ${projectName}</p>
          <p><strong>Milestone:</strong> ${milestoneName}</p>
          <p><strong>Amount:</strong> $${amount.toLocaleString()} USD</p>
          <p><strong>Invoice:</strong> ${invoiceNumber}</p>
        </div>
        <p>Our team will begin working on this milestone and keep you updated on progress.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">Wall-V Digital Agency</p>
      </div>
    `,
  };
}

export function adminNewProjectEmail(projectName: string, clientName: string, projectType: string, budget: string): EmailOptions & { subject: string } {
  return {
    to: "",
    subject: `New project created: "${projectName}"`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New Project Created</h2>
        <p>A new project has been created by the AI agent:</p>
        <div style="background: #f9f9f9; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p><strong>Project:</strong> ${projectName}</p>
          <p><strong>Client:</strong> ${clientName}</p>
          <p><strong>Type:</strong> ${projectType}</p>
          <p><strong>Budget:</strong> ${budget}</p>
        </div>
        <a href="/dashboard/projects" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 16px 0;">View in Dashboard</a>
      </div>
    `,
  };
}

export function milestoneCompletedEmail(projectName: string, milestoneName: string): EmailOptions & { subject: string } {
  return {
    to: "",
    subject: `Milestone completed: "${milestoneName}" in ${projectName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Milestone Completed</h2>
        <p>Great news! A milestone in your project has been completed:</p>
        <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #22c55e;">
          <p><strong>Project:</strong> ${projectName}</p>
          <p><strong>Milestone:</strong> ${milestoneName}</p>
        </div>
        <p>Please review the deliverables and let us know if you have any feedback.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">Wall-V Digital Agency</p>
      </div>
    `,
  };
}
