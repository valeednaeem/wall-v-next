/**
 * Centralized security utilities — rate limiting, abuse detection, input validation,
 * CAPTCHA verification, file validation, and security event logging.
 *
 * IMPORTANT: The in-memory rate limiter works for single-instance deployments.
 * For multi-instance/serverless (Vercel), this provides per-invocation protection.
 * For cross-instance rate limiting, replace with Upstash Redis or similar.
 */
import { connectToDatabase } from "@/lib/mongodb";
import SecurityEvent from "@/models/security-event";

// ─── IP Extraction ───────────────────────────────────────────────────────────

export function getClientIp(request: Request): string {
  // In production behind Vercel's edge, x-forwarded-for is set by the proxy.
  // x-forwarded-for CAN be spoofed if not behind a trusted reverse proxy,
  // but Vercel strips/replaces it at the edge, so it's safe in production.
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

// ─── In-Memory Rate Limiter ──────────────────────────────────────────────────
// Per-invocation protection. Works for single-instance and provides per-request
// throttling even in serverless (each cold start gets fresh state, but same
// invocation handles one request).

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt };
}

// Cleanup stale entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now > entry.resetAt) rateLimitStore.delete(key);
    }
  }, 5 * 60 * 1000);
}

// ─── Preset Rate Limits ──────────────────────────────────────────────────────

export const RATE_LIMITS = {
  SIGNUP: { maxRequests: 3, windowMs: 60 * 60 * 1000 },          // 3 per hour per IP
  LOGIN: { maxRequests: 5, windowMs: 15 * 60 * 1000 },           // 5 per 15min per IP
  LOGIN_EMAIL: { maxRequests: 5, windowMs: 15 * 60 * 1000 },     // 5 per 15min per email
  PASSWORD_RESET: { maxRequests: 3, windowMs: 60 * 60 * 1000 },  // 3 per hour per email
  PUBLIC_FORM: { maxRequests: 5, windowMs: 60 * 60 * 1000 },     // 5 per hour per IP
  AI_CHAT: { maxRequests: 20, windowMs: 60 * 1000 },              // 20 per minute per session
  MASTER_CHAT: { maxRequests: 10, windowMs: 60 * 1000 },          // 10 per minute per IP
  FILE_UPLOAD: { maxRequests: 10, windowMs: 60 * 60 * 1000 },     // 10 per hour per user
  WEBHOOK: { maxRequests: 30, windowMs: 60 * 1000 },              // 30 per minute per IP
  SEND_VERIFICATION: { maxRequests: 3, windowMs: 60 * 60 * 1000 },// 3 per hour per IP
  LOGOUT: { maxRequests: 10, windowMs: 60 * 1000 },               // 10 per minute per IP
};

// ─── Honeypot Check ──────────────────────────────────────────────────────────
// Bot fills hidden fields; humans don't see them.

export function checkHoneypot(body: Record<string, unknown>): boolean {
  const honeypotFields = ["website", "fax", "company_url", "referrer"];
  for (const field of honeypotFields) {
    if (body[field] && String(body[field]).trim() !== "") {
      return false; // Bot detected
    }
  }
  return true; // Human (or no honeypot triggered)
}

// ─── Timing Check ────────────────────────────────────────────────────────────
// Forms completed too fast are likely bots.

export function checkTiming(body: Record<string, unknown>, minSeconds: number = 3): boolean {
  const startedAt = body._startedAt;
  if (!startedAt || typeof startedAt !== "number") return true; // No timing data = allow
  const elapsed = (Date.now() - startedAt) / 1000;
  return elapsed >= minSeconds;
}

// ─── CAPTCHA Verification (Cloudflare Turnstile) ─────────────────────────────

export async function verifyCaptcha(token: string, ip: string): Promise<{ success: boolean; error?: string }> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  // If CAPTCHA is not configured, skip verification (graceful degradation)
  if (!secretKey) {
    console.warn("[Security] TURNSTILE_SECRET_KEY not configured — CAPTCHA verification skipped");
    return { success: true };
  }

  if (!token) {
    return { success: false, error: "CAPTCHA token is required" };
  }

  try {
    const formData = new URLSearchParams();
    formData.append("secret", secretKey);
    formData.append("response", token);
    formData.append("remoteip", ip);

    const result = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
    });

    const data = await result.json();

    if (data.success) {
      return { success: true };
    }

    return {
      success: false,
      error: data["error-codes"]?.[0] || "CAPTCHA verification failed",
    };
  } catch (error) {
    console.error("[Security] CAPTCHA verification error:", error);
    // Fail open for availability — don't block users if CAPTCHA service is down
    return { success: true };
  }
}

// ─── Input Validation ────────────────────────────────────────────────────────

export function validateEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim().toLowerCase();
  if (trimmed.length < 5 || trimmed.length > 254) return false;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(trimmed);
}

export function validateName(name: string): boolean {
  if (!name || typeof name !== "string") return false;
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 100) return false;
  if (/<script|javascript:|on\w+\s*=|<iframe|<object|<embed/i.test(trimmed)) return false;
  return true;
}

export function validatePassword(password: string): { valid: boolean; reason?: string } {
  if (!password || typeof password !== "string") return { valid: false, reason: "Password is required" };
  if (password.length < 8) return { valid: false, reason: "Password must be at least 8 characters" };
  if (password.length > 128) return { valid: false, reason: "Password is too long" };
  if (/\s/.test(password)) return { valid: false, reason: "Password cannot contain spaces" };
  return { valid: true };
}

export function sanitizeString(input: string, maxLength: number = 500): string {
  if (typeof input !== "string") return "";
  return input.trim().slice(0, maxLength);
}

export function validateRoleAssignment(
  targetRole: string,
  requestorRole: string
): { allowed: boolean; reason?: string } {
  const PRIVILEGED_ROLES = ["super-admin", "admin"];
  const CUSTOMER_ONLY = ["customer"];

  if (targetRole === "super-admin" && requestorRole !== "super-admin") {
    return { allowed: false, reason: "Only super-admin can assign super-admin role" };
  }

  if (PRIVILEGED_ROLES.includes(requestorRole)) {
    if (PRIVILEGED_ROLES.includes(targetRole) && requestorRole !== "super-admin") {
      return { allowed: false, reason: "Only super-admin can assign admin roles" };
    }
    return { allowed: true };
  }

  if (!CUSTOMER_ONLY.includes(targetRole)) {
    return { allowed: false, reason: "You can only assign the customer role" };
  }

  return { allowed: true };
}

// ─── File Validation ─────────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
]);

// Magic bytes for file type validation (first few bytes of file)
const FILE_SIGNATURES: Record<string, number[][]> = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47]],
  "image/gif": [[0x47, 0x49, 0x46, 0x38]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]], // RIFF header
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]],
  "application/zip": [[0x50, 0x4b, 0x03, 0x04]], // Also covers .docx, .xlsx
};

export function validateFileType(mimeType: string, fileBytes?: Uint8Array): { valid: boolean; reason?: string } {
  // Check against allowlist
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return { valid: false, reason: `File type ${mimeType} is not allowed` };
  }

  // If file content provided, validate magic bytes
  if (fileBytes && fileBytes.length >= 4) {
    const expectedSignatures = FILE_SIGNATURES[mimeType];
    if (expectedSignatures) {
      const matches = expectedSignatures.some((sig) =>
        sig.every((byte, i) => fileBytes[i] === byte)
      );
      if (!matches) {
        return { valid: false, reason: "File content does not match declared type" };
      }
    }
  }

  return { valid: true };
}

export function sanitizeFilename(filename: string): string {
  // Remove path separators, null bytes, and dangerous characters
  return filename
    .replace(/[\/\\:*?"<>|\x00-\x1f]/g, "")
    .replace(/\.\./g, "")
    .slice(0, 255);
}

// ─── Account Status ──────────────────────────────────────────────────────────

export const ACCOUNT_STATUS = {
  ACTIVE: "active",
  PENDING_VERIFICATION: "pending_verification",
  SUSPENDED: "suspended",
  QUARANTINED: "quarantined",
  BLOCKED: "blocked",
} as const;

// ─── Security Event Logging ──────────────────────────────────────────────────

export type SecurityEventType =
  | "signup_attempt"
  | "signup_success"
  | "signup_blocked"
  | "login_success"
  | "login_failed"
  | "login_blocked"
  | "password_reset_requested"
  | "password_reset_success"
  | "email_verification_sent"
  | "email_verified"
  | "role_change_attempt"
  | "privilege_escalation_attempt"
  | "rate_limit_triggered"
  | "honeypot_triggered"
  | "timing_check_failed"
  | "unauthorized_api_access"
  | "account_suspended"
  | "account_quarantined"
  | "suspicious_activity"
  | "webhook_signature_invalid"
  | "webhook_rate_limit"
  | "input_validation_failed"
  | "token_revoked"
  | "token_revocation_failed"
  | "file_upload_blocked"
  | "captcha_failed"
  | "session_invalidated";

export async function logSecurityEvent(params: {
  type: SecurityEventType;
  severity?: "low" | "medium" | "high" | "critical";
  userId?: string;
  email?: string;
  ip: string;
  userAgent?: string;
  path?: string;
  method?: string;
  details?: Record<string, unknown>;
  blocked?: boolean;
}): Promise<void> {
  try {
    await connectToDatabase();
    await SecurityEvent.create({
      type: params.type,
      severity: params.severity || "medium",
      userId: params.userId,
      email: params.email,
      ip: params.ip,
      userAgent: params.userAgent,
      path: params.path,
      method: params.method,
      details: params.details,
      blocked: params.blocked || false,
    });
  } catch {
    console.error("[Security] Failed to log event:", params.type);
  }
}

// ─── Abuse Detection ─────────────────────────────────────────────────────────

const registrationAttempts = new Map<string, { count: number; firstAttempt: number; lastAttempt: number }>();

export function detectRegistrationAbuse(ip: string, email: string): { suspicious: boolean; reason?: string } {
  const now = Date.now();
  const hourAgo = now - 60 * 60 * 1000;

  const ipEntry = registrationAttempts.get(`ip:${ip}`);
  if (ipEntry && ipEntry.firstAttempt > hourAgo) {
    if (ipEntry.count >= 3) {
      return { suspicious: true, reason: `IP ${ip} has ${ipEntry.count} registration attempts in the last hour` };
    }
  }

  const domain = email.split("@")[1];
  if (domain) {
    const domainEntry = registrationAttempts.get(`domain:${domain}`);
    if (domainEntry && domainEntry.firstAttempt > hourAgo) {
      if (domainEntry.count >= 5) {
        return { suspicious: true, reason: `Domain ${domain} has ${domainEntry.count} registrations in the last hour` };
      }
    }
  }

  const ipKey = `ip:${ip}`;
  const existing = registrationAttempts.get(ipKey);
  if (existing && existing.firstAttempt > hourAgo) {
    existing.count++;
    existing.lastAttempt = now;
  } else {
    registrationAttempts.set(ipKey, { count: 1, firstAttempt: now, lastAttempt: now });
  }

  const domainKey = `domain:${domain}`;
  const domainExisting = registrationAttempts.get(domainKey);
  if (domainExisting && domainExisting.firstAttempt > hourAgo) {
    domainExisting.count++;
    domainExisting.lastAttempt = now;
  } else if (domain) {
    registrationAttempts.set(domainKey, { count: 1, firstAttempt: now, lastAttempt: now });
  }

  return { suspicious: false };
}

// Cleanup abuse tracking every 10 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const hourAgo = Date.now() - 60 * 60 * 1000;
    for (const [key, entry] of registrationAttempts.entries()) {
      if (entry.firstAttempt < hourAgo) registrationAttempts.delete(key);
    }
  }, 10 * 60 * 1000);
}
