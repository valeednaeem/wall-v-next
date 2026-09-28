"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ToolHeader } from "@/components/tools/ToolHeader";
import { ToolInput } from "@/components/tools/ToolInput";
import { ToolOutput } from "@/components/tools/ToolOutput";
import { UsageMeter } from "@/components/tools/UsageMeter";
import { UpgradePrompt } from "@/components/tools/UpgradePrompt";
import DOMPurify from "isomorphic-dompurify";

type UpgradeReason = "limit_reached" | "plan_required" | "auth_required";

export interface ToolDetailData {
  _id: string;
  name: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  icon?: string;
  featuredImage?: string;
  accessModel: "free" | "freemium" | "subscription";
  status: string;
  category?: { name: string; slug: string };
  tags?: { _id: string; name: string; slug: string }[];
  features?: string[];
  flags?: { isFeatured?: boolean; isNew?: boolean; isComingSoon?: boolean };
  usagePolicy: {
    dailyLimit: number;
    monthlyLimit: number;
    lifetimeFreeExecutions: number;
    creditsPerExecution: number;
    rateLimitPerMinute: number;
    maxInputLength: number;
    maxOutputLength: number;
  };
  seo?: { metaTitle?: string; metaDescription?: string };
}

export function ToolDetailContent({ initialTool }: { initialTool: ToolDetailData }) {
  const tool = initialTool;
  const [busy, setBusy] = useState(false);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [upgradeReason, setUpgradeReason] = useState<UpgradeReason | null>(null);
  const [remainingToday, setRemainingToday] = useState<number | null>(null);
  const beaconSent = useRef(false);

  useEffect(() => {
    if (beaconSent.current) return;
    beaconSent.current = true;
    fetch(`/api/tools/${tool.slug}/view`, { method: "POST" }).catch(() => {});
  }, [tool.slug]);

  const run = async (input: string) => {
    setBusy(true);
    setError("");
    setOutput("");
    setUpgradeReason(null);
    try {
      const res = await fetch(`/api/tools/${tool.slug}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const reason = data.reason as UpgradeReason | undefined;
        if (reason && ["limit_reached", "plan_required", "auth_required"].includes(reason)) {
          setUpgradeReason(reason);
          if (typeof data.remainingToday === "number") setRemainingToday(data.remainingToday);
        } else {
          setError(data.error || "Something went wrong. Please try again.");
        }
        return;
      }

      setOutput(data.output || "");
      if (typeof data.usage?.remainingToday === "number") {
        setRemainingToday(data.usage.remainingToday);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const policy = tool.usagePolicy;
  const limitLines: string[] = [];
  if (policy.dailyLimit > 0) limitLines.push(`${policy.dailyLimit} runs per day`);
  if (policy.monthlyLimit > 0) limitLines.push(`${policy.monthlyLimit} runs per month`);
  if (tool.accessModel === "freemium" && policy.lifetimeFreeExecutions > 0) {
    limitLines.push(`${policy.lifetimeFreeExecutions} free runs total`);
  }
  if (policy.creditsPerExecution > 0) limitLines.push(`${policy.creditsPerExecution} credit per run`);

  return (
    <div className="container mx-auto px-4 py-12 space-y-10 max-w-5xl">
      <ToolHeader tool={tool} />

      <div className="grid gap-8 lg:grid-cols-[1fr,320px]">
        <div className="space-y-8 min-w-0">
          {tool.description && (
            <section>
              <h2 className="text-xl font-semibold mb-3">About this tool</h2>
              <div
                className="article-content"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(tool.description) }}
              />
            </section>
          )}

          {tool.features && tool.features.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold mb-3">Features</h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {tool.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="text-xl font-semibold mb-3">Try it</h2>
            <div className="rounded-lg border p-4 space-y-4">
              <ToolInput
                maxLength={policy.maxInputLength || 0}
                onSubmit={run}
                busy={busy}
                disabledReason={
                  tool.status !== "published" ? "This tool is not available right now." : undefined
                }
              />
              {upgradeReason && (
                <UpgradePrompt reason={upgradeReason} toolName={tool.name} />
              )}
              <ToolOutput result={output} error={error} busy={busy} />
            </div>
          </section>

          {tool.tags && tool.tags.length > 0 && (
            <section>
              <div className="flex flex-wrap gap-2">
                {tool.tags.map((t) => (
                  <Link key={t._id} href={`/tools?search=${encodeURIComponent(t.name)}`}>
                    <Badge variant="secondary" className="hover:bg-muted/70">#{t.name}</Badge>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border p-4 space-y-3">
            <h3 className="text-sm font-semibold">Usage limits</h3>
            {limitLines.length > 0 ? (
              <ul className="space-y-1 text-sm text-muted-foreground">
                {limitLines.map((line) => <li key={line}>{line}</li>)}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No fixed limits — fair use applies.</p>
            )}
            <Separator />
            {policy.dailyLimit > 0 && (
              <UsageMeter
                used={remainingToday != null ? Math.max(0, policy.dailyLimit - remainingToday) : 0}
                limit={policy.dailyLimit}
              />
            )}
            {policy.maxInputLength > 0 && (
              <p className="text-xs text-muted-foreground">
                Max input: {policy.maxInputLength.toLocaleString()} characters
              </p>
            )}
          </div>

          <div className="rounded-lg border p-4 space-y-3 text-sm">
            <h3 className="text-sm font-semibold">More tools</h3>
            <Link href="/tools" className="block text-primary hover:underline">
              Browse all AI tools →
            </Link>
            <Link href="/pricing" className="block text-primary hover:underline">
              See pricing & plans →
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
