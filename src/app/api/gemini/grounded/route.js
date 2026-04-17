import { groundedQuery } from "@/lib/geminiClient";

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
    return Response.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
