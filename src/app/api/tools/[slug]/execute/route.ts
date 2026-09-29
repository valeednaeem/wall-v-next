import { NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import AITool from "@/models/ai-tool";
import AIToolProvider, { type IProviderModel } from "@/models/ai-tool-provider";
import { getAuthUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-middleware";
import { getClientIp, checkRateLimit } from "@/lib/security";
import { checkToolAccess } from "@/lib/tools/access";
import { deductSubscriptionCredits } from "@/lib/tools/subscription";
import { recordExecution, recordFunnelEvent } from "@/lib/tools/recorder";
import { getProviderAdapter } from "@/lib/ai-provider-adapter";
import { generateAIContent } from "@/services/ai";

const bodySchema = z.object({ input: z.string().min(1).max(50000) });

interface Params {
  params: Promise<{ slug: string }>;
}

const DENY_MESSAGES: Record<string, string> = {
  auth_required: "Sign in to use this tool.",
  plan_required: "This tool requires a paid plan.",
  limit_reached: "You have reached your usage limit for this tool.",
  credits_exhausted: "You have used all the credits in your plan. Renew to keep going.",
  input_too_long: "Your input is too long for this tool.",
  not_found: "Tool not found.",
};

export async function POST(request: Request, { params }: Params) {
  try {
    const { slug } = await params;

    let parsed: z.infer<typeof bodySchema>;
    try {
      parsed = bodySchema.parse(await request.json());
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: error.issues[0]?.message || "Invalid input", reason: "input_invalid" },
          { status: 400 }
        );
      }
      throw error;
    }

    await connectToDatabase();
    const tool = await AITool.findOne({ slug, status: "published" }).lean();
    if (!tool) {
      return NextResponse.json({ error: "Tool not found", reason: "not_found" }, { status: 404 });
    }

    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(
      `tool-exec:${slug}:${ip}`,
      tool.usagePolicy?.rateLimitPerMinute || 5,
      60000
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait a moment and try again.", reason: "rate_limited" },
        { status: 429 }
      );
    }

    const user = await getAuthUser();
    const toolId = String(tool._id);
    const access = await checkToolAccess(toolId, user, parsed.input.length, ip);
    if (!access.allowed) {
      if (
        access.reason === "limit_reached" ||
        access.reason === "plan_required" ||
        access.reason === "credits_exhausted"
      ) {
        recordFunnelEvent(toolId, "upgradePrompts");
      }
      const status =
        access.reason === "auth_required" ? 401 : access.reason === "not_found" ? 404 : 403;
      return NextResponse.json(
        {
          error: DENY_MESSAGES[access.reason || ""] || "Access denied.",
          reason: access.reason,
          remainingToday: access.remainingToday,
          remainingMonth: access.remainingMonth,
          freeRemaining: access.freeRemaining,
          remainingCredits: access.remainingCredits,
        },
        { status }
      );
    }

    recordFunnelEvent(toolId, "started");

    const startedAt = Date.now();
    let output = "";
    let model: string | undefined;
    let providerId: string | null = null;
    let inputTokens: number | undefined;
    let outputTokens: number | undefined;
    let estimatedCost = 0;

    try {
      const cfg = tool.aiConfig;
      let modelCfg: IProviderModel | undefined;

      if (cfg?.routing === "provider" && cfg.provider) {
        const providerDoc = await AIToolProvider.findById(cfg.provider).lean();
        if (providerDoc && providerDoc.status === "active") {
          const enabledModels = providerDoc.models.filter((m: IProviderModel) => m.enabled);
          modelCfg =
            (cfg.model
              ? enabledModels.find((m: IProviderModel) => m.name === cfg.model)
              : undefined) || enabledModels[0];
          if (modelCfg) providerId = String(providerDoc._id);
        }
      }

      if (modelCfg) {
        model = modelCfg.name;
        const adapter = getProviderAdapter(modelCfg.name);
        const result = await adapter.chat({
          model: modelCfg.name,
          messages: [{ role: "user", content: parsed.input }],
        });
        output = result.content;
        inputTokens = result.usage.prompt;
        outputTokens = result.usage.completion;
        estimatedCost =
          ((inputTokens || 0) / 1000) * (modelCfg.inputCostPer1k || 0) +
          ((outputTokens || 0) / 1000) * (modelCfg.outputCostPer1k || 0);
      } else {
        output = await generateAIContent([{ role: "user", content: parsed.input }]);
      }
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      const err = error as { code?: string; name?: string; message?: string };
      await recordExecution({
        toolId,
        categoryId: tool.category ? String(tool.category) : undefined,
        userId: user?.userId,
        ip,
        userAgent: request.headers.get("user-agent") || undefined,
        accessModel: tool.accessModel,
        status: "failed",
        creditsConsumed: 0,
        providerId,
        model,
        durationMs,
        errorType: err.code || err.name || "execution_error",
        errorMessage: (err.message || "Execution failed").slice(0, 500),
        estimatedCost: 0,
      });
      console.error(`[ai-tools] execute ${slug} failed:`, error);
      return NextResponse.json(
        { error: "The tool failed to generate a result. Please try again.", reason: "execution_failed" },
        { status: 502 }
      );
    }

    const durationMs = Date.now() - startedAt;
    await recordExecution({
      toolId,
      categoryId: tool.category ? String(tool.category) : undefined,
      userId: user?.userId,
      ip,
      userAgent: request.headers.get("user-agent") || undefined,
      accessModel: tool.accessModel,
      status: "success",
      creditsConsumed: tool.usagePolicy?.creditsPerExecution ?? 0,
      providerId,
      model,
      inputTokens,
      outputTokens,
      durationMs,
      estimatedCost,
    });

    if (tool.accessModel === "subscription" && user) {
      await deductSubscriptionCredits(
        user.userId,
        tool.usagePolicy?.creditsPerExecution ?? 0,
        tool.requiredPlan ? String(tool.requiredPlan) : undefined
      );
    }

    // Refresh remaining quota after the run (same window math as checkToolAccess)
    const refreshed = await checkToolAccess(toolId, user, 0, ip);

    return NextResponse.json({
      success: true,
      output,
      usage: {
        credits: tool.usagePolicy?.creditsPerExecution ?? 0,
        remainingToday: refreshed.remainingToday ?? access.remainingToday,
        freeRemaining: refreshed.freeRemaining ?? access.freeRemaining,
        remainingCredits: refreshed.remainingCredits ?? access.remainingCredits,
      },
    });
  } catch (error) {
    return handleApiError(error, "tools/[slug] execute");
  }
}
