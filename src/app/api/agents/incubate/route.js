import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { db } from '@/lib/firebaseAdmin';

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

// This endpoint generates the Level 1 and Level 2 "Global Channel Lore"
// and saves the initial Channel Profile to Firestore.
export async function POST(request) {
  try {
    const { niche, config } = await request.json();

    if (!niche || !config) {
      return NextResponse.json({ error: "Missing niche or configuration" }, { status: 400 });
    }

    console.log("Incubating Channel for Niche:", niche.niche);

    const systemPrompt = `You are a Master YouTube Architect building the "Global Channel Lore" for a highly profitable media empire.
The user is incubating a new channel in the "${niche.niche}" niche.
Vibe Override: ${config.vibe || "Use industry best practices"}
Revenue Strategy: ${Object.keys(config.revenue).filter(k => config.revenue[k]).join(", ")}
Content Format: ${config.format}

Generate a structured JSON output defining the Level 1 (Channel Lore) and Level 2 (Playlist/Arc Strategy).
Ensure you incorporate specific call-to-action hooks for the enabled revenue streams.`;

    const { object } = await generateObject({
      model: google('gemini-2.5-flash'),
      system: systemPrompt,
      prompt: "Generate the Global Channel Lore JSON.",
      schema: {
        type: 'object',
        properties: {
          level_1_channel_lore: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'A highly clickable, brandable channel name' },
              brand_voice: { type: 'string', description: 'The tone, pacing, and style of the channel' },
              revenue_stack_injections: { 
                type: 'array', 
                items: { type: 'string' },
                description: 'Specific instructions for how to inject the selected revenue streams into future scripts'
              }
            },
            required: ['name', 'brand_voice', 'revenue_stack_injections']
          },
          level_2_playlist_arc: {
            type: 'object',
            properties: {
              theme: { type: 'string' },
              progression: { type: 'string' }
            },
            required: ['theme', 'progression']
          }
        },
        required: ['level_1_channel_lore', 'level_2_playlist_arc']
      }
    });

    const channelProfile = {
      createdAt: new Date().toISOString(),
      nicheData: niche,
      config: config,
      globalLore: object,
      status: "incubating",
      metrics: {
        estimatedRevenue: 0,
        views: 0,
        subscribers: 0
      }
    };

    // Save to Firestore
    const docRef = await db.collection("channels").add(channelProfile);

    return NextResponse.json({ 
      success: true, 
      channelId: docRef.id,
      data: channelProfile
    });

  } catch (error) {
    console.error("Incubation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
