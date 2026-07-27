import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import ServicePrice from "@/models/service-price";
import { getAuthUser } from "@/lib/auth";

const DEFAULT_PRICES = [
  {
    serviceKey: "web-development",
    name: "Web Development",
    category: "development",
    description: "Custom web applications built with React, Next.js, Node.js",
    type: "starting-at" as const,
    basePrice: 499,
    features: ["Business websites", "Custom web applications", "SaaS platforms", "E-commerce websites", "Client portals", "Admin dashboards"],
    technology: ["Next.js", "React", "TypeScript", "Node.js", "MongoDB"],
    estimatedHours: { min: 40, max: 400 },
    estimatedWeeks: { min: 2, max: 16 },
    active: true,
    agentVisible: true,
    agentDescription: "Custom websites and web apps — from simple business sites to complex SaaS platforms.",
    displayOrder: 1,
  },
  {
    serviceKey: "mobile-app-development",
    name: "Mobile App Development",
    category: "development",
    description: "Cross-platform mobile apps with React Native or native iOS/Android",
    type: "starting-at" as const,
    basePrice: 2999,
    features: ["Cross-platform apps", "iOS & Android", "Push notifications", "Offline support", "App Store submission"],
    technology: ["React Native", "Swift", "Kotlin", "Flutter"],
    estimatedHours: { min: 200, max: 800 },
    estimatedWeeks: { min: 8, max: 24 },
    active: true,
    agentVisible: true,
    agentDescription: "Native and cross-platform mobile apps for iOS and Android.",
    displayOrder: 2,
  },
  {
    serviceKey: "ecommerce",
    name: "E-Commerce Solutions",
    category: "development",
    description: "Full e-commerce stores with payment processing, inventory, and analytics",
    type: "starting-at" as const,
    basePrice: 1499,
    features: ["Product management", "Payment processing", "Order management", "Inventory tracking", "Analytics dashboard"],
    technology: ["Next.js", "Stripe", "PayPal", "MongoDB"],
    estimatedHours: { min: 100, max: 500 },
    estimatedWeeks: { min: 4, max: 16 },
    active: true,
    agentVisible: true,
    agentDescription: "Complete e-commerce solutions with payment processing and inventory management.",
    displayOrder: 3,
  },
  {
    serviceKey: "ai-chatbot",
    name: "AI Chatbot Development",
    category: "ai-automation",
    description: "Custom AI chatbots trained on your business data",
    type: "starting-at" as const,
    basePrice: 1499,
    features: ["Custom AI training", "Knowledge base integration", "Multi-language", "WhatsApp/Telegram", "Analytics"],
    technology: ["OpenAI", "LangChain", "Vector DB", "Next.js"],
    estimatedHours: { min: 60, max: 200 },
    estimatedWeeks: { min: 2, max: 8 },
    active: true,
    agentVisible: true,
    agentDescription: "Custom AI chatbots trained on your business data for 24/7 customer support.",
    displayOrder: 4,
  },
  {
    serviceKey: "voice-agent",
    name: "Voice Agent Development",
    category: "ai-automation",
    description: "AI voice agents for phone support and sales",
    type: "starting-at" as const,
    basePrice: 2499,
    features: ["Natural voice conversations", "Call handling", "CRM integration", "Call recording", "Multi-language"],
    technology: ["Dograh", "ElevenLabs", "Twilio", "WebRTC"],
    estimatedHours: { min: 80, max: 300 },
    estimatedWeeks: { min: 3, max: 10 },
    active: true,
    agentVisible: true,
    agentDescription: "AI voice agents that handle phone calls naturally — for support, sales, and scheduling.",
    displayOrder: 5,
  },
  {
    serviceKey: "ai-automation",
    name: "AI Process Automation",
    category: "ai-automation",
    description: "Automate repetitive business processes with AI workflows",
    type: "starting-at" as const,
    basePrice: 999,
    features: ["Workflow automation", "Data extraction", "Document processing", "Integration with existing tools", "Custom AI models"],
    technology: ["Python", "LangChain", "APIs", "ML"],
    estimatedHours: { min: 40, max: 200 },
    estimatedWeeks: { min: 2, max: 8 },
    active: true,
    agentVisible: true,
    agentDescription: "Automate repetitive tasks and workflows with custom AI solutions.",
    displayOrder: 6,
  },
  {
    serviceKey: "hosting-basic",
    name: "Basic Hosting",
    category: "hosting",
    description: "Reliable shared hosting for small websites",
    type: "tiered" as const,
    tiers: [
      { name: "Basic", price: 3.99, features: ["5 GB Storage", "50 GB Bandwidth", "1 Website", "Free SSL", "Email Support"] },
      { name: "Business", price: 9.99, features: ["25 GB Storage", "Unlimited Bandwidth", "5 Websites", "Free SSL", "Priority Support", "Daily Backups"] },
      { name: "Cloud", price: 16.99, features: ["100 GB Storage", "Unlimited Bandwidth", "Unlimited Websites", "Free SSL", "24/7 Support", "Daily Backups", "CDN Included"] },
    ],
    active: true,
    agentVisible: true,
    agentDescription: "Web hosting from $3.99/month — all plans include free SSL and 99.9% uptime.",
    displayOrder: 7,
  },
  {
    serviceKey: "domain-registration",
    name: "Domain Registration",
    category: "domains",
    description: "Register domains in multiple TLDs",
    type: "tiered" as const,
    tiers: [
      { name: ".com", price: 9.99, features: ["1 year registration", "DNS management", "Domain forwarding"] },
      { name: ".net", price: 11.99, features: ["1 year registration", "DNS management", "Domain forwarding"] },
      { name: ".org", price: 10.99, features: ["1 year registration", "DNS management", "Domain forwarding"] },
      { name: ".pk", price: 14.99, features: ["1 year registration", "DNS management", "Domain forwarding"] },
      { name: ".io", price: 34.99, features: ["1 year registration", "DNS management", "Domain forwarding"] },
    ],
    active: true,
    agentVisible: true,
    agentDescription: "Domain registration from $9.99/year — .com, .net, .org, .pk, .io, .dev, .app, .co.",
    displayOrder: 8,
  },
  {
    serviceKey: "seo",
    name: "SEO Optimization",
    category: "marketing",
    description: "Search engine optimization to rank higher on Google",
    type: "tiered" as const,
    tiers: [
      { name: "Starter", price: 499, features: ["Keyword research", "On-page SEO", "Technical audit", "Monthly report"] },
      { name: "Growth", price: 999, features: ["Everything in Starter", "Content strategy", "Link building", "Competitor analysis"] },
      { name: "Enterprise", price: 2499, features: ["Everything in Growth", "Dedicated strategist", "Advanced analytics", "Reputation management"] },
    ],
    active: true,
    agentVisible: true,
    agentDescription: "SEO services from $499/month — keyword research, on-page optimization, and link building.",
    displayOrder: 9,
  },
  {
    serviceKey: "social-media",
    name: "Social Media Marketing",
    category: "marketing",
    description: "Social media management and advertising",
    type: "starting-at" as const,
    basePrice: 799,
    features: ["Content creation", "Post scheduling", "Community management", "Analytics reporting", "Ad campaigns"],
    technology: ["Meta Ads", "Google Ads", "Analytics"],
    estimatedHours: { min: 20, max: 80 },
    estimatedWeeks: { min: 4, max: 12 },
    active: true,
    agentVisible: true,
    agentDescription: "Social media marketing from $799/month — content creation, scheduling, and ad campaigns.",
    displayOrder: 10,
  },
  {
    serviceKey: "ui-ux-design",
    name: "UI/UX Design",
    category: "design",
    description: "User interface and experience design for web and mobile",
    type: "starting-at" as const,
    basePrice: 799,
    features: ["User research", "Wireframing", "Prototyping", "Design system", "Usability testing"],
    technology: ["Figma", "Adobe XD", "Sketch"],
    estimatedHours: { min: 40, max: 200 },
    estimatedWeeks: { min: 2, max: 8 },
    active: true,
    agentVisible: true,
    agentDescription: "UI/UX design services — wireframing, prototyping, brand identity, and design systems.",
    displayOrder: 11,
  },
  {
    serviceKey: "devops",
    name: "DevOps & Cloud",
    category: "consulting",
    description: "Cloud infrastructure setup, CI/CD, and DevOps consulting",
    type: "hourly" as const,
    hourlyRate: 150,
    features: ["AWS/GCP/Azure setup", "CI/CD pipelines", "Docker/Kubernetes", "Monitoring & alerting", "Security audit"],
    technology: ["AWS", "GCP", "Docker", "Kubernetes", "Terraform"],
    estimatedHours: { min: 20, max: 200 },
    estimatedWeeks: { min: 1, max: 8 },
    active: true,
    agentVisible: true,
    agentDescription: "DevOps consulting at $150/hr — cloud setup, CI/CD, containerization, and infrastructure.",
    displayOrder: 12,
  },
  {
    serviceKey: "digital-marketing",
    name: "Digital Marketing",
    category: "marketing",
    description: "Full-service digital marketing campaigns",
    type: "starting-at" as const,
    basePrice: 1299,
    features: ["PPC campaigns", "Email marketing", "Conversion optimization", "A/B testing", "Analytics & reporting"],
    technology: ["Google Ads", "Meta Ads", "Mailchimp", "GA4"],
    estimatedHours: { min: 30, max: 120 },
    estimatedWeeks: { min: 4, max: 12 },
    active: true,
    agentVisible: true,
    agentDescription: "Full-service digital marketing — PPC, email campaigns, conversion optimization, and analytics.",
    displayOrder: 13,
  },
  {
    serviceKey: "consulting",
    name: "Technical Consulting",
    category: "consulting",
    description: "Expert technical consulting for your digital projects",
    type: "hourly" as const,
    hourlyRate: 200,
    features: ["Architecture review", "Technology selection", "Performance audit", "Security review", "Team mentoring"],
    technology: ["Various"],
    estimatedHours: { min: 5, max: 50 },
    estimatedWeeks: { min: 1, max: 4 },
    active: true,
    agentVisible: true,
    agentDescription: "Technical consulting at $200/hr — architecture reviews, technology selection, and performance audits.",
    displayOrder: 14,
  },
];

export async function POST() {
  try {
    const user = await getAuthUser();
    if (!user || !["super-admin", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    let created = 0;
    let updated = 0;

    for (const price of DEFAULT_PRICES) {
      const existing = await ServicePrice.findOne({ serviceKey: price.serviceKey });
      if (existing) {
        await ServicePrice.updateOne({ serviceKey: price.serviceKey }, { $set: price });
        updated++;
      } else {
        await ServicePrice.create(price);
        created++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Seeding complete: ${created} created, ${updated} updated`,
      created,
      updated,
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: "Seed failed" }, { status: 500 });
  }
}
