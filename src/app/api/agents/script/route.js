import { logRouteError } from "@/lib/errorLogger";
import { structuredGenerate } from "@/lib/geminiClient";

export async function POST(request) {
  try {
    const payload = await request.json();

    const schema = {
      type: "object",
      properties: {
        scriptTitle: { type: "string" },
        hook: { type: "string" },
        body: { type: "array", items: { type: "string" } },
        callToAction: { type: "string" },
        revenueTogglesUsed: { type: "array", items: { type: "string" } }
      },
      required: ["scriptTitle", "hook", "body", "callToAction", "revenueTogglesUsed"]
    };

    const prompt = `Generate a Per-Video Execution Script (Level 3/4 JSON) incorporating dynamic revenue toggles based on this channel lore context:
    ${JSON.stringify(payload)}
    Include a script title, an engaging hook, a detailed body outline, a call to action, and list which revenue toggles from the context are being used.`;

    const result = await structuredGenerate({
      prompt,
      schema,
      complexity: "flash",
      systemPrompt: "You are an expert YouTube scriptwriter and funnel strategist."
    });

    return Response.json(JSON.parse(result.text));
  } catch (error) {
    logRouteError("agent", "Script Agent Failed", error, "/api/agents/script");
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
