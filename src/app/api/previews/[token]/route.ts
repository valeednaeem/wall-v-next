import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Preview, { verifyPreviewToken } from "@/models/preview";
import Project from "@/models/project";
import { logError } from "@/lib/error-logger";

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  let previewId: string | undefined;
  try {
    const { token } = await params;

    if (!token || token.length < 10) {
      return NextResponse.json({ error: "Invalid preview link" }, { status: 404 });
    }

    await connectToDatabase();

    // Find preview by token
    const preview = await Preview.findOne({ status: { $in: ["active", "expired"] } })
      .select("projectId milestoneIndex tokenHash status expiresAt accessCount maxAccesses paymentRequired paymentStatus accessLog")
      .lean();

    if (!preview) {
      return NextResponse.json({ error: "Preview not found" }, { status: 404 });
    }

    previewId = preview._id.toString();

    // Verify token
    if (!verifyPreviewToken(token, preview.tokenHash)) {
      await Preview.findByIdAndUpdate(preview._id, {
        $push: {
          accessLog: {
            timestamp: new Date(),
            event: "INVALID_TOKEN_ATTEMPT",
            ip: getClientIp(request),
            userAgent: request.headers.get("user-agent") || "unknown",
          },
        },
      });
      return NextResponse.json({ error: "Invalid preview link" }, { status: 404 });
    }

    // Check expiration
    if (new Date() > preview.expiresAt) {
      if (preview.status !== "expired") {
        await Preview.findByIdAndUpdate(preview._id, {
          status: "expired",
          $push: {
            accessLog: {
              timestamp: new Date(),
              event: "EXPIRED_PREVIEW",
              ip: getClientIp(request),
              userAgent: request.headers.get("user-agent") || "unknown",
            },
          },
        });
      }
      return NextResponse.json({
        success: false,
        error: "expired",
        message: "This preview has expired. Your project preview was provided for temporary evaluation. Proceed to checkout to continue with your project.",
        projectId: preview.projectId.toString(),
        expiresAt: preview.expiresAt,
      });
    }

    // Check access count
    if (preview.accessCount >= preview.maxAccesses) {
      return NextResponse.json({
        success: false,
        error: "max_accesses",
        message: "Preview access limit reached. Proceed to checkout to continue with your project.",
        projectId: preview.projectId.toString(),
      });
    }

    // Check if revoked
    if (preview.status === "revoked") {
      return NextResponse.json({
        success: false,
        error: "revoked",
        message: "This preview has been revoked. Please contact support.",
      });
    }

    // Check payment status
    if (preview.paymentStatus === "paid") {
      return NextResponse.json({
        success: false,
        error: "paid",
        message: "This project has been paid for. Please check your dashboard for access.",
        projectId: preview.projectId.toString(),
      });
    }

    // Update access count and log
    await Preview.findByIdAndUpdate(preview._id, {
      $inc: { accessCount: 1 },
      lastAccessedAt: new Date(),
      $push: {
        accessLog: {
          timestamp: new Date(),
          event: "PREVIEW_ACCESSED",
          ip: getClientIp(request),
          userAgent: request.headers.get("user-agent") || "unknown",
          details: `Access count: ${preview.accessCount + 1}/${preview.maxAccesses}`,
        },
      },
    });

    // Fetch project data
    const project = await Project.findById(preview.projectId)
      .select("name title description status demoHTML demoId requirements quote client language")
      .lean();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        previewId: preview._id.toString(),
        projectId: project._id.toString(),
        name: project.name || project.title,
        description: project.description,
        status: project.status,
        demoHTML: project.demoHTML,
        demoId: project.demoId,
        requirements: project.requirements,
        quote: project.quote,
        client: project.client,
        language: project.language,
        expiresAt: preview.expiresAt,
        accessCount: preview.accessCount + 1,
        maxAccesses: preview.maxAccesses,
        paymentRequired: preview.paymentRequired,
      },
    });
  } catch (error) {
    await logError({
      level: "error",
      message: "Error validating preview token",
      source: "api/previews/[token]",
      stack: error instanceof Error ? error.stack : undefined,
      metadata: { previewId },
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
