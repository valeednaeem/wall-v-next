import crypto from "crypto";
import { cookies } from "next/headers";

const CSRF_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "csrf-fallback-secret";
const CSRF_TOKEN_NAME = "csrf-token";
const CSRF_HEADER_NAME = "x-csrf-token";

export function generateCsrfToken(): string {
  const token = crypto.randomBytes(32).toString("hex");
  const signature = crypto
    .createHmac("sha256", CSRF_SECRET)
    .update(token)
    .digest("hex");
  return `${token}.${signature}`;
}

export function verifyCsrfToken(token: string): boolean {
  const [tokenValue, signature] = token.split(".");
  if (!tokenValue || !signature) return false;

  const expectedSignature = crypto
    .createHmac("sha256", CSRF_SECRET)
    .update(tokenValue)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(expectedSignature, "hex")
  );
}

export async function requireCsrf(handler: Function) {
  return async (req: Request, ctx?: unknown) => {
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get(CSRF_TOKEN_NAME)?.value;
    const headerToken = req.headers.get(CSRF_HEADER_NAME);

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      if (!verifyCsrfToken(headerToken || "")) {
        return new Response(JSON.stringify({ error: "Invalid CSRF token" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    return handler(req, ctx);
  };
}

export { CSRF_TOKEN_NAME, CSRF_HEADER_NAME };
