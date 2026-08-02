export interface DemoRequirements {
  projectType?: string;
  name?: string;
  email?: string;
  features?: string[];
  budget?: string;
  timeline?: string;
  description?: string;
  selectedOption?: string;
  company?: string;
  phone?: string;
}

interface TemplateConfig {
  sections: string[];
  colors: string[];
  accent: string;
}

const TEMPLATES: Record<string, TemplateConfig> = {
  // Development
  website: { sections: ["hero", "features", "about", "testimonials", "cta"], colors: ["#6366f1", "#8b5cf6", "#a855f7"], accent: "#6366f1" },
  "web-application": { sections: ["hero", "dashboard", "features", "pricing", "cta"], colors: ["#3b82f6", "#2563eb", "#1d4ed8"], accent: "#3b82f6" },
  "mobile-app": { sections: ["hero", "screens", "features", "download", "cta"], colors: ["#06b6d4", "#0891b2", "#0e7490"], accent: "#06b6d4" },
  ecommerce: { sections: ["hero", "categories", "featured", "deals", "cta"], colors: ["#f59e0b", "#d97706", "#b45309"], accent: "#f59e0b" },
  "landing-page": { sections: ["hero", "benefits", "social-proof", "cta"], colors: ["#10b981", "#059669", "#047857"], accent: "#10b981" },
  portfolio: { sections: ["hero", "work", "about", "contact", "cta"], colors: ["#8b5cf6", "#7c3aed", "#6d28d9"], accent: "#8b5cf6" },
  blog: { sections: ["hero", "posts", "newsletter", "cta"], colors: ["#f97316", "#ea580c", "#c2410c"], accent: "#f97316" },

  // AI & Automation
  "ai-chatbot": { sections: ["hero", "capabilities", "demo", "pricing", "cta"], colors: ["#10b981", "#059669", "#047857"], accent: "#10b981" },
  "ai-voice-agent": { sections: ["hero", "capabilities", "demo", "pricing", "cta"], colors: ["#8b5cf6", "#7c3aed", "#6d28d9"], accent: "#8b5cf6" },
  "ai-automation": { sections: ["hero", "workflows", "integrations", "pricing", "cta"], colors: ["#06b6d4", "#0891b2", "#0e7490"], accent: "#06b6d4" },
  "machine-learning": { sections: ["hero", "capabilities", "use-cases", "pricing", "cta"], colors: ["#ec4899", "#db2777", "#be185d"], accent: "#ec4899" },

  // Business Systems
  crm: { sections: ["hero", "modules", "dashboard", "integrations", "cta"], colors: ["#3b82f6", "#1e40af", "#1e3a5f"], accent: "#3b82f6" },
  erp: { sections: ["hero", "modules", "dashboard", "pricing", "cta"], colors: ["#1e40af", "#1e3a5f", "#0f172a"], accent: "#1e40af" },
  "erp-crm": { sections: ["hero", "modules", "dashboard", "pricing", "cta"], colors: ["#3b82f6", "#1e40af", "#1e3a5f"], accent: "#3b82f6" },

  // Marketing
  seo: { sections: ["hero", "audit", "strategy", "results", "cta"], colors: ["#22c55e", "#16a34a", "#15803d"], accent: "#22c55e" },
  marketing: { sections: ["hero", "channels", "strategy", "results", "cta"], colors: ["#f43f5e", "#e11d48", "#be123c"], accent: "#f43f5e" },
  "digital-marketing": { sections: ["hero", "channels", "strategy", "results", "cta"], colors: ["#f43f5e", "#e11d48", "#be123c"], accent: "#f43f5e" },
  "social-media": { sections: ["hero", "platforms", "content", "analytics", "cta"], colors: ["#ec4899", "#db2777", "#be185d"], accent: "#ec4899" },
  "ppc": { sections: ["hero", "platforms", "strategy", "results", "cta"], colors: ["#f59e0b", "#d97706", "#b45309"], accent: "#f59e0b" },
  "email-marketing": { sections: ["hero", "automation", "templates", "analytics", "cta"], colors: ["#6366f1", "#4f46e5", "#4338ca"], accent: "#6366f1" },

  // Design
  design: { sections: ["hero", "process", "portfolio", "pricing", "cta"], colors: ["#ec4899", "#db2777", "#be185d"], accent: "#ec4899" },
  "ui-ux": { sections: ["hero", "process", "portfolio", "pricing", "cta"], colors: ["#8b5cf6", "#7c3aed", "#6d28d9"], accent: "#8b5cf6" },
  branding: { sections: ["hero", "process", "portfolio", "pricing", "cta"], colors: ["#f43f5e", "#e11d48", "#be123c"], accent: "#f43f5e" },
  "logo-design": { sections: ["hero", "process", "portfolio", "pricing", "cta"], colors: ["#f97316", "#ea580c", "#c2410c"], accent: "#f97316" },

  // Infrastructure
  hosting: { sections: ["hero", "plans", "features", "uptime", "cta"], colors: ["#0ea5e9", "#0284c7", "#0369a1"], accent: "#0ea5e9" },
  domains: { sections: ["hero", "search", "features", "pricing", "cta"], colors: ["#14b8a6", "#0d9488", "#0f766e"], accent: "#14b8a6" },
  cloud: { sections: ["hero", "services", "features", "pricing", "cta"], colors: ["#0ea5e9", "#0284c7", "#0369a1"], accent: "#0ea5e9" },

  // Content
  "content-seo": { sections: ["hero", "services", "portfolio", "results", "cta"], colors: ["#ec4899", "#db2777", "#be185d"], accent: "#ec4899" },
  "content-writing": { sections: ["hero", "services", "portfolio", "pricing", "cta"], colors: ["#a855f7", "#9333ea", "#7e22ce"], accent: "#a855f7" },
  copywriting: { sections: ["hero", "services", "portfolio", "pricing", "cta"], colors: ["#6366f1", "#4f46e5", "#4338ca"], accent: "#6366f1" },

  // Consulting
  consulting: { sections: ["hero", "services", "process", "pricing", "cta"], colors: ["#0f172a", "#1e293b", "#334155"], accent: "#0f172a" },
  strategy: { sections: ["hero", "approach", "case-studies", "pricing", "cta"], colors: ["#1e293b", "#334155", "#475569"], accent: "#1e293b" },
};

const DEFAULT_TEMPLATE: TemplateConfig = {
  sections: ["hero", "features", "pricing", "cta"],
  colors: ["#6366f1", "#8b5cf6", "#a855f7"],
  accent: "#6366f1",
};

function getTemplate(projectType: string): TemplateConfig {
  const normalized = projectType.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  return TEMPLATES[normalized] || TEMPLATES[projectType] || DEFAULT_TEMPLATE;
}

function getFeatureIcons(features: string[]): string {
  const icons: Record<string, string> = {
    responsive: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>',
    security: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>',
    speed: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>',
    analytics: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>',
    ai: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>',
    integration: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>',
    realtime: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>',
    automation: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>',
    mobile: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/>',
    cloud: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"/>',
    seo: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>',
    ecommerce: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"/>',
    default: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>',
  };

  return features.map((f) => {
    const key = Object.keys(icons).find((k) => f.toLowerCase().includes(k)) || "default";
    return `
      <div class="bg-white p-6 rounded-2xl shadow-sm border hover:shadow-md transition-shadow">
        <div class="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style="background: ${TEMPLATES.website.colors[0]}15">
          <svg class="w-6 h-6" style="color: ${TEMPLATES.website.colors[0]}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            ${icons[key]}
          </svg>
        </div>
        <h3 class="text-lg font-semibold mb-2">${f}</h3>
        <p class="text-gray-600 text-sm">Professional implementation of ${f.toLowerCase()} tailored to your business needs.</p>
      </div>`;
  }).join("");
}

function getDefaultFeatures(projectType: string): string[] {
  const type = projectType.toLowerCase().replace(/\s+/g, "-");
  const defaults: Record<string, string[]> = {
    website: ["Responsive Design", "Fast Performance", "SEO Optimized", "Contact Forms", "Analytics Dashboard"],
    ecommerce: ["Product Catalog", "Shopping Cart", "Secure Checkout", "Inventory Management", "Order Tracking"],
    "mobile-app": ["Push Notifications", "Offline Mode", "Camera Integration", "User Authentication", "Real-time Sync"],
    crm: ["Contact Management", "Pipeline Tracking", "Email Integration", "Reporting Dashboard", "Task Automation"],
    erp: ["Inventory Control", "Financial Management", "HR Module", "Supply Chain", "Reporting"],
    seo: ["Keyword Research", "On-Page Optimization", "Technical SEO", "Content Strategy", "Analytics Reporting"],
    marketing: ["Campaign Management", "A/B Testing", "Audience Targeting", "Performance Analytics", "ROI Tracking"],
    "ai-chatbot": ["Natural Language Processing", "Multi-language Support", "Knowledge Base", "Lead Capture", "Analytics"],
    "ai-voice-agent": ["Voice Recognition", "Natural Conversation", "Call Recording", "Transcription", "Smart Routing"],
    "ai-automation": ["Workflow Automation", "Data Processing", "API Integration", "Scheduling", "Monitoring"],
    design: ["UI/UX Design", "Wireframing", "Prototyping", "Design System", "User Testing"],
    hosting: ["99.9% Uptime", "SSL Certificate", "Daily Backups", "CDN Support", "24/7 Monitoring"],
    consulting: ["Strategy Development", "Process Analysis", "Technology Assessment", "Implementation Planning", "Training"],
  };
  return defaults[type] || ["Custom Feature 1", "Custom Feature 2", "Custom Feature 3", "Custom Feature 4", "Custom Feature 5"];
}

export function generateDemoHTML(requirements: DemoRequirements, projectId: string): string {
  const template = getTemplate(requirements.projectType || "website");
  const name = requirements.name || "Your Project";
  const projectType = (requirements.projectType || "website").replace(/-/g, " ");
  const features = requirements.features && requirements.features.length > 0
    ? requirements.features
    : getDefaultFeatures(requirements.projectType || "website");
  const budget = requirements.budget || "TBD";
  const company = requirements.company || "";
  const selectedOption = requirements.selectedOption || "";

  const c1 = template.colors[0];
  const c2 = template.colors[1];
  const c3 = template.colors[2];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} — ${projectType} Demo</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
    * { font-family: 'Inter', sans-serif; }
    .gradient-bg { background: linear-gradient(135deg, ${c1}, ${c2}, ${c3}); }
    .gradient-text { background: linear-gradient(135deg, ${c1}, ${c2}); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .card-hover:hover { transform: translateY(-4px); box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
    .float { animation: float 3s ease-in-out infinite; }
    @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .fade-in { animation: fadeIn 0.6s ease-out forwards; }
    .delay-1 { animation-delay: 0.1s; opacity: 0; }
    .delay-2 { animation-delay: 0.2s; opacity: 0; }
    .delay-3 { animation-delay: 0.3s; opacity: 0; }
  </style>
</head>
<body class="bg-gray-50">
  <!-- Hero Section -->
  <section class="gradient-bg text-white py-24 px-6 relative overflow-hidden">
    <div class="absolute inset-0 opacity-10">
      <div class="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl"></div>
      <div class="absolute bottom-10 right-10 w-96 h-96 bg-white rounded-full blur-3xl"></div>
    </div>
    <div class="max-w-6xl mx-auto text-center relative z-10">
      <div class="inline-block bg-white/20 text-white px-5 py-2 rounded-full text-sm font-medium mb-6 backdrop-blur-sm">
        AI-Generated Demo Preview
      </div>
      <h1 class="text-5xl md:text-6xl font-bold mb-6 fade-in">${name}</h1>
      ${company ? `<p class="text-lg opacity-80 mb-3 fade-in delay-1">for ${company}</p>` : ""}
      <p class="text-xl opacity-90 max-w-2xl mx-auto mb-8 fade-in delay-2">
        Your custom ${projectType} — built with cutting-edge technology and designed for success.
      </p>
      ${selectedOption ? `<p class="text-sm opacity-70 mb-8 italic fade-in delay-3">"${selectedOption}"</p>` : ""}
      <div class="flex gap-4 justify-center fade-in delay-3">
        <a href="/checkout/${projectId}" class="bg-white px-8 py-3.5 rounded-xl font-semibold hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl" style="color: ${c1}">
          Proceed to Checkout
        </a>
        <a href="#features" class="border-2 border-white text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-white/10 transition-colors">
          Learn More
        </a>
      </div>
    </div>
  </section>

  <!-- Features Section -->
  <section id="features" class="py-24 px-6">
    <div class="max-w-6xl mx-auto">
      <div class="text-center mb-16">
        <h2 class="text-3xl md:text-4xl font-bold mb-4">Key Features</h2>
        <p class="text-gray-500 max-w-xl mx-auto">Everything you need to succeed, built into your ${projectType}.</p>
      </div>
      <div class="grid md:grid-cols-3 gap-8">
        ${getFeatureIcons(features)}
      </div>
    </div>
  </section>

  <!-- Stats Section -->
  <section class="bg-white py-20 px-6">
    <div class="max-w-5xl mx-auto">
      <div class="grid md:grid-cols-4 gap-8 text-center">
        <div class="p-6">
          <div class="text-4xl font-bold gradient-text">99%</div>
          <p class="text-gray-500 mt-2 text-sm">Client Satisfaction</p>
        </div>
        <div class="p-6">
          <div class="text-4xl font-bold gradient-text">50+</div>
          <p class="text-gray-500 mt-2 text-sm">Projects Delivered</p>
        </div>
        <div class="p-6">
          <div class="text-4xl font-bold gradient-text">24/7</div>
          <p class="text-gray-500 mt-2 text-sm">Support Available</p>
        </div>
        <div class="p-6">
          <div class="text-4xl font-bold gradient-text">3x</div>
          <p class="text-gray-500 mt-2 text-sm">Faster Delivery</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Pricing Section -->
  <section class="py-20 px-6">
    <div class="max-w-4xl mx-auto text-center">
      <h2 class="text-3xl font-bold mb-4">Estimated Investment</h2>
      <p class="text-gray-500 mb-8">Transparent pricing with no hidden fees.</p>
      <div class="bg-white rounded-2xl shadow-lg border p-8 inline-block">
        <p class="text-5xl font-bold mb-2" style="color: ${c1}">$${budget}</p>
        <p class="text-gray-500 text-sm mb-6">Estimated project budget</p>
        <a href="/checkout/${projectId}" class="inline-block px-10 py-3.5 rounded-xl font-semibold text-white shadow-lg hover:opacity-90 transition-opacity" style="background: ${c1}">
          Pay & Start Building
        </a>
      </div>
    </div>
  </section>

  <!-- CTA Section -->
  <section class="gradient-bg text-white py-20 px-6">
    <div class="max-w-4xl mx-auto text-center">
      <h2 class="text-3xl font-bold mb-4">Ready to Build This?</h2>
      <p class="opacity-90 mb-8 max-w-xl mx-auto">Get started today with Wall-V and bring your vision to life.</p>
      <a href="/checkout/${projectId}" class="inline-block bg-white px-10 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all" style="color: ${c1}">
        Pay & Start Building
      </a>
    </div>
  </section>

  <!-- Footer -->
  <footer class="bg-gray-900 text-gray-400 py-8 px-6 text-center text-sm">
    <p>Generated by Wall-V AI — <a href="/" class="text-white hover:underline">wall-v.com</a></p>
  </footer>
</body>
</html>`;
}
