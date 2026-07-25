"use client";

import { useState } from "react";
import Link from "next/link";

const categories = ["All", "Web Development", "AI Automation", "Mobile Apps", "ERP/CRM"];

const projects = [
  {
    title: "E-Commerce Platform",
    category: "Web Development",
    client: "RetailCo",
    description: "Full-stack e-commerce solution with inventory management, payment processing, and real-time analytics dashboard.",
    color: "from-violet-400 to-indigo-500",
    icon: "🛒",
  },
  {
    title: "AI Customer Support Bot",
    category: "AI Automation",
    client: "ServiceHub",
    description: "Intelligent chatbot handling 80% of customer inquiries automatically, integrated with their existing CRM system.",
    color: "from-blue-400 to-cyan-500",
    icon: "🤖",
  },
  {
    title: "Delivery Tracking App",
    category: "Mobile Apps",
    client: "QuickDeliver",
    description: "React Native mobile app with real-time GPS tracking, push notifications, and driver management.",
    color: "from-green-400 to-emerald-500",
    icon: "📱",
  },
  {
    title: "Manufacturing ERP System",
    category: "ERP/CRM",
    client: "工厂Max",
    description: "Custom ERP with production planning, inventory control, quality management, and financial reporting modules.",
    color: "from-orange-400 to-red-500",
    icon: "⚙️",
  },
  {
    title: "SaaS Analytics Dashboard",
    category: "Web Development",
    client: "DataFlow",
    description: "Real-time analytics dashboard with interactive charts, user management, and automated report generation.",
    color: "from-purple-400 to-pink-500",
    icon: "📊",
  },
  {
    title: "AI Content Generator",
    category: "AI Automation",
    client: "MediaWorks",
    description: "AI-powered content creation tool generating blog posts, social media content, and marketing copy.",
    color: "from-yellow-400 to-orange-500",
    icon: "✍️",
  },
];

export default function PortfolioPage() {
  const [active, setActive] = useState("All");

  const filtered = active === "All" ? projects : projects.filter((p) => p.category === active);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-violet-50 via-white to-indigo-50 py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary mb-6">
              Our Work
            </span>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
              Projects That{" "}
              <span className="text-primary">Deliver</span> Results
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto">
              From AI-powered startups to enterprise ERP systems — see what we&apos;ve built for our clients.
            </p>
          </div>
        </div>
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 right-0 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-40 left-0 h-80 w-80 rounded-full bg-indigo-500/5 blur-3xl" />
        </div>
      </section>

      {/* Filter Tabs */}
      <section className="py-12 border-b">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActive(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  active === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Projects Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
            {filtered.map((project) => (
              <div key={project.title} className="group rounded-2xl border overflow-hidden hover:shadow-lg transition-all">
                <div className={`h-48 bg-gradient-to-br ${project.color} flex items-center justify-center`}>
                  <span className="text-5xl group-hover:scale-110 transition-transform">{project.icon}</span>
                </div>
                <div className="p-6">
                  <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                    {project.category}
                  </span>
                  <h3 className="text-lg font-semibold mt-3">{project.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">Client: {project.client}</p>
                  <p className="text-sm text-muted-foreground mt-2">{project.description}</p>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-20">
              <p className="text-muted-foreground">No projects in this category yet.</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="rounded-3xl bg-gradient-to-r from-violet-600 to-indigo-600 p-12 text-center text-white">
            <h2 className="text-3xl font-bold">Have a Project in Mind?</h2>
            <p className="mt-4 text-white/80 max-w-xl mx-auto">
              Let&apos;s discuss your idea and build something extraordinary together.
            </p>
            <div className="mt-8">
              <Link
                href="/contact"
                className="rounded-lg bg-white px-8 py-3.5 text-sm font-medium text-violet-600 hover:bg-white/90 transition-colors"
              >
                Start a Conversation
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
