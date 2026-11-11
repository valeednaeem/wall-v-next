import { NextResponse } from "next/server";
import { generateImage } from "@/services/ai";

// Tool endpoint for Dograh voice bot
// Dograh can call this during voice calls when user asks to generate an image

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, caller_phone, caller_name } = body;

    if (!prompt) {
      return NextResponse.json({
        success: false,
        error: "Please describe what image you'd like me to generate",
      });
    }

    const result = await generateImage({
      prompt,
      size: "1024x1024",
      quality: "medium",
    });

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: "I couldn't generate that image. Could you describe it differently?",
      });
    }

    // Log the generation for tracking
    console.log(`[Tool:generate-image] Caller: ${caller_name || "unknown"} (${caller_phone || "unknown"}) | Prompt: ${prompt}`);

    return NextResponse.json({
      success: true,
      message: `Image generated successfully. The image has been created and will be sent to your email.`,
      imageUrl: result.imageUrl,
      revisedPrompt: result.revisedPrompt,
    });
  } catch (error) {
    console.error("Tool generate-image error:", error);
    return NextResponse.json({
      success: false,
      error: "Image generation service is temporarily unavailable",
    });
  }
}
