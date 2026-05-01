import { logRouteError } from "@/lib/errorLogger";
import { structuredGenerate } from "@/lib/geminiClient";

export async function POST(request) {
  try {
    const payload = await request.json();

    const schema = {
      type: "object",
      properties: {
        channelName: { type: "string" },
        niche: { type: "string" },
        targetAudience: { type: "string" },
        contentStrategy: { type: "string" },
        monetizationPlan: { type: "string" }
      },
      required: ["channelName", "niche", "targetAudience", "contentStrategy", "monetizationPlan"]
    };

    const prompt = `Generate a Global Channel Lore (Level 1/2 JSON) for a new YouTube channel based on this context:
    ${JSON.stringify(payload)}
    Include channel name, niche, target audience, content strategy, and monetization plan.`;

    const result = await structuredGenerate({
      prompt,
      schema,
      complexity: "flash",
      systemPrompt: "You are an expert YouTube channel incubator."
    });

    return Response.json(JSON.parse(result.text));
  } catch (error) {
    logRouteError("agent", "Incubate Agent Failed", error, "/api/agents/incubate");
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
