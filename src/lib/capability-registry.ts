export type RequestType =
  | "website-development"
  | "mobile-app-development"
  | "logo-design"
  | "graphic-design"
  | "image-generation"
  | "video-production"
  | "content-writing"
  | "seo-optimization"
  | "social-media-marketing"
  | "email-marketing"
  | "ppc-advertising"
  | "branding"
  | "ui-ux-design"
  | "ecommerce-development"
  | "saas-development"
  | "api-development"
  | "database-design"
  | "devops-infrastructure"
  | "security-audit"
  | "data-analytics"
  | "ai-ml-solution"
  | "automation-workflow"
  | "consulting-strategy"
  | "project-management"
  | "quality-assurance"
  | "technical-documentation"
  | "hosting-setup"
  | "domain-management"
  | "support-request"
  | "sales-inquiry"
  | "general-question"
  | "custom-request";

export interface CapabilityDefinition {
  id: string;
  name: string;
  description: string;
  requestTypes: RequestType[];
  requiredSkills: string[];
  requiredTools: string[];
  category: string;
  minUserRole: string;
  requiresAuth: boolean;
  requiresProject: boolean;
  estimatedDuration: string;
  icon: string;
}

export interface ClassifiedRequest {
  requestType: RequestType;
  confidence: number;
  keywords: string[];
  requiresProject: boolean;
  complexity: "simple" | "moderate" | "complex";
  estimatedAgents: number;
}

const REQUEST_PATTERNS: Record<RequestType, { keywords: string[]; patterns: RegExp[]; complexity: "simple" | "moderate" | "complex" }> = {
  "website-development": {
    keywords: ["website", "web app", "web application", "landing page", "site", "web dev", "responsive site", "business website", "portfolio site", "blog site"],
    patterns: [/\b(website|web\s*app|landing\s*page|web\s*application)\b/i, /\b(build|create|develop|design)\b.*\b(website|site|web)\b/i],
    complexity: "complex",
  },
  "mobile-app-development": {
    keywords: ["mobile app", "ios app", "android app", "app development", "react native", "flutter", "mobile application"],
    patterns: [/\b(mobile|ios|android)\s*(app|application)\b/i, /\b(build|create|develop)\b.*\b(app|application)\b/i],
    complexity: "complex",
  },
  "logo-design": {
    keywords: ["logo", "logo design", "brand mark", "emblem", "logotype"],
    patterns: [/\blogo\b/i, /\b(need|want|create|design)\b.*\blogo\b/i],
    complexity: "simple",
  },
  "graphic-design": {
    keywords: ["graphic design", "visual design", "banner", "flyer", "brochure", "poster", "business card", "stationery", "print design"],
    patterns: [/\b(graphic|visual)\s*design\b/i, /\b(banner|flyer|brochure|poster|business\s*card)\b/i],
    complexity: "moderate",
  },
  "image-generation": {
    keywords: ["image", "picture", "photo", "illustration", "generate image", "ai image", "artwork", "digital art", "concept art"],
    patterns: [/\b(generate|create|make)\b.*\b(image|picture|photo|artwork|illustration)\b/i, /\b(ai|digital)\s*(image|art|illustration)\b/i],
    complexity: "simple",
  },
  "video-production": {
    keywords: ["video", "animation", "motion graphics", "promo video", "explainer video", "commercial", "advertisement video", "youtube"],
    patterns: [/\b(video|animation|motion\s*graphic)\b/i, /\b(create|produce|make)\b.*\b(video|animation)\b/i],
    complexity: "complex",
  },
  "content-writing": {
    keywords: ["content", "writing", "blog post", "article", "copywriting", "website copy", "product description", "email copy", "newsletter"],
    patterns: [/\b(content|writing|blog|article|copywriting)\b/i, /\b(write|create)\b.*\b(content|blog|article|copy)\b/i],
    complexity: "moderate",
  },
  "seo-optimization": {
    keywords: ["seo", "search engine optimization", "keyword research", "on-page seo", "technical seo", "seo audit", "rank higher", "organic traffic"],
    patterns: [/\bseo\b/i, /\b(search\s*engine\s*optimization|keyword\s*research|on.page)\b/i, /\b(improve|boost|increase)\b.*\b(seo|ranking|traffic)\b/i],
    complexity: "moderate",
  },
  "social-media-marketing": {
    keywords: ["social media", "social media marketing", "instagram", "facebook", "twitter", "linkedin", "tiktok", "social campaign", "social strategy"],
    patterns: [/\b(social\s*media|instagram|facebook|twitter|linkedin|tiktok)\b/i, /\b(social\s*media)\s*(campaign|strategy|marketing|plan)\b/i],
    complexity: "moderate",
  },
  "email-marketing": {
    keywords: ["email marketing", "email campaign", "newsletter", "drip campaign", "email automation", "email sequence"],
    patterns: [/\b(email\s*marketing|email\s*campaign|newsletter|drip)\b/i],
    complexity: "moderate",
  },
  "ppc-advertising": {
    keywords: ["ppc", "google ads", "facebook ads", "paid advertising", "ad campaign", "pay per click", "paid media"],
    patterns: [/\b(ppc|google\s*ads|facebook\s*ads|paid\s*advertis|pay.per.click)\b/i],
    complexity: "moderate",
  },
  "branding": {
    keywords: ["brand", "branding", "brand identity", "brand strategy", "brand guidelines", "visual identity", "brand book"],
    patterns: [/\b(brand|branding|brand\s*identity|brand\s*strategy)\b/i],
    complexity: "complex",
  },
  "ui-ux-design": {
    keywords: ["ui", "ux", "ui/ux", "user interface", "user experience", "wireframe", "prototype", "figma", "design system"],
    patterns: [/\b(ui|ux|user\s*interface|user\s*experience|wireframe|prototype)\b/i],
    complexity: "moderate",
  },
  "ecommerce-development": {
    keywords: ["ecommerce", "e-commerce", "online store", "shop", "woocommerce", "shopify", "product catalog", "shopping cart"],
    patterns: [/\b(e.commerce|online\s*store|shop|shopping)\b/i, /\b(build|create)\b.*\b(store|shop)\b/i],
    complexity: "complex",
  },
  "saas-development": {
    keywords: ["saas", "software as a service", "subscription platform", "multi-tenant", "saas app"],
    patterns: [/\b(saas|software.as.a.service|subscription\s*platform)\b/i],
    complexity: "complex",
  },
  "api-development": {
    keywords: ["api", "rest api", "graphql", "backend api", "api design", "api development", "webhook"],
    patterns: [/\b(api|rest|graphql|webhook)\b.*\b(develop|design|build|create)\b/i, /\b(build|create|design)\b.*\b(api|rest|graphql)\b/i],
    complexity: "complex",
  },
  "database-design": {
    keywords: ["database", "database design", "schema", "data model", "mongodb", "postgresql", "mysql", "sql"],
    patterns: [/\b(database|schema|data\s*model)\b.*\b(design|build|create)\b/i],
    complexity: "complex",
  },
  "devops-infrastructure": {
    keywords: ["devops", "infrastructure", "ci/cd", "deployment", "docker", "kubernetes", "aws", "cloud", "server setup"],
    patterns: [/\b(devops|infrastructure|ci.cd|deployment|docker|kubernetes|aws|cloud)\b/i],
    complexity: "complex",
  },
  "security-audit": {
    keywords: ["security", "security audit", "penetration testing", "vulnerability", "security review", "compliance"],
    patterns: [/\b(security|penetration|vulnerability|compliance)\b.*\b(audit|test|review|assessment)\b/i],
    complexity: "complex",
  },
  "data-analytics": {
    keywords: ["analytics", "data analysis", "dashboard", "reporting", "data visualization", "business intelligence", "kpi"],
    patterns: [/\b(analytics|data\s*analysis|dashboard|reporting|data\s*visualization)\b/i],
    complexity: "moderate",
  },
  "ai-ml-solution": {
    keywords: ["ai", "machine learning", "artificial intelligence", "ml", "neural network", "nlp", "computer vision", "ai solution"],
    patterns: [/\b(ai|machine\s*learning|artificial\s*intelligence|ml|neural)\b/i],
    complexity: "complex",
  },
  "automation-workflow": {
    keywords: ["automation", "workflow", "automate", "process automation", "zapier", "n8n", "bot", "chatbot"],
    patterns: [/\b(automat|workflow|bot|chatbot)\b/i, /\b(automate|build|create)\b.*\b(bot|chatbot|automation|workflow)\b/i],
    complexity: "moderate",
  },
  "consulting-strategy": {
    keywords: ["consulting", "strategy", "advisory", "roadmap", "assessment", "review", "planning"],
    patterns: [/\b(consult|strategy|advisory|roadmap|assessment|planning)\b/i],
    complexity: "moderate",
  },
  "project-management": {
    keywords: ["project management", "agile", "scrum", "kanban", "sprint", "project plan", "milestone"],
    patterns: [/\b(project\s*management|agile|scrum|kanban|sprint)\b/i],
    complexity: "moderate",
  },
  "quality-assurance": {
    keywords: ["testing", "qa", "quality assurance", "test automation", "bug", "regression testing", "uat"],
    patterns: [/\b(testing|qa|quality\s*assurance|test\s*automation|regression)\b/i],
    complexity: "moderate",
  },
  "technical-documentation": {
    keywords: ["documentation", "technical writing", "docs", "api documentation", "user guide", "readme"],
    patterns: [/\b(documentation|technical\s*writing|docs|api\s*doc|user\s*guide)\b/i],
    complexity: "moderate",
  },
  "hosting-setup": {
    keywords: ["hosting", "server", "hosting setup", "web hosting", "cloud hosting", "vps", "dedicated server"],
    patterns: [/\b(hosting|server|vps|dedicated)\b.*\b(setup|plan|configure)\b/i, /\b(web\s*hosting|cloud\s*hosting)\b/i],
    complexity: "simple",
  },
  "domain-management": {
    keywords: ["domain", "domain name", "domain registration", "dns", "domain transfer"],
    patterns: [/\b(domain|dns)\b.*\b(register|transfer|manage|setup)\b/i, /\b(domain\s*name)\b/i],
    complexity: "simple",
  },
  "support-request": {
    keywords: ["help", "support", "issue", "problem", "error", "not working", "bug", "fix", "troubleshoot"],
    patterns: [/\b(help|support|issue|problem|error|bug|fix|troubleshoot)\b/i],
    complexity: "simple",
  },
  "sales-inquiry": {
    keywords: ["pricing", "cost", "quote", "proposal", "how much", "price", "estimate", "plan", "package"],
    patterns: [/\b(pricing|cost|quote|proposal|how\s*much|price|estimate|plan|package)\b/i],
    complexity: "simple",
  },
  "general-question": {
    keywords: ["what", "how", "can you", "do you", "tell me", "explain", "info", "information"],
    patterns: [/\b(what|how|can\s*you|do\s*you|tell\s*me|explain|info)\b/i],
    complexity: "simple",
  },
  "custom-request": {
    keywords: ["custom", "unique", "special", "specific", "tailored", "bespoke", "something else"],
    patterns: [/\b(custom|unique|special|specific|tailored|bespoke)\b/i],
    complexity: "complex",
  },
};

export function classifyRequest(message: string): ClassifiedRequest {
  const lower = message.toLowerCase();
  const scores: { type: RequestType; score: number; matchedKeywords: string[] }[] = [];

  for (const [type, config] of Object.entries(REQUEST_PATTERNS) as [RequestType, typeof REQUEST_PATTERNS[RequestType]][]) {
    let score = 0;
    const matchedKeywords: string[] = [];

    for (const keyword of config.keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        score += 2;
        matchedKeywords.push(keyword);
      }
    }

    for (const pattern of config.patterns) {
      if (pattern.test(message)) {
        score += 3;
      }
    }

    if (score > 0) {
      scores.push({ type, score, matchedKeywords });
    }
  }

  scores.sort((a, b) => b.score - a.score);

  if (scores.length === 0) {
    return {
      requestType: "general-question",
      confidence: 0.5,
      keywords: [],
      requiresProject: false,
      complexity: "simple",
      estimatedAgents: 1,
    };
  }

  const best = scores[0];
  const confidence = Math.min(best.score / 10, 1);
  const config = REQUEST_PATTERNS[best.type];

  const projectTypes: RequestType[] = [
    "website-development", "mobile-app-development", "ecommerce-development",
    "saas-development", "branding", "video-production",
  ];

  return {
    requestType: best.type,
    confidence,
    keywords: best.matchedKeywords,
    requiresProject: projectTypes.includes(best.type),
    complexity: config.complexity,
    estimatedAgents: config.complexity === "complex" ? 5 : config.complexity === "moderate" ? 3 : 1,
  };
}

export const CAPABILITY_REGISTRY: CapabilityDefinition[] = [
  {
    id: "web-development",
    name: "Website Development",
    description: "Custom website development from landing pages to complex web applications",
    requestTypes: ["website-development", "ecommerce-development"],
    requiredSkills: ["development", "frontend", "backend"],
    requiredTools: [],
    category: "development",
    minUserRole: "customer",
    requiresAuth: true,
    requiresProject: true,
    estimatedDuration: "2-8 weeks",
    icon: "Globe",
  },
  {
    id: "mobile-development",
    name: "Mobile App Development",
    description: "Native and cross-platform mobile application development",
    requestTypes: ["mobile-app-development"],
    requiredSkills: ["development", "mobile"],
    requiredTools: [],
    category: "development",
    minUserRole: "customer",
    requiresAuth: true,
    requiresProject: true,
    estimatedDuration: "4-12 weeks",
    icon: "Smartphone",
  },
  {
    id: "logo-design",
    name: "Logo Design",
    description: "Professional logo design and brand mark creation",
    requestTypes: ["logo-design"],
    requiredSkills: ["design", "branding"],
    requiredTools: [],
    category: "design",
    minUserRole: "customer",
    requiresAuth: true,
    requiresProject: false,
    estimatedDuration: "1-5 days",
    icon: "PenTool",
  },
  {
    id: "graphic-design",
    name: "Graphic Design",
    description: "Visual design for banners, flyers, brochures, and print materials",
    requestTypes: ["graphic-design"],
    requiredSkills: ["design"],
    requiredTools: [],
    category: "design",
    minUserRole: "customer",
    requiresAuth: true,
    requiresProject: false,
    estimatedDuration: "1-7 days",
    icon: "Palette",
  },
  {
    id: "image-generation",
    name: "AI Image Generation",
    description: "Generate custom images, illustrations, and artwork using AI",
    requestTypes: ["image-generation"],
    requiredSkills: ["generation", "design"],
    requiredTools: ["generate_image"],
    category: "generation",
    minUserRole: "customer",
    requiresAuth: true,
    requiresProject: false,
    estimatedDuration: "Minutes",
    icon: "Image",
  },
  {
    id: "video-production",
    name: "Video Production",
    description: "Promotional videos, explainer videos, and motion graphics",
    requestTypes: ["video-production"],
    requiredSkills: ["design", "content", "generation"],
    requiredTools: [],
    category: "creative",
    minUserRole: "customer",
    requiresAuth: true,
    requiresProject: true,
    estimatedDuration: "1-4 weeks",
    icon: "Video",
  },
  {
    id: "content-writing",
    name: "Content Writing",
    description: "Blog posts, articles, website copy, and marketing content",
    requestTypes: ["content-writing"],
    requiredSkills: ["content", "seo"],
    requiredTools: [],
    category: "content",
    minUserRole: "customer",
    requiresAuth: true,
    requiresProject: false,
    estimatedDuration: "1-5 days",
    icon: "FileText",
  },
  {
    id: "seo-services",
    name: "SEO Optimization",
    description: "Search engine optimization, audits, and ranking improvements",
    requestTypes: ["seo-optimization"],
    requiredSkills: ["seo", "content", "analysis"],
    requiredTools: [],
    category: "marketing",
    minUserRole: "customer",
    requiresAuth: true,
    requiresProject: false,
    estimatedDuration: "1-4 weeks",
    icon: "Search",
  },
  {
    id: "social-media",
    name: "Social Media Marketing",
    description: "Social media strategy, content creation, and campaign management",
    requestTypes: ["social-media-marketing"],
    requiredSkills: ["marketing", "content", "design"],
    requiredTools: [],
    category: "marketing",
    minUserRole: "customer",
    requiresAuth: true,
    requiresProject: false,
    estimatedDuration: "Ongoing",
    icon: "Share2",
  },
  {
    id: "email-marketing",
    name: "Email Marketing",
    description: "Email campaigns, newsletters, and automated sequences",
    requestTypes: ["email-marketing"],
    requiredSkills: ["marketing", "content"],
    requiredTools: [],
    category: "marketing",
    minUserRole: "customer",
    requiresAuth: true,
    requiresProject: false,
    estimatedDuration: "1-2 weeks",
    icon: "Mail",
  },
  {
    id: "ppc-advertising",
    name: "Paid Advertising",
    description: "Google Ads, Facebook Ads, and PPC campaign management",
    requestTypes: ["ppc-advertising"],
    requiredSkills: ["marketing", "analysis"],
    requiredTools: [],
    category: "marketing",
    minUserRole: "customer",
    requiresAuth: true,
    requiresProject: false,
    estimatedDuration: "Ongoing",
    icon: "Target",
  },
  {
    id: "branding-service",
    name: "Branding",
    description: "Complete brand identity, strategy, and guidelines",
    requestTypes: ["branding"],
    requiredSkills: ["design", "branding", "strategy"],
    requiredTools: [],
    category: "design",
    minUserRole: "customer",
    requiresAuth: true,
    requiresProject: true,
    estimatedDuration: "2-6 weeks",
    icon: "Sparkles",
  },
  {
    id: "ui-ux-design",
    name: "UI/UX Design",
    description: "User interface and experience design, wireframes, prototypes",
    requestTypes: ["ui-ux-design"],
    requiredSkills: ["design", "strategy"],
    requiredTools: [],
    category: "design",
    minUserRole: "customer",
    requiresAuth: true,
    requiresProject: false,
    estimatedDuration: "1-4 weeks",
    icon: "Layout",
  },
  {
    id: "saas-development",
    name: "SaaS Development",
    description: "Full-stack SaaS platform development",
    requestTypes: ["saas-development"],
    requiredSkills: ["development", "architecture", "frontend", "backend"],
    requiredTools: [],
    category: "development",
    minUserRole: "customer",
    requiresAuth: true,
    requiresProject: true,
    estimatedDuration: "8-24 weeks",
    icon: "Cloud",
  },
  {
    id: "api-development",
    name: "API Development",
    description: "RESTful API, GraphQL, and backend service development",
    requestTypes: ["api-development", "database-design"],
    requiredSkills: ["development", "backend"],
    requiredTools: [],
    category: "development",
    minUserRole: "customer",
    requiresAuth: true,
    requiresProject: false,
    estimatedDuration: "1-6 weeks",
    icon: "Server",
  },
  {
    id: "devops",
    name: "DevOps & Infrastructure",
    description: "Cloud infrastructure, CI/CD, and deployment automation",
    requestTypes: ["devops-infrastructure"],
    requiredSkills: ["devops", "infrastructure"],
    requiredTools: [],
    category: "operations",
    minUserRole: "customer",
    requiresAuth: true,
    requiresProject: false,
    estimatedDuration: "1-4 weeks",
    icon: "Container",
  },
  {
    id: "security-audit",
    name: "Security Audit",
    description: "Security assessment, vulnerability testing, and compliance",
    requestTypes: ["security-audit"],
    requiredSkills: ["security", "testing"],
    requiredTools: [],
    category: "security",
    minUserRole: "customer",
    requiresAuth: true,
    requiresProject: false,
    estimatedDuration: "1-2 weeks",
    icon: "Shield",
  },
  {
    id: "data-analytics",
    name: "Data Analytics",
    description: "Data analysis, dashboards, and business intelligence",
    requestTypes: ["data-analytics"],
    requiredSkills: ["analysis", "data"],
    requiredTools: [],
    category: "analysis",
    minUserRole: "customer",
    requiresAuth: true,
    requiresProject: false,
    estimatedDuration: "1-4 weeks",
    icon: "BarChart",
  },
  {
    id: "ai-ml",
    name: "AI & Machine Learning",
    description: "Custom AI/ML solutions, models, and intelligent features",
    requestTypes: ["ai-ml-solution"],
    requiredSkills: ["ai", "development", "data"],
    requiredTools: [],
    category: "development",
    minUserRole: "customer",
    requiresAuth: true,
    requiresProject: true,
    estimatedDuration: "4-16 weeks",
    icon: "Brain",
  },
  {
    id: "automation",
    name: "Automation & Workflows",
    description: "Process automation, chatbots, and workflow optimization",
    requestTypes: ["automation-workflow"],
    requiredSkills: ["automation", "integration"],
    requiredTools: [],
    category: "operations",
    minUserRole: "customer",
    requiresAuth: true,
    requiresProject: false,
    estimatedDuration: "1-3 weeks",
    icon: "Workflow",
  },
  {
    id: "consulting",
    name: "Consulting & Strategy",
    description: "Technical consulting, digital strategy, and advisory",
    requestTypes: ["consulting-strategy", "project-management"],
    requiredSkills: ["strategy", "project-management"],
    requiredTools: [],
    category: "consulting",
    minUserRole: "customer",
    requiresAuth: true,
    requiresProject: false,
    estimatedDuration: "1-2 weeks",
    icon: "MessageSquare",
  },
  {
    id: "qa-testing",
    name: "Quality Assurance",
    description: "Manual and automated testing, QA processes",
    requestTypes: ["quality-assurance"],
    requiredSkills: ["testing", "qa"],
    requiredTools: [],
    category: "testing",
    minUserRole: "customer",
    requiresAuth: true,
    requiresProject: false,
    estimatedDuration: "1-4 weeks",
    icon: "CheckCircle",
  },
  {
    id: "documentation",
    name: "Technical Documentation",
    description: "API docs, user guides, and technical writing",
    requestTypes: ["technical-documentation"],
    requiredSkills: ["documentation", "content"],
    requiredTools: [],
    category: "content",
    minUserRole: "customer",
    requiresAuth: true,
    requiresProject: false,
    estimatedDuration: "1-2 weeks",
    icon: "BookOpen",
  },
  {
    id: "hosting",
    name: "Hosting Setup",
    description: "Web hosting configuration and server setup",
    requestTypes: ["hosting-setup"],
    requiredSkills: ["hosting", "infrastructure"],
    requiredTools: [],
    category: "operations",
    minUserRole: "customer",
    requiresAuth: true,
    requiresProject: false,
    estimatedDuration: "1-3 days",
    icon: "Server",
  },
  {
    id: "domain",
    name: "Domain Management",
    description: "Domain registration, transfer, and DNS management",
    requestTypes: ["domain-management"],
    requiredSkills: ["hosting", "infrastructure"],
    requiredTools: [],
    category: "operations",
    minUserRole: "customer",
    requiresAuth: true,
    requiresProject: false,
    estimatedDuration: "1 day",
    icon: "Globe",
  },
  {
    id: "sales",
    name: "Sales & Pricing",
    description: "Pricing information, quotes, and project estimates",
    requestTypes: ["sales-inquiry"],
    requiredSkills: ["sales", "crm"],
    requiredTools: ["create_inquiry", "create_lead"],
    category: "sales",
    minUserRole: "customer",
    requiresAuth: false,
    requiresProject: false,
    estimatedDuration: "Immediate",
    icon: "DollarSign",
  },
  {
    id: "support",
    name: "Customer Support",
    description: "General support, troubleshooting, and assistance",
    requestTypes: ["support-request"],
    requiredSkills: ["support", "conversation"],
    requiredTools: [],
    category: "support",
    minUserRole: "customer",
    requiresAuth: false,
    requiresProject: false,
    estimatedDuration: "Immediate",
    icon: "LifeBuoy",
  },
];

export function resolveCapabilities(classified: ClassifiedRequest): CapabilityDefinition[] {
  return CAPABILITY_REGISTRY.filter((cap) =>
    cap.requestTypes.includes(classified.requestType)
  ).sort((a, b) => {
    const aExact = a.requestTypes.includes(classified.requestType) ? 1 : 0;
    const bExact = b.requestTypes.includes(classified.requestType) ? 1 : 0;
    return bExact - aExact;
  });
}

export function getCapabilityById(id: string): CapabilityDefinition | undefined {
  return CAPABILITY_REGISTRY.find((c) => c.id === id);
}
