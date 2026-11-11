import { NextResponse } from "next/server";
import { generateCode } from "@/services/ai";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const { allowed, resetAt } = checkRateLimit(`ai-code:${ip}`, 10, 60000);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)) } }
      );
    }

    const body = await request.json();
    const { prompt, language, framework } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const result = await generateCode({
      prompt,
      language: language || undefined,
      framework: framework || undefined,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        code: result.code,
        explanation: result.explanation,
      },
    });
  } catch (error) {
    console.error("Code generation error:", error);
    return NextResponse.json({ error: "Code generation failed" }, { status: 500 });
  }
}
