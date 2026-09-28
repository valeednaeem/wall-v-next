"use client";

import { useState } from "react";
import { CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { RANGE_PRESETS, type RangeKey } from "@/lib/tools/date-range";

export interface RangeValue {
  range: RangeKey;
  start?: string;
  end?: string;
}

export function DateRangeFilter({
  value,
  onChange,
}: {
  value: RangeValue;
  onChange: (v: RangeValue) => void;
}) {
  const [start, setStart] = useState(value.start || "");
  const [end, setEnd] = useState(value.end || "");
  const [customOpen, setCustomOpen] = useState(value.range === "custom");

  const pick = (key: RangeKey) => {
    if (key === "custom") {
      setCustomOpen(true);
      return;
    }
    setCustomOpen(false);
    onChange({ range: key });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex flex-wrap rounded-lg bg-muted p-1">
        {RANGE_PRESETS.filter((p) => p.key !== "custom").map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => pick(p.key)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors",
              value.range === p.key
                ? "bg-background text-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      <Button
        type="button"
        variant={value.range === "custom" ? "default" : "outline"}
        size="sm"
        onClick={() => pick("custom")}
      >
        <CalendarRange className="mr-1.5 h-4 w-4" />
        Custom
      </Button>
      {customOpen && (
        <span className="flex items-center gap-2">
          <Input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="h-9 w-[150px] text-sm"
            aria-label="Start date"
          />
          <span className="text-muted-foreground text-sm">–</span>
          <Input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="h-9 w-[150px] text-sm"
            aria-label="End date"
          />
          <Button
            type="button"
            size="sm"
            disabled={!start || !end}
            onClick={() => onChange({ range: "custom", start, end })}
          >
            Apply
          </Button>
        </span>
      )}
    </div>
  );
}
