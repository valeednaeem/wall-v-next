import { signToken, type JWTPayload } from "./jwt";
import { cookies } from "next/headers";

export async function createSession(user: JWTPayload) {
  const token = signToken(user);

  const cookieStore = await cookies();
  cookieStore.set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });

  return token;
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete("token");
}
