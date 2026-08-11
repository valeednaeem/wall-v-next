import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL;

function hasValidSessionCookie(request: NextRequest): boolean {
  const sessionToken = request.cookies.get("next-auth.session-token")?.value
    || request.cookies.get("__Secure-next-auth.session-token")?.value;
  const customToken = request.cookies.get("token")?.value;
  return !!(sessionToken || customToken);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only proxy /api/backend/* to the external backend server
  if (pathname.startsWith("/api/backend/") && BACKEND_URL) {
    const backendPath = pathname.replace("/api/backend", "");
    const backendUrl = new URL(backendPath, BACKEND_URL);
    backendUrl.search = request.nextUrl.search;

    try {
      const headers = new Headers();
      request.headers.forEach((value, key) => {
        if (key !== "host") headers.set(key, value);
      });

      const init: RequestInit = {
        method: request.method,
        headers,
      };

      if (request.method !== "GET" && request.method !== "HEAD") {
        init.body = await request.arrayBuffer();
      }

      const response = await fetch(backendUrl.toString(), init);

      const responseHeaders = new Headers();
      response.headers.forEach((value, key) => {
        if (!["content-encoding", "transfer-encoding"].includes(key.toLowerCase())) {
          responseHeaders.set(key, value);
        }
      });

      return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch {
      return NextResponse.json({ error: "Backend service unavailable" }, { status: 502 });
    }
  }

  // Protect /dashboard/* routes - require authentication
  if (pathname.startsWith("/dashboard")) {
    if (!hasValidSessionCookie(request)) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // All other routes pass through to Next.js handlers
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/backend/:path*", "/dashboard/:path*"],
};
