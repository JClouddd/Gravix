import { scholarChat } from "@/lib/knowledgeEngine";
import { logRouteError } from "@/lib/errorLogger";

/**
 * POST /api/knowledge/review
 * Chat with Scholar about a staged ingestion entry
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { message, stagingEntry, history = [] } = body;

    if (!message) {
      return Response.json(
        { error: "message is required" },
        { status: 400 }
      );
    }

    if (!stagingEntry) {
      return Response.json(
        { error: "stagingEntry is required — include the entry to review" },
        { status: 400 }
      );
    }

    const result = await scholarChat(message, stagingEntry, history);

    return Response.json({
      response: result.text,
      model: result.model,
      tokens: result.tokens,
      cost: result.cost,
    });
  } catch (error) {
    console.error("[/api/knowledge/review]", error);
    logRouteError("discovery", "/api/knowledge/review error", error, "/api/knowledge/review");
    return Response.json(
      { error: error.message || "Review chat failed" },
      { status: 500 }
    );
  }
}
