import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import ProjectPayment from "@/models/project-payment";
import Project from "@/models/project";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const clientProjects = await Project.find({
      $or: [
        { "client.email": user.email },
        { "client.email": user.email?.toLowerCase() },
      ],
    }).select("_id").lean();

    const projectIds = clientProjects.map((p) => p._id);

    const query: Record<string, unknown> = { project: { $in: projectIds } };

    const payments = await ProjectPayment.find(query)
      .select("amount currency type status method reference transactionId paidAt notes project invoice")
      .populate("project", "name")
      .sort({ paidAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await ProjectPayment.countDocuments(query);

    const totalPaid = await ProjectPayment.aggregate([
      { $match: { project: { $in: projectIds }, status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const totalAmount = totalPaid.length > 0 ? totalPaid[0].total : 0;

    return NextResponse.json({
      payments,
      total,
      totalPaid: totalAmount,
      page,
      limit,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
