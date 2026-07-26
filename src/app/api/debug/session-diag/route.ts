import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const error = url.searchParams.get("error");
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    const nextAuthCookies = allCookies.filter(
      (c) =>
        c.name.includes("authjs") ||
        c.name.includes("next-auth") ||
        c.name.includes("__Secure-") ||
        c.name.includes("__Host-") ||
        c.name === "token"
    );

    const session = await auth();

    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
    const secretLen = secret?.length || 0;

    return NextResponse.json(
      {
        url: req.url,
        error,
        code: code ? code.substring(0, 10) + "..." : null,
        state,
        secret: {
          source: process.env.NEXTAUTH_SECRET ? "NEXTAUTH_SECRET" : "AUTH_SECRET",
          length: secretLen,
        },
        sessionResult: session
          ? { user: session.user, expires: session.expires }
          : null,
        authCookieCount: nextAuthCookies.length,
        authCookies: nextAuthCookies.map((c) => ({
          name: c.name,
          valueLength: c.value.length,
          valuePreview: c.value.substring(0, 30),
        })),
        allCookieNames: allCookies.map((c) => c.name),
      },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
