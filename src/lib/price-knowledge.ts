import { connectToDatabase } from "@/lib/mongodb";
import ServicePrice from "@/models/service-price";

/**
 * Builds the Wall-V service knowledge string from the database prices.
 * Falls back to hardcoded defaults if the database is empty or unavailable.
 */
export async function buildServiceKnowledge(): Promise<string> {
  try {
    await connectToDatabase();
    const prices = await ServicePrice.find({ active: true, agentVisible: true })
      .sort({ displayOrder: 1, category: 1 })
      .lean();

    if (prices.length === 0) {
      return getDefaultKnowledge();
    }

    const sections: string[] = [];
    const grouped: Record<string, typeof prices> = {};

    for (const p of prices) {
      if (!grouped[p.category]) grouped[p.category] = [];
      grouped[p.category].push(p);
    }

    const categoryLabels: Record<string, string> = {
      development: "WEB & APP DEVELOPMENT",
      "ai-automation": "AI & AUTOMATION",
      hosting: "HOSTING",
      domains: "DOMAINS",
      marketing: "DIGITAL MARKETING",
      design: "UI/UX DESIGN",
      consulting: "CONSULTING",
      other: "OTHER SERVICES",
    };

    for (const [category, items] of Object.entries(grouped)) {
      const label = categoryLabels[category] || category.toUpperCase();
      const lines: string[] = [`${label}:`];

      for (const item of items) {
        let priceStr = "";
        if (item.type === "tiered" && item.tiers?.length) {
          const tierList = item.tiers.map((t) => `${t.name}: $${t.price}`).join(", ");
          priceStr = `(${tierList})`;
        } else if (item.type === "hourly" && item.hourlyRate) {
          priceStr = `$${item.hourlyRate}/hr`;
        } else if (item.type === "starting-at") {
          priceStr = `Starting from $${item.basePrice}`;
        } else {
          priceStr = `$${item.basePrice}`;
        }

        const desc = item.agentDescription || item.description || item.name;
        lines.push(`- ${item.name}: ${priceStr} — ${desc}`);

        if (item.features?.length > 0) {
          lines.push(`  Includes: ${item.features.join(", ")}`);
        }
        if (item.technology?.length > 0) {
          lines.push(`  Tech: ${item.technology.join(", ")}`);
        }
      }

      sections.push(lines.join("\n"));
    }

    return sections.join("\n\n");
  } catch (error) {
    console.error("Failed to load prices for knowledge base:", error);
    return getDefaultKnowledge();
  }
}

function getDefaultKnowledge(): string {
  return `WEB & APP DEVELOPMENT:
- Web Development: Starting from $499 — Custom web applications, business websites, e-commerce, SaaS platforms
- Mobile Apps: Starting from $2,999 — Cross-platform (React Native, Flutter), native iOS/Android
- CRM Systems: Starting from $1,499 — Lead management, pipeline tracking, client communication
- ERP Systems: Starting from $2,999 — Finance, HR, inventory, real-time dashboards

AI & AUTOMATION:
- AI Solutions: Starting from $1,499 — Chatbots, voice agents, workflow automation, predictive analytics

HOSTING:
- Basic: $3.99/mo (1 site, 5GB, free SSL)
- Business: $9.99/mo (10 sites, 25GB, daily backups)
- Cloud: $16.99/mo (unlimited, 50GB, CDN)
- WordPress: $6.99/mo | Reseller: $29.99/mo | Email: $1.99/mo

DOMAINS:
- Domain Registration: from $9.99/yr (.com, .net, .org, .pk, .io, .dev, .app, .co)

DIGITAL MARKETING:
- SEO & Marketing: Starting from $499 — SEO, Google Ads, Meta Ads, social media, email marketing

UI/UX DESIGN:
- Design Services: Starting from $999 — Wireframing, prototyping, brand identity, design systems`;
}
