import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import ErrorLog from "@/models/error-log";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user || !["super-admin", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const level = searchParams.get("level");
    const source = searchParams.get("source");
    const resolved = searchParams.get("resolved");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const query: Record<string, unknown> = {};
    if (level) query.level = level;
    if (source) query.source = source;
    if (resolved !== null && resolved !== undefined) {
      query.resolved = resolved === "true";
    }
    if (search) {
      query.$or = [
        { message: { $regex: search, $options: "i" } },
        { source: { $regex: search, $options: "i" } },
      ];
    }

    const total = await ErrorLog.countDocuments(query);
    const logs = await ErrorLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Get counts by level
    const [errorCount, warningCount, infoCount, criticalCount] = await Promise.all([
      ErrorLog.countDocuments({ level: "error" }),
      ErrorLog.countDocuments({ level: "warning" }),
      ErrorLog.countDocuments({ level: "info" }),
      ErrorLog.countDocuments({ level: "critical" }),
    ]);

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      stats: { errorCount, warningCount, infoCount, criticalCount },
    });
  } catch (error) {
    console.error("Error logs GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user || !["super-admin", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();
    const body = await request.json();
    const { id, resolved, notes } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const update: Record<string, unknown> = {};
    if (typeof resolved === "boolean") update.resolved = resolved;
    if (notes !== undefined) update.$push = { metadata: { notes, updatedAt: new Date() } };

    const log = await ErrorLog.findByIdAndUpdate(id, update, { new: true });
    if (!log) {
      return NextResponse.json({ error: "Log not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: log });
  } catch (error) {
    console.error("Error logs PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "super-admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (id) {
      await ErrorLog.findByIdAndDelete(id);
    } else {
      // Delete resolved logs older than 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      await ErrorLog.deleteMany({ resolved: true, createdAt: { $lt: thirtyDaysAgo } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error logs DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
