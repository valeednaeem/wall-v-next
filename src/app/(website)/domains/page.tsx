import type { Metadata } from "next";
import { DomainSearch } from "@/components/domains/domain-search";
import { DomainPricing } from "@/components/domains/domain-pricing";

export const metadata: Metadata = {
  title: "Domain Name Registration - Buy Domains at Best Prices",
  description:
    "Register your perfect domain name. 70+ TLDs available. Competitive pricing with free WHOIS privacy protection.",
};

const faqs = [
  {
    question: "How do I register a domain name?",
    answer:
      "Simply search for your desired domain name above. If it's available, add it to your cart and complete the checkout process. Your domain will be activated instantly.",
  },
  {
    question: "What is WHOIS privacy protection?",
    answer:
      "WHOIS privacy protection hides your personal contact information from the public WHOIS database, protecting you from spam and identity theft.",
  },
  {
    question: "Can I transfer my domain to you?",
    answer:
      "Yes! You can transfer your existing domain from any registrar. Simply initiate the transfer from your control panel and follow the instructions.",
  },
  {
    question: "Do you offer free domains with hosting?",
    answer:
      "Yes, we offer a free domain name for the first year with all annual hosting plans.",
  },
];

export default function DomainsPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      {/* Hero */}
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Find Your Perfect Domain
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Register your dream domain name from 70+ TLDs. Competitive pricing with
          free WHOIS privacy protection.
        </p>
      </div>

      {/* Domain Search */}
      <div className="max-w-xl mx-auto mb-20">
        <DomainSearch />
      </div>

      {/* Domain Pricing */}
      <section className="mb-20">
        <DomainPricing />
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
