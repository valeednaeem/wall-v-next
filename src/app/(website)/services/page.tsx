import type { Metadata } from "next";
import Link from "next/link";
import { generateSEO } from "@/lib/seo";

export const metadata: Metadata = generateSEO({
  title: "Services",
  description: "AI-powered digital agency services — custom software development, AI automation, ERP/CRM, web hosting, mobile apps, and digital marketing.",
  url: "/services",
  keywords: ["software development", "AI automation", "ERP CRM", "web hosting", "mobile apps", "digital marketing"],
});

const services = [
  {
    icon: "🤖",
    title: "AI Automation",
    description: "Intelligent agents and workflows that automate repetitive tasks, reduce human error, and free your team to focus on strategic work.",
    features: [
      "Custom AI chatbots and virtual assistants",
      "Workflow automation with smart decision-making",
      "Natural language processing and sentiment analysis",
      "Predictive analytics and demand forecasting",
      "Document processing and data extraction",
    ],
  },
  {
    icon: "🌐",
    title: "Web Development",
    description: "Custom web applications built with modern technologies like React, Next.js, Node.js, and cloud-native architectures.",
    features: [
      "Full-stack web applications",
      "Progressive Web Apps (PWA)",
      "E-commerce platforms and payment integration",
      "API design and microservices architecture",
      "Performance optimization and SEO",
    ],
  },
  {
    icon: "📱",
    title: "Mobile Apps",
    description: "Native and cross-platform mobile applications for iOS and Android using React Native, Flutter, and Swift/Kotlin.",
    features: [
      "Cross-platform apps with React Native / Flutter",
      "Native iOS and Android development",
      "Offline-first architecture",
      "Push notifications and real-time updates",
      "App Store optimization and deployment",
    ],
  },
  {
    icon: "☁️",
    title: "Web Hosting",
    description: "Enterprise-grade hosting with 99.9% uptime, free SSL, daily backups, and 24/7 monitoring and support.",
    features: [
      "Shared, VPS, and cloud hosting",
      "Managed WordPress hosting",
      "Free SSL certificates and CDN",
      "Automated daily backups",
      "99.9% uptime guarantee with SLA",
    ],
  },
  {
    icon: "⚙️",
    title: "ERP & CRM",
    description: "Enterprise resource planning and customer relationship management systems tailored to your business processes.",
    features: [
      "Custom ERP modules for finance, HR, inventory",
      "CRM with lead scoring and pipeline management",
      "Real-time dashboards and reporting",
      "Third-party integrations (Stripe, Zapier, etc.)",
      "Role-based access control and audit logging",
    ],
  },
  {
    icon: "📊",
    title: "Digital Marketing",
    description: "Data-driven marketing strategies including SEO, PPC, social media, and analytics to grow your online presence.",
    features: [
      "Search engine optimization (SEO)",
      "Google Ads and Meta Ads management",
      "Social media strategy and content creation",
      "Analytics setup and conversion tracking",
      "Email marketing automation",
    ],
  },
];

const process = [
  { step: "01", title: "Discovery", description: "We learn about your business, goals, and challenges to define the project scope and requirements." },
  { step: "02", title: "Design", description: "Our designers create wireframes and prototypes that align with your brand and user experience goals." },
  { step: "03", title: "Develop", description: "Our engineers build your solution using agile methodology with regular demos and feedback cycles." },
  { step: "04", title: "Deploy", description: "We launch your project with thorough testing, monitoring, and ongoing support to ensure success." },
];

const technologies = [
  "Next.js", "React", "TypeScript", "Node.js", "Python",
  "MongoDB", "PostgreSQL", "Redis", "Docker", "AWS",
  "Tailwind CSS", "GraphQL", "REST APIs", "Stripe", "Vercel",
];

export default function ServicesPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-violet-50 via-white to-indigo-50 py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary mb-6">
              What We Do
            </span>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
              Services Built to{" "}
              <span className="text-primary">Transform</span> Your Business
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto">
              From AI automation to full-stack development, we deliver end-to-end digital solutions that drive growth and efficiency.
            </p>
          </div>
        </div>
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 right-0 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-40 left-0 h-80 w-80 rounded-full bg-indigo-500/5 blur-3xl" />
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid gap-12 lg:grid-cols-2 max-w-6xl mx-auto">
            {services.map((service) => (
              <div key={service.title} className="rounded-2xl border p-8 hover:shadow-lg hover:border-primary/20 transition-all">
                <div className="text-4xl mb-4">{service.icon}</div>
                <h2 className="text-2xl font-bold mb-3">{service.title}</h2>
                <p className="text-muted-foreground mb-6">{service.description}</p>
                <ul className="space-y-2">
                  {service.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <span className="text-green-500 mt-0.5">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Our Process</h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              A proven methodology that delivers results on time and within budget
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
            {process.map((step) => (
              <div key={step.step} className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary font-bold text-lg mb-4">
                  {step.step}
                </div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technologies */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Technologies We Use</h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Modern tools and frameworks for scalable, maintainable solutions
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
            {technologies.map((tech) => (
              <span key={tech} className="px-4 py-2 rounded-full border bg-white text-sm font-medium hover:border-primary/30 hover:bg-primary/5 transition-colors">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="rounded-3xl bg-gradient-to-r from-violet-600 to-indigo-600 p-12 text-center text-white">
            <h2 className="text-3xl font-bold">Ready to Get Started?</h2>
            <p className="mt-4 text-white/80 max-w-xl mx-auto">
              Tell us about your project and we&apos;ll create a custom plan that fits your needs and budget.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/contact"
                className="rounded-lg bg-white px-8 py-3.5 text-sm font-medium text-violet-600 hover:bg-white/90 transition-colors"
              >
                Get a Free Quote
              </Link>
              <Link
                href="/pricing"
                className="rounded-lg border border-white/30 px-8 py-3.5 text-sm font-medium text-white hover:bg-white/10 transition-colors"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
