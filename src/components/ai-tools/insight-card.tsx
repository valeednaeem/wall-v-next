"use client";

import Link from "next/link";
import { AlertTriangle, Lightbulb, TrendingUp, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Insight } from "@/lib/tools/insights";

const SEVERITY = {
  warning: {
    icon: AlertTriangle,
    className: "border-red-200 bg-red-50 text-red-800",
    chip: "bg-red-100 text-red-700",
    label: "Warning",
  },
  opportunity: {
    icon: Lightbulb,
    className: "border-amber-200 bg-amber-50 text-amber-800",
    chip: "bg-amber-100 text-amber-700",
    label: "Opportunity",
  },
  info: {
    icon: TrendingUp,
    className: "border-blue-200 bg-blue-50 text-blue-800",
    chip: "bg-blue-100 text-blue-700",
    label: "Info",
  },
} as const;

function drilldownHref(insight: Insight): string {
  const params = new URLSearchParams();
  params.set("tab", insight.drilldown.tab);
  if (insight.drilldown.toolId) params.set("toolId", insight.drilldown.toolId);
  if (insight.drilldown.tab === "usage") {
    params.delete("tab");
    const qs = params.toString();
    return `/dashboard/ai-tools/usage${qs ? `?${qs}` : ""}`;
  }
  return `/dashboard/ai-tools/analytics?${params}`;
}

export function InsightCard({ insight }: { insight: Insight }) {
  const style = SEVERITY[insight.severity];
  const Icon = style.icon;
  return (
    <Card className={style.className}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Icon className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm leading-relaxed">{insight.text}</p>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className={`text-[10px] ${style.chip}`}>
                {style.label}
              </Badge>
              <Badge variant="outline" className="bg-background text-[10px]">
                {insight.metric}
              </Badge>
              <Badge variant="outline" className="bg-background text-[10px] text-muted-foreground">
                {insight.range}
              </Badge>
              <Badge variant="outline" className="bg-background text-[10px] text-muted-foreground">
                source: {insight.source}
              </Badge>
            </div>
          </div>
          <Link
            href={drilldownHref(insight)}
            className="flex shrink-0 items-center gap-1 text-xs font-medium underline-offset-4 hover:underline"
          >
            Drill down <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
