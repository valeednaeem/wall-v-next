import { cookies } from "next/headers";
import { verifyToken, type JWTPayload } from "./jwt";

export async function getAuthUserFromCookie(): Promise<JWTPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}
