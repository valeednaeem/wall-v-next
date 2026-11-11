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

const TEST_FUNCTIONS: Record<string, (config: Record<string, unknown>, userId?: string) => Promise<TestResult>> = {
  analytics: testAnalytics,
  search_console: testSearchConsole,
};

function getManagePermission(serviceId: string): string {
  switch (serviceId) {
    case "analytics":
      return "google:analytics:manage";
    case "search_console":
      return "google:search_console:manage";
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

    await GoogleServiceConfig.findByIdAndUpdate(service._id, {
      status: "syncing",
      lastTested: new Date(),
    });

    const result = await testFn(service.config, session.user.id);

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
