import { redirect } from "next/navigation";
import { connectToDatabase } from "@/lib/mongodb";
import Preview, { createPreviewToken } from "@/models/preview";
import Project from "@/models/project";

export default async function LegacyPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  await connectToDatabase();

  // Try to find an active preview for this project
  const existingPreview = await Preview.findOne({
    projectId: id,
    status: "active",
    expiresAt: { $gt: new Date() },
  })
    .select("token")
    .sort({ createdAt: -1 })
    .lean();

  if (existingPreview) {
    redirect(`/preview/${existingPreview.token}`);
  }

  // No active preview - check if project exists and has demo content
  const project = await Project.findById(id)
    .select("demoHTML name")
    .lean();

  if (!project?.demoHTML) {
    redirect("/preview/invalid");
  }

  // Create a new preview token
  const { token, tokenHash } = createPreviewToken();
  const preview = await Preview.create({
    projectId: project._id,
    token,
    tokenHash,
    status: "active",
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    accessCount: 0,
    maxAccesses: 10,
    paymentRequired: true,
    paymentStatus: "unpaid",
    accessLog: [
      {
        timestamp: new Date(),
        event: "PREVIEW_CREATED",
        details: "Created via legacy URL redirect",
      },
    ],
  });

  redirect(`/preview/${preview.token}`);
}
