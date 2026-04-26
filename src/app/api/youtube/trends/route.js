import { logRouteError } from "@/lib/errorLogger";
import { generate } from "@/lib/geminiClient";

export async function GET(request) {
  try {
    const prompt = "List 5 current trending topics in AI, Technology, and Software Development. Return ONLY a JSON array of strings.";
    const response = await generate({
      prompt,
      systemPrompt: "You are a trend analyzer. Output strictly valid JSON.",
      complexity: "flash",
      jsonSchema: {
        type: "array",
        items: { type: "string" }
      }
    });

    let trends = [];
    try {
      trends = JSON.parse(response.text);
    } catch (parseError) {
      throw new Error("Failed to parse Gemini response: " + response.text);
    }

    return Response.json({ trends });
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
