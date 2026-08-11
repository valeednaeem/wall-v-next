import { verifyToken, type JWTPayload } from "./jwt";
import { auth } from "./auth";

export async function getAuthUserFromCookie(): Promise<JWTPayload | null> {
  try {
    // First try the custom JWT token cookie
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (token) {
      const payload = verifyToken(token);
      if (payload) return payload;
    }

    // Fallback to NextAuth session
    const session = await auth();
    if (session?.user?.id) {
      return {
        userId: session.user.id,
        email: session.user.email || "",
        role: (session.user as { role?: string }).role || "customer",
      };
    }

    return null;
  } catch {
    return null;
  }
}
