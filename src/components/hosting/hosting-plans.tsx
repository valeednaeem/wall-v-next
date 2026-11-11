"use client";

import { useState, useEffect } from "react";
import { Cloud, Check, Star } from "lucide-react";

interface HostingPlan {
  _id: string;
  name: string;
  slug: string;
  provider: string;
  price: number;
  renewalPrice: number;
  currency: string;
  billingCycle: string;
  finalPrice: number;
  finalRenewalPrice: number;
  description: string;
  shortDescription: string;
  features: string[];
  highlights: string[];
  diskSpace: string;
  bandwidth: string;
  websites: number;
  emailAccounts: string;
  databases: string;
  ssl: boolean;
  backup: boolean;
  migration: boolean;
  sshAccess: boolean;
  isPopular: boolean;
}

export function HostingPlans() {
  const [plans, setPlans] = useState<HostingPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch("/api/hosting/plans");
      const data = await response.json();
      if (data.success) {
        setPlans(data.plans);
      }
    } catch (error) {
      console.error("Failed to fetch hosting plans:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => `$${price.toFixed(2)}`;

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
        <p className="mt-4 text-muted-foreground">Loading hosting plans...</p>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-2xl font-bold text-center mb-2">Hosting Plans</h2>
      <p className="text-muted-foreground text-center mb-8">
        Choose the perfect plan for your website
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {plans.map((plan) => (
          <div
            key={plan._id}
            className={`rounded-2xl border p-6 bg-white relative ${
              plan.isPopular ? "border-primary shadow-lg shadow-primary/10" : ""
            }`}
          >
            {plan.isPopular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1">
                <Star className="h-3 w-3" />
                Most Popular
              </span>
            )}
            <div className="flex items-center gap-2 mb-2">
              <Cloud className="h-5 w-5 text-primary" />
              <h3 className="text-xl font-bold">{plan.name}</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4 capitalize">
              {plan.provider === "websouls" ? "WebSouls" : "ResellersPanel"}
            </p>
            <div className="mt-4 mb-6">
              <span className="text-3xl font-bold">
                {formatPrice(plan.finalPrice)}
              </span>
              <span className="text-muted-foreground text-sm">
                /{plan.billingCycle === "annually" ? "yr" : plan.billingCycle === "monthly" ? "mo" : plan.billingCycle}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {plan.shortDescription || plan.description}
            </p>
            <ul className="space-y-2 mb-6">
              {plan.highlights.length > 0
                ? plan.highlights.map((f) => (
                    <li key={f} className="text-sm flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" /> {f}
                    </li>
                  ))
                : plan.features.slice(0, 5).map((f) => (
                    <li key={f} className="text-sm flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" /> {f}
                    </li>
                  ))
              }
            </ul>
            <button
              className={`w-full py-2.5 rounded-lg font-medium text-sm transition-colors ${
                plan.isPopular
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              Get Started
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
