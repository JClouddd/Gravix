import { NextResponse } from 'next/server';
import { tavilySearch } from '@/lib/tavilyClient';
import { getModelForTask, getThinkingBudget } from '@/lib/modelRouter';
import { logUsage } from '@/lib/costTracker';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request) {
  try {
    const { parentNiche, currentSubNiches = [] } = await request.json();

    if (!parentNiche) {
      return NextResponse.json({ error: 'parentNiche is required' }, { status: 400 });
    }

    console.log(`[MoreSubNiches] Generating alternatives for: ${parentNiche}`);

    // 1. Live Research
    const tavilyQuery = `${parentNiche} sub-niches underserved YouTube opportunities 2026 trending`;
    const tavilyResult = await tavilySearch(tavilyQuery, {
      searchDepth: 'basic',
      maxResults: 5,
      includeAnswer: true
    });

    let tavilyContext = '';
    if (!tavilyResult.error) {
      tavilyContext = `Summary: ${tavilyResult.answer || ''}\nSources:\n` + 
        tavilyResult.results.map(r => `- ${r.title}: ${r.content?.substring(0, 200)}`).join('\n');
    }

    // 2. Gemini Generation
    const { GoogleGenAI } = await import('@google/genai');
    const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const { model: modelName } = getModelForTask('niche_analysis');
    const thinkingBudget = getThinkingBudget('niche_analysis');

    const systemPrompt = `You are a YouTube market intelligence analyst. 
Your goal is to find highly profitable, underserved SUB-NICHES for a given parent niche.

CRITICAL RULES:
- Generate exactly 5 new sub-niches.
- DO NOT duplicate any of these existing sub-niches: ${currentSubNiches.join(', ')}
- Focus on high CPM, low competition, or emerging trends.
- Return STRICTLY valid JSON matching the exact schema requested.`;

    const userPrompt = `Parent Niche: ${parentNiche}
    
Live Market Research Data:
${tavilyContext}

Return valid JSON in this format:
{
  "subNiches": [
    {
      "name": "Sub-Niche Name",
      "whyBetter": "1 sentence on why this is a massive opportunity right now.",
      "cpmModifier": "+15%",
      "competitionLevel": "Lower"
    }
  ]
}`;

    const result = await genai.models.generateContent({
      model: modelName,
      contents: userPrompt,
      systemInstruction: systemPrompt,
      config: {
        thinkingConfig: { thinkingBudget },
        temperature: 0.4,
        responseMimeType: "application/json"
      }
    });

    const usage = result.usageMetadata || {};
    await logUsage({
      service: 'gemini_api',
      operation: 'more_subniches',
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
      console.error('[MoreSubNiches] Parse failed:', rawText);
      return NextResponse.json({ error: 'AI returned invalid JSON' }, { status: 422 });
    }

    return NextResponse.json(parsedData);

  } catch (error) {
    console.error('[MoreSubNiches] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
