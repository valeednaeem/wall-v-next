import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import dns from "dns";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// Fix DNS SRV resolution on Windows
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/wallvnext";

async function seed() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI, { dbName: "wallvnext" });
  console.log("Connected.\n");

  // Import models
  const { default: LegalPage } = await import("../models/legal-page");
  const { default: LegalVersion } = await import("../models/legal-version");
  const { default: CookieCategory } = await import("../models/cookie-category");
  const { default: CookieDefinition } = await import("../models/cookie-definition");
  const { default: RefundRule } = await import("../models/refund-rule");
  const { default: SitemapSettings } = await import("../models/sitemap-settings");

  // ==================== COOKIE CATEGORIES ====================
  console.log("Seeding cookie categories...");
  const categories = [
    { name: "Strictly Necessary", slug: "strictly-necessary", description: "Required for the website to function properly. Cannot be disabled.", isRequired: true, defaultEnabled: true, sortOrder: 1 },
    { name: "Functional", slug: "functional", description: "Enable personalized features like remembering your preferences and settings.", isRequired: false, defaultEnabled: true, sortOrder: 2 },
    { name: "Analytics", slug: "analytics", description: "Help us understand how visitors interact with our website by collecting anonymous data.", isRequired: false, defaultEnabled: false, sortOrder: 3 },
    { name: "Marketing", slug: "marketing", description: "Used to display relevant advertisements and track campaign performance.", isRequired: false, defaultEnabled: false, sortOrder: 4 },
    { name: "Third-Party", slug: "third-party", description: "Cookies set by third-party services integrated into our website.", isRequired: false, defaultEnabled: false, sortOrder: 5 },
  ];

  for (const cat of categories) {
    await CookieCategory.findOneAndUpdate({ slug: cat.slug }, cat, { upsert: true, new: true });
  }
  console.log(`  Created ${categories.length} cookie categories.`);

  // Get category IDs
  const necessaryCat = await CookieCategory.findOne({ slug: "strictly-necessary" });
  const functionalCat = await CookieCategory.findOne({ slug: "functional" });
  const analyticsCat = await CookieCategory.findOne({ slug: "analytics" });
  const marketingCat = await CookieCategory.findOne({ slug: "marketing" });
  const thirdPartyCat = await CookieCategory.findOne({ slug: "third-party" });

  // ==================== COOKIE DEFINITIONS ====================
  console.log("Seeding cookie definitions...");
  const cookies = [
    { name: "session_id", slug: "session-id", description: "Maintains your session state across page requests", category: necessaryCat!._id, provider: "Wall-V", purpose: "Session management", duration: "Session", type: "first-party" as const, isRequired: true, sortOrder: 1 },
    { name: "csrf_token", slug: "csrf-token", description: "Protects against cross-site request forgery attacks", category: necessaryCat!._id, provider: "Wall-V", purpose: "Security", duration: "Session", type: "first-party" as const, isRequired: true, sortOrder: 2 },
    { name: "auth_token", slug: "auth-token", description: "Authenticates logged-in users", category: necessaryCat!._id, provider: "Wall-V", purpose: "Authentication", duration: "30 days", type: "first-party" as const, isRequired: true, sortOrder: 3 },
    { name: "cookie_consent", slug: "cookie-consent", description: "Stores your cookie preference selections", category: necessaryCat!._id, provider: "Wall-V", purpose: "Compliance", duration: "1 year", type: "first-party" as const, isRequired: true, sortOrder: 4 },
    { name: "language_pref", slug: "language-pref", description: "Remembers your preferred language", category: functionalCat!._id, provider: "Wall-V", purpose: "Language preference", duration: "1 year", type: "first-party" as const, isRequired: false, sortOrder: 5 },
    { name: "theme_mode", slug: "theme-mode", description: "Stores your dark/light mode preference", category: functionalCat!._id, provider: "Wall-V", purpose: "Theme preference", duration: "1 year", type: "first-party" as const, isRequired: false, sortOrder: 6 },
    { name: "_ga", slug: "ga", description: "Distinguishes unique users by assigning a randomly generated number", category: analyticsCat!._id, provider: "Google Analytics", purpose: "Analytics", duration: "2 years", type: "third-party" as const, isRequired: false, sortOrder: 7 },
    { name: "_gid", slug: "gid", description: "Distinguishes unique users", category: analyticsCat!._id, provider: "Google Analytics", purpose: "Analytics", duration: "24 hours", type: "third-party" as const, isRequired: false, sortOrder: 8 },
    { name: "_fbp", slug: "fbp", description: "Used by Facebook to deliver advertising", category: marketingCat!._id, provider: "Meta", purpose: "Advertising", duration: "3 months", type: "third-party" as const, isRequired: false, sortOrder: 9 },
    { name: "_gcl_au", slug: "gcl-au", description: "Used by Google AdSense for experimentating ad efficiency", category: marketingCat!._id, provider: "Google", purpose: "Advertising", duration: "3 months", type: "third-party" as const, isRequired: false, sortOrder: 10 },
  ];

  for (const cookie of cookies) {
    await CookieDefinition.findOneAndUpdate({ name: cookie.name }, cookie, { upsert: true, new: true });
  }
  console.log(`  Created ${cookies.length} cookie definitions.`);

  // ==================== REFUND RULES ====================
  console.log("Seeding refund rules...");
  const refundRules = [
    {
      name: "AI Agents & SaaS",
      slug: "ai-agents-saas",
      description: "AI agent subscriptions may be cancelled within 14 days for a full refund if not substantially used.",
      serviceType: "AI Agents & SaaS",
      refundWindowDays: 14,
      refundPercentage: 100,
      conditions: ["Service not substantially used", "Within 14 days of purchase"],
      isEligible: true,
      requiresApproval: false,
      refundMethod: "original-payment" as const,
      processingDays: 10,
      excludedItems: ["Setup fees", "Usage beyond trial period"],
      sortOrder: 1,
    },
    {
      name: "Custom Software Development",
      slug: "custom-software-development",
      description: "Milestone-based billing. Refund for unstarted work only.",
      serviceType: "Software Development",
      refundWindowDays: 14,
      refundPercentage: 100,
      conditions: ["Payment for unstarted milestones", "Within 14 days of payment"],
      isEligible: true,
      requiresApproval: true,
      refundMethod: "original-payment" as const,
      processingDays: 14,
      excludedItems: ["Completed milestones", "Cancellation fees (15%)"],
      sortOrder: 2,
    },
    {
      name: "Website & Mobile App Development",
      slug: "website-mobile-app-development",
      description: "Refund for undelivered milestones. Cancellation fee may apply.",
      serviceType: "Web & Mobile Development",
      refundWindowDays: 14,
      refundPercentage: 85,
      conditions: ["Cancellation after project commencement", "Undelivered milestones only"],
      isEligible: true,
      requiresApproval: true,
      refundMethod: "original-payment" as const,
      processingDays: 14,
      excludedItems: ["Completed milestones", "Design concept fees"],
      sortOrder: 3,
    },
    {
      name: "Hosting Services",
      slug: "hosting-services",
      description: "Hosting fees refundable within 30 days. Domain fees non-refundable.",
      serviceType: "Hosting",
      refundWindowDays: 30,
      refundPercentage: 100,
      conditions: ["Within 30 days of purchase or renewal"],
      isEligible: true,
      requiresApproval: false,
      refundMethod: "original-payment" as const,
      processingDays: 7,
      excludedItems: ["Domain registration fees", "SSL certificate fees"],
      sortOrder: 4,
    },
    {
      name: "Digital Products & Templates",
      slug: "digital-products-templates",
      description: "Refund within 14 days if defective or not as described.",
      serviceType: "Digital Products",
      refundWindowDays: 14,
      refundPercentage: 100,
      conditions: ["Product is defective", "Not as described", "Within 14 days"],
      isEligible: true,
      requiresApproval: false,
      refundMethod: "original-payment" as const,
      processingDays: 10,
      excludedItems: ["Downloaded products functioning as described"],
      sortOrder: 5,
    },
    {
      name: "Consulting Services",
      slug: "consulting-services",
      description: "Refund if cancelled 48+ hours before session. 50% refund within 48 hours.",
      serviceType: "Consulting",
      refundWindowDays: 2,
      refundPercentage: 100,
      conditions: ["Cancelled more than 48 hours before session"],
      isEligible: true,
      requiresApproval: false,
      refundMethod: "original-payment" as const,
      processingDays: 7,
      excludedItems: ["Sessions within 48 hours (50% refund or reschedule)"],
      sortOrder: 6,
    },
    {
      name: "Maintenance & Support Plans",
      slug: "maintenance-support-plans",
      description: "Monthly plans cancel with 30 days notice. Annual plans prorated.",
      serviceType: "Maintenance",
      refundWindowDays: 30,
      refundPercentage: 90,
      conditions: ["30 days notice for monthly plans", "Prorated for annual plans"],
      isEligible: true,
      requiresApproval: false,
      refundMethod: "original-payment" as const,
      processingDays: 14,
      excludedItems: ["10% administrative fee for annual plans"],
      sortOrder: 7,
    },
    {
      name: "Design Services",
      slug: "design-services",
      description: "Full refund before concept. 50% after concept. No refund after final delivery.",
      serviceType: "Design",
      refundWindowDays: 14,
      refundPercentage: 100,
      conditions: ["Stage-dependent refund"],
      isEligible: true,
      requiresApproval: true,
      refundMethod: "original-payment" as const,
      processingDays: 14,
      excludedItems: ["Final delivered designs (unless defective)"],
      sortOrder: 8,
    },
  ];

  for (const rule of refundRules) {
    await RefundRule.findOneAndUpdate({ slug: rule.slug }, rule, { upsert: true, new: true });
  }
  console.log(`  Created ${refundRules.length} refund rules.`);

  // ==================== SITEMAP SETTINGS ====================
  console.log("Seeding sitemap settings...");
  await SitemapSettings.findOneAndUpdate(
    {},
    {
      includePages: true,
      includePosts: true,
      includeProducts: true,
      includeServices: true,
      includeCategories: true,
      includeTags: true,
      includeLegal: true,
      includePortfolio: true,
      defaultPriority: 0.5,
      defaultChangeFreq: "weekly",
    },
    { upsert: true, new: true }
  );
  console.log("  Created sitemap settings.");

  // ==================== LEGAL PAGES (DB records for dynamic management) ====================
  console.log("Seeding legal page records...");

  const legalPages = [
    { title: "Privacy Policy", slug: "privacy", type: "privacy", version: "1.0", status: "published", isActive: true },
    { title: "Terms & Conditions", slug: "terms", type: "terms", version: "1.0", status: "published", isActive: true },
    { title: "Disclaimer", slug: "disclaimer", type: "disclaimer", version: "1.0", status: "published", isActive: true },
    { title: "Refund Policy", slug: "refund", type: "refund", version: "1.0", status: "published", isActive: true },
    { title: "Cookie Policy", slug: "cookie-policy", type: "cookie", version: "1.0", status: "published", isActive: true },
    { title: "Sitemap", slug: "sitemap", type: "sitemap", version: "1.0", status: "published", isActive: true },
    { title: "Accessibility Statement", slug: "accessibility", type: "accessibility", version: "1.0", status: "published", isActive: true },
    { title: "Acceptable Use Policy", slug: "acceptable-use", type: "acceptable-use", version: "1.0", status: "published", isActive: true },
    { title: "AI Usage & Limitations Policy", slug: "ai-usage", type: "ai-usage", version: "1.0", status: "published", isActive: true },
    { title: "Data Processing & Security Policy", slug: "data-processing", type: "data-processing", version: "1.0", status: "published", isActive: true },
    { title: "Copyright & IP Policy", slug: "copyright", type: "copyright", version: "1.0", status: "published", isActive: true },
    { title: "Contact & Legal Notices", slug: "legal-notices", type: "contact-legal", version: "1.0", status: "published", isActive: true },
  ];

  for (const page of legalPages) {
    const existing = await LegalPage.findOne({ slug: page.slug });
    if (!existing) {
      const created = await LegalPage.create({
        ...page,
        content: `<p>Content managed from dashboard. Edit this page at /dashboard/settings/legal/editor/${page.slug}</p>`,
        seo: {
          metaTitle: `${page.title} | Wall-V`,
          metaDescription: `${page.title} for Wall-V services`,
          robots: "index, follow",
        },
      });
      await LegalVersion.create({
        legalPage: created._id,
        version: "1.0",
        content: created.content,
        title: created.title,
        changeNote: "Initial version",
        snapshot: { seo: created.seo, type: created.type, slug: created.slug },
      });
    }
  }
  console.log(`  Created ${legalPages.length} legal page records.`);

  console.log("\nSeeding complete!");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
