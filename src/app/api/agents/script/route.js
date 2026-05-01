import { structuredGenerate } from "@/lib/geminiClient";
import { logRouteError } from "@/lib/errorLogger";

export async function POST(request) {
  try {
    const body = await request.json();
    const { channelLore } = body;

    if (!channelLore) {
      return Response.json(
        { success: false, error: "Missing required field: channelLore" },
        { status: 400 }
      );
    }

    const scriptSchema = {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
        videoScript: { type: "string" },
        revenueToggles: {
          type: "object",
          properties: {
            adsense: { type: "boolean" },
            digitalProducts: { type: "boolean" },
            affiliateLinks: { type: "boolean" }
          }
        }
      },
      required: ["title", "description", "tags", "videoScript", "revenueToggles"]
    };

    const prompt = `Based on the following Channel Lore, generate a Per-Video Execution Script (Level 3/4 JSON) incorporating dynamic revenue toggles.

    Channel Lore:
    ${JSON.stringify(channelLore, null, 2)}`;

    const response = await structuredGenerate({
      prompt,
      schema: scriptSchema,
      complexity: "flash"
    });

    return Response.json({
      success: true,
      data: JSON.parse(response.text)
    });
  } catch (error) {
    await logRouteError(
      "youtube",
      "YouTube Video Script Generation Error",
      error,
      "/api/agents/script"
    );

    return Response.json(
      { success: false, error: "Failed to generate video script" },
      { status: 500 }
    );
  }
}
