import { NextResponse } from 'next/server';
import { structuredGenerate } from '@/lib/geminiClient';
import { logRouteError } from '@/lib/errorLogger';

export async function POST(request) {
  try {
    const body = await request.json();

    const schema = {
      type: "object",
      properties: {
        channelName: { type: "string" },
        niche: { type: "string" },
        description: { type: "string" },
        targetAudience: { type: "string" },
        contentStrategy: { type: "string" },
        revenueToggles: {
          type: "object",
          properties: {
            contentFormat: { type: "string" },
            revenueStack: { type: "string" }
          }
        }
      },
      required: ["channelName", "niche", "description", "targetAudience", "contentStrategy", "revenueToggles"]
    };

    const prompt = `Generate a Global Channel Lore (Level 1/2 JSON) for a YouTube channel based on this input: ${JSON.stringify(body)}`;

    const response = await structuredGenerate({
      prompt,
      schema,
      complexity: "flash",
      systemPrompt: "You are an expert YouTube channel incubator. You create detailed and actionable channel lore and strategy."
    });

    return NextResponse.json({ lore: JSON.parse(response.text) });
  } catch (error) {
    await logRouteError("agent", "Agent Incubate Failed", error, "/api/agents/incubate");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
