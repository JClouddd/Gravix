import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { generate } from "@/lib/geminiClient";
import { logUsage } from "@/lib/costTracker";
import { classifyContent, createStagingEntry } from "@/lib/knowledgeEngine";

/**
 * POST /api/knowledge/ingest-video
 * Ingest a YouTube video via Gemini's native video understanding.
 * Also fetches video description and comments via YouTube Data API.
 * Gemini watches the video and extracts comprehensive structured analysis.
 */

const VIDEO_ANALYSIS_PROMPT = `You are a senior technical research analyst for an AI operating system called Gravix, built entirely on Google Cloud infrastructure (Gemini, Firebase, Cloud Run, Vertex AI).

Analyze this video with MAXIMUM depth and extract every piece of useful information.

Return a JSON object with ALL of these fields:
{
  "title": "Video title",
  "summary": "Detailed summary of the core thesis and content (minimum 500 words)",

  "tools_and_software": [
    {"name": "Tool name", "type": "library|framework|api|platform|cli|service", "purpose": "How it's used in the video", "url": "If mentioned"}
  ],

  "integrations_and_apis": [
    {"name": "API/integration name", "type": "rest|sdk|webhook|oauth|grpc", "description": "What it connects and how", "auth_method": "If mentioned"}
  ],

  "beta_preview_features": [
    {"feature": "Feature name", "platform": "Which platform", "status": "beta|preview|experimental|alpha", "potential_use": "How we could leverage this in Gravix"}
  ],

  "visual_elements": [
    {"timestamp": "MM:SS", "type": "ui|diagram|infographic|code|terminal|dashboard", "description": "Detailed description of what's shown on screen"}
  ],

  "code_snippets": [
    {"language": "python|javascript|yaml|etc", "purpose": "What it does", "code_description": "Detailed description of the code shown", "key_patterns": ["Notable patterns or techniques used"]}
  ],

  "step_by_step_procedures": [
    {"title": "Procedure name", "steps": ["Step 1", "Step 2", "..."], "prerequisites": ["Required tools or setup"]}
  ],

  "configuration_shown": [
    {"type": "env_var|config_file|settings|cli_flag", "name": "Config name", "value_or_example": "What was shown", "context": "Why it matters"}
  ],

  "links_and_resources": [
    {"url": "URL if mentioned", "type": "docs|repo|paper|tool|article", "description": "What it is"}
  ],

  "key_quotes": ["Important verbatim statements from the speaker(s)"],

  "people_and_organizations": [
    {"name": "Name", "role": "Their role/title", "organization": "Company/project"}
  ],

  "timestamps": [
    {"time": "MM:SS", "topic": "What's being discussed"}
  ],

  "strategies_and_patterns": [
    {"name": "Strategy/pattern name", "description": "How it works", "applicability": "How it could apply to our system"}
  ],

  "google_infrastructure_mapping": {
    "description": "Map every non-Google tool/concept mentioned to its Google Cloud equivalent",
    "mappings": [
      {"source_tool": "e.g. Claude Code", "google_equivalent": "e.g. Jules / Gemini Code Assist", "migration_notes": "What would change in implementation", "feasibility": "easy|moderate|complex"}
    ]
  },

  "actionable_items": [
    {"action": "What to build or implement", "priority": "high|medium|low", "effort": "small|medium|large", "google_services_needed": ["List of Google services required"]}
  ],

  "raw_transcript_notes": "Detailed notes capturing the FULL substance of what was said — every important point, not summarized. This should be the most thorough section."
}

CRITICAL RULES:
1. Do NOT summarize or abbreviate. Capture EVERYTHING with full accuracy.
2. For ANY non-Google tool mentioned, ALWAYS provide the google_infrastructure_mapping.
3. Flag ALL beta/preview features — these are high-value intelligence.
4. Describe ALL visual elements — dashboards, code on screen, diagrams.
5. Capture ALL code patterns shown, even partially visible ones.`;

/**
 * Fetch YouTube video metadata (description, comments) via YouTube Data API
 */
async function fetchYouTubeMetadata(videoId, apiKey) {
  const metadata = { description: "", comments: [], chapters: [] };

  try {
    // Fetch video snippet (title, description, tags)
    const snippetRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`
    );
    if (snippetRes.ok) {
      const data = await snippetRes.json();
      const snippet = data.items?.[0]?.snippet;
      if (snippet) {
        metadata.description = snippet.description || "";
        metadata.channelTitle = snippet.channelTitle || "";
        metadata.publishedAt = snippet.publishedAt || "";
        metadata.tags = snippet.tags || [];
      }
    }

    // Fetch top comments (up to 20)
    const commentsRes = await fetch(
      `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=20&order=relevance&key=${apiKey}`
    );
    if (commentsRes.ok) {
      const data = await commentsRes.json();
      metadata.comments = (data.items || []).map(item => ({
        author: item.snippet?.topLevelComment?.snippet?.authorDisplayName,
        text: item.snippet?.topLevelComment?.snippet?.textDisplay,
        likes: item.snippet?.topLevelComment?.snippet?.likeCount,
      }));
    }
  } catch (err) {
    console.warn("[ingest-video] YouTube metadata fetch failed:", err.message);
  }

  return metadata;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { url, title = "", supplementary = null } = body;

    if (!url) {
      return Response.json({ error: "url is required" }, { status: 400 });
    }

    // Validate YouTube URL
    const youtubeRegex = /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/;
    if (!youtubeRegex.test(url)) {
      return Response.json({ error: "Only YouTube URLs are supported" }, { status: 400 });
    }

    // Extract video ID
    const videoId = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1] || "unknown";

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return Response.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
    }

    // Fetch YouTube metadata (description, comments) in parallel with video analysis
    const metadataPromise = fetchYouTubeMetadata(videoId, geminiApiKey);

    const startTime = Date.now();

    // Build the prompt — include supplementary context if provided
    let fullPrompt = VIDEO_ANALYSIS_PROMPT;
    if (supplementary) {
      fullPrompt += `\n\n--- SUPPLEMENTARY CONTEXT PROVIDED BY USER ---\n`;
      if (supplementary.repos) {
        fullPrompt += `\nGit Repositories:\n${supplementary.repos.map(r => `- ${r}`).join("\n")}`;
      }
      if (supplementary.prompts) {
        fullPrompt += `\nRelated Prompts/Instructions:\n${supplementary.prompts}`;
      }
      if (supplementary.notes) {
        fullPrompt += `\nAdditional Notes:\n${supplementary.notes}`;
      }
      fullPrompt += `\n--- END SUPPLEMENTARY CONTEXT ---\nIncorporate this context into your analysis. Cross-reference the video content with the provided repos and prompts.`;
    }

    // Call Gemini with the video
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  fileData: {
                    mimeType: "video/*",
                    fileUri: url,
                  },
                },
                { text: fullPrompt },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 16384,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errData = await geminiRes.json().catch(() => ({}));
      return Response.json(
        { error: `Gemini API error: ${errData.error?.message || geminiRes.statusText}` },
        { status: 502 }
      );
    }

    const geminiData = await geminiRes.json();
    const executionTime = Date.now() - startTime;

    // Get YouTube metadata (awaited from parallel call)
    const ytMetadata = await metadataPromise;

    // Extract response
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const promptTokens = geminiData.usageMetadata?.promptTokenCount || 0;
    const outputTokens = geminiData.usageMetadata?.candidatesTokenCount || 0;

    // Token validation
    if (promptTokens < 10000) {
      console.warn(`[ingest-video] Low token count (${promptTokens}) — video may not have been processed.`);
    }

    // Parse the analysis — robust handling for various Gemini response formats
    let analysis = {};
    let parseSuccess = false;

    // Strategy 1: Direct JSON parse
    try {
      analysis = JSON.parse(responseText);
      parseSuccess = true;
    } catch {
      // Strategy 2: Clean markdown code fences (```json ... ```)
      try {
        const cleaned = responseText
          .replace(/^```(?:json)?\s*\n?/i, "")
          .replace(/\n?```\s*$/i, "")
          .trim();
        analysis = JSON.parse(cleaned);
        parseSuccess = true;
      } catch {
        // Strategy 3: Extract first JSON object from response
        try {
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            analysis = JSON.parse(jsonMatch[0]);
            parseSuccess = true;
          }
        } catch {
          // All parse strategies failed
        }
      }
    }

    // Strategy 4: If parsing failed, retry with a simpler extraction prompt
    if (!parseSuccess && responseText.length > 100) {
      console.warn("[ingest-video] JSON parse failed. Retrying with extraction prompt...");
      try {
        const retryRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `Extract structured data from this video analysis text. Return ONLY valid JSON with these fields: title, summary, tools_and_software (array of {name, type, purpose}), strategies_and_patterns (array of {name, description}), actionable_items (array of {action, priority}), raw_transcript_notes (string). Here is the text:\n\n${responseText.slice(0, 30000)}`,
                }],
              }],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 8192,
                responseMimeType: "application/json",
              },
            }),
          }
        );
        if (retryRes.ok) {
          const retryData = await retryRes.json();
          const retryText = retryData.candidates?.[0]?.content?.parts?.[0]?.text || "";
          try {
            analysis = JSON.parse(retryText);
            parseSuccess = true;
            console.log("[ingest-video] Retry parse succeeded.");
          } catch {
            // Even retry failed — use raw text
          }
        }
      } catch (retryErr) {
        console.warn("[ingest-video] Retry extraction failed:", retryErr.message);
      }
    }

    // Final fallback: store as raw notes
    if (!parseSuccess) {
      analysis = {
        title: title || `YouTube Video: ${videoId}`,
        summary: responseText.slice(0, 2000),
        raw_transcript_notes: responseText,
        tools_and_software: [],
        integrations_and_apis: [],
        beta_preview_features: [],
        actionable_items: [],
        _parseError: true,
      };
    }

    // Sanitize entire analysis object — replace undefined with null for Firestore
    function sanitizeForFirestore(obj) {
      if (obj === null || obj === undefined) return null;
      if (typeof obj !== "object") return obj;
      if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
      const clean = {};
      for (const [k, v] of Object.entries(obj)) {
        clean[k] = v === undefined ? null : sanitizeForFirestore(v);
      }
      return clean;
    }
    analysis = sanitizeForFirestore(analysis);

    // Merge YouTube metadata into analysis (sanitize undefined values for Firestore)
    analysis.youtube_metadata = {
      description: ytMetadata.description || "",
      channelTitle: ytMetadata.channelTitle || "",
      publishedAt: ytMetadata.publishedAt || "",
      tags: ytMetadata.tags || [],
      topComments: ytMetadata.comments || [],
    };

    // Calculate cost
    const inputCost = (promptTokens / 1_000_000) * 0.075;
    const outputCost = (outputTokens / 1_000_000) * 0.30;
    const totalCost = inputCost + outputCost;

    // Log usage
    await logUsage({
      route: "/api/knowledge/ingest-video",
      model: "gemini-2.5-flash-lite",
      agent: "scholar",
      inputTokens: promptTokens,
      outputTokens: outputTokens,
      cost: totalCost,
    });

    // Build full content for storage
    const fullContent = JSON.stringify(analysis, null, 2);

    // Classify
    const classification = await classifyContent(
      analysis.summary || responseText.slice(0, 5000),
      analysis.title || title || `YouTube Video: ${videoId}`
    );

    // Create staging entry
    const entry = createStagingEntry({
      content: fullContent,
      title: analysis.title || title || `YouTube Video: ${videoId}`,
      type: "video_transcript",
      source: url,
      classification,
    });

    // Video-specific metadata
    entry.videoMeta = {
      videoId,
      url,
      promptTokens,
      outputTokens,
      cost: totalCost,
      executionTime,
      tokenValidation: promptTokens >= 10000 ? "verified" : "low_confidence",
      hasSupplementary: !!supplementary,
    };
    entry.analysis = analysis;
    entry.youtubeMetadata = ytMetadata;

    // Persist to Firestore
    await adminDb.collection("ingestion").doc(entry.id).set(entry);

    // Update stats
    await adminDb.collection("system").doc("knowledge_stats").set(
      {
        documentsIngested: FieldValue.increment(1),
        documentsStaged: FieldValue.increment(1),
        videosIngested: FieldValue.increment(1),
        lastIngest: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Auto-generate notebook (always creates one now)
    let notebookGenerated = null;
    try {
      const { generateNotebook } = await import("@/lib/notebookGenerator");
      notebookGenerated = await generateNotebook(entry);
    } catch (err) {
      console.warn("[ingest-video] Notebook generation skipped:", err.message);
    }

    // Trigger research expansion in background (fire-and-forget)
    // This adds tool dossiers, skill specs, Google mappings, and truth validation
    const toolCount = analysis.tools_and_software?.length || 0;
    if (notebookGenerated && toolCount > 0) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "";
      if (baseUrl) {
        fetch(`${baseUrl}/api/knowledge/research-expand`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notebookId: notebookGenerated.id }),
        }).catch(err => console.warn("[ingest-video] Background research failed:", err.message));
        console.log(`[ingest-video] Research expansion triggered for notebook ${notebookGenerated.id}`);
      }
    }

    // Count extraction stats
    const extractionStats = {
      tools: toolCount,
      integrations: analysis.integrations_and_apis?.length || 0,
      betaFeatures: analysis.beta_preview_features?.length || 0,
      codeSnippets: analysis.code_snippets?.length || 0,
      procedures: analysis.step_by_step_procedures?.length || 0,
      googleMappings: analysis.google_infrastructure_mapping?.mappings?.length || 0,
      actionItems: analysis.actionable_items?.length || 0,
      comments: ytMetadata.comments?.length || 0,
    };

    return Response.json({
      success: true,
      entry: {
        id: entry.id,
        title: entry.title,
        type: "video_transcript",
        category: classification.category,
        confidence: classification.confidence,
        tags: classification.tags,
        status: entry.status,
        notebook: notebookGenerated ? { id: notebookGenerated.id, name: notebookGenerated.name, status: "pending" } : null,
      },
      videoMeta: {
        videoId,
        promptTokens,
        outputTokens,
        cost: `$${totalCost.toFixed(4)}`,
        executionTime: `${(executionTime / 1000).toFixed(1)}s`,
        tokenValidation: promptTokens >= 10000 ? "✅ Video processed" : "⚠️ Low confidence",
      },
      extractionStats,
      message: `Video analyzed. Cost: $${totalCost.toFixed(4)}. Extracted: ${extractionStats.tools} tools, ${extractionStats.integrations} integrations, ${extractionStats.betaFeatures} beta features, ${extractionStats.googleMappings} Google mappings, ${extractionStats.comments} comments.`,
    });
  } catch (error) {
    console.error("[/api/knowledge/ingest-video]", error);
    return Response.json(
      { error: error.message || "Video ingestion failed" },
      { status: 500 }
    );
  }
}
