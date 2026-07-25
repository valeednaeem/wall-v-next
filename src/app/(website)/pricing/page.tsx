import type { Metadata } from "next";
import Link from "next/link";
import { PricingPlans } from "@/components/pricing-plans";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple, transparent pricing for web development, AI automation, and ERP/CRM solutions. Choose the plan that fits your business.",
};

const plans = [
  {
    name: "Starter",
    description: "Perfect for small businesses and startups",
    monthly: 499,
    annual: 399,
    popular: false,
    features: [
      "Single-page or landing page website",
      "Basic responsive design",
      "Contact form integration",
      "Standard hosting (1 year)",
      "Free domain (1 year)",
      "Basic SEO setup",
      "Email support",
    ],
    notIncluded: [
      "Custom AI features",
      "E-commerce functionality",
      "Mobile app",
      "Priority support",
    ],
  },
  {
    name: "Professional",
    description: "For growing businesses that need more power",
    monthly: 1499,
    annual: 1199,
    popular: true,
    features: [
      "Multi-page website (up to 10 pages)",
      "Custom UI/UX design",
      "AI chatbot integration",
      "CRM setup with lead tracking",
      "Premium hosting (1 year)",
      "Free domain (1 year)",
      "Advanced SEO & analytics",
      "Priority email & chat support",
    ],
    notIncluded: [
      "Custom ERP system",
      "Native mobile app",
    ],
  },
  {
    name: "Enterprise",
    description: "Full-scale solutions for large organizations",
    monthly: 2999,
    annual: 2499,
    popular: false,
    features: [
      "Unlimited pages & features",
      "Custom ERP/CRM development",
      "AI automation workflows",
      "Native mobile app (iOS + Android)",
      "Dedicated cloud server",
      "Custom domain & SSL",
      "Full SEO & marketing suite",
      "24/7 dedicated support",
      "Monthly strategy calls",
      "SLA with 99.9% uptime",
    ],
    notIncluded: [],
  },
];

const addons = [
  { name: "Additional Domain", price: "$9.99/yr" },
  { name: "Extra Email Accounts", price: "$3.99/yr each" },
  { name: "SSL Certificate (Premium)", price: "$19.99/yr" },
  { name: "Automated Backups", price: "$7.99/yr" },
  { name: "CDN Add-on", price: "$14.99/yr" },
  { name: "Extra Storage (10GB)", price: "$9.99/yr" },
];

const faqs = [
  { question: "How do I choose the right plan?", answer: "Start with Starter if you need a simple web presence. Choose Professional if you need CRM, AI chatbot, or multiple pages. Go Enterprise for custom ERP, mobile apps, or full-scale automation." },
  { question: "Can I upgrade my plan later?", answer: "Yes! You can upgrade at any time. We'll credit the remaining value of your current plan toward the upgrade." },
  { question: "What payment methods do you accept?", answer: "We accept bank transfers, JazzCash, EasyPaisa, Stripe (credit/debit cards), and PayPal. Enterprise plans can also be invoiced with NET-30 terms." },
  { question: "Is there a money-back guarantee?", answer: "Yes. We offer a 14-day money-back guarantee on all plans. If you're not satisfied, we'll refund your payment in full." },
];

export default function PricingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-violet-50 via-white to-indigo-50 py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary mb-6">
              Pricing
            </span>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
              Simple, Transparent{" "}
              <span className="text-primary">Pricing</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto">
              No hidden fees. No surprises. Choose the plan that fits your business and scale as you grow.
            </p>
          </div>
        </div>
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 right-0 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-40 left-0 h-80 w-80 rounded-full bg-indigo-500/5 blur-3xl" />
        </div>
      </section>

      {/* Pricing Plans */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <PricingPlans plans={plans} />
        </div>
      </section>

      {/* Add-ons */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Add-ons</h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Enhance your plan with additional services
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto">
            {addons.map((addon) => (
              <div key={addon.name} className="flex items-center justify-between rounded-xl border bg-white p-4">
                <span className="text-sm font-medium">{addon.name}</span>
                <span className="text-sm text-primary font-semibold">{addon.price}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {faqs.map((faq) => (
              <div key={faq.question} className="rounded-xl border p-6">
                <h3 className="font-semibold mb-2">{faq.question}</h3>
                <p className="text-muted-foreground text-sm">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="rounded-3xl bg-gradient-to-r from-violet-600 to-indigo-600 p-12 text-center text-white">
            <h2 className="text-3xl font-bold">Need a Custom Plan?</h2>
            <p className="mt-4 text-white/80 max-w-xl mx-auto">
              Tell us about your project and we&apos;ll create a tailored package that meets your exact requirements.
            </p>
            <div className="mt-8">
              <Link
                href="/contact"
                className="rounded-lg bg-white px-8 py-3.5 text-sm font-medium text-violet-600 hover:bg-white/90 transition-colors"
              >
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
