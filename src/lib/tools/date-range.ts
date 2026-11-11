export type RangeKey =
  | "today"
  | "yesterday"
  | "7d"
  | "30d"
  | "month"
  | "lastMonth"
  | "year"
  | "custom";

export interface DateRange {
  from: Date;
  to: Date;
  label: string;
  key: RangeKey;
}

export const RANGE_PRESETS: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "month", label: "This month" },
  { key: "lastMonth", label: "Last month" },
  { key: "year", label: "This year" },
  { key: "custom", label: "Custom" },
];

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function parseLocal(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Resolves a range preset (or explicit custom start/end, YYYY-MM-DD) into an
 * inclusive [from, to] window using local start-of-day / end-of-day bounds.
 * Falls back to "30d" for unknown presets.
 */
export function resolveRange(
  range?: string | null,
  start?: string | null,
  end?: string | null
): DateRange {
  const today = startOfDay(new Date());
  const key = (range || "30d") as RangeKey;

  switch (key) {
    case "today":
      return { from: today, to: endOfDay(new Date()), label: "Today", key };
    case "yesterday": {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return { from: y, to: endOfDay(y), label: "Yesterday", key };
    }
    case "7d": {
      const from = new Date(today);
      from.setDate(from.getDate() - 6);
      return { from, to: endOfDay(new Date()), label: "Last 7 days", key };
    }
    case "month": {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from, to: endOfDay(new Date()), label: "This month", key };
    }
    case "lastMonth": {
      const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const to = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
      return { from, to, label: "Last month", key };
    }
    case "year":
      return {
        from: new Date(today.getFullYear(), 0, 1),
        to: endOfDay(new Date()),
        label: "This year",
        key,
      };
    case "custom": {
      const s = parseLocal(start);
      const e = parseLocal(end);
      if (s && e && s <= e) {
        return {
          from: startOfDay(s),
          to: endOfDay(e),
          label: `${s.toLocaleDateString()} – ${e.toLocaleDateString()}`,
          key,
        };
      }
      break;
    }
    case "30d":
    default: {
      const from = new Date(today);
      from.setDate(from.getDate() - 29);
      const resolvedKey: RangeKey = range === "30d" || !range ? "30d" : key;
      return { from, to: endOfDay(new Date()), label: "Last 30 days", key: resolvedKey };
    }
  }

  // Invalid custom range → fall back to 30d
  const from = new Date(today);
  from.setDate(from.getDate() - 29);
  return { from, to: endOfDay(new Date()), label: "Last 30 days", key: "30d" };
}

/** Inclusive day labels (YYYY-MM-DD, local) from a range, for zero-filling series. */
export function eachDay(from: Date, to: Date): string[] {
  const days: string[] = [];
  const cur = startOfDay(from);
  const end = startOfDay(to);
  while (cur <= end && days.length < 400) {
    days.push(
      `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(
        cur.getDate()
      ).padStart(2, "0")}`
    );
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

/** Local YYYY-MM-DD for a Date (matches eachDay formatting). */
export function dayKey(d: Date): string {
  const x = startOfDay(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(
    x.getDate()
  ).padStart(2, "0")}`;
}
