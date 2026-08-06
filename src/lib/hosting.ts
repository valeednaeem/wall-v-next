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
  const rpPlans: HostingPlan[] = [
    {
      id: "rp-starter",
      name: "Starter",
      provider: "resellerspanel",
      price: applyMargin(5.99),
      renewalPrice: applyMargin(9.99),
      currency: "USD",
      billingCycle: "monthly",
      features: ["10GB SSD Storage", "1 Website", "Unlimited Bandwidth", "Free SSL", "Free Backup"],
      description: "10GB SSD, 1 Website, Unlimited Bandwidth",
      diskSpace: "10GB SSD",
      bandwidth: "Unlimited",
      websites: 1,
      emailAccounts: "Unlimited",
      databases: "Unlimited",
      ssl: true,
      backup: true,
      migration: true,
    },
    {
      id: "rp-business",
      name: "Business",
      provider: "resellerspanel",
      price: applyMargin(12.99),
      renewalPrice: applyMargin(19.99),
      currency: "USD",
      billingCycle: "monthly",
      features: ["50GB SSD Storage", "10 Websites", "Unlimited Bandwidth", "Free SSL", "Free Backup", "Email Accounts"],
      description: "50GB SSD, 10 Websites, Unlimited Bandwidth",
      diskSpace: "50GB SSD",
      bandwidth: "Unlimited",
      websites: 10,
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
      price: applyMargin(24.99),
      renewalPrice: applyMargin(39.99),
      currency: "USD",
      billingCycle: "monthly",
      features: ["100GB NVMe Storage", "Unlimited Websites", "Unlimited Bandwidth", "Free SSL", "Free Backup", "Email Accounts", "SSH Access"],
      description: "100GB NVMe, Unlimited Websites, Unlimited Bandwidth",
      diskSpace: "100GB NVMe",
      bandwidth: "Unlimited",
      websites: -1,
      emailAccounts: "Unlimited",
      databases: "Unlimited",
      ssl: true,
      backup: true,
      migration: true,
    },
  ];

  return rpPlans;
}

export async function getWebSoulsPlans(): Promise<HostingPlan[]> {
  const websoulsPlans: HostingPlan[] = [
    {
      id: "ws-startup",
      name: "Startup",
      provider: "websouls",
      price: applyMargin(35.68),
      renewalPrice: applyMargin(59.46),
      currency: "PKR",
      billingCycle: "yearly",
      features: [
        "50GB SSD Storage",
        "5 Websites",
        "Unlimited Bandwidth",
        "5 Databases",
        "Unlimited Email IDs",
        "Free SSL",
        "Free Backup",
        "Malware Scanning",
        "Free Website Migration",
        "7-Days Free Trial",
        "Free WHOIS Privacy",
        "Standard cPanel Access",
      ],
      description: "50GB SSD Storage, 5 Websites, Unlimited Bandwidth",
      diskSpace: "50GB SSD",
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
      price: applyMargin(41.53),
      renewalPrice: applyMargin(71.61),
      currency: "PKR",
      billingCycle: "yearly",
      features: [
        "100GB NVMe Storage",
        "100 Websites",
        "Unlimited Bandwidth",
        "Unlimited Databases",
        "Unlimited Email IDs",
        "Free SSL",
        "Free Backup",
        "Malware Scanning",
        "Free Website Migration",
        "7-Days Free Trial",
        "Free WHOIS Privacy",
        "Standard cPanel Access",
      ],
      description: "100GB NVMe Storage, 100 Websites, Unlimited Bandwidth",
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
      price: applyMargin(46.16),
      renewalPrice: applyMargin(83.93),
      currency: "PKR",
      billingCycle: "yearly",
      features: [
        "150GB NVMe Storage",
        "150 Websites",
        "AI Website Builder Included",
        "Unlimited Bandwidth",
        "Unlimited Databases",
        "Advanced Email Service",
        "Free SSL",
        "Free Backup",
        "Malware Scanning",
        "Free Website Migration",
        "7-Days Free Trial",
        "Free WHOIS Privacy",
        "cPanel with SSH Access",
        "NodeJs Supported",
      ],
      description: "150GB NVMe Storage, 150 Websites, AI Website Builder",
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
      price: applyMargin(76.11),
      renewalPrice: applyMargin(158.57),
      currency: "PKR",
      billingCycle: "yearly",
      features: [
        "250GB NVMe Storage",
        "200 Websites",
        "AI Website Builder Included",
        "Unlimited Bandwidth",
        "Unlimited Databases",
        "Advanced Email Service",
        "Free SSL",
        "Free Backup",
        "Malware Scanning",
        "Free Website Migration",
        "7-Days Free Trial",
        "Free WHOIS Privacy",
        "cPanel with SSH Access",
        "NodeJs Supported",
      ],
      description: "250GB NVMe Storage, 200 Websites, AI Website Builder",
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

  return websoulsPlans;
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
