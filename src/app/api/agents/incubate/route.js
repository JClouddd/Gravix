import { structuredGenerate } from "@/lib/geminiClient";
import { logRouteError } from "@/lib/errorLogger";

export async function POST(request) {
  try {
    const body = await request.json();
    const { wizardPayload } = body;

    if (!wizardPayload) {
      return Response.json(
        { success: false, error: "Missing required field: wizardPayload" },
        { status: 400 }
      );
    }

    const loreSchema = {
      type: "object",
      properties: {
        channelName: { type: "string" },
        niche: { type: "string" },
        targetAudience: { type: "string" },
        contentStrategy: { type: "string" },
        visualIdentity: {
          type: "object",
          properties: {
            colorPalette: { type: "array", items: { type: "string" } },
            typography: { type: "string" }
          }
        }
      },
      required: ["channelName", "niche", "targetAudience", "contentStrategy", "visualIdentity"]
    };

    const prompt = `Based on the following Wizard Payload, generate the Global Channel Lore (Level 1/2 JSON) for the channel, simulating an agent handoff.

    Wizard Payload:
    ${JSON.stringify(wizardPayload, null, 2)}`;

    const response = await structuredGenerate({
      prompt,
      schema: loreSchema,
      complexity: "flash"
    });

    return Response.json({
      success: true,
      data: JSON.parse(response.text)
    });
  } catch (error) {
    await logRouteError(
      "youtube",
      "YouTube Channel Lore Incubation Error",
      error,
      "/api/agents/incubate"
    );

    return Response.json(
      { success: false, error: "Failed to generate channel lore" },
      { status: 500 }
    );
  }
}
