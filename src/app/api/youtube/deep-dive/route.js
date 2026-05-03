import { NextResponse } from 'next/server';
import { tavilySearch } from '@/lib/tavilyClient';
import { getModelForTask, getThinkingBudget } from '@/lib/modelRouter';
import { logUsage } from '@/lib/costTracker';
import { adminDb as db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(request) {
  try {
    const { parentNiche, targetAudienceVibe } = await request.json();

    if (!parentNiche) {
      return NextResponse.json({ error: 'parentNiche is required' }, { status: 400 });
    }

    console.log(`[DeepDive] Generating Channel Blueprint for: ${parentNiche}`);

    // 1. Live Research (Market Successes and Gaps)
    const tavilyQueries = [
      `Top performing YouTube channels in ${parentNiche} 2026 strategies`,
      `Biggest complaints or missing content in ${parentNiche} YouTube videos reddit`,
      `How to stand out in the ${parentNiche} niche on YouTube`,
      `${parentNiche} target audience demographics and psychographics`
    ];

    const tavilyResults = await Promise.all(
      tavilyQueries.map(q => tavilySearch(q, {
        searchDepth: 'advanced',
        maxResults: 4,
        includeAnswer: true
      }))
    );

    const tavilyContext = tavilyResults
      .map((result, i) => {
        if (result.error) return `[Query ${i + 1}: ${result.error}]`;
        const answer = result.answer ? `Summary: ${result.answer}` : '';
        const sources = result.results
          .map(r => `- ${r.title}: ${r.content?.substring(0, 250)}`)
          .join('\n');
        return `[RESEARCH: "${tavilyQueries[i]}"]\n${answer}\n${sources}`;
      })
      .join('\n\n---\n\n');

    // 2. Gemini Generation
    const { GoogleGenAI } = await import('@google/genai');
    const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const { model: modelName } = getModelForTask('niche_analysis'); // Using the heavy model
    const thinkingBudget = getThinkingBudget('niche_analysis');

    const systemPrompt = `You are a world-class YouTube Channel Architect. 
Your goal is to build a comprehensive "Strategic Channel Blueprint" for a new channel entering a specific niche.

CRITICAL RULES:
- Focus heavily on 'Market Successes' (what top competitors do well that we must replicate) and 'Market Gaps' (what competitors ignore that we can dominate).
- The 'Channel Lore' should describe the overarching thematic universe, aesthetic, and unique value proposition.
- Base your analysis on the provided Live Research Data.
- Return STRICTLY valid JSON matching the exact schema requested.`;

    const userPrompt = `Parent Niche: ${parentNiche}
Target Audience Vibe (from Matrix): ${targetAudienceVibe || 'Determine best vibe'}
    
Live Market Research Data:
${tavilyContext}

Return valid JSON in this format:
{
  "blueprint": {
    "channelLore": {
      "theme": "The overarching theme/aesthetic",
      "uniqueValueProposition": "The 1-sentence hook that makes this channel different",
      "visualStyle": "Specific color grading, editing pace, and visual hooks"
    },
    "targetAudience": {
      "demographics": "Age, gender, location",
      "psychographics": "Fears, desires, pain points",
      "idealViewerPersona": "A short paragraph describing the exact person watching"
    },
    "marketSuccesses": [
      "Detail #1 that top competitors do perfectly",
      "Detail #2 that drives massive retention in this niche"
    ],
    "marketGaps": [
      "Gap #1 that competitors miss (e.g., they are too slow, too boring, etc)",
      "Gap #2 (e.g., an underserved sub-topic)"
    ],
    "successMetrics": {
      "targetCtr": "e.g. 8-12%",
      "targetAvd": "e.g. 45%+",
      "primaryMonetization": "The #1 way this channel will make money quickly"
    }
  }
}`;

    const result = await genai.models.generateContent({
      model: modelName,
      contents: userPrompt,
      systemInstruction: systemPrompt,
      config: {
        thinkingConfig: { thinkingBudget },
        temperature: 0.3
      }
    });

    const usage = result.usageMetadata || {};
    await logUsage({
      service: 'gemini_api',
      operation: 'deep_dive_blueprint',
      model: modelName,
      inputTokens: usage.promptTokenCount || 0,
      outputTokens: usage.candidatesTokenCount || 0,
      metadata: { parentNiche }
    });

    const rawText = result.text || '';
    const cleanText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let parsedData;
    try {
      parsedData = JSON.parse(cleanText);
    } catch (e) {
      console.error('[DeepDive] Parse failed:', rawText);
      return NextResponse.json({ error: 'AI returned invalid JSON' }, { status: 422 });
    }

    // Save blueprint to Firestore for persistence
    try {
      await db.collection('youtube_intelligence')
        .doc('blueprints')
        .collection(parentNiche.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase())
        .add({
          createdAt: new Date().toISOString(),
          blueprint: parsedData.blueprint
        });
    } catch (dbErr) {
      console.error('[DeepDive] Failed to save to Firestore:', dbErr);
    }

    return NextResponse.json(parsedData);

  } catch (error) {
    console.error('[DeepDive] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
