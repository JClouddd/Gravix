import { chat } from "@/lib/geminiClient";

/**
 * POST /api/gemini/chat
 * General chat endpoint with complexity routing
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      message,
      history = [],
      systemPrompt = "",
      complexity = "auto",
      grounded = false,
    } = body;

    if (!message || typeof message !== "string") {
      return Response.json(
        { error: "message is required and must be a string" },
        { status: 400 }
      );
    }

    const result = await chat({
      message,
      history,
      systemPrompt,
      complexity,
      grounded,
    });

    return Response.json({
      response: result.text,
      model: result.model,
      modelTier: result.modelTier,
      tokens: result.tokens,
      cost: result.cost,
      duration: result.duration,
      grounded: result.grounded,
    });
  } catch (error) {
    console.error("[/api/gemini/chat]", error);
    return Response.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
