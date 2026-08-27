/**
 * Centralized security utilities — rate limiting, abuse detection, input validation.
 *
 * IMPORTANT: The in-memory rate limiter works for single-instance deployments.
 * For multi-instance/serverless, replace with Redis-backed implementation.
 */
import { connectToDatabase } from "@/lib/mongodb";
import SecurityEvent from "@/models/security-event";

// ─── IP Extraction ───────────────────────────────────────────────────────────

export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

// ─── In-Memory Rate Limiter ──────────────────────────────────────────────────
// Works for single-instance. Replace with Redis for distributed.

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
  SIGNUP: { maxRequests: 3, windowMs: 60 * 60 * 1000 },        // 3 per hour per IP
  LOGIN: { maxRequests: 5, windowMs: 15 * 60 * 1000 },         // 5 per 15min per IP
  LOGIN_EMAIL: { maxRequests: 5, windowMs: 15 * 60 * 1000 },   // 5 per 15min per email
  PASSWORD_RESET: { maxRequests: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour per email
  PUBLIC_FORM: { maxRequests: 5, windowMs: 60 * 60 * 1000 },   // 5 per hour per IP
  AI_CHAT: { maxRequests: 20, windowMs: 60 * 1000 },            // 20 per minute per session
  MASTER_CHAT: { maxRequests: 10, windowMs: 60 * 1000 },        // 10 per minute per IP
  FILE_UPLOAD: { maxRequests: 10, windowMs: 60 * 60 * 1000 },   // 10 per hour per user
};

// ─── Honeypot Check ──────────────────────────────────────────────────────────
// Bot fills hidden fields; humans don't see them.

export function checkHoneypot(body: Record<string, unknown>): boolean {
  // If honeypot field has any value, it's a bot
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

// ─── Input Validation ────────────────────────────────────────────────────────

export function validateEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim().toLowerCase();
  if (trimmed.length < 5 || trimmed.length > 254) return false;
  // Basic email format check
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(trimmed);
}

export function validateName(name: string): boolean {
  if (!name || typeof name !== "string") return false;
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 100) return false;
  // No script tags or dangerous content
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

  // Only super-admin can assign super-admin
  if (targetRole === "super-admin" && requestorRole !== "super-admin") {
    return { allowed: false, reason: "Only super-admin can assign super-admin role" };
  }

  // Admin can assign admin and below
  if (PRIVILEGED_ROLES.includes(requestorRole)) {
    if (PRIVILEGED_ROLES.includes(targetRole) && requestorRole !== "super-admin") {
      return { allowed: false, reason: "Only super-admin can assign admin roles" };
    }
    return { allowed: true };
  }

  // Non-admin users can only assign customer
  if (!CUSTOMER_ONLY.includes(targetRole)) {
    return { allowed: false, reason: "You can only assign the customer role" };
  }

  return { allowed: true };
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
  | "input_validation_failed";

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
    // Security logging must never crash the request
    console.error("[Security] Failed to log event:", params.type);
  }
}

// ─── Abuse Detection ─────────────────────────────────────────────────────────

const registrationAttempts = new Map<string, { count: number; firstAttempt: number; lastAttempt: number }>();

export function detectRegistrationAbuse(ip: string, email: string): { suspicious: boolean; reason?: string } {
  const now = Date.now();
  const hourAgo = now - 60 * 60 * 1000;

  // Check IP-based abuse
  const ipEntry = registrationAttempts.get(`ip:${ip}`);
  if (ipEntry && ipEntry.firstAttempt > hourAgo) {
    if (ipEntry.count >= 3) {
      return { suspicious: true, reason: `IP ${ip} has ${ipEntry.count} registration attempts in the last hour` };
    }
  }

  // Check email domain abuse (multiple accounts from same domain)
  const domain = email.split("@")[1];
  if (domain) {
    const domainEntry = registrationAttempts.get(`domain:${domain}`);
    if (domainEntry && domainEntry.firstAttempt > hourAgo) {
      if (domainEntry.count >= 5) {
        return { suspicious: true, reason: `Domain ${domain} has ${domainEntry.count} registrations in the last hour` };
      }
    }
  }

  // Record attempt
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
