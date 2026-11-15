import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Development-only CSP entries
const devConnectSrc = isDev
  ? " http://localhost:3010 http://localhost:8000"
  : "";

const devScriptSrc = isDev ? " http://localhost:3010" : "";

const devCorsOrigins = isDev ? " http://localhost:3000" : "";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Vapi Web SDK → Daily.co runtime: the SDK loads Daily's
      // call-machine bundle from c.daily.co at call start (blob: for
      // Daily's audio workers). Dograh entries are retained untouched.
      `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://checkout.stripe.com https://apis.google.com https://accounts.google.com https://dograh.vercel.app https://app.dograh.com https://www.googletagmanager.com https://www.google-analytics.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://adservice.google.com https://c.daily.co https://*.daily.co https://*.dailywebrtc.com https://*.dailywebrtc.net blob:${devScriptSrc}`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https: http: https://www.google-analytics.com https://stats.g.doubleclick.net",
      "font-src 'self' https://fonts.gstatic.com",
      // Vapi + Daily.co: the Vapi Web SDK creates the web call via
      // POST https://api.vapi.ai, then joins a Daily.co room (HTTPS + WSS
      // on Daily's allowed base domains). Sentry ingest is Daily's bundled
      // error reporter. Dograh entries are retained untouched.
      `connect-src 'self' https://api.openai.com https://api.anthropic.com https://dograh.vercel.app https://app.dograh.com https://api.dograh.com wss://api.dograh.com https://www.google-analytics.com https://region1.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net https://api.vapi.ai https://c.daily.co https://*.daily.co wss://*.daily.co https://*.dailywebrtc.com wss://*.dailywebrtc.com https://*.dailywebrtc.net wss://*.dailywebrtc.net https://*.ingest.sentry.io${devConnectSrc}`,
      "frame-src 'self' https://js.stripe.com https://checkout.stripe.com https://www.youtube.com https://storage.googleapis.com https://maps.google.com https://www.google.com https://pagead2.googlesyndication.com https://tpc.googlesyndication.com",
      // Daily.co spawns audio-processing workers from blob: URLs and
      // plays remote audio via blob:/mediastream: sources during a call.
      "worker-src 'self' blob:",
      "media-src 'self' blob: mediastream:",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  redirects: async () => [
    { source: "/shop", destination: "/products", permanent: true },
    { source: "/shop/:path*", destination: "/products/:path*", permanent: true },
    { source: "/dashboard/voice-agent-conversations", destination: "/dashboard/ai-conversations", permanent: true },
    { source: "/dashboard/invoices", destination: "/dashboard/projects", permanent: true },
    { source: "/dashboard/sales", destination: "/dashboard/projects", permanent: true },
    { source: "/dashboard/production", destination: "/dashboard/projects", permanent: true },
    { source: "/dashboard/client-portal", destination: "/dashboard/projects", permanent: true },
    { source: "/dashboard/previews", destination: "/dashboard/projects", permanent: true },
    { source: "/dashboard/billing", destination: "/dashboard/settings", permanent: true },
    { source: "/dashboard/contacts", destination: "/dashboard/crm", permanent: true },
    { source: "/dashboard/gdpr", destination: "/dashboard/settings", permanent: true },
    { source: "/dashboard/notifications", destination: "/dashboard/settings", permanent: true },
    { source: "/dashboard/pages", destination: "/dashboard/blog", permanent: true },
    { source: "/dashboard/resellerspanel", destination: "/dashboard/settings", permanent: true },
    { source: "/dashboard/services", destination: "/dashboard/marketing", permanent: true },
    { source: "/dashboard/support", destination: "/dashboard", permanent: true },
    { source: "/dashboard/tags", destination: "/dashboard/ecommerce/products", permanent: true },
    { source: "/dashboard/teams", destination: "/dashboard/users", permanent: true },
    { source: "/dashboard/contentManagement", destination: "/dashboard/blog", permanent: true },
    { source: "/dashboard/marketing/overview", destination: "/dashboard/marketing", permanent: true },
  ],
  headers: async () => [
    {
      source: "/(.*)",
      headers: securityHeaders,
    },
  ],
};

export default nextConfig;
