import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import SecurityEvent from "@/models/security-event";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const role = (session.user as { role?: string }).role;
    if (!["super-admin", "admin"].includes(role || "")) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 500);
    const skip = parseInt(url.searchParams.get("skip") || "0");
    const type = url.searchParams.get("type");
    const severity = url.searchParams.get("severity");
    const ip = url.searchParams.get("ip");

    const filter: Record<string, unknown> = {};
    if (type) filter.type = type;
    if (severity) filter.severity = severity;
    if (ip) filter.ip = ip;

    const [events, total] = await Promise.all([
      SecurityEvent.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SecurityEvent.countDocuments(filter),
    ]);

    // Summary stats
    const [severityCounts, typeCounts, recentBlocked] = await Promise.all([
      SecurityEvent.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } },
        { $group: { _id: "$severity", count: { $sum: 1 } } },
      ]),
      SecurityEvent.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } },
        { $group: { _id: "$type", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      SecurityEvent.countDocuments({
        blocked: true,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        events,
        total,
        summary: {
          last24h: {
            bySeverity: Object.fromEntries(severityCounts.map((s: { _id: string; count: number }) => [s._id, s.count])),
            byType: typeCounts.map((t: { _id: string; count: number }) => ({ type: t._id, count: t.count })),
            blocked: recentBlocked,
          },
        },
      },
    });
  } catch (error) {
    console.error("Security events GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
