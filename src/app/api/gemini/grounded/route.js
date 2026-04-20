import { groundedQuery } from "@/lib/geminiClient";
import { logUsage } from "@/lib/costTracker";
import { logRouteError } from "@/lib/errorLogger";

/**
 * POST /api/gemini/grounded
 * Search-grounded queries — live Google Search data
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { query, systemPrompt } = body;

    if (!query || typeof query !== "string") {
      return Response.json(
        { error: "query is required and must be a string" },
        { status: 400 }
      );
    }

    const result = await groundedQuery({
      query,
      ...(systemPrompt && { systemPrompt }),
    });

    // Log usage
    try {
      await logUsage({
        route: "/api/gemini/grounded",
        model: result.model,
        modelTier: result.modelTier,
        inputTokens: result.tokens.input,
        outputTokens: result.tokens.output,
        totalTokens: result.tokens.total,
        cost: result.cost.totalCost,
      });
    } catch (err) {
      logRouteError("gemini", "/api/gemini/grounded error", err, "/api/gemini/grounded");
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
    console.error("[/api/gemini/grounded]", error);
    logRouteError("gemini", "/api/gemini/grounded error", error, "/api/gemini/grounded");
    return Response.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
