import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Inquiry from "@/models/inquiry";
import Lead from "@/models/lead";
import { getAuthUser } from "@/lib/auth";
import type { ProjectBrief } from "@/lib/project-discovery";

// POST /api/ai/inquiry
// Creates an inquiry (and optionally a lead) from a chatbot/voice conversation
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { brief, source = "ai-chatbot", language = "en" } = body;

    if (!brief || !brief.projectType) {
      return NextResponse.json(
        { error: "Project brief with projectType is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const projectBrief = brief as ProjectBrief & {
      _contactEmail?: string;
      _contactPhone?: string;
    };

    // Determine contact info
    const name = projectBrief.title?.replace("'s Project", "") || "AI Chat User";
    const email = projectBrief._contactEmail || "";
    const phone = projectBrief._contactPhone || "";

    // Build the inquiry message from the brief
    const messageParts: string[] = [];
    messageParts.push(`Project Type: ${projectBrief.projectType}`);
    if (projectBrief.objective) messageParts.push(`Objective: ${projectBrief.objective}`);
    if (projectBrief.businessContext.industry) messageParts.push(`Industry: ${projectBrief.businessContext.industry}`);
    if (projectBrief.targetAudience) messageParts.push(`Target Audience: ${projectBrief.targetAudience}`);
    if (projectBrief.features.length > 0) messageParts.push(`Features: ${projectBrief.features.join(", ")}`);
    if (projectBrief.integrations.length > 0) messageParts.push(`Integrations: ${projectBrief.integrations.join(", ")}`);
    if (projectBrief.estimatedBudget) messageParts.push(`Budget: $${projectBrief.estimatedBudget}`);
    if (projectBrief.desiredTimeline) messageParts.push(`Timeline: ${projectBrief.desiredTimeline}`);
    if (projectBrief.designPreferences) messageParts.push(`Design: ${projectBrief.designPreferences}`);
    if (projectBrief.hostingRequired) messageParts.push("Hosting: Required");
    if (projectBrief.domainRequired && projectBrief.domainName) messageParts.push(`Domain: ${projectBrief.domainName}`);
    if (projectBrief.mobileAppRequired) messageParts.push("Mobile App: Yes");
    if (projectBrief.aiFeaturesRequired) messageParts.push("AI Features: Yes");
    if (projectBrief.seoRequired) messageParts.push("SEO: Required");

    const inquiryMessage = messageParts.join("\n");

    // Create the inquiry
    const inquiry = await Inquiry.create({
      name: name || "AI Chat User",
      email: email || "pending@wall-v.com",
      phone: phone || undefined,
      subject: `${projectBrief.projectType?.replace(/-/g, " ") || "Project"} Inquiry — AI Chat`,
      message: inquiryMessage,
      type: "sales",
      status: "new",
      priority: projectBrief.estimatedBudget ? "high" : "medium",
      source,
      tags: [
        "ai-generated",
        projectBrief.projectType || "unknown",
        ...(projectBrief.recommendedServices || []),
      ],
      estimatedBudget: projectBrief.estimatedBudget
        ? parseInt(projectBrief.estimatedBudget.split("-")[0]) || undefined
        : undefined,
      estimatedTimeline: projectBrief.desiredTimeline || undefined,
    });

    // Also create a lead if we have email
    let lead = null;
    if (email && email !== "pending@wall-v.com") {
      lead = await Lead.create({
        name: name || "AI Chat User",
        email,
        phone: phone || undefined,
        source,
        status: "new",
        score: projectBrief.estimatedBudget ? 60 : 30,
        budget: projectBrief.estimatedBudget
          ? parseInt(projectBrief.estimatedBudget.split("-")[0]) || undefined
          : undefined,
        requirements: inquiryMessage,
        serviceInterest: projectBrief.recommendedServices || [],
        tags: ["ai-generated", projectBrief.projectType || "unknown"],
      });

      // Link lead to inquiry
      inquiry.lead = lead._id;
      await inquiry.save();
    }

    return NextResponse.json({
      success: true,
      data: {
        inquiryId: inquiry._id.toString(),
        leadId: lead?._id?.toString() || null,
        message: "Your project inquiry has been saved. Our team will review it and get back to you shortly.",
      },
    });
  } catch (error) {
    console.error("Inquiry creation error:", error);
    return NextResponse.json(
      { error: "Failed to create inquiry" },
      { status: 500 }
    );
  }
}
