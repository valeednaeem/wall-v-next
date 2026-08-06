import { getHostingPlans as rpGetPlans } from "./resellerspanel";
import { getHostingPlans as wsGetPlans } from "./websouls";

export type HostingProvider = "resellerspanel" | "websouls";

export interface HostingPlan {
  id: string;
  name: string;
  provider: HostingProvider;
  price: number;
  renewalPrice: number;
  currency: string;
  billingCycle: string;
  features: string[];
  description: string;
  diskSpace: string;
  bandwidth: string;
  websites: number;
  emailAccounts: string;
  databases: string;
  ssl: boolean;
  backup: boolean;
  migration: boolean;
}

export interface HostingOffer {
  id: string;
  planId: string;
  provider: HostingProvider;
  name: string;
  originalPrice: number;
  offerPrice: number;
  discount: number;
  currency: string;
  billingCycle: string;
  features: string[];
  description: string;
  isActive: boolean;
  validUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MARGIN_HOSTING = 0.15;

function applyMargin(price: number): number {
  return Math.round(price * (1 + MARGIN_HOSTING) * 100) / 100;
}

export async function getResellerPanelPlans(): Promise<HostingPlan[]> {
  try {
    const plans = await rpGetPlans();

    return plans.map((plan) => ({
      id: `rp-${plan.id}`,
      name: plan.name,
      provider: "resellerspanel" as HostingProvider,
      price: applyMargin(plan.price),
      renewalPrice: applyMargin(plan.renewalPrice),
      currency: "USD",
      billingCycle: "monthly",
      features: plan.features.length > 0 ? plan.features : extractFeatures(plan.description),
      description: plan.description,
      diskSpace: extractDiskSpace(plan.description),
      bandwidth: "Unlimited",
      websites: extractWebsites(plan.description),
      emailAccounts: "Unlimited",
      databases: extractDatabases(plan.description),
      ssl: true,
      backup: true,
      migration: true,
    }));
  } catch (error) {
    console.error("Failed to fetch ResellersPanel plans:", error);
    return [];
  }
}

export async function getWebSoulsPlans(): Promise<HostingPlan[]> {
  try {
    const plans = await wsGetPlans();

    return plans.map((plan) => ({
      id: `ws-${plan.id}`,
      name: plan.name,
      provider: "websouls" as HostingProvider,
      price: applyMargin(plan.price),
      renewalPrice: applyMargin(plan.price),
      currency: "PKR",
      billingCycle: plan.billingCycle || "yearly",
      features: plan.features.length > 0 ? plan.features : extractFeatures(plan.description),
      description: plan.description,
      diskSpace: extractDiskSpace(plan.description),
      bandwidth: "Unlimited",
      websites: extractWebsites(plan.description),
      emailAccounts: "Unlimited",
      databases: extractDatabases(plan.description),
      ssl: true,
      backup: true,
      migration: true,
    }));
  } catch (error) {
    console.error("Failed to fetch WebSouls plans:", error);
    return [];
  }
}

export async function getAllHostingPlans(): Promise<HostingPlan[]> {
  const [rpPlans, wsPlans] = await Promise.allSettled([
    getResellerPanelPlans(),
    getWebSoulsPlans(),
  ]);

  const plans: HostingPlan[] = [];

  if (rpPlans.status === "fulfilled") {
    plans.push(...rpPlans.value);
  }

  if (wsPlans.status === "fulfilled") {
    plans.push(...wsPlans.value);
  }

  return plans;
}

function extractFeatures(description: string): string[] {
  const features: string[] = [];
  if (description.includes("SSD") || description.includes("NVMe")) {
    features.push("Fast Storage");
  }
  if (description.includes("Unlimited")) {
    features.push("Unlimited Resources");
  }
  if (description.includes("SSL")) {
    features.push("Free SSL");
  }
  if (description.includes("Backup")) {
    features.push("Free Backup");
  }
  return features;
}

function extractDiskSpace(description: string): string {
  const match = description.match(/(\d+[GT]B)\s*(SSD|NVMe)/i);
  return match ? `${match[1]} ${match[2]}` : "Unlimited";
}

function extractWebsites(description: string): number {
  const match = description.match(/(\d+)\s*(?:Websites?|Domains?)/i);
  return match ? parseInt(match[1]) : 1;
}

function extractDatabases(description: string): string {
  const match = description.match(/(\d+)\s*Databases?/i);
  return match ? match[1] : "Unlimited";
}
