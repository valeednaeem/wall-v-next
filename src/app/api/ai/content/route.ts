import { NextResponse } from "next/server";
import { generateBlogContent, generateProductDescription, generateSEOContent } from "@/services/ai";
import { getAuthUserFromCookie } from "@/lib/auth-cookie";

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUserFromCookie();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["super-admin", "admin", "manager"].includes(authUser.role)) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const { type, prompt, features } = body;

    let result: string | { metaTitle: string; metaDescription: string; keywords: string[] };

    switch (type) {
      case "blog":
        result = await generateBlogContent(prompt);
        break;
      case "description":
        result = await generateProductDescription(prompt, features || []);
        break;
      case "seo":
        result = await generateSEOContent(prompt);
        break;
      default:
        return NextResponse.json({ error: "Invalid content type" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("AI content error:", error);
    return NextResponse.json({ error: "AI service error" }, { status: 500 });
  }
}
