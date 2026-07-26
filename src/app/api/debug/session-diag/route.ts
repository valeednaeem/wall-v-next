import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    const nextAuthCookies = allCookies.filter(
      (c) =>
        c.name.includes("authjs") ||
        c.name.includes("next-auth") ||
        c.name.includes("__Secure-") ||
        c.name === "token"
    );

    const session = await auth();

    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
    const secretLen = secret?.length || 0;
    const secretFirst4 = secret?.substring(0, 4) || "none";

    return NextResponse.json(
      {
        secret: {
          source: process.env.NEXTAUTH_SECRET ? "NEXTAUTH_SECRET" : process.env.AUTH_SECRET ? "AUTH_SECRET" : "NONE",
          length: secretLen,
          first4: secretFirst4,
        },
        sessionResult: session
          ? { user: session.user, expires: session.expires }
          : null,
        authCookieCount: nextAuthCookies.length,
        authCookies: nextAuthCookies.map((c) => ({
          name: c.name,
          valueLength: c.value.length,
          valueFirst20: c.value.substring(0, 20),
        })),
        allCookieNames: allCookies.map((c) => c.name),
        trustHost: true,
      },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
