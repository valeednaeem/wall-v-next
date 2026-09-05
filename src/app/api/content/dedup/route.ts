import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, requireRole } from "@/lib/api-middleware";
import {
  findAllDuplicates,
  autoMerge,
  undoMerge,
  batchAutoMerge,
} from "@/lib/content-deduplication";

// GET: Find all duplicate groups
export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const roleError = requireRole(user, ["super-admin", "admin", "manager"]);
    if (roleError) return roleError;

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("campaignId") || undefined;
    const threshold = searchParams.get("threshold")
      ? parseFloat(searchParams.get("threshold")!)
      : undefined;

    const groups = await findAllDuplicates({ campaignId, threshold });

    const totalItems = groups.reduce(
      (sum, g) => sum + 1 + g.duplicates.length,
      0
    );

    return NextResponse.json({
      success: true,
      data: {
        groups,
        stats: {
          totalGroups: groups.length,
          totalItems,
          mergeable: groups.filter((g) => g.recommendedAction === "merge")
            .length,
          keepBoth: groups.filter((g) => g.recommendedAction === "keep_both")
            .length,
          archive: groups.filter((g) => g.recommendedAction === "archive")
            .length,
        },
      },
    });
  } catch (error) {
    return handleApiError(error, "Content dedup GET");
  }
}

// POST: Auto-merge two items or batch merge
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const roleError = requireRole(user, ["super-admin", "admin", "manager"]);
    if (roleError) return roleError;

    const body = await request.json();

    if (body.action === "batch") {
      const result = await batchAutoMerge(body.campaignId);
      return NextResponse.json({ success: true, data: result });
    }

    if (!body.primaryId || !body.duplicateId) {
      return NextResponse.json(
        { error: "Missing required fields: primaryId, duplicateId" },
        { status: 400 }
      );
    }

    const validStrategies = ["best_quality", "combine_strengths", "ai_synthesize"];
    const strategy = validStrategies.includes(body.strategy)
      ? body.strategy
      : "ai_synthesize";

    const merged = await autoMerge(body.primaryId, body.duplicateId, {
      strategy,
    });

    return NextResponse.json({ success: true, data: merged });
  } catch (error) {
    return handleApiError(error, "Content dedup POST");
  }
}

// DELETE: Undo a merge
export async function DELETE(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const roleError = requireRole(user, ["super-admin", "admin", "manager"]);
    if (roleError) return roleError;

    const body = await request.json();

    if (!body.contentItemId) {
      return NextResponse.json(
        { error: "Missing required field: contentItemId" },
        { status: 400 }
      );
    }

    const result = await undoMerge(body.contentItemId);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleApiError(error, "Content dedup DELETE");
  }
}
