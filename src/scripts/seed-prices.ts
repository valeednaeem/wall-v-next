/**
 * Seed default service prices into the database.
 * Run with: npx tsx src/scripts/seed-prices.ts
 */
import { connectToDatabase } from "@/lib/mongodb";
import ServicePrice from "@/models/service-price";

const DEFAULT_PRICES = [
  {
    serviceKey: "web-development",
    name: "Web Development",
    category: "development",
    description: "Custom web applications built with React, Next.js, Node.js",
    type: "starting-at",
    basePrice: 499,
    features: ["Business websites", "Custom web applications", "SaaS platforms", "E-commerce websites", "Client portals", "Admin dashboards"],
    technology: ["Next.js", "React", "TypeScript", "Node.js", "MongoDB"],
    estimatedHours: { min: 40, max: 400 },
    estimatedWeeks: { min: 2, max: 16 },
    active: true,
    displayOrder: 1,
    agentVisible: true,
    agentDescription: "Custom web applications — business websites, dashboards, e-commerce, SaaS platforms. Built with React, Next.js, TypeScript, Node.js, and MongoDB.",
  },
  {
    serviceKey: "ai-automation",
    name: "AI & Automation",
    category: "ai-automation",
    description: "Intelligent agents and workflows that automate repetitive tasks",
    type: "starting-at",
    basePrice: 1499,
    features: ["AI chatbots and virtual assistants", "AI voice agents", "Workflow automation", "Predictive analytics", "Document processing"],
    technology: ["OpenAI", "LangChain", "Python", "Node.js"],
    estimatedHours: { min: 60, max: 600 },
    estimatedWeeks: { min: 3, max: 24 },
    active: true,
    displayOrder: 2,
    agentVisible: true,
    agentDescription: "AI-powered solutions — chatbots, voice agents, workflow automation, predictive analytics, and intelligent document processing.",
  },
  {
    serviceKey: "mobile-apps",
    name: "Mobile Applications",
    category: "development",
    description: "Native and cross-platform mobile apps for iOS and Android",
    type: "starting-at",
    basePrice: 2999,
    features: ["Cross-platform apps (React Native / Flutter)", "Native iOS and Android", "Offline-first architecture", "Push notifications", "App Store deployment"],
    technology: ["React Native", "Flutter", "iOS", "Android"],
    estimatedHours: { min: 120, max: 800 },
    estimatedWeeks: { min: 4, max: 32 },
    active: true,
    displayOrder: 3,
    agentVisible: true,
    agentDescription: "Native and cross-platform mobile apps for iOS and Android. Built with React Native or Flutter, with push notifications, offline support, and App Store deployment.",
  },
  {
    serviceKey: "crm-systems",
    name: "CRM Systems",
    category: "development",
    description: "Customer relationship management with lead scoring and pipeline",
    type: "starting-at",
    basePrice: 1499,
    features: ["Lead management", "Pipeline tracking", "Client communication", "Invoicing integration", "Reporting dashboards"],
    technology: ["Next.js", "React", "Node.js", "MongoDB"],
    estimatedHours: { min: 80, max: 500 },
    estimatedWeeks: { min: 4, max: 20 },
    active: true,
    displayOrder: 4,
    agentVisible: true,
    agentDescription: "Custom CRM systems with lead management, sales pipeline tracking, client communication, invoicing integration, and real-time reporting dashboards.",
  },
  {
    serviceKey: "erp-systems",
    name: "ERP Systems",
    category: "development",
    description: "Enterprise resource planning tailored to your business",
    type: "starting-at",
    basePrice: 2999,
    features: ["Finance modules", "HR management", "Inventory tracking", "Real-time dashboards", "Third-party integrations"],
    technology: ["Next.js", "Node.js", "MongoDB", "REST APIs"],
    estimatedHours: { min: 200, max: 1000 },
    estimatedWeeks: { min: 8, max: 40 },
    active: true,
    displayOrder: 5,
    agentVisible: true,
    agentDescription: "Enterprise resource planning systems — finance, HR, inventory management, real-time dashboards, and third-party integrations.",
  },
  {
    serviceKey: "hosting-basic",
    name: "Basic Hosting",
    category: "hosting",
    description: "Entry-level hosting for personal sites and blogs",
    type: "fixed",
    basePrice: 3.99,
    currency: "USD",
    features: ["1 Website", "5GB Storage", "Free SSL", "99.9% Uptime"],
    active: true,
    displayOrder: 10,
    agentVisible: true,
    agentDescription: "Basic hosting plan — $3.99/month. 1 website, 5GB storage, free SSL certificate, 99.9% uptime guarantee.",
  },
  {
    serviceKey: "hosting-business",
    name: "Business Hosting",
    category: "hosting",
    description: "Hosting for growing businesses with multiple sites",
    type: "fixed",
    basePrice: 9.99,
    currency: "USD",
    features: ["10 Websites", "25GB Storage", "Daily Backups", "Free SSL", "99.9% Uptime"],
    active: true,
    displayOrder: 11,
    agentVisible: true,
    agentDescription: "Business hosting plan — $9.99/month. 10 websites, 25GB storage, daily backups, free SSL.",
  },
  {
    serviceKey: "hosting-cloud",
    name: "Cloud Hosting",
    category: "hosting",
    description: "High-performance cloud hosting for demanding sites",
    type: "fixed",
    basePrice: 16.99,
    currency: "USD",
    features: ["Unlimited Sites", "50GB Storage", "CDN", "Free SSL", "99.9% Uptime"],
    active: true,
    displayOrder: 12,
    agentVisible: true,
    agentDescription: "Cloud hosting plan — $16.99/month. Unlimited sites, 50GB storage, CDN included, free SSL.",
  },
  {
    serviceKey: "hosting-wordpress",
    name: "WordPress Hosting",
    category: "hosting",
    description: "Optimized hosting for WordPress sites",
    type: "fixed",
    basePrice: 6.99,
    currency: "USD",
    features: ["1 Website", "10GB Storage", "Auto Updates", "Free SSL"],
    active: true,
    displayOrder: 13,
    agentVisible: true,
    agentDescription: "WordPress hosting — $6.99/month. 1 website, 10GB storage, automatic updates, free SSL.",
  },
  {
    serviceKey: "hosting-reseller",
    name: "Reseller Hosting",
    category: "hosting",
    description: "White-label hosting for agencies and resellers",
    type: "fixed",
    basePrice: 29.99,
    currency: "USD",
    features: ["50 Accounts", "100GB Storage", "White Label", "Free SSL"],
    active: true,
    displayOrder: 14,
    agentVisible: true,
    agentDescription: "Reseller hosting — $29.99/month. 50 accounts, 100GB storage, white-label branding.",
  },
  {
    serviceKey: "hosting-email",
    name: "Email Hosting",
    category: "hosting",
    description: "Professional email hosting with custom domain",
    type: "fixed",
    basePrice: 1.99,
    currency: "USD",
    features: ["5 Accounts", "5GB Storage", "Custom Domain", "Spam Protection"],
    active: true,
    displayOrder: 15,
    agentVisible: true,
    agentDescription: "Email hosting — $1.99/month. 5 email accounts, 5GB storage, custom domain, spam protection.",
  },
  {
    serviceKey: "domain-registration",
    name: "Domain Registration",
    category: "domains",
    description: "Register and manage domain names",
    type: "starting-at",
    basePrice: 9.99,
    currency: "USD",
    features: [".com", ".net", ".org", ".pk", ".io", ".dev", ".app", ".co"],
    active: true,
    displayOrder: 20,
    agentVisible: true,
    agentDescription: "Domain registration — from $9.99/year. Available extensions: .com, .net, .org, .pk, .io, .dev, .app, .co.",
  },
  {
    serviceKey: "digital-marketing",
    name: "Digital Marketing",
    category: "marketing",
    description: "SEO, PPC, social media, and analytics",
    type: "starting-at",
    basePrice: 499,
    features: ["Search engine optimization (SEO)", "Google Ads and Meta Ads", "Social media strategy", "Analytics setup", "Email marketing"],
    active: true,
    displayOrder: 25,
    agentVisible: true,
    agentDescription: "Digital marketing services — SEO, Google Ads, Meta Ads, social media strategy, analytics setup, and email marketing.",
  },
  {
    serviceKey: "uiux-design",
    name: "UI/UX Design",
    category: "design",
    description: "User interface and experience design",
    type: "starting-at",
    basePrice: 999,
    features: ["Wireframing and prototyping", "Brand identity", "Design systems", "Usability testing"],
    technology: ["Figma", "Adobe XD", "Tailwind CSS"],
    active: true,
    displayOrder: 30,
    agentVisible: true,
    agentDescription: "UI/UX design services — wireframing, prototyping, brand identity, design systems, and usability testing.",
  },
];

async function seed() {
  console.log("Connecting to database...");
  await connectToDatabase();

  let created = 0;
  let updated = 0;

  for (const price of DEFAULT_PRICES) {
    const existing = await ServicePrice.findOne({ serviceKey: price.serviceKey });
    if (existing) {
      await ServicePrice.updateOne({ serviceKey: price.serviceKey }, { $set: price });
      updated++;
    } else {
      await ServicePrice.create(price);
      created++;
    }
  }

  console.log(`Seeding complete: ${created} created, ${updated} updated`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
