import { verifyToken, type JWTPayload } from "./jwt";
import { auth } from "./auth";

export async function getAuthUserFromCookie(): Promise<JWTPayload | null> {
  try {
    // Auth.js is the canonical dashboard session.
    const session = await auth();
    if (session?.user?.id) {
      return {
        userId: session.user.id,
        email: session.user.email || "",
        role: (session.user as { role?: string }).role || "customer",
      };
    }

    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const legacyToken = cookieStore.get("token")?.value;
    if (legacyToken) {
      const payload = verifyToken(legacyToken);
      if (payload) return payload;
    }

    return null;
  } catch {
    return null;
  }
}
