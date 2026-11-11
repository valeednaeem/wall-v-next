import { NextResponse } from "next/server";
import { generateImage } from "@/services/ai";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const { allowed, resetAt } = checkRateLimit(`ai-image:${ip}`, 10, 60000);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)) } }
      );
    }

    const body = await request.json();
    const { prompt, size, quality, background } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const result = await generateImage({
      prompt,
      size: size || "1024x1024",
      quality: quality || "medium",
      background: background || "auto",
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        imageUrl: result.imageUrl,
        revisedPrompt: result.revisedPrompt,
      },
    });
  } catch (error) {
    console.error("Image generation error:", error);
    return NextResponse.json({ error: "Image generation failed" }, { status: 500 });
  }
}
