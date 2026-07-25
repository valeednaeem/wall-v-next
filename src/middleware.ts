import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Pass through NextAuth API routes
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Pass through static files and Next.js internals
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.includes(".")) {
    return NextResponse.next();
  }

  // Proxy /api/backend/* requests to the backend server
  if (pathname.startsWith("/api/backend/")) {
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

  // Proxy /api/* requests to backend (catch-all for API routes)
  // Exclude routes that have local Next.js handlers
  const LOCAL_API_PREFIXES = ["/api/ai", "/api/settings", "/api/auth"];
  if (pathname.startsWith("/api/") && !LOCAL_API_PREFIXES.some((p) => pathname.startsWith(p))) {
    const backendUrl = new URL(pathname, BACKEND_URL);
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
      // If backend is down, let Next.js handle it (the route may still work with local logic)
      return NextResponse.next();
    }
  }

  // All other routes pass through
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
