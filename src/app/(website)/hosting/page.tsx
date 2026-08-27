import type { Metadata } from "next";
import Link from "next/link";
import { generateSEO } from "@/lib/seo";
import { connectToDatabase } from "@/lib/mongodb";
import HostingPlan from "@/models/hosting-plan";

export const metadata: Metadata = generateSEO({
  title: "Web Hosting",
  description: "Enterprise-grade web hosting with 99.9% uptime, free SSL, daily backups, and 24/7 support. Shared, VPS, cloud, and dedicated plans.",
  url: "/hosting",
  keywords: ["web hosting", "VPS hosting", "cloud hosting", "dedicated server", "WordPress hosting"],
});

async function getHostingPlans() {
  try {
    await connectToDatabase();
    const plans = await HostingPlan.find({ isActive: true })
      .sort({ sortOrder: 1, category: 1 })
      .lean();
    return JSON.parse(JSON.stringify(plans));
  } catch {
    return [];
  }
}

export default async function HostingPage() {
  const plans = await getHostingPlans();

  const grouped: Record<string, typeof plans> = {};
  for (const p of plans) {
    const cat = p.category || "shared";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(p);
  }

  return (
    <div className="min-h-screen">
      <section className="bg-gradient-to-br from-primary/10 via-background to-primary/5 py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-4">Web Hosting</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Reliable, fast, and secure hosting for your website. Powered by industry-leading infrastructure.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        {plans.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">Hosting plans are being configured. Please contact us for details.</p>
        ) : (
          Object.entries(grouped).map(([category, categoryPlans]) => (
            <div key={category} className="mb-12">
              <h2 className="text-2xl font-bold capitalize mb-6">{category.replace(/-/g, " ")} Hosting</h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {categoryPlans.map((plan: { _id: string; name: string; slug: string; description?: string; finalPrice: number; finalRenewalPrice?: number; diskSpace: string; bandwidth: string; websites: number; emailAccounts: number; databases: number; features?: string[]; isPopular?: boolean; provider: string }) => (
                  <div key={plan._id} className={`rounded-xl border p-6 transition-shadow hover:shadow-lg ${plan.isPopular ? "border-primary ring-2 ring-primary/20" : ""}`}>
                    {plan.isPopular && (
                      <span className="inline-block rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground font-medium mb-3">
                        Most Popular
                      </span>
                    )}
                    <h3 className="text-lg font-semibold">{plan.name}</h3>
                    {plan.description && <p className="text-sm text-muted-foreground mt-1 mb-4">{plan.description}</p>}
                    <div className="text-3xl font-bold text-primary mb-1">
                      ${plan.finalPrice}<span className="text-sm font-normal text-muted-foreground">/mo</span>
                    </div>
                    {plan.finalRenewalPrice && plan.finalRenewalPrice !== plan.finalPrice && (
                      <p className="text-xs text-muted-foreground mb-4">Renews at ${plan.finalRenewalPrice}/mo</p>
                    )}
                    <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                      <div>💾 {plan.diskSpace}</div>
                      <div>📊 {plan.bandwidth}</div>
                      <div>🌐 {plan.websites} website{plan.websites !== 1 ? "s" : ""}</div>
                      <div>✉️ {plan.emailAccounts} emails</div>
                      <div>🗄️ {plan.databases} databases</div>
                      <div>🔒 Free SSL</div>
                    </div>
                    {plan.features && plan.features.length > 0 && (
                      <ul className="text-sm space-y-1 mb-4">
                        {plan.features.slice(0, 5).map((f: string, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-green-500 mt-0.5">✓</span>
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <Link
                      href={`/contact?service=hosting&plan=${plan.slug}`}
                      className="block w-full text-center rounded-lg bg-primary px-4 py-2 text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                    >
                      Get Started
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
