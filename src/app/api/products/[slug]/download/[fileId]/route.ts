import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Product from "@/models/product";
import Order from "@/models/order";
import { getAuthUser } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; fileId: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const { slug, fileId } = await params;

    // Find the product
    const product = await Product.findOne({ slug }).lean();
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Find the specific file
    const file = product.files?.find((f: { id: string }) => f.id === fileId);
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Admin/manager/staff can always download (for testing)
    const isAdmin = ["super-admin", "admin", "manager", "staff"].includes(user.role);

    let matchingOrder = null;

    if (!isAdmin) {
      // For customers: verify they have a paid order for this product
      matchingOrder = await Order.findOne({
        user: user.userId,
        "items.product": product._id,
        paymentStatus: "paid",
        status: { $in: ["confirmed", "processing", "completed"] },
      }).lean();

      if (!matchingOrder) {
        return NextResponse.json(
          { error: "You have not purchased this product" },
          { status: 403 }
        );
      }
    }

    // Serve the file from the data URL
    if (!file.url || !file.url.startsWith("data:")) {
      return NextResponse.json({ error: "File data not available" }, { status: 500 });
    }

    // Parse the data URL to extract base64 content
    const base64Match = file.url.match(/^data:([^;]+);base64,(.+)$/);
    if (!base64Match) {
      return NextResponse.json({ error: "Invalid file data format" }, { status: 500 });
    }

    const mimeType = base64Match[1];
    const base64Data = base64Match[2];
    const fileBuffer = Buffer.from(base64Data, "base64");

    // Increment download count on the product
    await Product.findByIdAndUpdate(product._id, { $inc: { downloadCount: 1 } });

    // Log download to the order if this is a customer download
    if (matchingOrder) {
      await Order.findByIdAndUpdate(matchingOrder._id, {
        $inc: { downloadCount: 1 },
        $push: {
          downloads: {
            file: `${slug}/${fileId}`,
            name: file.originalName,
            downloadedAt: new Date(),
          },
        },
      });
    }

    // Return the file with appropriate headers
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${file.originalName}"`,
        "Content-Length": fileBuffer.length.toString(),
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}
