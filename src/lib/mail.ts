interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: EmailOptions): Promise<boolean> {
  try {
    // TODO: Integrate with SMTP provider (Nodemailer, Resend, SendGrid, etc.)
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
