import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import LegalPage from "@/models/legal-page";
import LegalVersion from "@/models/legal-version";
import { getAuthUser } from "@/lib/auth";

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
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const { slug } = await params;
    const body = await request.json();

    const existing = await LegalPage.findOne({ slug });
    if (!existing) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    const contentChanged = body.content && body.content !== existing.content;
    const titleChanged = body.title && body.title !== existing.title;

    if (contentChanged || titleChanged) {
      const parts = existing.version.split(".").map(Number);
      const minor = (parts[1] || 0) + 1;
      body.version = `${parts[0]}.${minor}`;
    }

    if (body.status === "published" && existing.status !== "published") {
      body.lastPublishedAt = new Date();
      if (!body.version || body.version === existing.version) {
        const parts = existing.version.split(".").map(Number);
        body.version = `${parts[0] + 1}.0`;
      }
    }

    if (body.title && body.title !== existing.title) {
      body.slug = await generateUniqueSlugForLegal(body.title);
    }

    const updated = await LegalPage.findOneAndUpdate(
      { slug },
      { ...body, updatedAt: new Date() },
      { new: true }
    );

    if (contentChanged || titleChanged || body.status === "published") {
      await LegalVersion.create({
        legalPage: updated._id,
        version: updated.version,
        content: updated.content,
        title: updated.title,
        changeNote: body.changeNote || `Updated to version ${updated.version}`,
        snapshot: { seo: updated.seo, type: updated.type, slug: updated.slug },
        createdBy: user._id,
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
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
