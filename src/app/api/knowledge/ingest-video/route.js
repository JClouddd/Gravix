import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { generate } from "@/lib/geminiClient";
import { logUsage } from "@/lib/costTracker";
import { classifyContent, createStagingEntry } from "@/lib/knowledgeEngine";

/**
 * POST /api/knowledge/ingest-video
 * Ingest a YouTube video via Gemini's native video understanding.
 * Gemini watches the video and extracts structured analysis.
 */

const VIDEO_ANALYSIS_PROMPT = `You are a research analyst. Analyze this video thoroughly and extract ALL information accurately.

Return a JSON object with these fields:
{
  "title": "Video title",
  "summary": "Detailed summary of the core thesis and content (minimum 500 words)",
  "tools": ["Every tool, platform, library, API, or service mentioned with context on how it's used"],
  "strategies": ["Every strategy, framework, mental model, or methodology discussed"],
  "technical_details": ["All code patterns, architectures, configurations, or technical implementations shown"],
  "visual_intelligence": ["Description of any dashboards, UIs, interfaces, diagrams, or visual content shown on screen"],
  "actionable_items": ["Specific things that can be built, automated, integrated, or applied based on this content"],
  "key_quotes": ["Important direct quotes or statements from the speaker(s)"],
  "timestamps": [{"time": "MM:SS", "topic": "What's being discussed at this timestamp"}],
  "people_mentioned": ["Names and roles of people referenced"],
  "links_resources": ["Any URLs, books, papers, or resources mentioned"],
  "raw_transcript_notes": "Detailed notes capturing the full substance of what was said (not summarized — accurate and thorough)"
}

CRITICAL: Do NOT summarize or abbreviate. Capture EVERYTHING discussed in the video with full accuracy and detail. The user wants the raw information, not a condensed version.`;

export async function POST(request) {
  try {
    const body = await request.json();
    const { url, title = "" } = body;

    if (!url) {
      return Response.json({ error: "url is required" }, { status: 400 });
    }

    // Validate it's a YouTube URL
    const youtubeRegex = /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/;
    if (!youtubeRegex.test(url)) {
      return Response.json({ error: "Only YouTube URLs are supported for video ingestion" }, { status: 400 });
    }

    // Extract video ID for reference
    const videoId = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1] || "unknown";

    // Call Gemini with the video URL using fileData
    // Per skill docs: REST API needs File API upload for reliable processing
    // But we can try the direct URL method first and validate token count
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return Response.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
    }

    const startTime = Date.now();

    // Use Gemini REST API with fileData containing YouTube URL
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
                { text: VIDEO_ANALYSIS_PROMPT },
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

    // Extract response
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const promptTokens = geminiData.usageMetadata?.promptTokenCount || 0;
    const outputTokens = geminiData.usageMetadata?.candidatesTokenCount || 0;

    // Validate the video was actually processed (not hallucinated)
    if (promptTokens < 10000) {
      console.warn(`[ingest-video] Low token count (${promptTokens}) — video may not have been processed. Falling back.`);
      // Still save what we got, but flag it
    }

    // Parse the analysis
    let analysis = {};
    try {
      analysis = JSON.parse(responseText);
    } catch {
      analysis = { raw_transcript_notes: responseText, summary: "Failed to parse structured response" };
    }

    // Calculate cost (gemini-2.5-flash-lite pricing)
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

    // Build the full content for storage — raw and accurate, not summarized
    const fullContent = JSON.stringify(analysis, null, 2);

    // Classify the content
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

    // Add video-specific metadata
    entry.videoMeta = {
      videoId,
      url,
      promptTokens,
      outputTokens,
      cost: totalCost,
      executionTime,
      tokenValidation: promptTokens >= 10000 ? "verified" : "low_confidence",
    };
    entry.analysis = analysis;

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

    // Auto-generate notebook
    let notebookGenerated = null;
    try {
      const { generateNotebook } = await import("@/lib/notebookGenerator");
      notebookGenerated = await generateNotebook(entry);
    } catch (err) {
      console.warn("[ingest-video] Notebook generation skipped:", err.message);
    }

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
        tokenValidation: promptTokens >= 10000 ? "✅ Video processed" : "⚠️ Low confidence — video may not have fully processed",
      },
      message: `Video analyzed successfully. Cost: $${totalCost.toFixed(4)}. ${Object.keys(analysis).length} analysis fields extracted.`,
    });
  } catch (error) {
    console.error("[/api/knowledge/ingest-video]", error);
    return Response.json(
      { error: error.message || "Video ingestion failed" },
      { status: 500 }
    );
  }
}
