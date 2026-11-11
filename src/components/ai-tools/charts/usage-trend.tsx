"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export interface UsagePoint {
  date: string;
  executions: number;
  users: number;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number | string; color?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-background px-3 py-2 shadow-sm text-xs">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-muted-foreground">
          <span className="inline-block h-2 w-2 rounded-full mr-1.5" style={{ background: p.color }} />
          {p.name}: <span className="font-medium text-foreground tabular-nums">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

export function UsageTrend({ data, height = 280 }: { data: UsagePoint[]; height?: number }) {
  return (
    <div style={{ height, width: "100%" }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
          <defs>
            <linearGradient id="gradExec" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#16a34a" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradUsers" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.15)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(d: string) => d.slice(5)}
          />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="executions"
            name="Executions"
            stroke="#16a34a"
            strokeWidth={2}
            fill="url(#gradExec)"
          />
          <Area
            type="monotone"
            dataKey="users"
            name="Users"
            stroke="#2563eb"
            strokeWidth={2}
            fill="url(#gradUsers)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
