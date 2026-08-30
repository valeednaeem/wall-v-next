import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Product from "@/models/product";
import GoogleServiceConfig from "@/models/google-services";
import { getValidGoogleToken, GOOGLE_SCOPES } from "@/lib/google-auth";
import { requirePermission } from "@/lib/api-middleware";
import { isProductAvailable } from "@/lib/product-availability";

interface SyncResult {
  message: string;
  synced: number;
  failed: number;
  errors: string[];
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

    const permError = await requirePermission(jwtUser, "google:merchant:manage");
    if (permError) return permError;

    await connectToDatabase();

    // Get valid OAuth token
    const tokenData = await getValidGoogleToken(session.user.id);
    if (!tokenData) {
      return NextResponse.json({ success: false, error: "Google authorization required. Please connect your Google account first." }, { status: 401 });
    }

    // Check if we have the required scope
    const hasScope = tokenData.scope.some((s) => s.includes("content"));
    if (!hasScope) {
      return NextResponse.json({ success: false, error: "Missing Merchant Center scope. Please reconnect your Google account." }, { status: 403 });
    }

    // Get Merchant Center config
    const serviceConfig = await GoogleServiceConfig.findOne({ serviceId: "merchant_center" });
    if (!serviceConfig || !serviceConfig.config.merchantId) {
      return NextResponse.json({ success: false, error: "Merchant Center not configured. Please enter your Merchant ID first." }, { status: 400 });
    }

    const merchantId = serviceConfig.config.merchantId;
    const dataSourceId = serviceConfig.config.dataSourceId;

    // Fetch eligible products from Wall-V
    const products = await Product.find({
      status: "published",
      type: { $in: ["product", "digital", "saas"] },
      price: { $gt: 0 },
      featuredImage: { $exists: true, $ne: "" },
    })
      .populate("category")
      .lean();

    if (products.length === 0) {
      return NextResponse.json({ success: true, data: { message: "No eligible products to sync", synced: 0, failed: 0, errors: [] } });
    }

    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    // Convert products to Merchant Center format
    const merchantProducts = products.map((product) => ({
      offerId: product.sku || product.slug,
      title: product.name,
      description: product.description,
      link: `${process.env.NEXT_PUBLIC_APP_URL}/products/${product.slug}`,
      imageLink: product.featuredImage,
      availability: isProductAvailable(product.status, product.type, product.stock) ? "in_stock" : "out_of_stock",
      price: { value: product.price.toFixed(2), currency: product.currency || "USD" },
      googleProductCategory: (product.category as any)?.googleCategory || "Software > Business & Productivity Software",
      brand: "Wall-V",
      condition: "new",
      gtin: product.specifications?.gtin || "",
      mpn: product.sku || product.slug,
      ...(product.salePrice && product.salePrice < product.price && {
        salePrice: { value: product.salePrice.toFixed(2), currency: product.currency || "USD" },
        salePriceEffectiveDate: new Date().toISOString().split("T")[0] + "/" + new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      }),
    }));

    // If we have a data source, use the Content API to insert/update products
    if (dataSourceId) {
      // Batch insert using Content API
      const batchSize = 100;
      for (let i = 0; i < merchantProducts.length; i += batchSize) {
        const batch = merchantProducts.slice(i, i + batchSize);
        const batchBody = {
          entries: batch.map((product) => ({
            batchId: product.offerId,
            merchantId,
            method: "insert",
            product,
          })),
        };

        try {
          const response = await fetch(`https://shoppingcontent.googleapis.com/content/v2.1/${merchantId}/products/batch`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${tokenData.accessToken}`,
            },
            body: JSON.stringify(batchBody),
          });

          const result = await response.json();

          if (result.entries) {
            for (const entry of result.entries) {
              if (entry.errors) {
                failed++;
                errors.push(`${entry.batchId}: ${JSON.stringify(entry.errors)}`);
              } else {
                synced++;
              }
            }
          }
        } catch (error) {
          failed += batch.length;
          errors.push(`Batch ${i / batchSize + 1}: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }
    } else {
      // Without data source, we can only validate - would need manual upload
      synced = merchantProducts.length;
      errors.push("No data source configured. Products prepared but not uploaded. Configure a Data Source in Merchant Center for automatic sync.");
    }

    // Update service config with last sync info
    await GoogleServiceConfig.findByIdAndUpdate(serviceConfig._id, {
      lastSynced: new Date(),
      status: failed > 0 && synced === 0 ? "sync_failed" : "sync_completed",
      lastError: errors.length > 0 ? errors.slice(0, 3).join("; ") : undefined,
    });

    const result: SyncResult = {
      message: `Sync completed: ${synced} synced, ${failed} failed`,
      synced,
      failed,
      errors,
    };

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Merchant Center sync error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}