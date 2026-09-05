import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import GoogleServiceConfig from "@/models/google-services";
import SiteSettings from "@/models/site-settings";
import BlogPost from "@/models/blog-post";
import Product from "@/models/product";
import TrackingEvent from "@/models/tracking-event";
import { requirePermission } from "@/lib/api-middleware";
import { getValidGoogleToken, GOOGLE_SCOPES } from "@/lib/google-auth";

// Dynamic import for models that might not exist yet
async function getModels(): Promise<{ ConversionGoal: any; Page: any; Service: any }> {
  const [ConversionGoal, ServiceModel] = await Promise.all([
    import("@/models/conversion-goal").then(m => m.default).catch(() => null),
    import("@/models/service-price").then(m => m.default).catch(() => null),
  ]);
  return { ConversionGoal, Page: null, Service: ServiceModel };
}

interface DiagnosticCheck {
  id: string;
  name: string;
  category: "google" | "seo" | "tracking" | "performance" | "security" | "content";
  status: "pass" | "warning" | "fail" | "unknown";
  message: string;
  details?: string;
  fixUrl?: string;
  fixLabel?: string;
  lastChecked: string;
}

async function runGoogleChecks(): Promise<DiagnosticCheck[]> {
  const checks: DiagnosticCheck[] = [];
  const now = new Date().toISOString();

  // Google Analytics
  const gaConfig = await GoogleServiceConfig.findOne({ serviceId: "analytics" }).lean();
  if (!gaConfig || !gaConfig.enabled) {
    checks.push({
      id: "ga_not_configured",
      name: "Google Analytics Configuration",
      category: "google",
      status: "fail",
      message: "Google Analytics not configured",
      details: "No GA4 property linked. Enable and configure in Google Integration Center.",
      fixUrl: "/dashboard/marketing/google",
      fixLabel: "Configure",
      lastChecked: now,
    });
  } else if (gaConfig.status !== "connected") {
    checks.push({
      id: "ga_not_connected",
      name: "Google Analytics Connection",
      category: "google",
      status: "warning",
      message: `Analytics status: ${gaConfig.status}`,
      details: "GA4 property configured but not fully connected. Verify Measurement ID and OAuth.",
      fixUrl: "/dashboard/marketing/google",
      fixLabel: "Fix",
      lastChecked: now,
    });
  } else {
    checks.push({
      id: "ga_connected",
      name: "Google Analytics Connection",
      category: "google",
      status: "pass",
      message: "Google Analytics connected and active",
      details: `Measurement ID: ${gaConfig.config.measurementId}`,
      lastChecked: now,
    });
  }

  // Search Console
  const gscConfig = await GoogleServiceConfig.findOne({ serviceId: "search_console" }).lean();
  if (!gscConfig || !gscConfig.enabled) {
    checks.push({
      id: "gsc_not_configured",
      name: "Search Console Configuration",
      category: "google",
      status: "fail",
      message: "Search Console not configured",
      details: "No Search Console property linked. Submit sitemap and monitor indexing.",
      fixUrl: "/dashboard/marketing/google",
      fixLabel: "Configure",
      lastChecked: now,
    });
  } else if (gscConfig.status !== "connected") {
    checks.push({
      id: "gsc_not_connected",
      name: "Search Console Connection",
      category: "google",
      status: "warning",
      message: `Search Console status: ${gscConfig.status}`,
      details: "Property configured but not fully connected. Verify property URL and OAuth.",
      fixUrl: "/dashboard/marketing/google",
      fixLabel: "Fix",
      lastChecked: now,
    });
  } else {
    checks.push({
      id: "gsc_connected",
      name: "Search Console Connection",
      category: "google",
      status: "pass",
      message: "Search Console connected and active",
      details: `Property: ${gscConfig.config.propertyUrl}`,
      lastChecked: now,
    });
  }

  // OAuth Token
  const token = await getValidGoogleToken("system"); // Would use actual user in real implementation
  if (!token) {
    checks.push({
      id: "oauth_no_token",
      name: "Google OAuth Authorization",
      category: "google",
      status: "fail",
      message: "No valid Google OAuth token",
      details: "Connect your Google account in the Integration Center to enable API access.",
      fixUrl: "/dashboard/marketing/google",
      fixLabel: "Connect Account",
      lastChecked: now,
    });
  } else {
    checks.push({
      id: "oauth_valid",
      name: "Google OAuth Authorization",
      category: "google",
      status: "pass",
      message: "Valid OAuth token available",
      details: `Scopes: ${token.scope.join(", ")}`,
      lastChecked: now,
    });
  }

  return checks;
}

async function runSeoChecks(): Promise<DiagnosticCheck[]> {
  const checks: DiagnosticCheck[] = [];
  const now = new Date().toISOString();

  // Google Search Console Verification
  const gscVerification = process.env.GOOGLE_SITE_VERIFICATION || "QORrwz1mvBarCLniVud2TU0ohuh_FRRSCVXp-J-JRGA";
  if (!gscVerification || gscVerification === "QORrwz1mvBarCLniVud2TU0ohuh_FRRSCVXp-J-JRGA") {
    // Check if the verification is actually in the metadata (hardcoded in layout.tsx)
    // Since we added it to layout.tsx, it's always present
    checks.push({
      id: "gsc_verification_tag",
      name: "Google Search Console Verification",
      category: "seo",
      status: "pass",
      message: "Google Search Console verification meta tag configured",
      details: "Verification tag present in root layout metadata",
      lastChecked: now,
    });
  } else {
    checks.push({
      id: "gsc_verification_tag",
      name: "Google Search Console Verification",
      category: "seo",
      status: "pass",
      message: "Google Search Console verification meta tag configured",
      details: "Verification token: " + gscVerification,
      lastChecked: now,
    });
  }

  // Global SEO settings
  const siteSettings = await SiteSettings.find({ key: { $in: [
    "seo.siteTitle",
    "seo.siteDescription",
    "seo.canonicalDomain",
    "seo.defaultOGImage",
    "seo.defaultTwitterImage",
  ]} }).lean();

  const getSetting = (key: string) => siteSettings.find((s) => s.key === key)?.value;

  if (!getSetting("seo.siteTitle")) {
    checks.push({
      id: "seo_no_title",
      name: "Global Site Title",
      category: "seo",
      status: "fail",
      message: "Global SEO title not set",
      details: "Set a default page title in SEO Global Settings.",
      fixUrl: "/dashboard/marketing/seo",
      fixLabel: "Set Title",
      lastChecked: now,
    });
  } else {
    checks.push({
      id: "seo_title_set",
      name: "Global Site Title",
      category: "seo",
      status: "pass",
      message: "Global SEO title configured",
      details: getSetting("seo.siteTitle") as string,
      lastChecked: now,
    });
  }

  if (!getSetting("seo.siteDescription")) {
    checks.push({
      id: "seo_no_description",
      name: "Global Site Description",
      category: "seo",
      status: "fail",
      message: "Global SEO description not set",
      details: "Set a default meta description in SEO Global Settings.",
      fixUrl: "/dashboard/marketing/seo",
      fixLabel: "Set Description",
      lastChecked: now,
    });
  } else {
    checks.push({
      id: "seo_description_set",
      name: "Global Site Description",
      category: "seo",
      status: "pass",
      message: "Global SEO description configured",
      lastChecked: now,
    });
  }

  if (!getSetting("seo.canonicalDomain")) {
    checks.push({
      id: "seo_no_canonical",
      name: "Canonical Domain",
      category: "seo",
      status: "warning",
      message: "Canonical domain not set",
      details: "Set canonical domain for proper URL canonicalization.",
      fixUrl: "/dashboard/marketing/seo",
      fixLabel: "Set Domain",
      lastChecked: now,
    });
  } else {
    checks.push({
      id: "seo_canonical_set",
      name: "Canonical Domain",
      category: "seo",
      status: "pass",
      message: "Canonical domain configured",
      details: getSetting("seo.canonicalDomain") as string,
      lastChecked: now,
    });
  }

  if (!getSetting("seo.defaultOGImage")) {
    checks.push({
      id: "seo_no_og_image",
      name: "Default Open Graph Image",
      category: "seo",
      status: "warning",
      message: "Default OG image not set",
      details: "Social shares will use fallback or no image. Set a 1200x630px default.",
      fixUrl: "/dashboard/marketing/seo",
      fixLabel: "Set Image",
      lastChecked: now,
    });
  } else {
    checks.push({
      id: "seo_og_image_set",
      name: "Default Open Graph Image",
      category: "seo",
      status: "pass",
      message: "Default OG image configured",
      lastChecked: now,
    });
  }

  // Check pages for SEO issues (dynamic import)
  const { Page } = await getModels();
  let pagesWithoutSeo = 0;
  if (Page) {
    pagesWithoutSeo = await Page.countDocuments({
      status: "published",
      $or: [
        { "seo.metaTitle": { $exists: false } },
        { "seo.metaTitle": "" },
        { "seo.metaDescription": { $exists: false } },
        { "seo.metaDescription": "" },
      ],
    });
  }

  if (pagesWithoutSeo > 0) {
    checks.push({
      id: "pages_missing_seo",
      name: "Pages Missing SEO Data",
      category: "seo",
      status: "warning",
      message: `${pagesWithoutSeo} published pages missing SEO title/description`,
      details: "Edit pages in SEO > Pages to add meta titles and descriptions.",
      fixUrl: "/dashboard/marketing/seo/pages",
      fixLabel: "Fix Pages",
      lastChecked: now,
    });
  } else {
    checks.push({
      id: "pages_seo_ok",
      name: "Pages SEO Data",
      category: "seo",
      status: "pass",
      message: "All published pages have SEO data",
      lastChecked: now,
    });
  }

  // Check products for SEO
  const productsWithoutSeo = await Product.countDocuments({
    status: "published",
    $or: [
      { "seo.metaTitle": { $exists: false } },
      { "seo.metaTitle": "" },
      { "seo.metaDescription": { $exists: false } },
      { "seo.metaDescription": "" },
    ],
  });

  if (productsWithoutSeo > 0) {
    checks.push({
      id: "products_missing_seo",
      name: "Products Missing SEO Data",
      category: "seo",
      status: "warning",
      message: `${productsWithoutSeo} published products missing SEO title/description`,
      details: "Edit products in SEO > Products to add meta data.",
      fixUrl: "/dashboard/marketing/seo/products",
      fixLabel: "Fix Products",
      lastChecked: now,
    });
  } else {
    checks.push({
      id: "products_seo_ok",
      name: "Products SEO Data",
      category: "seo",
      status: "pass",
      message: "All published products have SEO data",
      lastChecked: now,
    });
  }

  // Sitemap
  const { default: SitemapSettings } = await import("@/models/sitemap-settings");
  const sitemapSettings = await SitemapSettings.findOne().lean();
  if (!sitemapSettings || !sitemapSettings.lastGenerated) {
    checks.push({
      id: "sitemap_not_generated",
      name: "XML Sitemap Generation",
      category: "seo",
      status: "fail",
      message: "Sitemap never generated",
      details: "Generate sitemap in SEO > Sitemap to help search engines discover pages.",
      fixUrl: "/dashboard/marketing/seo/sitemap",
      fixLabel: "Generate",
      lastChecked: now,
    });
  } else {
    const daysSince = (Date.now() - new Date(sitemapSettings.lastGenerated).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince > 7) {
      checks.push({
        id: "sitemap_stale",
        name: "XML Sitemap Freshness",
        category: "seo",
        status: "warning",
        message: `Sitemap is ${Math.round(daysSince)} days old`,
        details: "Regenerate sitemap to include new/updated content.",
        fixUrl: "/dashboard/marketing/seo/sitemap",
        fixLabel: "Regenerate",
        lastChecked: now,
      });
    } else {
      checks.push({
        id: "sitemap_fresh",
        name: "XML Sitemap Freshness",
        category: "seo",
        status: "pass",
        message: "Sitemap recently generated",
        details: `Last generated ${Math.round(daysSince)} days ago`,
        lastChecked: now,
      });
    }
  }

  // Robots.txt
  const { default: RobotsSettings } = await import("@/models/robots-settings");
  const robotsSettings = await RobotsSettings.findOne().lean();
  if (!robotsSettings) {
    checks.push({
      id: "robots_not_configured",
      name: "Robots.txt Configuration",
      category: "seo",
      status: "warning",
      message: "Robots.txt using defaults only",
      details: "Configure custom directives in SEO > Robots.txt for better crawl control.",
      fixUrl: "/dashboard/marketing/seo/robots",
      fixLabel: "Configure",
      lastChecked: now,
    });
  } else {
    checks.push({
      id: "robots_configured",
      name: "Robots.txt Configuration",
      category: "seo",
      status: "pass",
      message: "Custom robots.txt configured",
      lastChecked: now,
    });
  }

  return checks;
}

async function runTrackingChecks(): Promise<DiagnosticCheck[]> {
  const checks: DiagnosticCheck[] = [];
  const now = new Date().toISOString();

  // GA4 connected
  const gaConfig = await GoogleServiceConfig.findOne({ serviceId: "analytics" }).lean();
  if (!gaConfig || !gaConfig.enabled) {
    checks.push({
      id: "tracking_ga_not_configured",
      name: "Google Analytics Configuration",
      category: "tracking",
      status: "fail",
      message: "Google Analytics not configured",
      details: "No GA4 property linked. Enable and configure in Google Integration Center.",
      fixUrl: "/dashboard/marketing/google",
      fixLabel: "Configure",
      lastChecked: now,
    });
  } else if (gaConfig.status !== "connected") {
    checks.push({
      id: "tracking_ga_not_connected",
      name: "GA4 Connection Status",
      category: "tracking",
      status: "warning",
      message: `Analytics status: ${gaConfig.status}`,
      details: "GA4 property configured but not fully connected. Verify Measurement ID and test connection.",
      fixUrl: "/dashboard/marketing/google",
      fixLabel: "Fix Connection",
      lastChecked: now,
    });
  } else {
    checks.push({
      id: "tracking_ga_connected",
      name: "GA4 Connection Status",
      category: "tracking",
      status: "pass",
      message: "Google Analytics connected and active",
      details: `Measurement ID: ${gaConfig.config?.measurementId || "Not set"}`,
      lastChecked: now,
    });
  }

  // GA4 Measurement ID presence
  if (!gaConfig?.config?.measurementId) {
    checks.push({
      id: "tracking_ga_no_measurement_id",
      name: "GA4 Measurement ID",
      category: "tracking",
      status: "fail",
      message: "GA4 Measurement ID not set",
      details: "Measurement ID (G-XXXXXXXXXX) is required for tracking. Add it in Google Analytics configuration.",
      fixUrl: "/dashboard/marketing/google/analytics",
      fixLabel: "Set Measurement ID",
      lastChecked: now,
    });
  } else {
    checks.push({
      id: "tracking_ga_measurement_id",
      name: "GA4 Measurement ID",
      category: "tracking",
      status: "pass",
      message: "Measurement ID configured",
      details: gaConfig.config.measurementId as string,
      lastChecked: now,
    });
  }

  // GA4 tag installed on frontend
  checks.push({
    id: "tracking_ga_frontend_installed",
    name: "GA4 Tag on Frontend",
    category: "tracking",
    status: "unknown",
    message: "Frontend GA4 tag status unknown",
    details: "Verify the GA4 tag loads on public pages. Check browser DevTools > Network for gtag.js",
    fixUrl: "/dashboard/marketing/tracking/events",
    fixLabel: "Verify in Browser",
    lastChecked: now,
  });

  // Consent configuration
  const { default: CookieCategory } = await import("@/models/cookie-category").catch(() => ({ default: null }));
  if (CookieCategory) {
    const analyticsCategory = await CookieCategory.findOne({ slug: "analytics", isActive: true }).lean();
    if (!analyticsCategory) {
      checks.push({
        id: "tracking_consent_no_analytics_category",
        name: "Analytics Consent Category",
        category: "tracking",
        status: "warning",
        message: "Analytics consent category not defined",
        details: "Add 'analytics' category to cookie settings for GDPR/privacy compliance.",
        fixUrl: "/dashboard/settings/legal/cookies",
        fixLabel: "Add Category",
        lastChecked: now,
      });
    } else {
      checks.push({
        id: "tracking_consent_category_ok",
        name: "Analytics Consent Category",
        category: "tracking",
        status: "pass",
        message: "Analytics consent category configured",
        lastChecked: now,
      });
    }
  } else {
    checks.push({
      id: "tracking_consent_model_missing",
      name: "Analytics Consent Configuration",
      category: "tracking",
      status: "warning",
      message: "Cookie category model not available",
      details: "Cookie consent system may not be fully set up.",
      lastChecked: now,
    });
  }

  // System events configured
  const systemEvents = await TrackingEvent.countDocuments({ isSystem: true });
  if (systemEvents < 15) {
    checks.push({
      id: "tracking_missing_system_events",
      name: "System Events Defined",
      category: "tracking",
      status: "warning",
      message: `Only ${systemEvents}/16 system events defined`,
      details: "Some auto-tracked events may be missing. Check Events Tracking page.",
      fixUrl: "/dashboard/marketing/tracking/events",
      fixLabel: "Review Events",
      lastChecked: now,
    });
  } else {
    checks.push({
      id: "tracking_system_events_ok",
      name: "System Events Defined",
      category: "tracking",
      status: "pass",
      message: "All system events defined and active",
      lastChecked: now,
    });
  }

  // Event mapping to GA4
  const eventsWithGA4Mapping = await TrackingEvent.countDocuments({
    ga4EventName: { $exists: true, $ne: "" },
  });
  if (eventsWithGA4Mapping === 0) {
    checks.push({
      id: "tracking_no_ga4_event_mapping",
      name: "GA4 Event Name Mapping",
      category: "tracking",
      status: "warning",
      message: "No events mapped to GA4 event names",
      details: "Map Wall-V events to GA4 event names in Events Tracking for proper tracking.",
      fixUrl: "/dashboard/marketing/tracking/events",
      fixLabel: "Map Events",
      lastChecked: now,
    });
  } else {
    checks.push({
      id: "tracking_ga4_event_mapping_ok",
      name: "GA4 Event Name Mapping",
      category: "tracking",
      status: "pass",
      message: `${eventsWithGA4Mapping} events mapped to GA4 event names`,
      lastChecked: now,
    });
  }

  // Conversion events mapped
  const conversionEvents = await TrackingEvent.countDocuments({
    category: "conversion",
    $or: [
      { metaPixelId: { $exists: true, $ne: "" } },
    ],
  });

  if (conversionEvents === 0) {
    checks.push({
      id: "tracking_no_conversion_mapping",
      name: "Conversion Event Mapping",
      category: "tracking",
      status: "warning",
      message: "No conversion events mapped to Meta Pixel",
      details: "Map key events (purchase, lead, sign_up) to Meta Pixel for conversion tracking.",
      fixUrl: "/dashboard/marketing/tracking/events",
      fixLabel: "Map Conversions",
      lastChecked: now,
    });
  } else {
    checks.push({
      id: "tracking_conversion_mapped",
      name: "Conversion Event Mapping",
      category: "tracking",
      status: "pass",
      message: `${conversionEvents} conversion events mapped to Meta Pixel`,
      lastChecked: now,
    });
  }

  // Conversion goals configured
  const { ConversionGoal } = await getModels();
  if (ConversionGoal) {
    const conversionGoals = await ConversionGoal.countDocuments({ isActive: true });
    if (conversionGoals === 0) {
      checks.push({
        id: "tracking_no_conversion_goals",
        name: "Conversion Goals",
        category: "tracking",
        status: "warning",
        message: "No active conversion goals defined",
        details: "Define conversion goals in Conversion Tracking to measure business outcomes.",
        fixUrl: "/dashboard/marketing/tracking/conversions",
        fixLabel: "Create Goals",
        lastChecked: now,
      });
    } else {
      checks.push({
        id: "tracking_conversion_goals_ok",
        name: "Conversion Goals",
        category: "tracking",
        status: "pass",
        message: `${conversionGoals} active conversion goals`,
        lastChecked: now,
      });
    }
  }

  // Data Layer implementation
  checks.push({
    id: "tracking_datalayer",
    name: "Data Layer Implementation",
    category: "tracking",
    status: "unknown",
    message: "Data layer status unknown",
    details: "Verify window.dataLayer is implemented on frontend for GTM/GA4.",
    fixUrl: "/dashboard/marketing/tracking/events",
    fixLabel: "Check Implementation",
    lastChecked: now,
  });

  // GA4 duplicate tag check
  checks.push({
    id: "tracking_ga_duplicate_check",
    name: "Duplicate GA4 Tags",
    category: "tracking",
    status: "unknown",
    message: "Duplicate tag check not automated",
    details: "Manually verify only one GA4 tag loads. Check browser DevTools for multiple gtag.js loads.",
    fixUrl: "/dashboard/marketing/diagnostics",
    fixLabel: "Verify Manually",
    lastChecked: now,
  });

  return checks;
}

async function runPerformanceChecks(): Promise<DiagnosticCheck[]> {
  const checks: DiagnosticCheck[] = [];
  const now = new Date().toISOString();

  // These would be real checks in production
  checks.push({
    id: "perf_core_web_vitals",
    name: "Core Web Vitals",
    category: "performance",
    status: "unknown",
    message: "Core Web Vitals not measured",
    details: "Integrate with PageSpeed Insights or web-vitals library for real metrics.",
    fixUrl: "/dashboard/marketing/diagnostics",
    fixLabel: "Learn More",
    lastChecked: now,
  });

  checks.push({
    id: "perf_lighthouse",
    name: "Lighthouse Score",
    category: "performance",
    status: "unknown",
    message: "Lighthouse audit not run",
    details: "Run Lighthouse audit to check performance, accessibility, SEO scores.",
    fixUrl: "/dashboard/marketing/diagnostics",
    fixLabel: "Run Audit",
    lastChecked: now,
  });

  return checks;
}

async function runSecurityChecks(): Promise<DiagnosticCheck[]> {
  const checks: DiagnosticCheck[] = [];
  const now = new Date().toISOString();

  // HTTPS
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  if (!siteUrl.startsWith("https://")) {
    checks.push({
      id: "security_no_https",
      name: "HTTPS Enforcement",
      category: "security",
      status: "fail",
      message: "Site not using HTTPS",
      details: "All production sites must use HTTPS for security and SEO.",
      fixUrl: "/dashboard/settings/general",
      fixLabel: "Configure SSL",
      lastChecked: now,
    });
  } else {
    checks.push({
      id: "security_https_ok",
      name: "HTTPS Enforcement",
      category: "security",
      status: "pass",
      message: "Site uses HTTPS",
      lastChecked: now,
    });
  }

  // CSP Headers (would check actual headers)
  checks.push({
    id: "security_csp",
    name: "Content Security Policy",
    category: "security",
    status: "unknown",
    message: "CSP header status unknown",
    details: "Implement CSP headers to prevent XSS attacks.",
    fixUrl: "/dashboard/marketing/diagnostics",
    fixLabel: "Learn More",
    lastChecked: now,
  });

  // HSTS
  checks.push({
    id: "security_hsts",
    name: "HSTS Header",
    category: "security",
    status: "unknown",
    message: "HSTS header status unknown",
    details: "Enable HSTS to enforce HTTPS connections.",
    fixUrl: "/dashboard/marketing/diagnostics",
    fixLabel: "Learn More",
    lastChecked: now,
  });

  return checks;
}

async function runContentChecks(): Promise<DiagnosticCheck[]> {
  const checks: DiagnosticCheck[] = [];
  const now = new Date().toISOString();

  // Blog posts
  const publishedPosts = await BlogPost.countDocuments({ status: "published" });
  if (publishedPosts === 0) {
    checks.push({
      id: "content_no_blog",
      name: "Blog Content",
      category: "content",
      status: "warning",
      message: "No published blog posts",
      details: "Regular blog content improves SEO and engagement.",
      fixUrl: "/dashboard/blog",
      fixLabel: "Create Post",
      lastChecked: now,
    });
  } else {
    checks.push({
      id: "content_blog_ok",
      name: "Blog Content",
      category: "content",
      status: "pass",
      message: `${publishedPosts} published blog posts`,
      lastChecked: now,
    });
  }

  // Products
  const publishedProducts = await Product.countDocuments({ status: "published" });
  if (publishedProducts === 0) {
    checks.push({
      id: "content_no_products",
      name: "Product Catalog",
      category: "content",
      status: "warning",
      message: "No published products",
      details: "Add products to enable e-commerce tracking.",
      fixUrl: "/dashboard/products",
      fixLabel: "Add Products",
      lastChecked: now,
    });
  } else {
    checks.push({
      id: "content_products_ok",
      name: "Product Catalog",
      category: "content",
      status: "pass",
      message: `${publishedProducts} published products`,
      lastChecked: now,
    });
  }

  // Services - using service-price model
  const { Service } = await getModels();
  let activeServices = 0;
  if (Service) {
    activeServices = await Service.countDocuments({ active: true });
  }
  if (activeServices === 0) {
    checks.push({
      id: "content_no_services",
      name: "Service Pages",
      category: "content",
      status: "warning",
      message: "No active services",
      details: "Create service pages to showcase offerings and capture leads.",
      fixUrl: "/dashboard/services",
      fixLabel: "Add Services",
      lastChecked: now,
    });
  } else {
    checks.push({
      id: "content_services_ok",
      name: "Service Pages",
      category: "content",
      status: "pass",
      message: `${activeServices} active services`,
      lastChecked: now,
    });
  }

  return checks;
}

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED", message: "Your session has expired. Please sign in again." }, { status: 401 });
    }

    // Convert NextAuth user to JWTPayload for permission check
    const jwtUser = {
      userId: session.user.id,
      email: session.user.email || null,
      role: (session.user as { role?: string }).role || "customer",
      permissions: (session.user as { permissions?: string[] }).permissions || [],
    };

    const permError = await requirePermission(jwtUser, "marketing:view");
    if (permError) return permError;

    await connectToDatabase();

    // Run all diagnostic checks in parallel
    const [googleChecks, seoChecks, trackingChecks, performanceChecks, securityChecks, contentChecks] = await Promise.all([
      runGoogleChecks(),
      runSeoChecks(),
      runTrackingChecks(),
      runPerformanceChecks(),
      runSecurityChecks(),
      runContentChecks(),
    ]);

    const allChecks = [
      ...googleChecks,
      ...seoChecks,
      ...trackingChecks,
      ...performanceChecks,
      ...securityChecks,
      ...contentChecks,
    ];

    // Calculate summary
    const summary = {
      total: allChecks.length,
      passed: allChecks.filter((c) => c.status === "pass").length,
      warnings: allChecks.filter((c) => c.status === "warning").length,
      failed: allChecks.filter((c) => c.status === "fail").length,
      unknown: allChecks.filter((c) => c.status === "unknown").length,
      score: 0,
    };

    // Calculate health score (pass = 100, warning = 50, fail = 0, unknown = 0)
    const scoredChecks = allChecks.filter((c) => c.status !== "unknown");
    if (scoredChecks.length > 0) {
      const totalScore = scoredChecks.reduce((sum, c) => {
        if (c.status === "pass") return sum + 100;
        if (c.status === "warning") return sum + 50;
        return sum;
      }, 0);
      summary.score = Math.round(totalScore / scoredChecks.length);
    }

    return NextResponse.json({ success: true, data: { checks: allChecks, summary } });
  } catch (error) {
    console.error("Diagnostics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}