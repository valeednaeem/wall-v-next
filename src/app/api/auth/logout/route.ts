import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, revokeToken } from "@/lib/jwt";
import { checkRateLimit, getClientIp, logSecurityEvent } from "@/lib/security";

/**
 * POST /api/auth/logout
 * Revokes the current JWT token and clears the cookie.
 * Token is added to blocklist so it cannot be used again.
 */
export async function POST() {
  try {
    const ip = getClientIp({ headers: new Headers() } as Request);

    // Rate limit: 10 per minute
    const rl = checkRateLimit("logout:" + ip, 10, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        // Revoke the token
        try {
          await revokeToken(token, "logout", payload.userId);
        } catch {
          // If blocklist fails, still clear cookie — fail open for UX
          console.warn("[Logout] Failed to revoke token in blocklist");
        }

        await logSecurityEvent({
          type: "token_revoked",
          severity: "low",
          userId: payload.userId,
          email: payload.email || undefined,
          ip,
          path: "/api/auth/logout",
          method: "POST",
          details: { reason: "logout" },
        });
      }
    }

    // Clear the cookie
    cookieStore.set("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 0,
      path: "/",
    });

    return NextResponse.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
