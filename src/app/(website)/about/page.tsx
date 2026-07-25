import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Us",
  description: "Learn about Wall-V — an AI-powered digital agency based in Pakistan, building innovative software solutions for businesses worldwide.",
};

const stats = [
  { value: "150+", label: "Projects Completed" },
  { value: "50+", label: "Happy Clients" },
  { value: "99.9%", label: "Uptime Guarantee" },
  { value: "24/7", label: "Support Available" },
];

const team = [
  { name: "Ahmad Khan", role: "CEO & Founder", bio: "Visionary leader with 10+ years in software development and AI research." },
  { name: "Sara Malik", role: "CTO", bio: "Full-stack architect passionate about scalable systems and cloud infrastructure." },
  { name: "Usman Ali", role: "Lead Developer", bio: "Expert in React, Next.js, and Node.js with a focus on performance." },
  { name: "Fatima Zahra", role: "Head of Design", bio: "UI/UX designer creating intuitive, accessible, and beautiful experiences." },
];

const values = [
  { title: "Innovation", description: "We stay at the forefront of technology, leveraging AI and modern tools to deliver cutting-edge solutions.", icon: "💡" },
  { title: "Quality", description: "Every line of code is crafted with care. We follow best practices, write tests, and review thoroughly.", icon: "✨" },
  { title: "Transparency", description: "Open communication, honest timelines, and clear pricing — no surprises, no hidden fees.", icon: "🔍" },
  { title: "Support", description: "Our relationship doesn't end at launch. We provide ongoing maintenance, updates, and 24/7 support.", icon: "🛡️" },
];

export default function AboutPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-violet-50 via-white to-indigo-50 py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary mb-6">
              About Wall-V
            </span>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
              We Build the{" "}
              <span className="text-primary">Future</span> of Digital
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto">
              A Pakistan-based AI-powered agency on a mission to make world-class technology accessible to businesses everywhere.
            </p>
          </div>
        </div>
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 right-0 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-40 left-0 h-80 w-80 rounded-full bg-indigo-500/5 blur-3xl" />
        </div>
      </section>

      {/* Story */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto grid gap-12 md:grid-cols-2 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Our Story</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Wall-V was founded with a simple belief: every business deserves access to world-class technology. Based in Karachi, Pakistan, we started as a small team of developers and designers passionate about building solutions that make a real difference.
                </p>
                <p>
                  Today, we&apos;re a full-service digital agency specializing in AI automation, custom software development, ERP/CRM systems, web hosting, and digital products. We&apos;ve helped over 50 clients across 10+ countries transform their operations and scale their businesses.
                </p>
              </div>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 p-8 flex items-center justify-center h-72">
              <div className="text-center">
                <span className="text-6xl">🚀</span>
                <p className="mt-4 text-sm font-medium text-primary">Building the future, one project at a time</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
            <div className="rounded-2xl border bg-white p-8">
              <span className="text-3xl mb-4 block">🎯</span>
              <h3 className="text-xl font-bold mb-3">Our Mission</h3>
              <p className="text-muted-foreground">
                To empower businesses with intelligent, scalable, and affordable technology solutions. We combine AI innovation with human expertise to deliver software that drives real business outcomes.
              </p>
            </div>
            <div className="rounded-2xl border bg-white p-8">
              <span className="text-3xl mb-4 block">🔭</span>
              <h3 className="text-xl font-bold mb-3">Our Vision</h3>
              <p className="text-muted-foreground">
                To become the leading AI-powered digital agency in South Asia, known for innovation, quality, and exceptional client success. We envision a future where AI augments every business process.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 border-y">
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

      {/* Team */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Meet the Team</h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              The talented people behind Wall-V&apos;s success
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
            {team.map((member) => (
              <div key={member.name} className="text-center rounded-2xl border p-6 hover:shadow-lg transition-shadow">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary mx-auto mb-4">
                  {member.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <h3 className="font-semibold">{member.name}</h3>
                <p className="text-sm text-primary mb-2">{member.role}</p>
                <p className="text-sm text-muted-foreground">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Our Values</h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              The principles that guide everything we do
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
            {values.map((value) => (
              <div key={value.title} className="rounded-2xl bg-white border p-6 text-center">
                <span className="text-3xl mb-4 block">{value.icon}</span>
                <h3 className="font-semibold mb-2">{value.title}</h3>
                <p className="text-sm text-muted-foreground">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="rounded-3xl bg-gradient-to-r from-violet-600 to-indigo-600 p-12 text-center text-white">
            <h2 className="text-3xl font-bold">Join Our Journey</h2>
            <p className="mt-4 text-white/80 max-w-xl mx-auto">
              Whether you&apos;re a startup or enterprise, we&apos;d love to help you build something amazing together.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/contact"
                className="rounded-lg bg-white px-8 py-3.5 text-sm font-medium text-violet-600 hover:bg-white/90 transition-colors"
              >
                Get in Touch
              </Link>
              <Link
                href="/services"
                className="rounded-lg border border-white/30 px-8 py-3.5 text-sm font-medium text-white hover:bg-white/10 transition-colors"
              >
                View Our Services
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
