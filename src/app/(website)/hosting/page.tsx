import type { Metadata } from "next";
import { DomainSearch } from "@/components/domains/domain-search";

export const metadata: Metadata = {
  title: "Web Hosting & Domain Services",
  description:
    "Reliable web hosting with 99.9% uptime. Shared, VPS, and cloud hosting plans. Free SSL, daily backups, 24/7 support.",
};

const faqs = [
  {
    question: "What is web hosting?",
    answer:
      "Web hosting is a service that allows you to make your website accessible on the internet. Your website files are stored on a server that is connected to the internet 24/7.",
  },
  {
    question: "Do you offer free domain registration?",
    answer:
      "Yes, we offer a free domain name for the first year with all annual hosting plans. Domain renewal is at standard rates.",
  },
  {
    question: "What is the uptime guarantee?",
    answer:
      "We guarantee 99.9% uptime for all hosting plans. If we fail to meet this guarantee, you'll receive hosting credits.",
  },
  {
    question: "Can I upgrade my hosting plan later?",
    answer:
      "Yes, you can upgrade your hosting plan at any time. We'll handle the migration with zero downtime.",
  },
];

const plans = [
  {
    name: "Basic Hosting",
    price: "3.99",
    period: "/mo",
    features: [
      "1 Website",
      "5GB Storage",
      "10GB Bandwidth",
      "Free SSL",
      "Email Support",
    ],
    popular: false,
  },
  {
    name: "Business Hosting",
    price: "9.99",
    period: "/mo",
    features: [
      "10 Websites",
      "25GB Storage",
      "100GB Bandwidth",
      "Free SSL",
      "Priority Support",
      "Daily Backups",
    ],
    popular: true,
  },
  {
    name: "Cloud Hosting",
    price: "16.99",
    period: "/mo",
    features: [
      "Unlimited Sites",
      "50GB Storage",
      "Unlimited Bandwidth",
      "Free SSL",
      "24/7 Support",
      "CDN",
      "Staging",
    ],
    popular: false,
  },
  {
    name: "WordPress Hosting",
    price: "6.99",
    period: "/mo",
    features: [
      "1 Website",
      "10GB Storage",
      "Free SSL",
      "Auto Updates",
      "WordPress Optimized",
    ],
    popular: false,
  },
  {
    name: "Reseller Hosting",
    price: "29.99",
    period: "/mo",
    features: [
      "50 Accounts",
      "100GB Storage",
      "Unlimited Bandwidth",
      "WHM Control Panel",
      "White Label",
    ],
    popular: false,
  },
  {
    name: "Email Hosting",
    price: "1.99",
    period: "/mo",
    features: [
      "5 Email Accounts",
      "5GB Storage",
      "Webmail Access",
      "Spam Protection",
      "Custom Domain",
    ],
    popular: false,
  },
];

export default function HostingPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      {/* Hero */}
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Web Hosting & Domains
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Enterprise-grade hosting with 99.9% uptime, free SSL, and 24/7
          support.
        </p>
      </div>

      {/* Domain Search */}
      <div className="max-w-xl mx-auto mb-20">
        <DomainSearch />
      </div>

      {/* Hosting Plans */}
      <section className="mb-20">
        <h2 className="text-2xl font-bold text-center mb-2">Hosting Plans</h2>
        <p className="text-muted-foreground text-center mb-8">
          Choose the perfect plan for your website
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-6 bg-white relative ${
                plan.popular
                  ? "border-primary shadow-lg shadow-primary/10"
                  : ""
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                  Most Popular
                </span>
              )}
              <h3 className="text-xl font-bold">{plan.name}</h3>
              <div className="mt-4 mb-6">
                <span className="text-3xl font-bold">${plan.price}</span>
                <span className="text-muted-foreground text-sm">
                  {plan.period}
                </span>
              </div>
              <ul className="space-y-2 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="text-sm flex items-center gap-2">
                    <span className="text-green-500">✓</span> {f}
                  </li>
                ))}
              </ul>
              <button
                className={`w-full py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  plan.popular
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                Get Started
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-8">
          Frequently Asked Questions
        </h2>
        <div className="space-y-6">
          {faqs.map((faq) => (
            <div key={faq.question} className="rounded-xl border p-6">
              <h3 className="font-semibold mb-2">{faq.question}</h3>
              <p className="text-muted-foreground text-sm">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
