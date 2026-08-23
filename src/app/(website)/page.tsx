import Link from "next/link";
import type { Metadata } from "next";
import ChatWidgetLoader from "@/components/agents/ChatWidgetLoader";

const services = [
  { title: "AI Automation", description: "Intelligent agents & workflows that automate your business processes.", icon: "🤖" },
  { title: "Web Development", description: "Custom web applications built with modern technologies.", icon: "🌐" },
  { title: "Mobile Apps", description: "Native and cross-platform mobile applications.", icon: "📱" },
  { title: "Web Hosting", description: "Reliable, secure, and scalable hosting solutions.", icon: "☁️" },
  { title: "ERP & CRM", description: "Enterprise resource planning and customer management.", icon: "⚙️" },
  { title: "Digital Marketing", description: "Data-driven strategies to grow your online presence.", icon: "📊" },
];

const stats = [
  { value: "150+", label: "Projects Completed" },
  { value: "50+", label: "Happy Clients" },
  { value: "99.9%", label: "Uptime Guarantee" },
  { value: "24/7", label: "Support Available" },
];

const products = [
  { name: "Business Hosting", price: "9.99", period: "/mo", features: ["10 Websites", "25GB Storage", "Free SSL", "Daily Backups"] },
  { name: "WordPress Hosting", price: "6.99", period: "/mo", features: ["1 Website", "10GB Storage", "Free SSL", "Auto Updates"] },
  { name: "Cloud Hosting", price: "16.99", period: "/mo", features: ["Unlimited Sites", "50GB Storage", "CDN Included", "99.9% Uptime"] },
];

const faqs = [
  { question: "What services does Wall-V offer?", answer: "Wall-V offers custom software development, AI automation, ERP/CRM solutions, web hosting, domain registration, digital product sales, and ongoing maintenance and support." },
  { question: "How does AI automation benefit my business?", answer: "AI automation streamlines repetitive tasks, reduces human error, cuts operational costs, and frees your team to focus on strategic work." },
  { question: "Do you provide ongoing support after project delivery?", answer: "Yes. We offer maintenance plans, 24/7 support tickets, hosting management, and continuous improvement cycles." },
  { question: "How can I get a quote for my project?", answer: "Visit our contact page or click 'Get Your Free Quote'. We'll discuss your requirements and provide a detailed proposal with timelines and costs." },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-violet-50 via-white to-indigo-50 py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary mb-6">
              AI-Powered Digital Agency
            </span>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
              Build. Automate.{" "}
              <span className="text-primary">Scale.</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto">
              We build exceptional websites, mobile apps, and AI automation solutions.
              From hosting to enterprise ERP/CRM systems — everything you need to grow.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/contact"
                className="rounded-lg bg-primary px-8 py-3.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25"
              >
                Get Your Free Quote
              </Link>
              <Link
                href="/services"
                className="rounded-lg border border-border px-8 py-3.5 text-sm font-medium hover:bg-accent transition-colors"
              >
                Explore Services
              </Link>
            </div>
          </div>
        </div>
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 right-0 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-40 left-0 h-80 w-80 rounded-full bg-indigo-500/5 blur-3xl" />
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 border-y bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-bold text-primary">{stat.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Our Services</h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Comprehensive digital solutions powered by artificial intelligence
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <div key={service.title} className="group rounded-xl border p-6 hover:shadow-lg hover:border-primary/20 transition-all">
                <div className="text-4xl mb-4">{service.icon}</div>
                <h3 className="text-xl font-semibold">{service.title}</h3>
                <p className="mt-2 text-muted-foreground text-sm">{service.description}</p>
                <Link href="/services" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
                  Learn More →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hosting Plans */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Hosting Plans</h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Enterprise-grade hosting with 99.9% uptime guarantee
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
            {products.map((plan, idx) => (
              <div key={plan.name} className={`rounded-2xl border p-8 bg-white ${idx === 1 ? "border-primary shadow-lg shadow-primary/10 scale-[1.02]" : ""}`}>
                {idx === 1 && (
                  <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-4">
                    Most Popular
                  </span>
                )}
                <h3 className="text-xl font-semibold">{plan.name}</h3>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <span className="text-green-500">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/hosting-domain"
                  className={`block w-full text-center py-2.5 rounded-lg font-medium text-sm transition-colors ${
                    idx === 1
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/hosting-domain" className="text-sm font-medium text-primary hover:underline">
              View all hosting plans →
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="rounded-3xl bg-gradient-to-r from-violet-600 to-indigo-600 p-12 text-center text-white">
            <h2 className="text-3xl font-bold">Ready to Transform Your Business?</h2>
            <p className="mt-4 text-white/80 max-w-xl mx-auto">
              Let our AI-powered platform help you build, automate, and scale your digital presence.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup"
                className="rounded-lg bg-white px-8 py-3.5 text-sm font-medium text-violet-600 hover:bg-white/90 transition-colors"
              >
                Start Free Trial
              </Link>
              <Link
                href="/contact"
                className="rounded-lg border border-white/30 px-8 py-3.5 text-sm font-medium text-white hover:bg-white/10 transition-colors"
              >
                Talk to Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Voice Agent CTA */}
      <section className="py-20 bg-gradient-to-br from-violet-600 to-indigo-700 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-block rounded-full bg-white/20 px-4 py-1.5 text-xs font-medium mb-6">
              AI Voice Agent
            </span>
            <h2 className="text-3xl md:text-4xl font-bold">Prefer to Talk? Use Our Voice Agent</h2>
            <p className="mt-4 text-white/80 max-w-xl mx-auto">
              Skip the forms. Speak naturally with our AI assistant to get instant answers about services, pricing, and project estimates.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/voice-agent"
                className="rounded-lg bg-white px-8 py-3.5 text-sm font-medium text-violet-600 hover:bg-white/90 transition-colors"
              >
                Try Voice Assistant
              </Link>
              <Link
                href="/contact"
                className="rounded-lg border border-white/30 px-8 py-3.5 text-sm font-medium text-white hover:bg-white/10 transition-colors"
              >
                Talk to Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {faqs.map((faq) => (
              <div key={faq.question} className="rounded-xl border bg-white p-6">
                <h3 className="font-semibold mb-2">{faq.question}</h3>
                <p className="text-muted-foreground text-sm">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Chat Widget */}
      <ChatWidgetLoader />
    </div>
  );
}
