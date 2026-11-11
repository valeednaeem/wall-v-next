interface UsageMeterProps {
  used?: number;
  limit: number;
  label?: string;
}

export function UsageMeter({ used = 0, limit, label = "Uses today" }: UsageMeterProps) {
  if (limit <= 0) {
    return (
      <div className="text-sm text-muted-foreground">
        {label}: <span className="font-medium text-foreground">Unlimited</span>
      </div>
    );
  }

  const safeUsed = Math.min(used, limit);
  const percent = Math.round((safeUsed / limit) * 100);
  const remaining = Math.max(0, limit - safeUsed);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {remaining} of {limit} remaining
        </span>
      </div>
      <div
        className="h-2 w-full rounded-full bg-muted overflow-hidden"
        role="progressbar"
        aria-valuenow={safeUsed}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-label={label}
      >
        <div
          className={`h-full rounded-full transition-all ${percent >= 100 ? "bg-destructive" : "bg-primary"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
