import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import LegalPage from "@/models/legal-page";
import LegalVersion from "@/models/legal-version";
import { auth } from "@/lib/auth";
import { pickFields } from "@/lib/pick-fields";

const LEGAL_PAGE_FIELDS = ["title", "content", "type", "seo", "isActive", "status", "changeNote", "language"];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectToDatabase();
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const dashboard = searchParams.get("dashboard") === "true";

    const query: Record<string, unknown> = { slug };
    if (!dashboard) query.isActive = true;

    const page = await LegalPage.findOne(query).lean();
    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: page });
  } catch (error) {
    console.error("Legal page GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role;
    if (!["super-admin", "admin"].includes(userRole || "")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    await connectToDatabase();
    const { slug } = await params;
    const body = await request.json();
    const pageData = pickFields(body, LEGAL_PAGE_FIELDS);

    const existing = await LegalPage.findOne({ slug });
    if (!existing) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    const contentChanged = pageData.content && pageData.content !== existing.content;
    const titleChanged = pageData.title && pageData.title !== existing.title;

    if (contentChanged || titleChanged) {
      const parts = existing.version.split(".").map(Number);
      const minor = (parts[1] || 0) + 1;
      pageData.version = `${parts[0]}.${minor}`;
    }

    if (pageData.status === "published" && existing.status !== "published") {
      pageData.lastPublishedAt = new Date();
      if (!pageData.version || pageData.version === existing.version) {
        const parts = existing.version.split(".").map(Number);
        pageData.version = `${parts[0] + 1}.0`;
      }
    }

    if (pageData.title && pageData.title !== existing.title) {
      pageData.slug = await generateUniqueSlugForLegal(pageData.title);
    }

    const updated = await LegalPage.findOneAndUpdate(
      { slug },
      { ...pageData, updatedAt: new Date() },
      { new: true }
    );

    if (contentChanged || titleChanged || pageData.status === "published") {
      await LegalVersion.create({
        legalPage: updated._id,
        version: updated.version,
        content: updated.content,
        title: updated.title,
        changeNote: pageData.changeNote || `Updated to version ${updated.version}`,
        snapshot: { seo: updated.seo, type: updated.type, slug: updated.slug },
        createdBy: session.user.id,
      });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Legal PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role;
    if (!["super-admin", "admin"].includes(userRole || "")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    await connectToDatabase();
    const { slug } = await params;

    const existing = await LegalPage.findOne({ slug });
    if (!existing) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    await LegalPage.findOneAndUpdate({ slug }, { isActive: false });

    return NextResponse.json({ success: true, message: "Page archived" });
  } catch (error) {
    console.error("Legal DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function generateUniqueSlugForLegal(text: string): Promise<string> {
  const slugify = (await import("slugify")).default;
  let slug = slugify(text, { lower: true, strict: true, trim: true });
  let counter = 1;
  while (await LegalPage.findOne({ slug, isActive: true })) {
    slug = slugify(text, { lower: true, strict: true, trim: true }) + `-${counter}`;
    counter++;
  }
  return slug;
}
