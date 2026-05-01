import { NextResponse } from 'next/server';
import { structuredGenerate } from '@/lib/geminiClient';
import { logRouteError } from '@/lib/errorLogger';

export async function POST(request) {
  try {
    const body = await request.json();

    const schema = {
      type: "object",
      properties: {
        title: { type: "string" },
        hook: { type: "string" },
        outline: {
          type: "array",
          items: {
            type: "object",
            properties: {
              timestamp: { type: "string" },
              section: { type: "string" },
              content: { type: "string" }
            }
          }
        },
        callToAction: { type: "string" },
        monetizationStrategy: { type: "string" }
      },
      required: ["title", "hook", "outline", "callToAction", "monetizationStrategy"]
    };

    const prompt = `Generate a Per-Video Execution Script (Level 3/4 JSON) incorporating dynamic revenue toggles, based on this channel lore: ${JSON.stringify(body)}`;

    const response = await structuredGenerate({
      prompt,
      schema,
      complexity: "flash",
      systemPrompt: "You are an expert YouTube script writer. You write engaging, high-retention scripts optimized for the channel's revenue stack."
    });

    return NextResponse.json({ script: JSON.parse(response.text) });
  } catch (error) {
    await logRouteError("agent", "Agent Script Failed", error, "/api/agents/script");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
