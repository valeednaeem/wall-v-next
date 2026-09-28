"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

const COLORS: Record<string, string> = {
  free: "#16a34a",
  freemium: "#f59e0b",
  subscription: "#2563eb",
};

const LABELS: Record<string, string> = {
  free: "Free",
  freemium: "Freemium",
  subscription: "Subscription",
};

function MixTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number }[];
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-md border bg-background px-3 py-2 shadow-sm text-xs">
      <p className="font-medium">{LABELS[p.name || ""] || p.name}</p>
      <p className="text-muted-foreground tabular-nums">{p.value} executions</p>
    </div>
  );
}

export function AccessMix({
  data,
  height = 260,
}: {
  data: { name: string; value: number }[];
  height?: number;
}) {
  const visible = data.filter((d) => d.value > 0);
  const total = visible.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex flex-col items-center">
      <div style={{ height, width: "100%" }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={visible}
              dataKey="value"
              nameKey="name"
              innerRadius="60%"
              outerRadius="85%"
              paddingAngle={2}
              stroke="none"
            >
              {visible.map((d) => (
                <Cell key={d.name} fill={COLORS[d.name] || "#94a3b8"} />
              ))}
            </Pie>
            <Tooltip content={<MixTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
        {visible.map((d) => (
          <span key={d.name} className="inline-flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[d.name] || "#94a3b8" }} />
            {LABELS[d.name] || d.name}
            <span className="font-medium text-foreground tabular-nums">
              {total > 0 ? Math.round((d.value / total) * 100) : 0}%
            </span>
          </span>
        ))}
        {total === 0 && <span className="text-muted-foreground">No executions in range</span>}
      </div>
    </div>
  );
}
