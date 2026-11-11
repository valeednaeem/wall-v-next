"use client";

import { useState } from "react";

interface PricingToggleProps {
  onChange?: (annual: boolean) => void;
}

export function PricingToggle({ onChange }: PricingToggleProps) {
  const [annual, setAnnual] = useState(false);

  const toggle = () => {
    const next = !annual;
    setAnnual(next);
    onChange?.(next);
  };

  return (
    <div className="flex items-center justify-center gap-3">
      <span className={`text-sm font-medium ${!annual ? "text-foreground" : "text-muted-foreground"}`}>
        Monthly
      </span>
      <button
        onClick={toggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          annual ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            annual ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
      <span className={`text-sm font-medium ${annual ? "text-foreground" : "text-muted-foreground"}`}>
        Annual
        <span className="ml-1.5 inline-block rounded-full bg-green-100 text-green-800 text-xs px-2 py-0.5 font-medium">
          Save 20%
        </span>
      </span>
    </div>
  );
}
