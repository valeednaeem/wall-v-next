import Link from "next/link";
import { ArrowUpRight, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UpgradePromptProps {
  reason: "limit_reached" | "plan_required" | "auth_required";
  toolName: string;
}

const COPY: Record<UpgradePromptProps["reason"], { title: string; body: string; primary: string }> = {
  limit_reached: {
    title: "Daily limit reached",
    body: "You've used all of your free runs for today. Come back tomorrow, or upgrade for more.",
    primary: "View plans",
  },
  plan_required: {
    title: "Pro plan required",
    body: "{tool} is available on a paid plan. Upgrade to unlock unlimited runs.",
    primary: "Upgrade to Pro",
  },
  auth_required: {
    title: "Sign in required",
    body: "This tool requires an account so we can track your usage and credits.",
    primary: "Sign in",
  },
};

export function UpgradePrompt({ reason, toolName }: UpgradePromptProps) {
  const copy = COPY[reason];

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
        <Button size="sm" asChild>
          <Link href="/pricing">
            {copy.primary} <ArrowUpRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    </div>
  );
}
