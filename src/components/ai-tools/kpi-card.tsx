import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface KpiCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  delta?: number;
  icon?: LucideIcon;
  href?: string;
  iconColor?: string;
}

export function KpiCard({ label, value, sublabel, delta, icon: Icon, href, iconColor }: KpiCardProps) {
  const body = (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs sm:text-sm text-muted-foreground truncate">{label}</p>
          {Icon && <Icon className={cn("h-4 w-4 shrink-0", iconColor || "text-muted-foreground")} />}
        </div>
        <p className="mt-1 sm:mt-2 text-xl sm:text-3xl font-bold tabular-nums">{value}</p>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          {typeof delta === "number" && delta !== 0 && (
            <span className={cn("font-medium", delta > 0 ? "text-emerald-600" : "text-red-500")}>
              {delta > 0 ? "▲" : "▼"} {Math.abs(delta)}%
            </span>
          )}
          {sublabel && <span className="truncate">{sublabel}</span>}
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {body}
      </Link>
    );
  }
  return body;
}
