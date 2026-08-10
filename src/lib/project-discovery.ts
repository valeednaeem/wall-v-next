/**
 * Wall-V Project Discovery Engine
 *
 * Shared intelligence layer used by chatbot, voice agent, and AI chat.
 * Discovers what a visitor wants to build, buy, host, or manage,
 * then produces a structured project brief and connects to CRM.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type ProjectType =
  | "website"
  | "web-application"
  | "mobile-app"
  | "ecommerce"
  | "saas"
  | "ai-integration"
  | "crm"
  | "erp"
  | "automation"
  | "hosting"
  | "domain"
  | "digital-product"
  | "seo-marketing"
  | "redesign"
  | "consulting"
  | "other";

export type DiscoveryStage =
  | "greeting"
  | "identify-intent"
  | "understand-goal"
  | "discover-requirements"
  | "identify-scope"
  | "budget-timeline"
  | "recommend-solution"
  | "generate-brief"
  | "user-confirmation"
  | "create-inquiry"
  | "completed";

export interface ProjectBrief {
  title: string;
  projectType: ProjectType | null;
  businessContext: {
    industry: string;
    description: string;
    customers: string;
  };
  objective: string;
  targetAudience: string;
  features: string[];
  userRoles: string[];
  integrations: string[];
  designPreferences: string;
  hostingRequired: boolean;
  domainRequired: boolean;
  domainName: string;
  mobileAppRequired: boolean;
  aiFeaturesRequired: boolean;
  seoRequired: boolean;
  estimatedBudget: string;
  desiredTimeline: string;
  technicalComplexity: "low" | "medium" | "high" | "unknown";
  missingInformation: string[];
  recommendedServices: string[];
  recommendedNextSteps: string[];
}

export interface ConversationState {
  stage: DiscoveryStage;
  intent: "new_project" | "existing_project" | "service_inquiry" | "product_inquiry" | "hosting_inquiry" | "domain_inquiry" | "support" | "general" | "unknown";
  brief: ProjectBrief;
  askedQuestions: string[];
  lastQuestionCategory: string;
  userContext?: {
    isLoggedIn: boolean;
    userId?: string;
    existingProjects?: number;
    existingInquiries?: number;
  };
  language: string;
  turnCount: number;
}

export interface DiscoveryResponse {
  message: string;
  stage: DiscoveryStage;
  nextQuestion?: string;
  brief?: ProjectBrief;
  action?: "continue" | "summarize" | "confirm" | "create_inquiry";
  suggestions?: string[];
}

// ─── Wall-V Service Knowledge Base ───────────────────────────────────────────

export const WALLV_SERVICES = {
  webDevelopment: {
    name: "Web Development",
    description: "Custom web applications built with React, Next.js, Node.js",
    includes: [
      "Business websites",
      "Custom web applications",
      "SaaS platforms",
      "E-commerce websites",
      "Client portals",
      "Admin dashboards",
    ],
    startingPrice: 499,
    technology: ["Next.js", "React", "TypeScript", "Node.js", "MongoDB"],
  },
  aiAutomation: {
    name: "AI & Automation",
    description: "Intelligent agents and workflows that automate repetitive tasks",
    includes: [
      "AI chatbots and virtual assistants",
      "AI voice agents",
      "Workflow automation",
      "Predictive analytics",
      "Document processing",
    ],
    startingPrice: 1499,
  },
  mobileApps: {
    name: "Mobile Applications",
    description: "Native and cross-platform mobile apps for iOS and Android",
    includes: [
      "Cross-platform apps (React Native / Flutter)",
      "Native iOS and Android",
      "Offline-first architecture",
      "Push notifications",
      "App Store deployment",
    ],
    startingPrice: 2999,
  },
  crm: {
    name: "CRM Systems",
    description: "Customer relationship management with lead scoring and pipeline",
    includes: [
      "Lead management",
      "Pipeline tracking",
      "Client communication",
      "Invoicing integration",
      "Reporting dashboards",
    ],
    startingPrice: 1499,
  },
  erp: {
    name: "ERP Systems",
    description: "Enterprise resource planning tailored to your business",
    includes: [
      "Finance modules",
      "HR management",
      "Inventory tracking",
      "Real-time dashboards",
      "Third-party integrations",
    ],
    startingPrice: 2999,
  },
  hosting: {
    name: "Web Hosting",
    description: "Enterprise-grade hosting with 99.9% uptime",
    plans: [
      { name: "Basic", price: 3.99, period: "mo", features: ["1 Website", "5GB Storage", "Free SSL"] },
      { name: "Business", price: 9.99, period: "mo", features: ["10 Websites", "25GB Storage", "Daily Backups"] },
      { name: "Cloud", price: 16.99, period: "mo", features: ["Unlimited Sites", "50GB Storage", "CDN"] },
      { name: "WordPress", price: 6.99, period: "mo", features: ["1 Website", "10GB Storage", "Auto Updates"] },
      { name: "Reseller", price: 29.99, period: "mo", features: ["50 Accounts", "100GB Storage", "White Label"] },
      { name: "Email", price: 1.99, period: "mo", features: ["5 Accounts", "5GB Storage", "Custom Domain"] },
    ],
  },
  domains: {
    name: "Domain Registration",
    description: "Register and manage domain names",
    extensions: [".com", ".net", ".org", ".pk", ".io", ".dev", ".app", ".co"],
    startingPrice: 9.99,
  },
  digitalMarketing: {
    name: "Digital Marketing",
    description: "SEO, PPC, social media, and analytics",
    includes: [
      "Search engine optimization (SEO)",
      "Google Ads and Meta Ads",
      "Social media strategy",
      "Analytics setup",
      "Email marketing",
    ],
    startingPrice: 499,
  },
  uiux: {
    name: "UI/UX Design",
    description: "User interface and experience design",
    includes: [
      "Wireframing and prototyping",
      "Brand identity",
      "Design systems",
      "Usability testing",
    ],
    startingPrice: 999,
  },
};

// ─── Project Type Detection ──────────────────────────────────────────────────

const PROJECT_TYPE_KEYWORDS: Record<ProjectType, string[]> = {
  website: ["website", "web site", "site", "landing page", "business site", "company site", "blog site", "portfolio site", "personal site", "information site", "brochure site"],
  "web-application": ["web app", "web application", "dashboard", "admin panel", "portal", "internal tool", "business tool", "management system", "booking system", "booking platform"],
  "mobile-app": ["mobile app", "android app", "ios app", "phone app", "mobile application", "cross-platform app", "react native", "flutter"],
  ecommerce: ["ecommerce", "e-commerce", "online store", "store", "shop", "marketplace", "sell products", "sell online", "product catalog"],
  saas: ["saas", "software as a service", "subscription platform", "multi-tenant", "platform", "marketplace platform"],
  "ai-integration": ["ai", "artificial intelligence", "machine learning", "chatbot", "voice agent", "ai assistant", "ai features", "smart", "intelligent", "automation"],
  crm: ["crm", "customer relationship", "lead management", "sales pipeline", "client management", "customer database"],
  erp: ["erp", "enterprise resource", "business management", "inventory management", "hr system", "finance system", "accounting system"],
  automation: ["automation", "automate", "workflow", "automated", "reduce manual", "streamline", "integrate"],
  hosting: ["hosting", "host", "server", "web host", "hosting plan", "hosting service"],
  domain: ["domain", "domain name", "register domain", "buy domain", "domain registration"],
  "digital-product": ["digital product", "template", "theme", "plugin", "software product", "download", "digital download"],
  "seo-marketing": ["seo", "search engine optimization", "digital marketing", "marketing", "social media", "google ads", "facebook ads", "advertising", "content marketing"],
  redesign: ["redesign", "revamp", "update website", "modernize", "rebrand", "new design", "new look"],
  consulting: ["consulting", "consultation", "strategy", "advice", "guidance", "review", "audit", "assessment"],
  other: [],
};

export function detectProjectType(userMessage: string): ProjectType | null {
  const lower = userMessage.toLowerCase();
  let bestMatch: ProjectType | null = null;
  let bestScore = 0;

  for (const [type, keywords] of Object.entries(PROJECT_TYPE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        const score = keyword.length;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = type as ProjectType;
        }
      }
    }
  }

  return bestMatch;
}

// ─── Feature Detection ───────────────────────────────────────────────────────

const FEATURE_KEYWORDS: Record<string, string[]> = {
  "User Authentication": ["login", "signup", "register", "authentication", "auth", "sign in", "sign up", "account", "password"],
  "Payment Processing": ["payment", "checkout", "pay", "stripe", "paypal", "credit card", "billing", "invoice", "subscribe", "subscription"],
  "E-commerce": ["product", "cart", "checkout", "store", "shop", "order", "purchase", "buy"],
  "Booking System": ["booking", "appointment", "schedule", "reservation", "calendar", "book"],
  "Messaging": ["chat", "message", "messaging", "inbox", "conversation", "notification"],
  "Notifications": ["notification", "alert", "email notification", "push notification", "sms"],
  "Dashboards": ["dashboard", "analytics", "reporting", "charts", "metrics", "kpis"],
  "Search": ["search", "filter", "sort", "find"],
  "File Uploads": ["upload", "file", "document", "image upload", "media"],
  "User Roles": ["roles", "permissions", "admin", "staff", "user types", "access control"],
  "AI Features": ["ai", "chatbot", "voice", "machine learning", "intelligent", "smart"],
  "API Integration": ["api", "integration", "third-party", "webhook", "connect"],
  "Multi-Language": ["multi-language", "i18n", "localization", "translate", "arabic", "urdu", "french", "spanish"],
  "Responsive Design": ["responsive", "mobile-friendly", "mobile", "tablet", "responsive design"],
  "SEO": ["seo", "search engine", "meta tags", "sitemap", "structured data"],
  "Social Media Integration": ["social media", "facebook", "instagram", "linkedin", "twitter", "youtube"],
  "Email Integration": ["email", "smtp", "email sending", "newsletter", "email template"],
  "Maps": ["map", "location", "google maps", "directions", "geolocation"],
  "Reporting": ["report", "reporting", "export", "pdf", "csv", "analytics"],
  "Real-time Updates": ["real-time", "live", "websocket", "instant", "realtime"],
  "Offline Support": ["offline", "pwa", "progressive web app", "cache"],
};

export function detectFeatures(userMessage: string): string[] {
  const lower = userMessage.toLowerCase();
  const found: string[] = [];

  for (const [feature, keywords] of Object.entries(FEATURE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        if (!found.includes(feature)) {
          found.push(feature);
        }
        break;
      }
    }
  }

  return found;
}

// ─── Budget Detection ────────────────────────────────────────────────────────

export function detectBudget(text: string): string | null {
  const lower = text.toLowerCase();

  if (lower.includes("cheap") || lower.includes("low budget") || lower.includes("affordable") || lower.includes("minimum") || lower.includes("as cheap")) return "500-1500";
  if (lower.includes("medium") || lower.includes("moderate") || lower.includes("reasonable")) return "1500-5000";
  if (lower.includes("premium") || lower.includes("high") || lower.includes("enterprise") || lower.includes("unlimited")) return "5000-15000";
  if (lower.includes("no budget") || lower.includes("no limit") || lower.includes("whatever it takes")) return "15000+";

  const nums = text.match(/\$?\d[\d,]*\.?\d*/g);
  if (nums) {
    const parsed = parseInt(nums[0].replace(/[$,]/g, ""));
    if (parsed > 0) {
      if (parsed < 1500) return "500-1500";
      if (parsed < 5000) return "1500-5000";
      if (parsed < 15000) return "5000-15000";
      return "15000+";
    }
  }

  return null;
}

// ─── Timeline Detection ──────────────────────────────────────────────────────

export function detectTimeline(text: string): string | null {
  const lower = text.toLowerCase();

  if (lower.includes("urgent") || lower.includes("asap") || lower.includes("quickly") || lower.includes("immediately") || lower.includes("fast")) return "1-2 weeks";
  if (lower.includes("month")) return "2-4 weeks";
  if (lower.includes("week")) return "1-2 weeks";
  if (lower.includes("flexible") || lower.includes("no rush") || lower.includes("eventually")) return "4-8 weeks";
  if (lower.includes("long") || lower.includes("complex") || lower.includes("large")) return "8-12 weeks";

  return null;
}

// ─── Contact Info Detection ──────────────────────────────────────────────────

export function detectContactInfo(text: string): { name?: string; email?: string; phone?: string } {
  const result: { name?: string; email?: string; phone?: string } = {};

  const nameMatch = text.match(/(?:i'm|i am|my name is|call me|i am)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
  if (nameMatch) result.name = nameMatch[1];

  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w{2,}/);
  if (emailMatch) result.email = emailMatch[0];

  const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/);
  if (phoneMatch) result.phone = phoneMatch[0];

  return result;
}

// ─── Adaptive Question Generation ────────────────────────────────────────────

function getNextQuestion(brief: ProjectBrief, askedQuestions: string[]): string | null {
  // Determine what's missing and ask the most important next question
  const missing = getMissingInformation(brief);

  if (missing.length === 0) return null;

  // Priority order for questions
  const priorityOrder = [
    "projectType",
    "objective",
    "features",
    "budget",
    "timeline",
    "businessContext",
    "targetAudience",
    "contactInfo",
    "designPreferences",
    "integrations",
    "hostingDomain",
  ];

  for (const field of priorityOrder) {
    if (missing.includes(field) && !askedQuestions.includes(field)) {
      return field;
    }
  }

  // If all priority questions asked, ask remaining
  for (const field of missing) {
    if (!askedQuestions.includes(field)) {
      return field;
    }
  }

  return null;
}

export function getMissingInformation(brief: ProjectBrief): string[] {
  const missing: string[] = [];

  if (!brief.projectType) missing.push("projectType");
  if (!brief.objective) missing.push("objective");
  if (brief.features.length === 0) missing.push("features");
  if (!brief.estimatedBudget) missing.push("budget");
  if (!brief.desiredTimeline) missing.push("timeline");
  if (!brief.businessContext.industry && !brief.businessContext.description) missing.push("businessContext");
  if (!brief.targetAudience) missing.push("targetAudience");

  // Only ask for contact info if we have enough project info
  if (brief.projectType && brief.objective) {
    missing.push("contactInfo");
  }

  return missing;
}

// ─── Question Templates ──────────────────────────────────────────────────────

const QUESTION_TEMPLATES: Record<string, Record<string, string>> = {
  en: {
    projectType: "What kind of project are you looking to build? For example: a website, a web application, a mobile app, an online store, or something else?",
    objective: "What's the main goal of this project? What problem should it solve for your business or customers?",
    features: "What key features do you need? For example: user accounts, payments, booking, dashboards, AI features, or anything specific to your idea.",
    budget: "What budget range are you working with? This helps me recommend the right approach.",
    timeline: "When do you need this ready? Are you working with a specific deadline?",
    contactInfo: "Could you share your name and email so I can save your project details and follow up?",
    designPreferences: "Do you have any design preferences? For example: brand colors, a logo, or websites whose look and feel you like?",
    integrations: "Do you need any integrations? For example: payment gateways, email services, Google Analytics, social media, or third-party APIs?",
    hostingDomain: "Do you already have hosting and a domain, or do you need help with those as well?",
    businessContext: "Tell me about your business. What industry are you in, and what does your company do?",
    targetAudience: "Who will be using this? Are they your customers, employees, or a specific group?",
    mobileApp: "Do you also need a mobile app, or is a web-based solution sufficient for now?",
    aiFeatures: "Do you want AI features like a chatbot, voice assistant, smart recommendations, or automation?",
  },
  es: {
    projectType: "¿Qué tipo de proyecto quieres crear? Por ejemplo: un sitio web, una aplicación web, una app móvil, una tienda en línea, u otra cosa.",
    objective: "¿Cuál es el objetivo principal de este proyecto? ¿Qué problema debe resolver para tu negocio?",
    features: "¿Qué funcionalidades clave necesitas? Por ejemplo: cuentas de usuario, pagos, reservas, paneles, funciones de IA.",
    budget: "¿Con qué presupuesto cuentas? Esto me ayuda a recomendar el enfoque adecuado.",
    timeline: "¿Cuándo necesitas tenerlo listo? ¿Tienes una fecha límite específica?",
    contactInfo: "¿Podrías compartir tu nombre y correo electrónico para guardar los detalles de tu proyecto?",
  },
  ar: {
    projectType: "ما نوع المشروع الذي تريد بناءه؟ على سبيل المثال: موقع إلكتروني، تطبيق ويب، تطبيق جوال، متجر إلكتروني، أو شيء آخر.",
    objective: "ما هو الهدف الرئيسي من هذا المشروع؟ ما هي المشكلة التي يجب أن يحلها لأعمالك؟",
    features: "ما هي الميزات الرئيسية التي تحتاجها؟ على سبيل المثال: حسابات مستخدمين، مدفوعات، حجوزات، لوحات تحكم، ميزات الذكاء الاصطناعي.",
    budget: "ما هو نطاق الميزانية التي تعمل بها؟ هذا يساعدني في التوصية بالنهج المناسب.",
    timeline: "متى تحتاج أن يكون جاهزاً؟ هل لديك موعد نهائي محدد؟",
    contactInfo: "هل يمكنك مشاركة اسمك وبريدك الإلكتروني لحفظ تفاصيل مشروعك؟",
  },
  fr: {
    projectType: "Quel type de projet souhaitez-vous créer ? Par exemple : un site web, une application web, une application mobile, une boutique en ligne, ou autre chose.",
    objective: "Quel est l'objectif principal de ce projet ? Quel problème doit-il résoudre pour votre entreprise ?",
    features: "Quelles fonctionnalités clés vous need ? Par exemple : comptes utilisateurs, paiements, réservations, tableaux de bord, fonctionnalités IA.",
    budget: "Quel budget envisagez-vous ? Cela m'aide à recommander la bonne approche.",
    timeline: "Quand devez-vous avoir terminé ? Avez-vous une date limite spécifique ?",
    contactInfo: "Pourriez-vous partager votre nom et email pour sauvegarder les détails de votre projet ?",
  },
  ur: {
    projectType: "آپ کس قسم کا پروجیکٹ بنانا چاہتے ہیں؟ مثال کے طور پر: ویب سائٹ، ویب ایپلیکیشن، موبائل ایپ، آن لائن اسٹور، یا کچھ اور۔",
    objective: "اس پروجیکٹ کا بنیادی مقصد کیا ہے؟ یہ آپ کے کاروبار کے لیے کون سا مسئلہ حل کرے گا؟",
    features: "آپ کو کون سی اہم خصوصیات درکار ہیں؟ مثال کے طور پر: صارف اکاؤنٹس، ادائیگیاں، بکنگ، ڈیش بورڈز، AI خصوصیات۔",
    budget: "آپ کس بجٹ رینج کے ساتھ کام کر رہے ہیں؟ اس سے مجھے مناسب تجویز کرنے میں مدد ملتی ہے۔",
    timeline: "آپ کو یہ کب تیار چاہیے؟ کیا آپ کے پاس کوئی مخصوص ڈیڈ لائن ہے؟",
    contactInfo: "کیا آپ اپنا نام اور ای میل شیئر کر سکتے ہیں تاکہ آپ کے پروجیکٹ کی تفصیلات محفوظ ہو سکیں؟",
  },
};

// ─── Service Recommendation ──────────────────────────────────────────────────

export function recommendServices(brief: ProjectBrief): string[] {
  const services: string[] = [];

  if (brief.projectType === "website" || brief.projectType === "redesign") {
    services.push("Web Development");
  } else if (brief.projectType === "web-application" || brief.projectType === "saas") {
    services.push("Web Development");
  } else if (brief.projectType === "mobile-app") {
    services.push("Mobile Applications");
  } else if (brief.projectType === "ecommerce") {
    services.push("Web Development");
    services.push("E-commerce");
  } else if (brief.projectType === "crm") {
    services.push("CRM Systems");
  } else if (brief.projectType === "erp") {
    services.push("ERP Systems");
  } else if (brief.projectType === "ai-integration" || brief.projectType === "automation") {
    services.push("AI & Automation");
  } else if (brief.projectType === "seo-marketing") {
    services.push("Digital Marketing");
  }

  if (brief.aiFeaturesRequired && !services.includes("AI & Automation")) {
    services.push("AI & Automation");
  }

  if (brief.seoRequired && !services.includes("Digital Marketing")) {
    services.push("Digital Marketing");
  }

  if (brief.hostingRequired) {
    services.push("Web Hosting");
  }

  if (brief.domainRequired) {
    services.push("Domain Registration");
  }

  if (brief.mobileAppRequired && !services.includes("Mobile Applications")) {
    services.push("Mobile Applications");
  }

  if (services.length === 0) {
    services.push("Web Development");
  }

  return services;
}

// ─── Brief Summary Generation ────────────────────────────────────────────────

export function generateBriefSummary(brief: ProjectBrief, language: string = "en"): string {
  const lang = language in QUESTION_TEMPLATES ? language : "en";
  const t = QUESTION_TEMPLATES[lang] || QUESTION_TEMPLATES.en;

  let summary = "";

  if (lang === "ar") {
    summary = `**ملخص المشروع:**\n\n`;
    summary += `**النوع:** ${brief.projectType || "غير محدد"}\n`;
    summary += `**الهدف:** ${brief.objective || "غير محدد"}\n`;
    if (brief.features.length > 0) summary += `**الميزات:** ${brief.features.join(", ")}\n`;
    if (brief.estimatedBudget) summary += `**الميزانية:** ${brief.estimatedBudget}\n`;
    if (brief.desiredTimeline) summary += `**الجدول الزمني:** ${brief.desiredTimeline}\n`;
    if (brief.recommendedServices.length > 0) summary += `**الخدمات الموصى بها:** ${brief.recommendedServices.join(", ")}\n`;
  } else if (lang === "ur") {
    summary = `**پروجیکٹ کا خلاصہ:**\n\n`;
    summary += `**قسم:** ${brief.projectType || "نامعلوم"}\n`;
    summary += `**مقصد:** ${brief.objective || "نامعلوم"}\n`;
    if (brief.features.length > 0) summary += `**خصوصیات:** ${brief.features.join(", ")}\n`;
    if (brief.estimatedBudget) summary += `**بجٹ:** ${brief.estimatedBudget}\n`;
    if (brief.desiredTimeline) summary += `**ٹائم لائن:** ${brief.desiredTimeline}\n`;
    if (brief.recommendedServices.length > 0) summary += `**تجویز کردہ خدمات:** ${brief.recommendedServices.join(", ")}\n`;
  } else {
    summary = `**Project Summary:**\n\n`;
    summary += `**Type:** ${brief.projectType || "Not yet determined"}\n`;
    summary += `**Objective:** ${brief.objective || "Not yet determined"}\n`;
    if (brief.businessContext.industry) summary += `**Industry:** ${brief.businessContext.industry}\n`;
    if (brief.targetAudience) summary += `**Target Audience:** ${brief.targetAudience}\n`;
    if (brief.features.length > 0) summary += `**Key Features:** ${brief.features.join(", ")}\n`;
    if (brief.integrations.length > 0) summary += `**Integrations:** ${brief.integrations.join(", ")}\n`;
    if (brief.estimatedBudget) summary += `**Budget Range:** $${brief.estimatedBudget}\n`;
    if (brief.desiredTimeline) summary += `**Timeline:** ${brief.desiredTimeline}\n`;
    if (brief.designPreferences) summary += `**Design:** ${brief.designPreferences}\n`;
    if (brief.hostingRequired) summary += `**Hosting:** Required\n`;
    if (brief.domainRequired && brief.domainName) summary += `**Domain:** ${brief.domainName}\n`;
    if (brief.mobileAppRequired) summary += `**Mobile App:** Yes\n`;
    if (brief.aiFeaturesRequired) summary += `**AI Features:** Yes\n`;
    if (brief.recommendedServices.length > 0) summary += `**Recommended Services:** ${brief.recommendedServices.join(", ")}\n`;
  }

  if (brief.missingInformation.length > 0) {
    summary += `\n**Still needed:** ${brief.missingInformation.join(", ")}`;
  }

  return summary;
}

// ─── Core Discovery Logic ────────────────────────────────────────────────────

export function initializeConversationState(language: string = "en", userContext?: ConversationState["userContext"]): ConversationState {
  return {
    stage: "greeting",
    intent: "unknown",
    brief: {
      title: "",
      projectType: null,
      businessContext: { industry: "", description: "", customers: "" },
      objective: "",
      targetAudience: "",
      features: [],
      userRoles: [],
      integrations: [],
      designPreferences: "",
      hostingRequired: false,
      domainRequired: false,
      domainName: "",
      mobileAppRequired: false,
      aiFeaturesRequired: false,
      seoRequired: false,
      estimatedBudget: "",
      desiredTimeline: "",
      technicalComplexity: "unknown",
      missingInformation: [],
      recommendedServices: [],
      recommendedNextSteps: [],
    },
    askedQuestions: [],
    lastQuestionCategory: "",
    userContext,
    language,
    turnCount: 0,
  };
}

export function processUserMessage(state: ConversationState, userMessage: string): ConversationState {
  const newState = { ...state, brief: { ...state.brief }, turnCount: state.turnCount + 1 };

  // Detect project type if not yet known
  if (!newState.brief.projectType) {
    const detected = detectProjectType(userMessage);
    if (detected) {
      newState.brief.projectType = detected;
      if (newState.stage === "greeting" || newState.stage === "identify-intent") {
        newState.stage = "understand-goal";
      }
    }
  }

  // Detect features
  const detectedFeatures = detectFeatures(userMessage);
  if (detectedFeatures.length > 0) {
    const allFeatures = [...new Set([...newState.brief.features, ...detectedFeatures])];
    newState.brief.features = allFeatures;
  }

  // Detect budget
  const detectedBudget = detectBudget(userMessage);
  if (detectedBudget && !newState.brief.estimatedBudget) {
    newState.brief.estimatedBudget = detectedBudget;
  }

  // Detect timeline
  const detectedTimeline = detectTimeline(userMessage);
  if (detectedTimeline && !newState.brief.desiredTimeline) {
    newState.brief.desiredTimeline = detectedTimeline;
  }

  // Detect contact info
  const contactInfo = detectContactInfo(userMessage);
  if (contactInfo.name) newState.brief.title = `${contactInfo.name}'s Project`;
  if (contactInfo.email) {
    // Store for later inquiry creation
    (newState.brief as Record<string, unknown>)._contactEmail = contactInfo.email;
  }
  if (contactInfo.phone) {
    (newState.brief as Record<string, unknown>)._contactPhone = contactInfo.phone;
  }

  // Detect hosting/domain needs
  const lower = userMessage.toLowerCase();
  if (lower.includes("hosting") || lower.includes("host")) {
    newState.brief.hostingRequired = true;
  }
  if (lower.includes("domain") || lower.includes(".com") || lower.includes(".pk") || lower.includes(".io")) {
    newState.brief.domainRequired = true;
    const domainMatch = userMessage.match(/[\w-]+\.(com|net|org|pk|io|dev|app|co)/i);
    if (domainMatch) newState.brief.domainName = domainMatch[0];
  }

  // Detect AI features
  if (lower.includes("ai") || lower.includes("chatbot") || lower.includes("voice") || lower.includes("intelligent") || lower.includes("automation")) {
    newState.brief.aiFeaturesRequired = true;
  }

  // Detect mobile app
  if (lower.includes("mobile") || lower.includes("app") || lower.includes("android") || lower.includes("ios")) {
    newState.brief.mobileAppRequired = true;
  }

  // Detect SEO
  if (lower.includes("seo") || lower.includes("search engine") || lower.includes("google ranking")) {
    newState.brief.seoRequired = true;
  }

  // Detect business context
  if (!newState.brief.businessContext.description) {
    if (lower.includes("restaurant") || lower.includes("food")) newState.brief.businessContext = { ...newState.brief.businessContext, industry: "Food & Restaurant", description: "Restaurant business" };
    else if (lower.includes("school") || lower.includes("education") || lower.includes("university")) newState.brief.businessContext = { ...newState.brief.businessContext, industry: "Education", description: "Educational institution" };
    else if (lower.includes("clinic") || lower.includes("hospital") || lower.includes("medical") || lower.includes("health")) newState.brief.businessContext = { ...newState.brief.businessContext, industry: "Healthcare", description: "Healthcare organization" };
    else if (lower.includes("shop") || lower.includes("retail") || lower.includes("store")) newState.brief.businessContext = { ...newState.brief.businessContext, industry: "Retail", description: "Retail business" };
    else if (lower.includes("realestate") || lower.includes("real estate") || lower.includes("property")) newState.brief.businessContext = { ...newState.brief.businessContext, industry: "Real Estate", description: "Real estate business" };
    else if (lower.includes("finance") || lower.includes("bank") || lower.includes("insurance")) newState.brief.businessContext = { ...newState.brief.businessContext, industry: "Finance", description: "Financial services" };
    else if (lower.includes("travel") || lower.includes("tourism") || lower.includes("hotel")) newState.brief.businessContext = { ...newState.brief.businessContext, industry: "Travel & Tourism", description: "Travel and tourism business" };
  }

  // Detect target audience
  if (!newState.brief.targetAudience) {
    if (lower.includes("customer") || lower.includes("client")) newState.brief.targetAudience = "Customers/Clients";
    else if (lower.includes("employee") || lower.includes("staff") || lower.includes("team")) newState.brief.targetAudience = "Internal team/Employees";
    else if (lower.includes("student") || lower.includes("teacher")) newState.brief.targetAudience = "Students and educators";
    else if (lower.includes("patient") || lower.includes("doctor")) newState.brief.targetAudience = "Patients and medical staff";
    else if (lower.includes("general public") || lower.includes("everyone") || lower.includes("public")) newState.brief.targetAudience = "General public";
  }

  // Detect design preferences
  if (!newState.brief.designPreferences) {
    if (lower.includes("modern") || lower.includes("clean")) newState.brief.designPreferences = "Modern, clean design";
    else if (lower.includes("luxury") || lower.includes("premium")) newState.brief.designPreferences = "Premium, luxury feel";
    else if (lower.includes("minimal") || lower.includes("simple")) newState.brief.designPreferences = "Minimal, simple design";
    else if (lower.includes("creative") || lower.includes("unique")) newState.brief.designPreferences = "Creative, unique design";
    else if (lower.includes("professional") || lower.includes("corporate")) newState.brief.designPreferences = "Professional, corporate design";
  }

  // Detect integrations
  const integrationKeywords: Record<string, string[]> = {
    "Google Analytics": ["google analytics", "analytics", "tracking"],
    "Payment Gateway": ["payment gateway", "stripe", "paypal", "payment processing"],
    "Email Service": ["email service", "smtp", "mailchimp", "sendgrid"],
    "Social Media": ["social media", "facebook", "instagram", "linkedin"],
    "WhatsApp": ["whatsapp"],
    "Google Ads": ["google ads", "adwords", "ppc"],
    "CRM Integration": ["crm integration", "salesforce", "hubspot"],
    "Maps": ["google maps", "maps", "location"],
  };

  for (const [integration, keywords] of Object.entries(integrationKeywords)) {
    for (const kw of keywords) {
      if (lower.includes(kw) && !newState.brief.integrations.includes(integration)) {
        newState.brief.integrations.push(integration);
        break;
      }
    }
  }

  // Update intent
  if (newState.intent === "unknown") {
    if (newState.brief.projectType) newState.intent = "new_project";
    else if (lower.includes("host")) newState.intent = "hosting_inquiry";
    else if (lower.includes("domain")) newState.intent = "domain_inquiry";
    else if (lower.includes("support") || lower.includes("help") || lower.includes("issue")) newState.intent = "support";
    else if (lower.includes("price") || lower.includes("plan") || lower.includes("cost")) newState.intent = "service_inquiry";
  }

  // Update stage based on collected info
  const missing = getMissingInformation(newState.brief);

  // Handle post-brief stages
  if (newState.stage === "user-confirmation" || newState.stage === "create-inquiry") {
    // Already past the brief — don't regress
  } else if (missing.length === 0) {
    newState.stage = "generate-brief";
  } else if (newState.brief.projectType && newState.brief.objective) {
    newState.stage = "discover-requirements";
  } else if (newState.brief.projectType) {
    newState.stage = "understand-goal";
  }

  // Detect confirmation intent when at generate-brief stage
  if (newState.stage === "generate-brief") {
    const lower = userMessage.toLowerCase();
    const confirms = lower.includes("looks good") || lower.includes("save it") || lower.includes("correct") || lower.includes("yes") || lower.includes("confirm") || lower.includes("that's right") || lower.includes("perfect") || lower.includes("great");
    const modifies = lower.includes("change") || lower.includes("modify") || lower.includes("update") || lower.includes("wrong") || lower.includes("incorrect") || lower.includes("edit");
    const addsMore = lower.includes("add more") || lower.includes("more details") || lower.includes("also need") || lower.includes("forgot") || lower.includes("don't forget");

    if (confirms) {
      newState.stage = "create-inquiry";
    } else if (modifies) {
      // Stay at generate-brief, reset asked questions so user can revise
      newState.askedQuestions = [];
      newState.stage = "discover-requirements";
    } else if (addsMore) {
      // Stay at generate-brief, allow adding more info
      newState.askedQuestions = [];
      newState.stage = "discover-requirements";
    }
  }

  return newState;
}

// ─── Dynamic Suggestions ───────────────────────────────────────────────────

function generateDynamicSuggestions(state: ConversationState): string[] {
  const { brief, lastQuestionCategory, stage, turnCount } = state;

  // Stage: generate-brief → confirmation actions
  if (stage === "generate-brief") {
    const pools = [
      ["Looks good, save it", "I need to make changes", "Let me add more details"],
      ["That's correct, proceed", "Something needs fixing", "I have more to add"],
    ];
    return pools[turnCount % 2];
  }

  // Stage: create-inquiry → post-confirmation
  if (stage === "create-inquiry") {
    return ["Send me the details", "Start a new project", "Visit your website"];
  }

  // Use turnCount to shift suggestions within same category (prevents repetition)
  const shift = turnCount % 2 === 0 ? 0 : 1;

  // Suggestions based on what was just asked
  switch (lastQuestionCategory) {
    case "projectType": {
      if (brief.projectType) break; // already set, don't suggest
      const pools = [
        ["I need a website", "I need a web app", "I need a mobile app", "I need an online store", "I need AI/automation"],
        ["A business website", "A web application", "A mobile app", "An ecommerce store", "Something else"],
      ];
      return pools[shift];
    }
    case "objective": {
      const type = brief.projectType;
      const objectivePools: Record<string, string[][]> = {
        website: [
          ["Establish online presence", "Generate leads", "Showcase portfolio", "Share information"],
          ["Attract more customers", "Build credibility", "Drive foot traffic", "Support marketing"],
        ],
        ecommerce: [
          ["Sell products online", "Reach more customers", "Replace physical store", "Start a side business"],
          ["Launch a brand", "Expand market reach", "Automate sales", "Reduce overhead"],
        ],
        "web-application": [
          ["Streamline operations", "Replace manual process", "Serve customers better", "Create a product"],
          ["Automate workflows", "Centralize data", "Improve team efficiency", "Launch a SaaS"],
        ],
        saas: [
          ["Create a product", "Serve customers better", "Replace manual process", "Scale my business"],
          ["Launch quickly", "Validate an idea", "Automate delivery", "Reach global users"],
        ],
        "mobile-app": [
          ["Engage customers on mobile", "Provide on-the-go access", "Increase loyalty", "Complement website"],
          ["Enable offline access", "Leverage device features", "Improve retention", "Reach mobile-first users"],
        ],
        "ai-integration": [
          ["Save time on repetitive tasks", "Improve customer support", "Make smarter decisions", "Reduce costs"],
          ["Automate insights", "Personalize experiences", "Predict trends", "Enhance productivity"],
        ],
        automation: [
          ["Save time on repetitive tasks", "Reduce human error", "Scale operations", "Cut costs"],
          ["Automate reporting", "Streamline onboarding", "Speed up response times", "Eliminate busywork"],
        ],
      };
      const pool = objectivePools[type || ""] || [
        ["Grow my business", "Save time", "Improve customer experience", "Modernize existing tool"],
        ["Increase revenue", "Reduce costs", "Gain competitive edge", "Future-proof my business"],
      ];
      return pool[shift];
    }
    case "features": {
      const type = brief.projectType;
      const existing = new Set(brief.features.map((f) => f.toLowerCase()));
      const featurePools: Record<string, string[][]> = {
        website: [
          ["Contact form", "Blog", "Gallery", "Testimonials", "Live chat"],
          ["SEO", "Analytics", "Social media links", "Newsletter signup", "FAQ section"],
        ],
        ecommerce: [
          ["Product catalog", "Shopping cart", "Payment processing", "Order tracking", "Wishlist"],
          ["Reviews & ratings", "Inventory management", "Discount codes", "Shipping calculator", "Customer accounts"],
        ],
        "web-application": [
          ["User authentication", "Dashboard", "Admin panel", "Search", "File uploads"],
          ["API integration", "Real-time updates", "Role-based access", "Data export", "Notifications"],
        ],
        saas: [
          ["User authentication", "Dashboard", "Billing & subscriptions", "API", "Admin panel"],
          ["Analytics", "Integrations", "White-label", "Multi-tenant", "Audit logs"],
        ],
        "mobile-app": [
          ["Push notifications", "Offline mode", "Camera/GPS", "Social login", "In-app purchases"],
          ["Deep linking", "Biometrics", "QR scanner", "Chat", "File sharing"],
        ],
        "ai-integration": [
          ["Chatbot", "Voice assistant", "Data analysis", "Recommendations", "Automation"],
          ["Sentiment analysis", "Image recognition", "NLP", "Predictive analytics", "Smart search"],
        ],
      };
      const pools = featurePools[type || ""] || [
        ["User login", "Payment processing", "Dashboard", "Notifications", "Search"],
        ["File uploads", "Messaging", "Reporting", "Integrations", "Mobile responsive"],
      ];
      // Filter out already-mentioned, shift to rotate
      const filtered = pools[shift].filter((f) => !existing.has(f.toLowerCase()));
      // If all filtered out, try the other pool
      if (filtered.length === 0) {
        const otherPool = pools[shift === 0 ? 1 : 0].filter((f) => !existing.has(f.toLowerCase()));
        if (otherPool.length > 0) return otherPool.slice(0, 4);
        return ["I'll type my own", "That's enough features", "What do you recommend?"];
      }
      return filtered.slice(0, 4);
    }
    case "budget": {
      const type = brief.projectType;
      const budgetPools: Record<string, string[][]> = {
        "mobile-app": [
          ["Under $3,000", "$3,000 - $8,000", "$8,000 - $20,000", "Not sure yet"],
          ["Tight budget", "Flexible budget", "Let's see options first", "Depends on features"],
        ],
        "web-application": [
          ["Under $2,000", "$2,000 - $5,000", "$5,000 - $15,000", "Not sure yet"],
          ["Starting small", "Ready to invest", "Need a quote first", "Depends on scope"],
        ],
        saas: [
          ["Under $3,000", "$3,000 - $8,000", "$8,000 - $20,000", "Not sure yet"],
          ["Bootstrap budget", "Funded startup", "Enterprise level", "Need pricing tiers"],
        ],
        ecommerce: [
          ["Under $2,000", "$2,000 - $5,000", "$5,000 - $10,000", "Not sure yet"],
          ["Small store", "Large catalog", "Multi-vendor", "Depends on features"],
        ],
      };
      const pool = budgetPools[type || ""] || [
        ["Under $1,000", "$1,000 - $3,000", "$3,000 - $8,000", "Not sure yet"],
        ["Tight budget", "Moderate budget", "Flexible budget", "Let's discuss"],
      ];
      return pool[shift];
    }
    case "timeline": {
      const pools = [
        ["ASAP (rush)", "Within 2 weeks", "Within 1 month", "1-3 months"],
        ["Need it fast", "A few weeks", "A month or two", "No rush at all"],
      ];
      return pools[shift];
    }
    case "contactInfo": {
      return ["Sure, I'll share", "Let's finish first", "Skip this for now"];
    }
    case "designPreferences": {
      const pools = [
        ["Modern and clean", "Minimal and simple", "Bold and creative", "Professional"],
        ["Dark theme", "Colorful", "Elegant", "No preference"],
      ];
      return pools[shift];
    }
    case "integrations": {
      const existing = new Set(brief.integrations.map((i) => i.toLowerCase()));
      const pools = [
        ["Payment gateway", "Google Analytics", "Email service", "Social media"],
        ["WhatsApp", "CRM", "Maps", "Google Ads"],
      ];
      const filtered = pools[shift].filter((i) => !existing.has(i.toLowerCase()));
      if (filtered.length === 0) {
        const other = pools[shift === 0 ? 1 : 0].filter((i) => !existing.has(i.toLowerCase()));
        return other.length > 0 ? other.slice(0, 4) : ["No integrations needed", "I'll add later"];
      }
      return filtered.slice(0, 4);
    }
    case "hostingDomain": {
      return ["I have both", "Need hosting only", "Need domain only", "Need both", "Not sure"];
    }
    case "businessContext": {
      const pools = [
        ["Technology / SaaS", "E-commerce / Retail", "Healthcare", "Education"],
        ["Finance", "Food & Restaurant", "Real Estate", "Other"],
      ];
      return pools[shift];
    }
    case "targetAudience": {
      const pools = [
        ["Customers / Clients", "Internal team", "Students / Learners"],
        ["Patients / Users", "General public", "Business partners"],
      ];
      return pools[shift];
    }
    case "mobileApp": {
      return ["Yes, I need both", "No, web is enough", "Maybe later", "Tell me the difference"];
    }
    case "aiFeatures": {
      const pools = [
        ["Chatbot", "Voice assistant", "Smart recommendations", "Process automation"],
        ["Data analysis", "Image recognition", "Smart search", "No AI needed"],
      ];
      return pools[shift];
    }
    default:
      break;
  }

  // Fallback: generate suggestions based on what's missing
  const missing = getMissingInformation(brief);
  if (missing.includes("projectType")) {
    return ["I need a website", "I need a web app", "I need a mobile app", "I need an online store"];
  }
  if (missing.includes("features")) {
    return ["Tell me what I need", "I'm not sure yet", "Show me examples"];
  }
  if (missing.includes("budget")) {
    return ["Let's discuss later", "I have a tight budget", "Quality over price"];
  }
  if (missing.includes("timeline")) {
    return ["ASAP", "Within a month", "No rush"];
  }

  // If brief is complete, suggest project actions
  if (!missing.length || (missing.length <= 1 && missing[0] !== "projectType")) {
    return ["View project summary", "Generate first milestone", "Get a quote"];
  }

  return ["Tell me more", "What do you recommend?", "Let's get started"];
}

export function generateNextResponse(state: ConversationState): DiscoveryResponse {
  const lang = state.language in QUESTION_TEMPLATES ? state.language : "en";
  const templates = QUESTION_TEMPLATES[lang] || QUESTION_TEMPLATES.en;

  // If we have a complete brief, generate summary
  if (state.stage === "generate-brief") {
    const services = recommendServices(state.brief);
    state.brief.recommendedServices = services;
    state.brief.recommendedNextSteps = [
      "Review the project summary above",
      "Let me know if anything needs to be changed",
      "I'll save your project inquiry for our team to review",
    ];

    return {
      message: `Here's what I understand about your project. Please review and let me know if anything needs to be corrected.\n\n${generateBriefSummary(state.brief, state.language)}\n\nDoes this look correct? I can save this as a project inquiry for our team.`,
      stage: state.stage,
      brief: state.brief,
      action: "confirm",
      suggestions: generateDynamicSuggestions(state),
    };
  }

  // Get next question
  const nextQuestionField = getNextQuestion(state.brief, state.askedQuestions);

  if (nextQuestionField) {
    state.askedQuestions.push(nextQuestionField);
    state.lastQuestionCategory = nextQuestionField;
    const question = templates[nextQuestionField] || templates.projectType;

    return {
      message: question,
      stage: state.stage,
      nextQuestion: nextQuestionField,
      action: "continue",
      suggestions: generateDynamicSuggestions(state),
    };
  }

  // All questions exhausted — move to brief generation if we have core info
  if (state.brief.projectType && state.brief.objective) {
    state.stage = "generate-brief";
    const services = recommendServices(state.brief);
    state.brief.recommendedServices = services;
    state.brief.recommendedNextSteps = [
      "Review the project summary above",
      "Let me know if anything needs to be changed",
      "I'll save your project inquiry for our team to review",
    ];

    return {
      message: `Here's what I understand about your project. Please review and let me know if anything needs to be corrected.\n\n${generateBriefSummary(state.brief, state.language)}\n\nDoes this look correct? I can save this as a project inquiry for our team.`,
      stage: state.stage,
      brief: state.brief,
      action: "confirm",
      suggestions: generateDynamicSuggestions(state),
    };
  }

  // Fallback - ask about project type (only when we truly have no info)
  return {
    message: templates.projectType,
    stage: state.stage,
    nextQuestion: "projectType",
    action: "continue",
    suggestions: generateDynamicSuggestions(state),
  };
}

// ─── System Prompt Generation for AI ─────────────────────────────────────────

export function generateDiscoverySystemPrompt(state: ConversationState): string {
  const lang = state.language === "en" ? "English" : state.language === "es" ? "Spanish" : state.language === "fr" ? "French" : state.language === "ar" ? "Arabic" : state.language === "ur" ? "Urdu" : "English";

  let prompt = `You are Wall-V AI, a professional project consultant and solution architect for Wall-V, an AI-powered digital agency.

Your role is to help visitors understand what they need and guide them toward the right solution.

BEHAVIOR RULES:
- Act like a professional consultant, not a FAQ bot
- Ask ONE question at a time
- Listen carefully and adapt based on previous answers
- Never ask questions you already have answers for
- Use simple language, avoid technical jargon
- Be friendly but professional
- Confirm important details before proceeding
- Ask for the visitor's name early if not provided. Once you know it, use it naturally 1-2 times during the conversation (when making recommendations or summarizing). Don't overuse it.
- Always respond in ${lang}

WALL-V SERVICES:
- Web Development: Custom websites and web apps (React, Next.js, Node.js) — from $499
- AI & Automation: Chatbots, voice agents, workflow automation — from $1,499
- Mobile Applications: iOS and Android apps (React Native, Flutter) — from $2,999
- CRM Systems: Lead management, pipeline tracking, client communication — from $1,499
- ERP Systems: Finance, HR, inventory management — from $2,999
- Hosting: Basic ($3.99/mo), Business ($9.99/mo), Cloud ($16.99/mo), WordPress ($6.99/mo), Reseller ($29.99/mo), Email ($1.99/mo)
- Domain Registration: .com, .net, .org, .pk, .io, .dev, .app, .co — from $9.99/yr
- Digital Marketing: SEO, Google Ads, social media, analytics — from $499
- UI/UX Design: Wireframing, prototyping, design systems — from $999

CURRENT CONVERSATION STATE:
- Stage: ${state.stage}
- Detected project type: ${state.brief.projectType || "Not yet determined"}
- Features discovered: ${state.brief.features.length > 0 ? state.brief.features.join(", ") : "None yet"}
- Budget: ${state.brief.estimatedBudget || "Not discussed"}
- Timeline: ${state.brief.desiredTimeline || "Not discussed"}
- Turn count: ${state.turnCount}

${state.brief.projectType ? `The user appears to need a ${state.brief.projectType}. Ask relevant follow-up questions.` : "Help the user clarify what they want to build."}

${state.brief.features.length > 0 ? `Known features: ${state.brief.features.join(", ")}. Don't ask about these again.` : ""}

Ask the NEXT most important question based on what's missing. Don't overwhelm the user.`;

  return prompt;
}

// ─── Dynamic Service Pricing ─────────────────────────────────────────────────

/**
 * Load current service prices from the database and return a lookup map.
 * Falls back to hardcoded WALLV_SERVICES values if database is unavailable.
 */
export async function getDynamicServices(): Promise<typeof WALLV_SERVICES> {
  try {
    const { connectToDatabase } = await import("@/lib/mongodb");
    const { default: ServicePrice } = await import("@/models/service-price");

    await connectToDatabase();
    const dbPrices = await ServicePrice.find({ active: true }).lean();

    if (dbPrices.length === 0) return WALLV_SERVICES;

    const services = { ...WALLV_SERVICES };

    for (const dp of dbPrices) {
      const key = dp.serviceKey.replace(/-/g, "");
      const matchKey = Object.keys(services).find(
        (k) => k.toLowerCase().replace(/[^a-z]/g, "") === key || k.toLowerCase().includes(key.slice(0, 5))
      );

      if (matchKey && services[matchKey as keyof typeof services]) {
        const svc = { ...services[matchKey as keyof typeof services] };
        if ("startingPrice" in svc) {
          (svc as { startingPrice: number }).startingPrice = dp.basePrice;
        }
        if (dp.tiers && "plans" in svc) {
          (svc as { plans: { name: string; price: number; period: string; features: string[] }[] }).plans = dp.tiers.map((t: { name: string; price: number; period?: string; features: string[] }) => ({
            name: t.name,
            price: t.price,
            period: "mo",
            features: t.features,
          }));
        }
        (services as Record<string, unknown>)[matchKey] = svc;
      }
    }

    return services;
  } catch {
    return WALLV_SERVICES;
  }
}

/**
 * Build a compact price string for the AI system prompt from database prices.
 */
export async function getAgentPriceSummary(): Promise<string> {
  try {
    const { connectToDatabase } = await import("@/lib/mongodb");
    const { default: ServicePrice } = await import("@/models/service-price");

    await connectToDatabase();
    const prices = await ServicePrice.find({ active: true, agentVisible: true })
      .sort({ displayOrder: 1 })
      .lean();

    if (prices.length === 0) {
      return Object.entries(WALLV_SERVICES)
        .map(([key, svc]) => {
          if ("plans" in svc) {
            const plans = (svc as { plans: { name: string; price: number }[] }).plans;
            return `- ${svc.name}: ${plans.map((p) => `${p.name} $${p.price}`).join(", ")}`;
          }
          const sp = "startingPrice" in svc ? (svc as { startingPrice: number }).startingPrice : 0;
          return `- ${svc.name}: from $${sp}`;
        })
        .join("\n");
    }

    return prices
      .map((p) => {
        let priceStr = "";
        if (p.type === "tiered" && p.tiers?.length) {
          priceStr = p.tiers.map((t: { name: string; price: number }) => `${t.name} $${t.price}`).join(", ");
        } else if (p.type === "hourly" && p.hourlyRate) {
          priceStr = `$${p.hourlyRate}/hr`;
        } else {
          priceStr = `from $${p.basePrice}`;
        }
        return `- ${p.name}: ${priceStr}`;
      })
      .join("\n");
  } catch {
    return "";
  }
}
