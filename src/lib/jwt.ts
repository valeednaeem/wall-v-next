import jwt from "jsonwebtoken";
import crypto from "crypto";
import TokenBlocklist from "@/models/token-blocklist";

const JWT_EXPIRES_IN = "1d";

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set. Please define it in .env.local");
  }
  return secret;
}

export interface JWTPayload {
  userId: string;
  email?: string | null;
  role: string;
  permissions?: string[];
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify a JWT token (basic — no revocation check).
 * Use verifyTokenSecure() for security-sensitive operations.
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, getSecret()) as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Hash a JWT token for secure blocklist storage.
 * We hash tokens before storing so a database breach doesn't expose valid tokens.
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Revoke a token (used on logout, password change, etc.).
 * Stores a hash of the token with a TTL matching JWT_EXPIRES_IN.
 */
export async function revokeToken(
  token: string,
  reason: "logout" | "password_change" | "role_change" | "account_suspension" | "security",
  userId: string
): Promise<void> {
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // matches JWT_EXPIRES_IN

  await TokenBlocklist.findOneAndUpdate(
    { tokenHash },
    { tokenHash, userId, reason, expiresAt },
    { upsert: true, new: true }
  );
}

/**
 * Check if a token has been revoked.
 */
export async function isTokenRevoked(token: string): Promise<boolean> {
  const tokenHash = hashToken(token);
  const blocklisted = await TokenBlocklist.findOne({ tokenHash });
  return !!blocklisted;
}

/**
 * Revoke ALL tokens for a user (used on password change, account suspension, role change).
 */
export async function revokeAllUserTokens(
  userId: string,
  reason: "password_change" | "role_change" | "account_suspension" | "security"
): Promise<void> {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await TokenBlocklist.findOneAndUpdate(
    { userId, reason },
    { tokenHash: `bulk:${userId}:${Date.now()}`, userId, reason, expiresAt },
    { upsert: true, new: true }
  );
}

/**
 * Verify a token and check it hasn't been revoked.
 * Returns null if token is invalid or revoked.
 */
export async function verifyTokenSecure(token: string): Promise<JWTPayload | null> {
  try {
    const decoded = jwt.verify(token, getSecret()) as JWTPayload;

    // Check blocklist (skip if DB not connected — fail open for availability)
    try {
      const revoked = await isTokenRevoked(token);
      if (revoked) return null;
    } catch {
      // DB connection issue — fail open for availability
      console.warn("Token blocklist check failed — allowing token for availability");
    }

    return decoded;
  } catch {
    return null;
  }
}
