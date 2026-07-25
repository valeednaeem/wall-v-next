"use client";

import { useState } from "react";
import Link from "next/link";
import { PricingToggle } from "@/components/pricing-toggle";

interface Plan {
  name: string;
  description: string;
  monthly: number;
  annual: number;
  popular: boolean;
  features: string[];
  notIncluded: string[];
}

export function PricingPlans({ plans }: { plans: Plan[] }) {
  const [annual, setAnnual] = useState(false);

  return (
    <>
      <PricingToggle onChange={setAnnual} />

      <div className="grid gap-8 md:grid-cols-3 max-w-6xl mx-auto mt-8">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-2xl border p-8 bg-white relative ${
              plan.popular ? "border-primary shadow-lg shadow-primary/10" : ""
            }`}
          >
            {plan.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                Most Popular
              </span>
            )}
            <h3 className="text-xl font-bold">{plan.name}</h3>
            <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
            <div className="mt-6 mb-6">
              <span className="text-sm text-muted-foreground">$</span>{" "}
              <span className="text-4xl font-bold">{(annual ? plan.annual : plan.monthly).toLocaleString()}</span>
              <span className="text-muted-foreground text-sm">/project</span>
            </div>
            {annual && (
              <p className="text-xs text-green-600 mb-6">
                Save ${(plan.monthly - plan.annual).toLocaleString()} per project
              </p>
            )}
            {!annual && (
              <p className="text-xs text-muted-foreground mb-6">
                Annual billing: ${plan.annual.toLocaleString()}/project
              </p>
            )}
            <ul className="space-y-2 mb-6">
              {plan.features.map((f) => (
                <li key={f} className="text-sm flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span> {f}
                </li>
              ))}
              {plan.notIncluded.map((f) => (
                <li key={f} className="text-sm flex items-start gap-2 text-muted-foreground">
                  <span className="mt-0.5">—</span> {f}
                </li>
              ))}
            </ul>
            <Link
              href="/contact"
              className={`block w-full text-center py-2.5 rounded-lg font-medium text-sm transition-colors ${
                plan.popular
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              Get Started
            </Link>
          </div>
        ))}
      </div>
    </>
  );
}
