import { NextResponse } from 'next/server';
import { BigQuery } from '@google-cloud/bigquery';
import { tavilySearch } from '@/lib/tavilyClient';
import { getModelForTask, getThinkingBudget } from '@/lib/modelRouter';
import { logUsage } from '@/lib/costTracker';
import { adminDb as db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const bigquery = new BigQuery({ projectId: 'antigravity-hub-jcloud' });

/**
 * Niche Profitability Matrix — Hybrid Intelligence Engine
 * 
 * Three-phase architecture:
 *   Phase A: Pull baseline CPM tiers + API reference data from BigQuery vault
 *   Phase B: Run live global research via Tavily multi-query
 *   Phase C: Fuse vault baseline with live data via Gemini Pro + Google Search grounding
 * 
 * GET  → Returns cached matrix from Firestore (if fresh)
 * POST → Full regeneration with hybrid vault+live data
 */

// ── GET: Return cached matrix ──────────────────────────────────────────────
export async function GET() {
  try {
    const matrixDoc = await db.collection('youtube_intelligence').doc('niche_matrix_latest').get();
    
    if (matrixDoc.exists) {
      const data = matrixDoc.data();
      const ageHours = (Date.now() - new Date(data.generatedAt).getTime()) / (1000 * 60 * 60);
      
      return NextResponse.json({
        status: 'cached',
        data: data.niches,
        marketSnapshot: data.marketSnapshot,
        methodology: data.methodology,
        vaultBaseline: data.vaultBaseline,
        metadata: {
          generatedAt: data.generatedAt,
          ageHours: Math.round(ageHours * 10) / 10,
          dataSources: data.dataSources,
          stale: ageHours > 24
        }
      });
    }
    
    return NextResponse.json({ 
      status: 'empty', 
      message: 'No matrix generated yet. Send a POST request to generate.' 
    });
  } catch (error) {
    console.error('Error fetching cached matrix:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ── POST: Generate fresh matrix ────────────────────────────────────────────
export async function POST(request) {
  try {
    let userParams = {};
    try { userParams = await request.json(); } catch(e) {}
    
    const {
      focusArea = null,
      includeSubNiches = true,
      depth = 'deep'
    } = userParams;

    console.log('[NicheMatrix] Starting hybrid intelligence scan...');
    const startTime = Date.now();

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE A: Pull vault baseline data from BigQuery
    // ═══════════════════════════════════════════════════════════════════════
    
    console.log('[NicheMatrix] Phase A: Pulling vault baseline...');
    let vaultBaseline = {};
    
    try {
      // Pull CPM reference data
      const [cpmRows] = await bigquery.query({
        query: `
          SELECT TO_JSON_STRING(payload) as data 
          FROM \`antigravity_lake.omni_vault\`
          WHERE source_uri = 'deep_research_cpm_niche_matrix_2026'
          LIMIT 1
        `,
        location: 'us-east4'
      });
      
      if (cpmRows.length > 0) {
        vaultBaseline.cpmMatrix = JSON.parse(cpmRows[0].data);
      }

      // Pull YouTube API reference data
      const [apiRows] = await bigquery.query({
        query: `
          SELECT source_uri, TO_JSON_STRING(payload) as data
          FROM \`antigravity_lake.omni_vault\`
          WHERE source_uri IN (
            'google_docs_youtube_analytics_api_metrics',
            'google_docs_youtube_data_api_v3_upload'
          )
        `,
        location: 'us-east4'
      });
      
      for (const row of apiRows) {
        if (row.source_uri.includes('analytics')) {
          vaultBaseline.analyticsApi = JSON.parse(row.data);
        } else if (row.source_uri.includes('upload')) {
          vaultBaseline.uploadApi = JSON.parse(row.data);
        }
      }
      
      console.log(`[NicheMatrix] Phase A complete — ${Object.keys(vaultBaseline).length} vault sources loaded`);
    } catch (vaultErr) {
      console.warn('[NicheMatrix] Vault pull failed (non-critical):', vaultErr.message);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE B: Live global research via Tavily
    // ═══════════════════════════════════════════════════════════════════════
    
    console.log('[NicheMatrix] Phase B: Running live global research...');
    
    const tavilyQueries = [
      'highest CPM YouTube niches 2025 2026 revenue per mille data',
      'fastest growing YouTube categories 2026 emerging trends',
      'faceless YouTube channel niches that make money AI automation',
      'YouTube niche competition analysis low competition high CPM',
      'YouTube sub-niche opportunities underserved audience 2026',
      'YouTube CPM rates by country 2026 US UK Germany Australia India Brazil',
      'YouTube CPM long form vs shorts vs tutorials vs listicles content format rates',
      'Google Trends YouTube search volume data highest traffic topics 2026'
    ];
    
    if (focusArea) {
      tavilyQueries.push(`${focusArea} YouTube niche CPM revenue potential 2026`);
      tavilyQueries.push(`${focusArea} sub-niches underserved YouTube opportunities`);
      tavilyQueries.push(`${focusArea} Google Trends search volume YouTube traffic`);
    }

    const tavilyResults = await Promise.all(
      tavilyQueries.map(q => tavilySearch(q, {
        searchDepth: depth === 'deep' ? 'advanced' : 'basic',
        maxResults: 5,
        includeAnswer: true,
        includeDomains: [
          'socialblade.com', 'tubefilter.com', 'vidiq.com',
          'tubebuddy.com', 'blog.youtube', 'noxinfluencer.com',
          'ezoic.com', 'mediavine.com'
        ]
      }))
    );

    const tavilyContext = tavilyResults
      .map((result, i) => {
        if (result.error) return `[Query ${i + 1}: ${result.error}]`;
        const answer = result.answer ? `Summary: ${result.answer}` : '';
        const sources = result.results
          .map(r => `- ${r.title}: ${r.content?.substring(0, 300)}`)
          .join('\n');
        return `[LIVE RESEARCH: "${tavilyQueries[i]}"]\n${answer}\n${sources}`;
      })
      .join('\n\n---\n\n');

    console.log(`[NicheMatrix] Phase B complete — ${tavilyResults.length} live queries executed`);

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE C: Gemini Pro fusion — Vault baseline × Live signal
    // ═══════════════════════════════════════════════════════════════════════
    
    console.log('[NicheMatrix] Phase C: Gemini Pro hybrid fusion...');
    
    const { GoogleGenAI } = await import('@google/genai');
    const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const { model: modelName } = getModelForTask('niche_analysis');
    const thinkingBudget = getThinkingBudget('niche_analysis');

    // Build the vault context block
    const vaultContext = vaultBaseline.cpmMatrix ? `
VAULT BASELINE DATA (from our curated intelligence database):
CPM Tier Structure:
${JSON.stringify(vaultBaseline.cpmMatrix.tiers, null, 2)}

Key Strategic Factors:
- Demographics: ${vaultBaseline.cpmMatrix.key_factors?.demographics || 'N/A'}
- Geography: ${vaultBaseline.cpmMatrix.key_factors?.geography || 'N/A'}
- Seasonality: ${vaultBaseline.cpmMatrix.key_factors?.seasonality || 'N/A'}
- Faceless Channel Risk: ${vaultBaseline.cpmMatrix.key_factors?.faceless_channels || 'N/A'}
- Format: ${vaultBaseline.cpmMatrix.key_factors?.format || 'N/A'}
- RPM vs CPM: ${vaultBaseline.cpmMatrix.key_factors?.rpm_vs_cpm || 'N/A'}

Strategic Insights:
- Revenue Stacking: ${vaultBaseline.cpmMatrix.strategic_insights?.revenue_stacking || 'N/A'}
- Niche vs Volume: ${vaultBaseline.cpmMatrix.strategic_insights?.niche_vs_volume || 'N/A'}
- AI Automation Risk: ${vaultBaseline.cpmMatrix.strategic_insights?.ai_automation_risk || 'N/A'}

YouTube API Capabilities:
- Upload quota: ${vaultBaseline.uploadApi?.quota_management?.daily_quota || '10,000 units'} per day
- Upload cost: ${vaultBaseline.uploadApi?.quota_management?.videos_insert_cost || '1600'} units per video
- Max uploads/day: ${vaultBaseline.uploadApi?.quota_management?.max_uploads_per_day || '~6'}
- Available operations: videos.insert, thumbnails.set, playlistItems.insert
- Multi-channel routing: ${vaultBaseline.uploadApi?.multi_channel_routing?.strategy || 'Separate OAuth per channel'}
` : '';

    const systemPrompt = `You are a senior YouTube market intelligence analyst performing a HYBRID analysis.

You have TWO data sources:
1. VAULT BASELINE — Curated reference data from our intelligence database with known CPM tiers and strategic frameworks
2. LIVE SIGNAL — Real-time web research from today's internet

Your job is to COMPARE and CALIBRATE these two sources:
- Where live data confirms the vault baseline, note the agreement
- Where live data DIFFERS from the vault baseline, highlight the discrepancy and explain why
- For each niche, show BOTH the vault's predicted CPM range AND the live market estimate

CRITICAL RULES:
- Always cite whether data comes from [VAULT] or [LIVE] or [BOTH]
- Factor in current seasonality (current month: ${new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })})
- Flag any "faceless channel risks" based on the vault's warning data
- Include revenue stacking potential (AdSense + affiliates + products + sponsorships)
- Evaluate AI automation viability with specific tools (Veo 3.1, Imagen 4, ElevenLabs, LLMs)
- Consider the YouTube API quota constraint: max ~6 uploads/day with default quota
- Incorporate Google/YouTube SEARCH TRENDS and volume metrics into the trend analysis where possible
- For EACH niche, generate a highly specific \`targetAudienceVibe\` that outlines the exact pacing, tone, and demographic profile needed
- For EACH niche, provide geographic CPM breakdowns by country tier (Tier 1: US/UK/CA/AU/DE, Tier 2: FR/JP/KR/NL, Tier 3: BR/MX/IN/PH)
- For EACH niche, provide CPM/RPM rates broken down by content FORMAT (long-form 10+min, short-form <60s, tutorials, listicles, documentary, commentary)`;

    const userPrompt = `Perform a HYBRID niche intelligence analysis using both our vault baseline and live research data.
${focusArea ? `\nFOCUS AREA: Prioritize "${focusArea}" but include other opportunities.\n` : ''}
${vaultContext}

LIVE RESEARCH DATA & SEARCH TRENDS:
${tavilyContext}

Return STRICTLY valid JSON (no markdown) in this format:
{
  "generatedAt": "${new Date().toISOString()}",
  "currentSeason": "Q2 2026 — post-Q4 CPM correction period",
  "marketSnapshot": "2-3 sentence summary comparing vault predictions to current reality",
  "niches": [
    {
      "rank": 1,
      "niche": "Main Niche Name",
      "vaultCpmRange": "$15–$65+",
      "vaultTier": 1,
      "liveCpmEstimate": { "low": 18.00, "high": 42.00 },
      "cpmSource": "BOTH — vault confirmed by live data, adjusted for Q2 seasonal dip",
      "competition": "Medium",
      "automationScore": 8,
      "automationTools": ["Veo 3.1 for B-roll", "ElevenLabs for voiceover", "Gemini for scripts"],
      "automationNotes": "Detailed explanation",
      "facelessViability": "High|Medium|Low",
      "facelessRisk": "Specific risk if applicable",
      "trendDirection": "Growing",
      "trendDetails": "Specific data incorporating search volumes and Google Trends",
      "targetAudienceVibe": "Dark, gritty, fast-paced hook-heavy style for 18-24yo males",
      "audience": { "age": "25-54", "gender": "Mixed", "topCountries": ["US", "UK", "DE"] },
      "contentFormat": "Recommended primary format",
      "estimatedViewsPerVideo": "10K-50K",
      "geoCpm": {
        "tier1": { "countries": ["US", "UK", "CA", "AU", "DE"], "cpmRange": "$18–$42", "multiplier": "1x (baseline)" },
        "tier2": { "countries": ["FR", "JP", "KR", "NL"], "cpmRange": "$8–$20", "multiplier": "0.5x" },
        "tier3": { "countries": ["BR", "MX", "IN", "PH"], "cpmRange": "$1–$5", "multiplier": "0.1x" },
        "bestCountry": "US",
        "note": "Why this niche performs differently across regions"
      },
      "formatRates": {
        "longForm": { "format": "10-20 min deep dives", "cpm": "$X", "why": "Multiple mid-roll ad slots" },
        "shorts": { "format": "<60s vertical", "cpm": "$0.05-$0.15", "why": "Shorts fund = low CPM" },
        "tutorials": { "format": "How-to / educational", "cpm": "$X", "why": "High intent audience" },
        "listicles": { "format": "Top 10 / ranked lists", "cpm": "$X", "why": "High retention" },
        "bestFormat": "The specific format that maximizes revenue for THIS niche",
        "formatStrategy": "How to combine formats for max reach + revenue"
      },
      "revenueStack": {
        "adsense": "Primary — $X/1000 views",
        "affiliates": "High potential — specific programs",
        "digitalProducts": "Course/ebook viability",
        "sponsorships": "Brand deal potential"
      },
      "seasonality": "Q4 spike +40%, Q1 dip -20%",
      "uploadsPerWeek": 3,
      "timeToFirstRevenue": "2-4 months",
      "subNiches": [
        {
          "name": "Sub-Niche Name",
          "whyBetter": "More specific, less competition",
          "cpmModifier": "+15%",
          "competitionLevel": "Lower"
        }
      ],
      "compositeScore": 8.5,
      "quickWin": true,
      "reasoning": "Cite specific [VAULT] and [LIVE] data points"
    }
  ],
  "methodology": "Hybrid fusion: Vault baseline calibrated with live Tavily + Google Search data",
  "apiCapabilities": {
    "dailyUploadCapacity": 6,
    "quotaCostPerUpload": 1600,
    "totalDailyQuota": 10000,
    "availableOperations": ["videos.insert", "thumbnails.set", "playlistItems.insert"]
  },
  "dataSources": ["BigQuery vault", "Tavily", "Google Search"]
}

Generate at least 8 niches${includeSubNiches ? ', each with 2-4 sub-niches' : ''}. Order by compositeScore descending.`;

    const result = await genai.models.generateContent({
      model: modelName,
      contents: userPrompt,
      systemInstruction: systemPrompt,
      config: {
        thinkingConfig: { thinkingBudget },
        temperature: 0.2,
        tools: [{ googleSearch: {} }]
      }
    });

    const usage = result.usageMetadata || {};
    await logUsage({
      service: 'gemini_api',
      operation: 'niche_matrix_hybrid',
      model: modelName,
      inputTokens: usage.promptTokenCount || 0,
      outputTokens: usage.candidatesTokenCount || 0,
      metadata: { focusArea, depth, vaultSourcesUsed: Object.keys(vaultBaseline).length, tavilyQueriesUsed: tavilyQueries.length }
    });

    const rawText = result.text || '';
    const cleanText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let matrixData;
    try {
      matrixData = JSON.parse(cleanText);
    } catch (parseError) {
      console.error('[NicheMatrix] Parse failed:', rawText.substring(0, 500));
      return NextResponse.json({ 
        error: 'AI returned invalid JSON. Try again.',
        rawPreview: rawText.substring(0, 500)
      }, { status: 422 });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Save to Firestore (latest + historical snapshot)
    // ═══════════════════════════════════════════════════════════════════════
    
    const totalTime = Date.now() - startTime;
    
    const saveData = {
      generatedAt: new Date().toISOString(),
      niches: matrixData.niches || [],
      marketSnapshot: matrixData.marketSnapshot || '',
      methodology: matrixData.methodology || '',
      currentSeason: matrixData.currentSeason || '',
      apiCapabilities: matrixData.apiCapabilities || {},
      dataSources: matrixData.dataSources || [],
      vaultBaseline: {
        tiersLoaded: !!vaultBaseline.cpmMatrix,
        analyticsApiLoaded: !!vaultBaseline.analyticsApi,
        uploadApiLoaded: !!vaultBaseline.uploadApi
      },
      focusArea,
      depth,
      researchTimeMs: totalTime,
      modelUsed: modelName,
      tokensUsed: { input: usage.promptTokenCount || 0, output: usage.candidatesTokenCount || 0 }
    };
    
    await db.collection('youtube_intelligence').doc('niche_matrix_latest').set(saveData);
    await db.collection('youtube_intelligence')
      .doc(`niche_matrix_${new Date().toISOString().split('T')[0]}`)
      .set(saveData);

    console.log(`[NicheMatrix] Complete in ${totalTime}ms — ${matrixData.niches?.length || 0} niches, hybrid fusion`);

    return NextResponse.json({
      status: 'success',
      data: matrixData,
      metadata: {
        researchTimeMs: totalTime,
        vaultSourcesUsed: Object.keys(vaultBaseline).length,
        tavilyQueriesUsed: tavilyQueries.length,
        modelUsed: modelName,
        tokensUsed: usage
      }
    });

  } catch (error) {
    console.error('[NicheMatrix] Generation failed:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate matrix' }, { status: 500 });
  }
}
