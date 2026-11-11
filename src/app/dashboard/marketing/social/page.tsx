"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { Globe, MessageSquare, Share2, Image, Loader2, CheckCircle2, AlertCircle, ExternalLink, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SocialPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Social Sharing</h2>
        <div className="grid gap-4 md:grid-cols-2 animate-pulse">
          <div className="rounded-lg border p-6">
            <div className="h-4 bg-muted rounded w-1/2 mb-2" />
            <div className="h-4 bg-muted rounded w-1/4" />
          </div>
          <div className="rounded-lg border p-6">
            <div className="h-4 bg-muted rounded w-1/2 mb-2" />
            <div className="h-4 bg-muted rounded w-1/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const cards = [
    {
      href: "/dashboard/marketing/social/og",
      icon: Globe,
      color: "text-blue-500",
      bg: "bg-blue-50",
      border: "border-blue-200",
      title: "Open Graph (Facebook, LinkedIn, Slack)",
      description: "Configure how your pages appear when shared on Facebook, LinkedIn, Slack, and other platforms using Open Graph protocol.",
      features: [
        "Default title, description, and image",
        "Page-specific overrides",
        "Article/Product structured data",
        "Facebook App ID integration",
        "Live preview with generated meta tags",
      ],
      status: "active",
    },
    {
      href: "/dashboard/marketing/social/twitter",
      icon: MessageSquare,
      color: "text-sky-500",
      bg: "bg-sky-50",
      border: "border-sky-200",
      title: "Twitter / X Cards",
      description: "Configure how your pages appear when shared on Twitter/X with Summary Large Image cards.",
      features: [
        "Card type selection (Large Image, Summary, App, Player)",
        "Site and creator @handles",
        "Page-specific overrides",
        "Character count indicators",
        "Live preview with generated meta tags",
      ],
      status: "active",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Share2 className="h-6 w-6 text-primary" />
            Social Sharing Configuration
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Control how your content appears when shared across social platforms</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="rounded-lg border p-6 hover:border-primary/50 hover:bg-accent/30 transition-all group">
            <div className="flex items-start gap-4">
              <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0", card.bg)}>
                <card.icon className={cn("h-6 w-6", card.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">{card.title}</h3>
                  <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                    card.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                  )}>
                    {card.status === "active" ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                    {card.status === "active" ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{card.description}</p>
                <ul className="mt-4 space-y-2">
                  {card.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Configure settings</span>
              <ExternalLink className={cn("h-4 w-4 transition-transform group-hover:translate-x-1", card.color)} />
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Reference */}
      <div className="rounded-lg border p-6 bg-gray-50">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Quick Reference
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="p-4 rounded-lg bg-white border">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Image className="h-4 w-4" />
              Image Specifications
            </h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p><strong>Open Graph:</strong> 1200×630px (1.91:1)</p>
              <p><strong>Twitter Large:</strong> 1200×675px (16:9)</p>
              <p><strong>Twitter Summary:</strong> 300×157px (1.91:1)</p>
              <p><strong>Max file size:</strong> 5MB</p>
              <p><strong>Formats:</strong> JPG, PNG, WebP</p>
            </div>
          </div>
          <div className="p-4 rounded-lg bg-white border">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Character Limits
            </h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p><strong>OG Title:</strong> 60-90 chars</p>
              <p><strong>OG Description:</strong> 160-200 chars</p>
              <p><strong>Twitter Title:</strong> 70 chars</p>
              <p><strong>Twitter Description:</strong> 200 chars</p>
              <p><strong>Twitter Handle:</strong> 15 chars</p>
            </div>
          </div>
          <div className="p-4 rounded-lg bg-white border">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              Testing Tools
            </h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>• Facebook Sharing Debugger</p>
              <p>• Twitter Card Validator</p>
              <p>• LinkedIn Post Inspector</p>
              <p>• Slack Link Unfurl Preview</p>
              <p>• Open Graph Check (opengraph.xyz)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Implementation Note */}
      <div className="rounded-lg border p-6 bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Implementation Notes
        </h3>
        <ul className="space-y-2 text-sm text-blue-800 list-disc list-inside">
          <li>Meta tags are automatically injected in <code className="bg-blue-100 px-1 rounded">layout.tsx</code> using these settings</li>
          <li>Page-specific overrides take precedence over global defaults</li>
          <li>Changes take effect immediately — no rebuild required</li>
          <li>Use the preview tools to validate before sharing</li>
          <li>Clear platform caches (Facebook Debugger, Twitter Validator) after changes</li>
        </ul>
      </div>
    </div>
  );
}