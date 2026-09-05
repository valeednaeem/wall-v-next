"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Newspaper,
  LayoutDashboard,
  Megaphone,
  CalendarDays,
  FileText,
  Share2,
  Link2,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Overview", href: "/dashboard/content", icon: LayoutDashboard },
  { label: "Campaigns", href: "/dashboard/content/campaigns", icon: Megaphone },
  { label: "Calendar", href: "/dashboard/content/calendar", icon: CalendarDays },
  { label: "Articles", href: "/dashboard/content/articles", icon: FileText },
  { label: "Social", href: "/dashboard/content/social", icon: Share2 },
  { label: "Connections", href: "/dashboard/content/connections", icon: Link2 },
  { label: "Settings", href: "/dashboard/content/settings", icon: Settings },
];

export default function ContentStudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/dashboard/content");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="h-8 bg-muted rounded w-64 animate-pulse" />
        <div className="h-10 bg-muted rounded w-full animate-pulse" />
        <div className="h-64 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  const isActive = (href: string) => {
    if (href === "/dashboard/content") {
      return pathname === "/dashboard/content";
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Newspaper className="h-5 w-5 text-primary" />
            </div>
            Content Studio
          </h1>
          <p className="text-sm text-muted-foreground mt-1 ml-13">
            Manage campaigns, plans, articles, and social publishing
          </p>
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b pb-px">
        {TABS.map((tab) => {
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap rounded-t-lg transition-colors",
                active
                  ? "bg-background text-foreground border border-b-0 border-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <div>{children}</div>
    </div>
  );
}
