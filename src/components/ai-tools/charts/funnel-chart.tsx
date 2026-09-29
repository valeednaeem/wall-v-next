"use client";

export interface FunnelStage {
  key: string;
  label: string;
  count: number;
  pctOfPrevious: number;
  pctOfFirst: number;
}

const COLORS = ["#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#f59e0b", "#16a34a"];

export function FunnelChart({ stages }: { stages: FunnelStage[] }) {
  if (!stages.length) {
    return <p className="text-sm text-muted-foreground">No funnel data in this range.</p>;
  }
  return (
    <div className="space-y-3">
      {stages.map((s, i) => (
        <div key={s.key} className="space-y-1">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium">{s.label}</span>
            <span className="tabular-nums text-muted-foreground">
              {s.count.toLocaleString()}
              <span className="ml-2 text-xs">
                {s.pctOfFirst}% of first
                {i > 0 && <span className="ml-2">({s.pctOfPrevious}% of prev)</span>}
              </span>
            </span>
          </div>
          <div className="h-6 w-full overflow-hidden rounded bg-muted">
            <div
              className="h-full rounded transition-all"
              style={{
                width: `${Math.max(s.pctOfFirst, s.count > 0 ? 2 : 0)}%`,
                backgroundColor: COLORS[i % COLORS.length],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
