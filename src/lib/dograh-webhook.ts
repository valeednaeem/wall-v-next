import crypto from "crypto";

export const MAX_DOGRAH_WEBHOOK_BYTES = 1_000_000;

export interface DograhWebhookAuthResult {
  ok: boolean;
  status: 200 | 401 | 503;
  reason?: string;
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function authenticateDograhWebhook(request: Request): DograhWebhookAuthResult {
  const secret = process.env.DOGRAH_WEBHOOK_SECRET;
  if (!secret) {
    return {
      ok: false,
      status: 503,
      reason: "Dograh webhook authentication is not configured.",
    };
  }

  const headerName = process.env.DOGRAH_WEBHOOK_HEADER?.trim() || "X-API-Key";
  const providedSecret = request.headers.get(headerName);

  if (providedSecret && safeEqual(providedSecret, secret)) {
    return { ok: true, status: 200 };
  }

  return { ok: false, status: 401, reason: "Unauthorized webhook request." };
}

export function validateDograhWebhookBody(body: unknown): { valid: boolean; reason?: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { valid: false, reason: "Webhook payload must be a JSON object." };
  }

  const serializedLength = JSON.stringify(body).length;
  if (serializedLength > MAX_DOGRAH_WEBHOOK_BYTES) {
    return { valid: false, reason: "Webhook payload is too large." };
  }

  return { valid: true };
}
