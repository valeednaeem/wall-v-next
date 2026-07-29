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
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const { slug } = await params;

    const page = await LegalPage.findOne({ slug }).lean();
    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    const versions = await LegalVersion.find({ legalPage: page._id })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: versions });
  } catch (error) {
    console.error("Versions GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
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

    const page = await LegalPage.findOne({ slug });
    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    const parts = page.version.split(".").map(Number);
    const newVersion = `${parts[0]}.${(parts[1] || 0) + 1}`;

    if (body.restore) {
      const oldVersion = await LegalVersion.findById(body.versionId);
      if (!oldVersion) {
        return NextResponse.json({ error: "Version not found" }, { status: 404 });
      }

      await LegalPage.findOneAndUpdate(
        { slug },
        { content: oldVersion.content, title: oldVersion.title, version: newVersion }
      );

      const restored = await LegalVersion.create({
        legalPage: page._id,
        version: newVersion,
        content: oldVersion.content,
        title: oldVersion.title,
        changeNote: body.changeNote || `Restored from version ${oldVersion.version}`,
        snapshot: { seo: page.seo, type: page.type, slug: page.slug },
        createdBy: user._id,
      });

      return NextResponse.json({ success: true, data: restored });
    }

    const version = await LegalVersion.create({
      legalPage: page._id,
      version: newVersion,
      content: body.content || page.content,
      title: body.title || page.title,
      changeNote: body.changeNote,
      snapshot: { seo: page.seo, type: page.type, slug: page.slug },
      createdBy: user._id,
    });

    await LegalPage.findOneAndUpdate({ slug }, { version: newVersion });

    return NextResponse.json({ success: true, data: version }, { status: 201 });
  } catch (error) {
    console.error("Versions POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
