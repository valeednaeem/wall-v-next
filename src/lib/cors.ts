import { NextResponse } from "next/server";

const isDev = process.env.NODE_ENV === "development";

const ALLOWED_ORIGINS = [
  "https://app.dograh.com",
  "https://api.dograh.com",
  "https://wall-v-next-six.vercel.app",
  "https://www.wall-v.com",
  "https://wall-v.com",
  ...(isDev ? ["http://localhost:3000"] : []),
];

export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

export function handleOPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": isDev ? "http://localhost:3000" : ALLOWED_ORIGINS[0],
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}