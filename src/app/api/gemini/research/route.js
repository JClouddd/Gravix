import { deepResearch } from "@/lib/geminiClient";
import { logUsage } from "@/lib/costTracker";
import { logRouteError } from "@/lib/errorLogger";

/**
 * POST /api/gemini/research
 * Deep Research — extended thinking, grounded, comprehensive analysis
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { topic, systemPrompt } = body;

    if (!topic || typeof topic !== "string") {
      return Response.json(
        { error: "topic is required and must be a string" },
        { status: 400 }
      );
    }

    // Cost warning for Deep Research
    const estimatedInputTokens = topic.length * 1.3;
    if (estimatedInputTokens > 50000) {
      return Response.json({
        warning: true,
        message: "This research topic is very long. Estimated cost may exceed $0.10. Please confirm.",
        estimatedTokens: Math.round(estimatedInputTokens),
      });
    }

    const result = await deepResearch({
      topic,
      ...(systemPrompt && { systemPrompt }),
    });

    // Log usage
    try {
      await logUsage({
        route: "/api/gemini/research",
        model: result.model,
        modelTier: result.modelTier,
        inputTokens: result.tokens.input,
        outputTokens: result.tokens.output,
        totalTokens: result.tokens.total,
        cost: result.cost.totalCost,
      });
    } catch (err) {
      logRouteError("gemini", "/api/gemini/research error", err, "/api/gemini/research");
      console.warn("[costTracker] Failed to log:", err.message);
    }

    return Response.json({
      response: result.text,
      model: result.model,
      tokens: result.tokens,
      cost: result.cost,
      duration: result.duration,
      groundingMetadata: result.groundingMetadata,
    });
  } catch (error) {
    console.error("[/api/gemini/research]", error);
    logRouteError("gemini", "/api/gemini/research error", error, "/api/gemini/research");
    return Response.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
