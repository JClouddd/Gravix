import { logRouteError } from "@/lib/errorLogger";
import { structuredGenerate } from "@/lib/geminiClient";

export async function GET(request) {
  try {
    const schema = {
      type: "object",
      properties: {
        trends: { type: "array", items: { type: "string" } },
      },
      required: ["trends"]
    };

    const response = await structuredGenerate({
      prompt: "What are the current top 5 trending topics for tech and AI YouTube channels right now? Return an array of short trend titles.",
      systemPrompt: "You are an expert YouTube trends analyst.",
      schema,
      complexity: "flash"
    });

    const parsed = JSON.parse(response.text);
    return Response.json({ trends: parsed.trends });
  } catch (error) {
    await logRouteError(
      "youtube",
      "YouTube Trends API Error",
      error,
      "/api/youtube/trends"
    );
    return Response.json(
      { error: "Failed to fetch trends" },
      { status: 500 }
    );
  }
}
