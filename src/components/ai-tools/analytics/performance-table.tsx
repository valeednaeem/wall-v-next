"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";

export interface PerfRow {
  toolId: string;
  name: string;
  status: string;
  executions: number;
  growth: number;
  previousExecutions: number;
  uniqueUsers: number;
  repeatRate: number;
  conversionRate: number;
  revenue: number;
  estimatedCost: number;
  profitContribution: number;
  errorRate: number;
  credits: number;
}

type NumericKey = Exclude<keyof PerfRow, "toolId" | "name" | "status">;

const COLUMNS: { key: NumericKey | "name"; label: string; align?: "right" }[] = [
  { key: "name", label: "Tool" },
  { key: "executions", label: "Exec", align: "right" },
  { key: "growth", label: "Growth", align: "right" },
  { key: "uniqueUsers", label: "Users", align: "right" },
  { key: "repeatRate", label: "Repeat %", align: "right" },
  { key: "conversionRate", label: "Conv %", align: "right" },
  { key: "credits", label: "Credits", align: "right" },
  { key: "revenue", label: "Revenue", align: "right" },
  { key: "estimatedCost", label: "API cost", align: "right" },
  { key: "profitContribution", label: "Profit", align: "right" },
  { key: "errorRate", label: "Errors %", align: "right" },
];

export function PerformanceTable({ rows }: { rows: PerfRow[] }) {
  const [sort, setSort] = useState<{ key: NumericKey | "name"; dir: "asc" | "desc" }>({
    key: "executions",
    dir: "desc",
  });

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      if (typeof av === "number" && typeof bv === "number") {
        return sort.dir === "asc" ? av - bv : bv - av;
      }
      return sort.dir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return copy;
  }, [rows, sort]);

  const toggle = (key: NumericKey | "name") => {
    setSort((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }));
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {COLUMNS.map((c) => (
              <TableHead
                key={c.key}
                className={c.align === "right" ? "text-right" : ""}
                onClick={() => toggle(c.key)}
                aria-sort={
                  sort.key === c.key ? (sort.dir === "desc" ? "descending" : "ascending") : undefined
                }
              >
                <button
                  type="button"
                  className="inline-flex items-center gap-1 hover:text-foreground"
                  onClick={() => toggle(c.key)}
                >
                  {c.label}
                  <ArrowUpDown className="h-3 w-3 opacity-50" />
                </button>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.length === 0 ? (
            <TableRow>
              <TableCell colSpan={COLUMNS.length} className="py-8 text-center text-sm text-muted-foreground">
                No tool activity in this range.
              </TableCell>
            </TableRow>
          ) : (
            sorted.map((r) => (
              <TableRow key={r.toolId}>
                <TableCell className="font-medium">
                  <span className="flex items-center gap-2">
                    {r.name}
                    <Badge variant="outline" className="text-[10px]">
                      {r.status}
                    </Badge>
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">{r.executions}</TableCell>
                <TableCell
                  className={`text-right tabular-nums ${r.growth > 0 ? "text-emerald-600" : r.growth < 0 ? "text-red-600" : ""}`}
                >
                  {r.growth > 0 ? "+" : ""}
                  {r.growth}%
                </TableCell>
                <TableCell className="text-right tabular-nums">{r.uniqueUsers}</TableCell>
                <TableCell className="text-right tabular-nums">{r.repeatRate}%</TableCell>
                <TableCell className="text-right tabular-nums">{r.conversionRate}%</TableCell>
                <TableCell className="text-right tabular-nums">{r.credits}</TableCell>
                <TableCell className="text-right tabular-nums">{formatPrice(r.revenue)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatPrice(r.estimatedCost)}</TableCell>
                <TableCell
                  className={`text-right tabular-nums ${r.profitContribution < 0 ? "text-red-600" : ""}`}
                >
                  {formatPrice(r.profitContribution)}
                </TableCell>
                <TableCell
                  className={`text-right tabular-nums ${r.errorRate > 10 ? "font-semibold text-red-600" : ""}`}
                >
                  {r.errorRate}%
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
