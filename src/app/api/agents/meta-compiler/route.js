import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { adminDb as db } from '@/lib/firebaseAdmin';

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request) {
  try {
    const { channelId } = await request.json();

    if (!channelId) {
      return NextResponse.json({ error: "Missing channelId" }, { status: 400 });
    }

    console.log("Running Meta-Prompt Compiler for Channel:", channelId);

    const channelDoc = await db.collection("channels").doc(channelId).get();
    
    if (!channelDoc.exists) {
      // Return a simulated response if the channel is mock/doesn't exist in DB yet
      if (channelId.startsWith("c") || channelId === "new_channel_tmp") {
         return await runSimulatedCompiler(channelId);
      }
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    const channelData = channelDoc.data();
    return await runCompiler(channelId, channelData);

  } catch (error) {
    console.error("Meta-Compiler Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Simulated compiler for testing without real YouTube Data
async function runSimulatedCompiler(channelId) {
    // 1. Generate Fake Analytics
    const simulatedAnalytics = `
    Recent Video Performance (Last 3 Uploads):
    - Video 1 (Topic: "Why SaaS fails"): CTR 4.2%, AVD 2:15. Sharp drop-off at 0:10.
    - Video 2 (Topic: "Building a CRM"): CTR 6.1%, AVD 4:30. Gradual decline, spike at 3:00 during code review.
    - Video 3 (Topic: "API Limits"): CTR 3.5%, AVD 1:45. Viewers drop when screen is static for >15s.
    `;

    // 2. Call Gemini to analyze
    const systemPrompt = `You are the Meta-Prompt Compiler for an autonomous YouTube Empire.
Your job is to analyze video performance analytics and generate a single, highly actionable "Insight Rule".
This rule will be added to the Channel's "Learning Ledger" to improve future videos.

Target Agent Options: "script" (for writing/pacing), "audio" (for voiceover style), "visuals" (for editing/b-roll), "assembly" (for final pacing), "global" (for all).

Analytics Data:
${simulatedAnalytics}

Identify the biggest point of failure or the biggest success. Generate exactly ONE highly specific insight.`;

    const { object } = await generateObject({
      model: google('gemini-2.5-flash'),
      system: systemPrompt,
      prompt: "Analyze the data and generate a structured insight.",
      schema: {
        type: 'object',
        properties: {
          insight: { type: 'string', description: 'A short description of what was learned (e.g. "Viewers drop during static screens")' },
          reasoning: { type: 'string', description: 'The data-backed reason for this insight.' },
          targetAgent: { type: 'string', enum: ['script', 'audio', 'visuals', 'assembly', 'global'] },
          actionableRule: { type: 'string', description: 'The exact rule to append to the agent prompt (e.g. "Rule: Change visuals every 5 seconds.")' }
        },
        required: ['insight', 'reasoning', 'targetAgent', 'actionableRule']
      }
    });

    // In a real app, we'd save this to Firestore. For the mock UI, we just return it.
    return NextResponse.json({ 
      success: true, 
      simulated: true,
      insight: object
    });
}

async function runCompiler(channelId, channelData) {
   // Real implementation would fetch actual YouTube Analytics API here.
   // We will default to the simulated logic for now until the real OAuth flow is attached to videos.
   return await runSimulatedCompiler(channelId);
}
