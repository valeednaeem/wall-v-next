import Link from "next/link";
import type { Metadata } from "next";
import {
  Bot, Globe, Smartphone, Cloud, Settings, BarChart3,
  Shield, Clock, Headphones, CheckCircle2, ArrowRight,
  Zap, Users, TrendingUp, Star, MessageSquare, Sparkles,
} from "lucide-react";

const services = [
  { title: "AI Automation", description: "Intelligent agents & workflows that automate your business processes end-to-end.", icon: Bot, color: "text-violet-600 bg-violet-100" },
  { title: "Web Development", description: "Custom web applications built with React, Next.js, and modern frameworks.", icon: Globe, color: "text-blue-600 bg-blue-100" },
  { title: "Mobile Apps", description: "Native and cross-platform mobile applications for iOS and Android.", icon: Smartphone, color: "text-emerald-600 bg-emerald-100" },
  { title: "Web Hosting", description: "Reliable, secure, and scalable hosting with 99.9% uptime guarantee.", icon: Cloud, color: "text-cyan-600 bg-cyan-100" },
  { title: "ERP & CRM", description: "Enterprise resource planning and customer relationship management.", icon: Settings, color: "text-amber-600 bg-amber-100" },
  { title: "Digital Marketing", description: "Data-driven SEO, content, and social strategies to grow your presence.", icon: BarChart3, color: "text-rose-600 bg-rose-100" },
];

const stats = [
  { value: "150+", label: "Projects Delivered", icon: TrendingUp },
  { value: "50+", label: "Happy Clients", icon: Users },
  { value: "99.9%", label: "Uptime SLA", icon: Shield },
  { value: "24/7", label: "Support Available", icon: Headphones },
];

const products = [
  { name: "Business Hosting", price: "9.99", period: "/mo", features: ["10 Websites", "25GB Storage", "Free SSL", "Daily Backups"], popular: false },
  { name: "WordPress Hosting", price: "6.99", period: "/mo", features: ["1 Website", "10GB Storage", "Free SSL", "Auto Updates"], popular: true },
  { name: "Cloud Hosting", price: "16.99", period: "/mo", features: ["Unlimited Sites", "50GB Storage", "CDN Included", "99.9% Uptime"], popular: false },
];

const processSteps = [
  { step: "01", title: "Discovery", description: "We analyze your requirements, market, and goals to craft a strategic plan." },
  { step: "02", title: "Design & Build", description: "Our team designs and develops your solution with agile sprints and weekly demos." },
  { step: "03", title: "Launch & Scale", description: "We deploy, monitor, and continuously optimize to ensure peak performance." },
];

const testimonials = [
  { name: "Sarah Chen", role: "CEO, TechFlow", content: "Wall-V transformed our operations with their AI automation. We saved 30+ hours per week on manual tasks.", rating: 5 },
  { name: "Michael Rodriguez", role: "Founder, GrowthHub", content: "The team delivered our platform 2 weeks ahead of schedule. Their technical expertise is unmatched.", rating: 5 },
  { name: "Emily Watson", role: "CTO, DataPulse", content: "From hosting to full-stack development, Wall-V is our one-stop digital partner. Exceptional quality.", rating: 5 },
];

const faqs = [
  { question: "What services does Wall-V offer?", answer: "Wall-V offers custom software development, AI automation, ERP/CRM solutions, web hosting, domain registration, digital product sales, and ongoing maintenance and support." },
  { question: "How does AI automation benefit my business?", answer: "AI automation streamlines repetitive tasks, reduces human error, cuts operational costs, and frees your team to focus on strategic work. Our clients typically see 40-60% time savings on routine operations." },
  { question: "Do you provide ongoing support after project delivery?", answer: "Yes. We offer maintenance plans, 24/7 support tickets, hosting management, and continuous improvement cycles to ensure your digital assets stay performant and secure." },
  { question: "How can I get a quote for my project?", answer: "Visit our contact page or click 'Get Your Free Quote'. We'll discuss your requirements and provide a detailed proposal with timelines and costs — completely free." },
  { question: "What technologies does Wall-V use?", answer: "We use modern, battle-tested technologies: React, Next.js, TypeScript, Node.js, Python, MongoDB, PostgreSQL, and cloud platforms like AWS and Vercel for reliable, scalable solutions." },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-violet-50 via-white to-indigo-50 py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary mb-6">
              <Sparkles className="h-3 w-3" />
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
                className="rounded-lg bg-primary px-8 py-3.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
              >
                Get Your Free Quote
              </Link>
              <Link
                href="/services"
                className="rounded-lg border border-border px-8 py-3.5 text-sm font-medium hover:bg-accent transition-all hover:-translate-y-0.5"
              >
                Explore Services
              </Link>
            </div>
          </div>
        </div>
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
              <div key={stat.label} className="text-center group">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <stat.icon className="h-5 w-5" />
                </div>
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
            <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary mb-4">
              What We Do
            </span>
            <h2 className="text-3xl font-bold">Our Services</h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Comprehensive digital solutions powered by artificial intelligence
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <div key={service.title} className="group rounded-xl border p-6 hover:shadow-lg hover:border-primary/20 transition-all duration-300 hover:-translate-y-1">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${service.color} mb-4`}>
                  <service.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold">{service.title}</h3>
                <p className="mt-2 text-muted-foreground text-sm leading-relaxed">{service.description}</p>
                <Link href="/services" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:gap-2 transition-all">
                  Learn More <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary mb-4">
              Our Process
            </span>
            <h2 className="text-3xl font-bold">How It Works</h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              A proven three-step process to bring your vision to life
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
            {processSteps.map((step, idx) => (
              <div key={step.step} className="relative text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground text-xl font-bold mb-4">
                  {step.step}
                </div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
                {idx < processSteps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] border-t-2 border-dashed border-primary/20" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary mb-4">
              Client Stories
            </span>
            <h2 className="text-3xl font-bold">Trusted by Industry Leaders</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
            {testimonials.map((t) => (
              <div key={t.name} className="rounded-xl border bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">&ldquo;{t.content}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                    {t.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hosting Plans */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary mb-4">
              Hosting
            </span>
            <h2 className="text-3xl font-bold">Enterprise-Grade Hosting</h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Secure, fast, and reliable hosting with 99.9% uptime guarantee
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
            {products.map((plan) => (
              <div key={plan.name} className={`rounded-2xl border p-8 bg-white transition-all duration-300 hover:-translate-y-1 ${plan.popular ? "border-primary shadow-lg shadow-primary/10 scale-[1.02] relative" : "hover:shadow-md"}`}>
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-medium text-primary-foreground">
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
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/hosting-domain"
                  className={`block w-full text-center py-2.5 rounded-lg font-medium text-sm transition-all ${
                    plan.popular
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/hosting-domain" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:gap-2 transition-all">
              View all hosting plans <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="rounded-3xl bg-gradient-to-r from-violet-600 to-indigo-600 p-12 text-center text-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 right-0 w-60 h-60 bg-white rounded-full translate-x-1/3 translate-y-1/3" />
            </div>
            <div className="relative">
              <h2 className="text-3xl font-bold">Ready to Transform Your Business?</h2>
              <p className="mt-4 text-white/80 max-w-xl mx-auto">
                Let our AI-powered platform help you build, automate, and scale your digital presence.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/signup"
                  className="rounded-lg bg-white px-8 py-3.5 text-sm font-medium text-violet-600 hover:bg-white/90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  Start Free Trial
                </Link>
                <Link
                  href="/contact"
                  className="rounded-lg border border-white/30 px-8 py-3.5 text-sm font-medium text-white hover:bg-white/10 transition-all hover:-translate-y-0.5"
                >
                  Talk to Sales
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Voice Agent CTA */}
      <section className="py-20 bg-gradient-to-br from-violet-600 to-indigo-700 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-1.5 text-xs font-medium mb-6">
              <MessageSquare className="h-3 w-3" />
              AI Voice Agent
            </span>
            <h2 className="text-3xl md:text-4xl font-bold">Prefer to Talk? Use Our Voice Agent</h2>
            <p className="mt-4 text-white/80 max-w-xl mx-auto">
              Skip the forms. Speak naturally with our AI assistant to get instant answers about services, pricing, and project estimates.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/voice-agent"
                className="rounded-lg bg-white px-8 py-3.5 text-sm font-medium text-violet-600 hover:bg-white/90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                Try Voice Assistant
              </Link>
              <Link
                href="/contact"
                className="rounded-lg border border-white/30 px-8 py-3.5 text-sm font-medium text-white hover:bg-white/10 transition-all hover:-translate-y-0.5"
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
          <div className="text-center mb-12">
            <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary mb-4">
              FAQ
            </span>
            <h2 className="text-3xl font-bold">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <details key={faq.question} className="group rounded-xl border bg-white overflow-hidden">
                <summary className="flex cursor-pointer items-center justify-between p-6 font-medium text-sm hover:bg-muted/50 transition-colors list-none">
                  {faq.question}
                  <span className="ml-4 shrink-0 transition-transform duration-200 group-open:rotate-180">
                    <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </summary>
                <div className="px-6 pb-6 text-sm text-muted-foreground leading-relaxed">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
