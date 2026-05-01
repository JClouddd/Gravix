import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { adminDb as db } from '@/lib/firebaseAdmin';

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

// This endpoint accepts a channel ID, retrieves the Global Lore,
// and generates a Per-Video Execution Script (Level 3/4).
export async function POST(request) {
  try {
    const { channelId, videoTopic } = await request.json();

    if (!channelId || !videoTopic) {
      return NextResponse.json({ error: "Missing channelId or videoTopic" }, { status: 400 });
    }

    // Retrieve Channel Profile from Firestore
    const channelDoc = await db.collection("channels").doc(channelId).get();
    if (!channelDoc.exists) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    const channelData = channelDoc.data();
    const globalLore = channelData.globalLore;
    const config = channelData.config;

    console.log(`Generating Per-Video Script for ${globalLore.level_1_channel_lore.name} on topic: ${videoTopic}`);

    const systemPrompt = `You are an elite YouTube scriptwriter and video architect.
You are writing a script for a channel named "${globalLore.level_1_channel_lore.name}".
Brand Voice: ${globalLore.level_1_channel_lore.brand_voice}
Revenue Injections Required: ${globalLore.level_1_channel_lore.revenue_stack_injections.join(" | ")}
Format Strategy: ${config.format}

If the format is 'funnel', you MUST generate BOTH a long_form script and a short_funnel script designed to hook viewers to the long_form.
Generate a structured JSON output defining Level 3 (Video Concept) and Level 4 (Scene Execution).`;

    const { object } = await generateObject({
      model: google('gemini-2.5-flash'),
      system: systemPrompt,
      prompt: `Write the episode about: ${videoTopic}`,
      schema: {
        type: 'object',
        properties: {
          level_3_video_concept: {
            type: 'object',
            properties: {
              long_form: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  pacing: { type: 'string' },
                  hook: { type: 'string' }
                }
              },
              short_funnel: {
                type: 'object',
                properties: {
                  hook: { type: 'string' },
                  call_to_action: { type: 'string' }
                }
              }
            }
          },
          level_4_scene_execution: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                scene: { type: 'number' },
                visual_prompt: { type: 'string', description: 'Prompt for image generator like Midjourney' },
                audio_prompt: { type: 'string', description: 'Prompt for audio/SFX like Suno' },
                dialogue: { type: 'string', description: 'Spoken script for Voiceover' }
              },
              required: ['scene', 'visual_prompt', 'audio_prompt', 'dialogue']
            }
          }
        },
        required: ['level_3_video_concept', 'level_4_scene_execution']
      }
    });

    // Save the script back to the channel's subcollection
    const scriptRef = await db.collection("channels").doc(channelId).collection("scripts").add({
      createdAt: new Date().toISOString(),
      topic: videoTopic,
      script: object
    });

    return NextResponse.json({ 
      success: true, 
      scriptId: scriptRef.id,
      data: object 
    });

  } catch (error) {
    console.error("Script Generation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
