import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/api", "/portal"],
      },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL || "https://wall-v.com"}/sitemap.xml`,
  };
}
