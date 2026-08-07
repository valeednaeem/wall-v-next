import { NextResponse } from "next/server";
import { generateCode } from "@/services/ai";

// Tool endpoint for Dograh voice bot
// Dograh can call this during voice calls when user asks to generate code

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, language, framework, caller_phone, caller_name } = body;

    if (!prompt) {
      return NextResponse.json({
        success: false,
        error: "Please describe what code you'd like me to generate",
      });
    }

    const result = await generateCode({
      prompt,
      language: language || undefined,
      framework: framework || undefined,
    });

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: "I couldn't generate that code. Could you describe it differently?",
      });
    }

    // Log the generation for tracking
    console.log(`[Tool:generate-code] Caller: ${caller_name || "unknown"} (${caller_phone || "unknown"}) | Prompt: ${prompt}`);

    return NextResponse.json({
      success: true,
      message: `Code generated successfully. The code has been created and will be sent to your email.`,
      code: result.code,
      explanation: result.explanation,
    });
  } catch (error) {
    console.error("Tool generate-code error:", error);
    return NextResponse.json({
      success: false,
      error: "Code generation service is temporarily unavailable",
    });
  }
}
