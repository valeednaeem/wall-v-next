import type { Metadata } from "next";
import { HostingPlans } from "@/components/hosting/hosting-plans";
import { DomainSearch } from "@/components/domains/domain-search";

export const metadata: Metadata = {
  title: "Web Hosting & Domain Services",
  description:
    "Reliable web hosting with 99.9% uptime. Shared, VPS, and cloud hosting plans. Free SSL, daily backups, 24/7 support. Register domains at competitive prices.",
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

export default function HostingDomainPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      {/* Hero */}
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Web Hosting & Domains
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Enterprise-grade hosting with 99.9% uptime, free SSL, and 24/7
          support. Register your perfect domain from 70+ TLDs.
        </p>
      </div>

      {/* Domain Search */}
      <div className="max-w-xl mx-auto mb-20">
        <DomainSearch />
      </div>

      {/* Hosting Plans */}
      <section className="mb-20">
        <HostingPlans />
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
