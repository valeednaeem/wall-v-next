import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import GoogleServiceConfig from "@/models/google-services";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/api-middleware";
import { getValidGoogleToken } from "@/lib/google-auth";

interface TestResult {
  success: boolean;
  status: string;
  message: string;
  details?: Record<string, string>;
  error?: string;
}

async function testAnalytics(config: Record<string, unknown>, _userId?: string): Promise<TestResult> {
  const measurementId = config.measurementId as string;
  const apiSecret = config.apiSecret as string;

  if (!measurementId) {
    return { success: false, status: "config_required", message: "Measurement ID is required" };
  }

  try {
    // Test GA4 Measurement Protocol
    const testUrl = `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret || "test"}`;
    const response = await fetch(testUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: "test_connection",
        events: [{ name: "test_connection", params: { test: true } }],
      }),
    });

    if (response.ok) {
      return {
        success: true,
        status: "connected",
        message: "Google Analytics connected successfully",
        details: { measurementId },
      };
    } else {
      const errorText = await response.text();
      return {
        success: false,
        status: "connection_failed",
        message: `GA4 API error: ${response.status}`,
        error: errorText,
      };
    }
  } catch (error) {
    return {
      success: false,
      status: "connection_failed",
      message: "Failed to connect to Google Analytics",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function testSearchConsole(config: Record<string, unknown>, userId?: string): Promise<TestResult> {
  const propertyUrl = config.propertyUrl as string;

  if (!propertyUrl) {
    return { success: false, status: "config_required", message: "Property URL is required" };
  }

  if (!userId) {
    return { success: false, status: "auth_required", message: "User ID required for authentication" };
  }

  const tokenData = await getValidGoogleToken(userId);
  if (!tokenData) {
    return {
      success: false,
      status: "auth_required",
      message: "Search Console requires OAuth authorization. Connect your Google account first.",
      details: { propertyUrl },
    };
  }

  try {
    const encodedSiteUrl = encodeURIComponent(propertyUrl);
    const response = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodedSiteUrl}/sitemapSubmissionRate`,
      {
        headers: { Authorization: `Bearer ${tokenData.accessToken}` },
      }
    );

    if (response.ok) {
      return {
        success: true,
        status: "connected",
        message: "Search Console connected successfully",
        details: { propertyUrl },
      };
    } else {
      const errorData = await response.json().catch(() => null);
      return {
        success: false,
        status: "connection_failed",
        message: errorData?.error?.message || `API returned ${response.status}`,
        details: { propertyUrl },
      };
    }
  } catch (error) {
    return {
      success: false,
      status: "connection_failed",
      message: "Failed to test Search Console connection",
      error: error instanceof Error ? error.message : "Unknown error",
      details: { propertyUrl },
    };
  }
}

async function testBusinessProfile(config: Record<string, unknown>, userId?: string): Promise<TestResult> {
  const accountId = config.accountId as string;

  if (!accountId) {
    return { success: false, status: "config_required", message: "Business Profile account ID is required" };
  }

  if (!userId) {
    return { success: false, status: "auth_required", message: "User ID required for authentication" };
  }

  const tokenData = await getValidGoogleToken(userId);
  if (!tokenData) {
    return {
      success: false,
      status: "auth_required",
      message: "Google Business Profile requires OAuth authorization. Connect your Google account first.",
      details: { accountId },
    };
  }

  try {
    // List business accounts to verify access
    const response = await fetch(
      `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${accountId}`,
      {
        headers: { Authorization: `Bearer ${tokenData.accessToken}` },
      }
    );

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        status: "connected",
        message: "Google Business Profile connected successfully",
        details: {
          accountId,
          accountName: data.accountName || data.title || "Connected",
        },
      };
    } else {
      // Try alternative API endpoint
      const altResponse = await fetch(
        `https://mybusinessaccountmanagement.googleapis.com/v1/accounts/${accountId}`,
        {
          headers: { Authorization: `Bearer ${tokenData.accessToken}` },
        }
      );

      if (altResponse.ok) {
        const data = await altResponse.json();
        return {
          success: true,
          status: "connected",
          message: "Google Business Profile connected successfully",
          details: {
            accountId,
            accountName: data.accountName || data.title || "Connected",
          },
        };
      }

      const errorData = await response.json().catch(() => null);
      return {
        success: false,
        status: "connection_failed",
        message: errorData?.error?.message || `API returned ${response.status}`,
        details: { accountId },
      };
    }
  } catch (error) {
    return {
      success: false,
      status: "connection_failed",
      message: "Failed to test Business Profile connection",
      error: error instanceof Error ? error.message : "Unknown error",
      details: { accountId },
    };
  }
}

async function testMerchantCenter(config: Record<string, unknown>, userId?: string): Promise<TestResult> {
  const merchantId = config.merchantId as string;

  if (!merchantId) {
    return { success: false, status: "config_required", message: "Merchant Center ID is required" };
  }

  if (!userId) {
    return { success: false, status: "auth_required", message: "User ID required for authentication" };
  }

  const tokenData = await getValidGoogleToken(userId);
  if (!tokenData) {
    return {
      success: false,
      status: "auth_required",
      message: "Merchant Center requires OAuth authorization. Connect your Google account first.",
      details: { merchantId },
    };
  }

  try {
    // Verify access by listing products (limit 1)
    const response = await fetch(
      `https://shoppingcontent.googleapis.com/content/v2.1/${merchantId}/products?maxResults=1`,
      {
        headers: { Authorization: `Bearer ${tokenData.accessToken}` },
      }
    );

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        status: "connected",
        message: "Google Merchant Center connected successfully",
        details: {
          merchantId,
          productCount: String(data.totalItems || data.kind ? "verified" : "0"),
        },
      };
    } else {
      const errorData = await response.json().catch(() => null);
      return {
        success: false,
        status: "connection_failed",
        message: errorData?.error?.message || `API returned ${response.status}`,
        details: { merchantId },
      };
    }
  } catch (error) {
    return {
      success: false,
      status: "connection_failed",
      message: "Failed to test Merchant Center connection",
      error: error instanceof Error ? error.message : "Unknown error",
      details: { merchantId },
    };
  }
}

async function testAds(config: Record<string, unknown>, userId?: string): Promise<TestResult> {
  const customerId = config.customerId as string;

  if (!customerId) {
    return { success: false, status: "config_required", message: "Google Ads Customer ID is required" };
  }

  if (!userId) {
    return { success: false, status: "auth_required", message: "User ID required for authentication" };
  }

  const tokenData = await getValidGoogleToken(userId);
  if (!tokenData) {
    return {
      success: false,
      status: "auth_required",
      message: "Google Ads requires OAuth authorization and developer token. Connect your Google account first.",
      details: { customerId },
    };
  }

  try {
    // Verify access by listing accessible customers
    const response = await fetch(
      `https://googleads.googleapis.com/v17/customers:listAccessibleCustomers`,
      {
        headers: {
          Authorization: `Bearer ${tokenData.accessToken}`,
          "developer-token": (config.developerToken as string) || "",
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      const customerIds = (data.resourceNames || []).map((r: string) => r.replace("customers/", ""));
      const hasAccess = customerIds.includes(customerId.replace(/-/g, ""));

      if (hasAccess) {
        return {
          success: true,
          status: "connected",
          message: "Google Ads connected successfully",
          details: {
            customerId,
            accessibleCustomers: String(customerIds.length),
          },
        };
      } else {
        return {
          success: false,
          status: "permission_denied",
          message: `Customer ID ${customerId} is not accessible with the current credentials`,
          details: { customerId, accessibleCustomers: customerIds.join(", ") },
        };
      }
    } else {
      const errorData = await response.json().catch(() => null);
      // If developer token is missing, still show as auth_required
      if (response.status === 403 && !config.developerToken) {
        return {
          success: false,
          status: "config_required",
          message: "Google Ads requires a developer token. Add it in the configuration.",
          details: { customerId },
        };
      }
      return {
        success: false,
        status: "connection_failed",
        message: errorData?.error?.message || `API returned ${response.status}`,
        details: { customerId },
      };
    }
  } catch (error) {
    return {
      success: false,
      status: "connection_failed",
      message: "Failed to test Google Ads connection",
      error: error instanceof Error ? error.message : "Unknown error",
      details: { customerId },
    };
  }
}

const TEST_FUNCTIONS: Record<string, (config: Record<string, unknown>, userId?: string) => Promise<TestResult>> = {
  analytics: testAnalytics,
  search_console: testSearchConsole,
  business_profile: testBusinessProfile,
  merchant_center: testMerchantCenter,
  ads: testAds,
};

function getManagePermission(serviceId: string): string {
  switch (serviceId) {
    case "analytics":
      return "google:analytics:manage";
    case "search_console":
      return "google:search_console:manage";
    case "business_profile":
      return "google:business_profile:manage";
    case "merchant_center":
      return "google:merchant:manage";
    case "ads":
      return "google:ads:manage";
    default:
      return "marketing:manage";
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ serviceId: string }> }
) {
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

    const { serviceId } = await params;
    const permError = await requirePermission(jwtUser, getManagePermission(serviceId));
    if (permError) return permError;

    await connectToDatabase();

    const service = await GoogleServiceConfig.findOne({ serviceId });
    if (!service) {
      return NextResponse.json({ success: false, error: "Service not found" }, { status: 404 });
    }

    const testFn = TEST_FUNCTIONS[serviceId];
    if (!testFn) {
      return NextResponse.json({ success: false, error: "Unknown service" }, { status: 400 });
    }

    // Update status to testing
    await GoogleServiceConfig.findByIdAndUpdate(service._id, {
      status: "syncing",
      lastTested: new Date(),
    });

    const result = await testFn(service.config, session.user.id);

    // Update with test result
    const newStatus = result.success ? "connected" : result.status;
    await GoogleServiceConfig.findByIdAndUpdate(service._id, {
      status: newStatus,
      lastTested: new Date(),
      lastError: result.error,
      details: result.details,
    });

    return NextResponse.json({ success: result.success, data: result });
  } catch (error) {
    console.error("Test connection error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}