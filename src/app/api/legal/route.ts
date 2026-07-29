import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import LegalPage from "@/models/legal-page";
import LegalVersion from "@/models/legal-version";
import { generateSlug } from "@/lib/generate-slug";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const all = searchParams.get("all") === "true";

    const query: Record<string, unknown> = {};
    if (type) query.type = type;
    if (status) query.status = status;
    if (!all) query.isActive = true;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
      ];
    }

    const pages = await LegalPage.find(query)
      .select("-content")
      .sort({ updatedAt: -1 })
      .lean();
    return NextResponse.json({ success: true, data: pages });
  } catch (error) {
    console.error("Legal GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const body = await request.json();

    const slug = await generateUniqueSlugForLegal(body.title);
    const version = "1.0";

    const page = await LegalPage.create({
      ...body,
      slug,
      version,
      status: body.status || "draft",
      author: user.userId,
    });

    await LegalVersion.create({
      legalPage: page._id,
      version,
      content: page.content,
      title: page.title,
      changeNote: "Initial version",
      snapshot: { seo: page.seo, type: page.type, slug: page.slug },
      createdBy: user.userId,
    });

    return NextResponse.json({ success: true, data: page }, { status: 201 });
  } catch (error) {
    console.error("Legal POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function generateUniqueSlugForLegal(text: string): Promise<string> {
  let slug = generateSlug(text);
  let counter = 1;
  while (await LegalPage.findOne({ slug })) {
    slug = `${generateSlug(text)}-${counter}`;
    counter++;
  }
  return slug;
}
