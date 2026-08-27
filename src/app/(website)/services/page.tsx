import type { Metadata } from "next";
import Link from "next/link";
import { generateSEO } from "@/lib/seo";
import { connectToDatabase } from "@/lib/mongodb";
import ServicePrice from "@/models/service-price";

export const metadata: Metadata = generateSEO({
  title: "Services",
  description: "AI-powered digital agency services — custom software development, AI automation, ERP/CRM, web hosting, mobile apps, and digital marketing.",
  url: "/services",
  keywords: ["software development", "AI automation", "ERP CRM", "web hosting", "mobile apps", "digital marketing"],
});

const CATEGORY_ICONS: Record<string, string> = {
  development: "💻",
  "ai-automation": "🤖",
  design: "🎨",
  marketing: "📈",
  hosting: "☁️",
  domains: "🌐",
  consulting: "📊",
  other: "⚡",
};

const CATEGORY_ORDER = ["development", "ai-automation", "design", "marketing", "hosting", "domains", "consulting"];

async function getServices() {
  try {
    await connectToDatabase();
    const prices = await ServicePrice.find({ active: true })
      .sort({ displayOrder: 1, category: 1 })
      .lean();
    return JSON.parse(JSON.stringify(prices));
  } catch {
    return [];
  }
}

function formatPrice(service: { type: string; basePrice?: number; hourlyRate?: number; tiers?: { name: string; price: number }[] }): string {
  if (service.type === "hourly" && service.hourlyRate) {
    return `From $${service.hourlyRate}/hr`;
  }
  if (service.type === "starting-at" && service.basePrice) {
    return `From $${service.basePrice.toLocaleString()}`;
  }
  if (service.type === "tiered" && service.tiers?.length) {
    const min = Math.min(...service.tiers.map((t) => t.price));
    return `From $${min.toLocaleString()}`;
  }
  if (service.basePrice) {
    return `$${service.basePrice.toLocaleString()}`;
  }
  return "Custom Quote";
}

export default async function ServicesPage() {
  const services = await getServices();

  // Group by category
  const grouped: Record<string, typeof services> = {};
  for (const s of services) {
    const cat = s.category || "other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(s);
  }

  const orderedCategories = CATEGORY_ORDER.filter((c) => grouped[c]?.length);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-primary/5 py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-4">Our Services</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            End-to-end digital solutions powered by AI. From concept to deployment, we deliver results.
          </p>
        </div>
      </section>

      {/* Services by Category */}
      {services.length === 0 ? (
        <section className="container mx-auto px-4 py-16 text-center text-muted-foreground">
          Services are being configured. Please contact us for a custom quote.
        </section>
      ) : (
        orderedCategories.map((category) => (
          <section key={category} className="container mx-auto px-4 py-12">
            <div className="flex items-center gap-3 mb-8">
              <span className="text-3xl">{CATEGORY_ICONS[category] || "⚡"}</span>
              <h2 className="text-2xl font-bold capitalize">{category.replace(/-/g, " ")}</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {grouped[category].map((service: { _id: string; serviceKey: string; name: string; description?: string; features?: string[]; type: string; basePrice?: number; hourlyRate?: number; tiers?: { name: string; price: number }[]; estimatedWeeks?: number; technology?: string[] }) => (
                <div key={service._id} className="rounded-xl border bg-card p-6 hover:shadow-lg transition-shadow">
                  <h3 className="text-lg font-semibold mb-2">{service.name}</h3>
                  {service.description && (
                    <p className="text-sm text-muted-foreground mb-4">{service.description}</p>
                  )}
                  <div className="text-primary font-bold text-lg mb-4">
                    {formatPrice(service)}
                  </div>
                  {service.features && service.features.length > 0 && (
                    <ul className="text-sm space-y-1 mb-4">
                      {service.features.slice(0, 4).map((f: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-green-500 mt-0.5">✓</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {service.technology && service.technology.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {service.technology.map((t: string, i: number) => (
                        <span key={i} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  <Link
                    href={`/contact?service=${service.serviceKey}`}
                    className="inline-flex items-center text-sm text-primary hover:underline"
                  >
                    Get Started →
                  </Link>
                </div>
              ))}
            </div>
          </section>
        ))
      )}

      {/* CTA */}
      <section className="bg-muted/50 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-4">Need a Custom Solution?</h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Our AI agents can help you define requirements and provide an instant estimate.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center rounded-lg bg-primary px-6 py-3 text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            Talk to Our AI Assistant
          </Link>
        </div>
      </section>
    </div>
  );
}
