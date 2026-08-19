import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import GoogleServiceConfig from "@/models/google-services";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/api-middleware";

const DEFAULT_SERVICES = [
  {
    serviceId: "analytics",
    name: "Google Analytics",
    icon: "GA4",
    description: "Track website traffic, user behavior, and conversions",
    configUrl: "/dashboard/marketing/google/analytics",
    defaultConfig: {
      measurementId: "",
      propertyId: "",
      dataStreamId: "",
      debugMode: false,
      consentMode: "default",
    },
  },
  {
    serviceId: "search_console",
    name: "Search Console",
    icon: "GSC",
    description: "Monitor search performance, indexing, and sitemaps",
    configUrl: "/dashboard/marketing/google/search-console",
    defaultConfig: {
      propertyUrl: "",
      verificationMethod: "html_tag",
    },
  },
  {
    serviceId: "business_profile",
    name: "Google Business Profile",
    icon: "GBP",
    description: "Manage business listings, reviews, and local presence",
    configUrl: "/dashboard/marketing/google/business-profile",
    defaultConfig: {
      accountId: "",
      locationIds: [],
    },
  },
  {
    serviceId: "merchant_center",
    name: "Google Merchant Center",
    icon: "GMC",
    description: "Sync products for Google Shopping and free listings",
    configUrl: "/dashboard/marketing/google/merchant-center",
    defaultConfig: {
      merchantId: "",
      dataSourceId: "",
      autoSync: false,
    },
  },
  {
    serviceId: "ads",
    name: "Google Ads",
    icon: "ADS",
    description: "Configure conversion tracking and campaign readiness",
    configUrl: "/dashboard/marketing/google/ads",
    defaultConfig: {
      customerId: "",
      conversionIds: [],
      developerToken: "",
    },
  },
];

async function ensureDefaultServices() {
  await connectToDatabase();
  for (const svc of DEFAULT_SERVICES) {
    await GoogleServiceConfig.findOneAndUpdate(
      { serviceId: svc.serviceId },
      {
        $setOnInsert: {
          serviceId: svc.serviceId,
          name: svc.name,
          enabled: false,
          config: svc.defaultConfig,
          status: "not_configured",
        },
      },
      { upsert: true, new: true }
    );
  }
}

export async function GET() {
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

    const permError = await requirePermission(jwtUser, "google:analytics:view");
    if (permError) return permError;

    await ensureDefaultServices();
    const services = await GoogleServiceConfig.find().lean();

    // Merge with default config for UI
    const mergedServices = DEFAULT_SERVICES.map((defaultSvc) => {
      const stored = services.find((s) => s.serviceId === defaultSvc.serviceId);
      return {
        ...defaultSvc,
        ...stored,
        config: { ...defaultSvc.defaultConfig, ...(stored?.config || {}) },
        status: stored?.status || "not_configured",
        lastTested: stored?.lastTested,
        lastSynced: stored?.lastSynced,
        lastError: stored?.lastError,
        details: stored?.details,
      };
    });

    return NextResponse.json({ success: true, data: mergedServices });
  } catch (error) {
    console.error("Google services GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}