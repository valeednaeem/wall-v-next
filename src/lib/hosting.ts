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

const FALLBACK_RP_PLANS: HostingPlan[] = [
  {
    id: "rp-business",
    name: "Business",
    provider: "resellerspanel",
    price: applyMargin(3.50),
    renewalPrice: applyMargin(3.50),
    currency: "USD",
    billingCycle: "monthly",
    features: ["5 Hosted Domains", "Unlimited Disk Space", "Unlimited Bandwidth", "20 MySQL Databases", "500 Email Accounts", "Free SSL", "Daily Backups", "ModSecurity Firewall", "1-Click Apps Installer"],
    description: "5 Hosted Domains, Unlimited Disk Space, 20 MySQL Databases",
    diskSpace: "Unlimited",
    bandwidth: "Unlimited",
    websites: 5,
    emailAccounts: "500",
    databases: "20",
    ssl: true,
    backup: true,
    migration: true,
  },
  {
    id: "rp-corporate",
    name: "Corporate",
    provider: "resellerspanel",
    price: applyMargin(7.50),
    renewalPrice: applyMargin(7.50),
    currency: "USD",
    billingCycle: "monthly",
    features: ["15 Hosted Domains", "Unlimited Disk Space", "Unlimited Bandwidth", "Unlimited MySQL Databases", "Unlimited Email Accounts", "Free SSL", "Daily Backups", "ModSecurity Firewall", "SSH Access"],
    description: "15 Hosted Domains, Unlimited Disk Space, Unlimited Databases",
    diskSpace: "Unlimited",
    bandwidth: "Unlimited",
    websites: 15,
    emailAccounts: "Unlimited",
    databases: "Unlimited",
    ssl: true,
    backup: true,
    migration: true,
  },
  {
    id: "rp-enterprise",
    name: "Enterprise",
    provider: "resellerspanel",
    price: applyMargin(12.50),
    renewalPrice: applyMargin(12.50),
    currency: "USD",
    billingCycle: "monthly",
    features: ["Unlimited Hosted Domains", "Unlimited Disk Space", "Unlimited Bandwidth", "Unlimited MySQL Databases", "Unlimited Email Accounts", "Free SSL", "Daily Backups", "ModSecurity Firewall", "SSH Access", "Dedicated IP"],
    description: "Unlimited Hosted Domains, Unlimited Disk Space, Unlimited Databases",
    diskSpace: "Unlimited",
    bandwidth: "Unlimited",
    websites: -1,
    emailAccounts: "Unlimited",
    databases: "Unlimited",
    ssl: true,
    backup: true,
    migration: true,
  },
];

const FALLBACK_WS_PLANS: HostingPlan[] = [
  {
    id: "ws-basic",
    name: "Basic",
    provider: "websouls",
    price: applyMargin(44.64),
    renewalPrice: applyMargin(44.64),
    currency: "USD",
    billingCycle: "yearly",
    features: ["1 Website", "10GB Storage", "Unlimited Bandwidth", "Unlimited Email Accounts", "1 Database", "Virus & Spam Protection", "Free SSL", "Free Backup"],
    description: "1 Website, 10GB Storage, Unlimited Bandwidth",
    diskSpace: "10GB",
    bandwidth: "Unlimited",
    websites: 1,
    emailAccounts: "Unlimited",
    databases: "1",
    ssl: true,
    backup: true,
    migration: true,
  },
  {
    id: "ws-startup",
    name: "Startup",
    provider: "websouls",
    price: applyMargin(59.46),
    renewalPrice: applyMargin(59.46),
    currency: "USD",
    billingCycle: "yearly",
    features: ["5 Websites", "50GB Storage", "Unlimited Bandwidth", "Unlimited Email Accounts", "5 Databases", "Virus & Spam Protection", "Free SSL", "Free Backup"],
    description: "5 Websites, 50GB Storage, Unlimited Bandwidth",
    diskSpace: "50GB",
    bandwidth: "Unlimited",
    websites: 5,
    emailAccounts: "Unlimited",
    databases: "5",
    ssl: true,
    backup: true,
    migration: true,
  },
  {
    id: "ws-grow",
    name: "Grow",
    provider: "websouls",
    price: applyMargin(71.61),
    renewalPrice: applyMargin(71.61),
    currency: "USD",
    billingCycle: "yearly",
    features: ["100 Websites", "100GB NVMe Storage", "Unlimited Bandwidth", "Unlimited Email Accounts", "Unlimited Databases", "Virus & Spam Protection", "Free SSL", "Free Backup"],
    description: "100 Websites, 100GB NVMe Storage, Unlimited Bandwidth",
    diskSpace: "100GB NVMe",
    bandwidth: "Unlimited",
    websites: 100,
    emailAccounts: "Unlimited",
    databases: "Unlimited",
    ssl: true,
    backup: true,
    migration: true,
  },
  {
    id: "ws-digital",
    name: "Digital",
    provider: "websouls",
    price: applyMargin(83.93),
    renewalPrice: applyMargin(83.93),
    currency: "USD",
    billingCycle: "yearly",
    features: ["150 Websites", "150GB NVMe Storage", "Unlimited Bandwidth", "Unlimited Email Accounts", "Unlimited Databases", "Virus & Spam Protection", "Free SSL", "Free Backup", "AI Website Builder"],
    description: "150 Websites, 150GB NVMe Storage, AI Website Builder",
    diskSpace: "150GB NVMe",
    bandwidth: "Unlimited",
    websites: 150,
    emailAccounts: "Unlimited",
    databases: "Unlimited",
    ssl: true,
    backup: true,
    migration: true,
  },
  {
    id: "ws-business",
    name: "Business",
    provider: "websouls",
    price: applyMargin(158.57),
    renewalPrice: applyMargin(158.57),
    currency: "USD",
    billingCycle: "yearly",
    features: ["200 Websites", "250GB NVMe Storage", "Unlimited Bandwidth", "Unlimited Email Accounts", "Unlimited Databases", "Virus & Spam Protection", "Free SSL", "Free Backup", "AI Website Builder", "SSH Access"],
    description: "200 Websites, 250GB NVMe Storage, AI Website Builder",
    diskSpace: "250GB NVMe",
    bandwidth: "Unlimited",
    websites: 200,
    emailAccounts: "Unlimited",
    databases: "Unlimited",
    ssl: true,
    backup: true,
    migration: true,
  },
];

export async function getResellerPanelPlans(): Promise<HostingPlan[]> {
  try {
    const plans = await rpGetPlans();
    if (plans.length === 0) return FALLBACK_RP_PLANS;

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
    return FALLBACK_RP_PLANS;
  }
}

export async function getWebSoulsPlans(): Promise<HostingPlan[]> {
  try {
    const plans = await wsGetPlans();
    if (plans.length === 0) return FALLBACK_WS_PLANS;

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
    return FALLBACK_WS_PLANS;
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
