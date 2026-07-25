import { NextResponse } from "next/server";
import { generateAIContent } from "@/services/ai";
import { getAuthUserFromCookie } from "@/lib/auth-cookie";

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUserFromCookie();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { projectType, description, features, timeline } = body;

    if (!projectType || !description) {
      return NextResponse.json(
        { error: "Project type and description are required" },
        { status: 400 }
      );
    }

    const prompt = `Estimate a project with the following details:
Type: ${projectType}
Description: ${description}
Features: ${features?.join(", ") || "Not specified"}
Timeline: ${timeline || "Flexible"}

Provide a detailed estimate including:
1. Budget range (min and max in USD)
2. Timeline estimate (in weeks)
3. Cost breakdown by category
4. Potential risks
5. Suggestions for optimization

Return the response as JSON with this structure:
{
  "budget": { "min": number, "max": number, "currency": "USD" },
  "timeline": { "min": number, "max": number, "unit": "weeks" },
  "breakdown": [{ "category": string, "hours": number, "cost": number }],
  "risks": [string],
  "suggestions": [string]
}`;

    const response = await generateAIContent([
      { role: "system", content: "You are a project estimation expert. Provide accurate, detailed estimates based on industry standards." },
      { role: "user", content: prompt },
    ]);

    let estimate;
    try {
      estimate = JSON.parse(response);
    } catch {
      estimate = {
        budget: { min: 5000, max: 50000, currency: "USD" },
        timeline: { min: 4, max: 24, unit: "weeks" },
        breakdown: [],
        risks: ["Timeline may vary based on requirements"],
        suggestions: ["Consider phased delivery"],
      };
    }

    return NextResponse.json({
      success: true,
      data: estimate,
    });
  } catch (error) {
    console.error("AI estimate error:", error);
    return NextResponse.json({ error: "AI service error" }, { status: 500 });
  }
}
