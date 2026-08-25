import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Product from "@/models/product";
import GoogleServiceConfig from "@/models/google-services";
import { getValidGoogleToken, GOOGLE_SCOPES } from "@/lib/google-auth";
import { requirePermission } from "@/lib/api-middleware";

interface SyncStatus {
  total: number;
  synced: number;
  pending: number;
  approved: number;
  rejected: number;
  issues: number;
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

    const permError = await requirePermission(jwtUser, "google:merchant:view");
    if (permError) return permError;

    await connectToDatabase();

    // Get total eligible products from Wall-V
    const totalProducts = await Product.countDocuments({
      status: "published",
      type: { $in: ["product", "digital", "saas"] },
      price: { $gt: 0 },
      featuredImage: { $exists: true, $ne: "" },
    });

    // Try to get actual status from Merchant Center if connected
    const serviceConfig = await GoogleServiceConfig.findOne({ serviceId: "merchant_center" });
    const tokenData = await getValidGoogleToken(session.user.id);

    if (tokenData && serviceConfig?.config?.merchantId && serviceConfig.config.dataSourceId) {
      try {
        const hasScope = tokenData.scope.some((s) => s.includes("content"));
        if (hasScope) {
          const response = await fetch(
            `https://shoppingcontent.googleapis.com/content/v2.1/${serviceConfig.config.merchantId}/products?dataSource=${serviceConfig.config.dataSourceId}`,
            {
              headers: { Authorization: `Bearer ${tokenData.accessToken}` },
            }
          );

          if (response.ok) {
            const data = await response.json();
            const products = data.resources || [];

            let synced = 0;
            let pending = 0;
            let approved = 0;
            let rejected = 0;
            let issues = 0;

            for (const product of products) {
              synced++;

              // Determine actual status from product issues/disapprovals
              const hasIssues = product.productStatus?.itemIssues?.length > 0;
              const hasDisapprovals = product.productStatus?.destinationStatuses?.some(
                (ds: Record<string, string>) => ds.destination === "Shopping" && ds.status === "disapproved"
              );

              if (hasDisapprovals) {
                rejected++;
              } else if (hasIssues) {
                issues++;
              } else {
                // Check if approved for Shopping destination
                const isApproved = product.productStatus?.destinationStatuses?.some(
                  (ds: Record<string, string>) => ds.destination === "Shopping" && ds.status === "accepted"
                );
                if (isApproved) {
                  approved++;
                } else {
                  pending++;
                }
              }
            }

            return NextResponse.json({
              success: true,
              data: {
                total: totalProducts,
                synced,
                pending,
                approved,
                rejected,
                issues,
              },
            });
          }
        }
      } catch (error) {
        console.error("Failed to fetch Merchant Center status:", error);
      }
    }

    // Fallback: estimate from local data
    return NextResponse.json({
      success: true,
      data: {
        total: totalProducts,
        synced: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        issues: 0,
      },
    });
  } catch (error) {
    console.error("Sync status error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}