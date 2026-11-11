import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface UpgradePlanInfo {
  slug: string;
  name: string;
  monthlyPrice: number;
}

interface UpgradePromptProps {
  reason: "limit_reached" | "plan_required" | "auth_required" | "credits_exhausted";
  toolName: string;
  toolId?: string;
  plan?: UpgradePlanInfo | null;
}

const COPY: Record<
  UpgradePromptProps["reason"],
  { title: string; body: string; primary: string }
> = {
  limit_reached: {
    title: "Daily limit reached",
    body: "You've used all of your free runs for today. Come back tomorrow, or upgrade for more.",
    primary: "View plans",
  },
  plan_required: {
    title: "Pro plan required",
    body: "{tool} is available on a paid plan. Upgrade to unlock it.",
    primary: "Upgrade to Pro",
  },
  credits_exhausted: {
    title: "Credits used up",
    body: "{tool} has used all the credits in your plan. Renew to keep going.",
    primary: "Renew plan",
  },
  auth_required: {
    title: "Sign in required",
    body: "This tool requires an account so we can track your usage and credits.",
    primary: "Sign in",
  },
};

export function UpgradePrompt({ reason, toolName, toolId, plan }: UpgradePromptProps) {
  const copy = COPY[reason];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const canSubscribe =
    plan != null && toolId != null && (reason === "plan_required" || reason === "credits_exhausted");

  const subscribe = async () => {
    if (!plan || !toolId) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "subscription",
          items: [{ planSlug: plan.slug, billing: "monthly" }],
          convertedViaTool: toolId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        const callback = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login?callbackUrl=${callback}`;
        return;
      }
      if (!res.ok) {
        setError(data.error || "Could not start checkout. Please try again.");
        return;
      }
      if (data.data?.activated) {
        window.location.reload();
        return;
      }
      if (data.data?.checkoutUrl) {
        window.location.href = data.data.checkoutUrl;
        return;
      }
      setError("Could not start checkout. Please try again.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (reason === "auth_required") {
    return (
      <div className="rounded-lg border bg-muted/40 px-4 py-4 space-y-3">
        <div>
          <h4 className="font-semibold text-sm">{copy.title}</h4>
          <p className="text-sm text-muted-foreground">{copy.body.replace("{tool}", toolName)}</p>
        </div>
        <Button size="sm" asChild>
          <Link href="/login">
            <LogIn className="h-4 w-4 mr-1.5" /> Sign in
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-muted/40 px-4 py-4 space-y-3">
      <div>
        <h4 className="font-semibold text-sm">{copy.title}</h4>
        <p className="text-sm text-muted-foreground">{copy.body.replace("{tool}", toolName)}</p>
      </div>
      <div className="flex gap-2">
        {canSubscribe ? (
          <Button size="sm" onClick={subscribe} disabled={busy}>
            {busy
              ? "Starting checkout…"
              : `${copy.primary} — $${plan!.monthlyPrice}/mo`}
            {!busy && <ArrowUpRight className="h-4 w-4 ml-1" />}
          </Button>
        ) : (
          <Button size="sm" asChild>
            <Link href="/pricing">
              {copy.primary} <ArrowUpRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        )}
        <Button size="sm" variant="outline" asChild>
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
