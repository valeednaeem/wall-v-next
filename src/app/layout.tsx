import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/providers";
import { CookieConsent } from "@/components/cookie-consent";

const inter = Inter({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Wall-V | AI-Powered Software Agency",
    template: "%s | Wall-V",
  },
  description:
    "Wall-V is an AI-powered software agency specializing in custom software development, AI automation, ERP/CRM solutions, web hosting, domain registration, and digital products.",
  keywords: [
    "software agency",
    "AI automation",
    "custom software development",
    "web hosting",
    "ERP",
    "CRM",
    "SaaS",
    "digital products",
    "web development",
    "Wall-V",
  ],
  authors: [{ name: "Wall-V" }],
  creator: "Wall-V",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Wall-V",
    title: "Wall-V | AI-Powered Software Agency",
    description:
      "AI-powered software agency providing custom software development, AI automation, ERP/CRM solutions, web hosting, and digital products.",
    images: [{ url: "/og-default.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Wall-V | AI-Powered Software Agency",
    description:
      "AI-powered software agency providing custom software development, AI automation, ERP/CRM solutions, web hosting, and digital products.",
    images: ["/og-default.png"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={cn("scroll-smooth antialiased", inter.className)}>
      <body className="min-h-screen bg-white">
        <Providers>{children}</Providers>
        <CookieConsent />
      </body>
    </html>
  );
}
