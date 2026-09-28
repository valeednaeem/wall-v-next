"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";

function RankTooltip({
  active,
  payload,
  valueFormatter,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number }[];
  valueFormatter?: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const v = p.value ?? 0;
  return (
    <div className="rounded-md border bg-background px-3 py-2 shadow-sm text-xs">
      <p className="font-medium">{p.name}</p>
      <p className="text-muted-foreground tabular-nums">
        {valueFormatter ? valueFormatter(v) : v}
      </p>
    </div>
  );
}

export function RankBar({
  data,
  color = "#16a34a",
  negativeColor = "#ef4444",
  height,
  valueFormatter,
}: {
  data: { name: string; value: number }[];
  color?: string;
  negativeColor?: string;
  height?: number;
  valueFormatter?: (v: number) => string;
}) {
  const h = height || Math.max(160, Math.min(420, data.length * 44 + 40));
  const rows = data.slice().sort((a, b) => b.value - a.value);

  if (rows.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        No data in range
      </div>
    );
  }

  return (
    <div style={{ height: h, width: "100%" }}>
      <ResponsiveContainer>
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
          barCategoryGap={10}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.15)" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={140}
            tickFormatter={(n: string) => (n.length > 18 ? `${n.slice(0, 17)}…` : n)}
          />
          <Tooltip content={<RankTooltip valueFormatter={valueFormatter} />} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {rows.map((r) => (
              <Cell key={r.name} fill={r.value < 0 ? negativeColor : color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
