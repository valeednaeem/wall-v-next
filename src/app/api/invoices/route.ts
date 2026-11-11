import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Invoice from "@/models/invoice";
import { getAuthUser } from "@/lib/auth";

/**
 * GET /api/invoices
 * List invoices. Admin sees all, client sees own.
 * Query params: status, projectId, client, page, limit
 */
export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
    const status = url.searchParams.get("status");
    const projectId = url.searchParams.get("projectId");
    const client = url.searchParams.get("client");

    const isAdmin = ["super-admin", "admin", "project-manager"].includes(user.role);
    const query: Record<string, unknown> = {};

    if (!isAdmin) {
      // Clients see only their invoices (by email match)
      query.$or = [
        { "client.email": user.email },
        { "client.user": user.userId },
      ];
    }

    if (status) query.status = status;
    if (projectId) query.project = projectId;
    if (client) query["client"] = client;

    const total = await Invoice.countDocuments(query);
    const invoices = await Invoice.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      data: invoices,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Invoices GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
