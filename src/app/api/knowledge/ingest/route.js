import { classifyContent, processUrl, createStagingEntry } from "@/lib/knowledgeEngine";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { logRouteError } from "@/lib/errorLogger";
import { DocumentServiceClient } from "@google-cloud/discoveryengine";
import * as cheerio from "cheerio";
import crypto from "crypto";

const discoveryClient = new DocumentServiceClient({
  apiEndpoint: "us-discoveryengine.googleapis.com",
});

/**
 * POST /api/knowledge/ingest
 * Submit content for ingestion — processes, classifies, and stages for review.
 * Supports: text, url, youtube, file
 * Auto-detects YouTube URLs when type is "url"
 */
export async function POST(request) {
  try {
    const body = await request.json();
    let { content, type = "text", title = "", source = "manual", fileName = "" } = body;

    if (Array.isArray(content)) {
      const projectId = process.env.GOOGLE_CLOUD_PROJECT || "antigravity-hub-jcloud";
      const location = process.env.GOOGLE_CLOUD_REGION || "us-east4";
      const dataStoreId = process.env.VERTEX_DATASTORE_ID || "knowledge-vault";
      const parent = `projects/${projectId}/locations/${location}/collections/default_collection/dataStores/${dataStoreId}/branches/0`;

      const documents = [];

      for (const url of content) {
        try {
          const res = await fetch(url);
          const html = await res.text();
          const $ = cheerio.load(html);
          const textContent = $('body').text().replace(/\s+/g, ' ').trim();

          const id = crypto.createHash("md5").update(url).digest("hex");

          documents.push({
            id,
            jsonData: JSON.stringify({ url, content: textContent })
          });
        } catch (err) {
          console.error(`Failed to scrape ${url}:`, err);
        }
      }

      if (documents.length > 0) {
        try {
          await discoveryClient.importDocuments({
            parent,
            inlineSource: { documents }
          });
          return Response.json({ success: true, imported: documents.length });
        } catch (err) {
          logRouteError("discovery", "Discovery Engine import error", err, "/api/knowledge/ingest");
          return Response.json({ error: "Discovery Engine import failed: " + err.message }, { status: 500 });
        }
      }
      return Response.json({ error: "No documents processed" }, { status: 400 });
    }

    if (!content) {
      return Response.json(
        { error: "content is required (text, URL, or file content)" },
        { status: 400 }
      );
    }

    // Auto-detect YouTube URLs
    const youtubeRegex = /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/;
    if ((type === "url" || type === "youtube") && youtubeRegex.test(content)) {
      type = "youtube";
    }

    // ── YouTube Video Ingestion ──
    if (type === "youtube") {
      try {
        const videoUrl = new URL("/api/knowledge/ingest-video", request.url);
        const videoRes = await fetch(videoUrl.toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: content, title }),
        });
        const data = await videoRes.json();
        if (!videoRes.ok) {
          return Response.json(data, { status: videoRes.status });
        }
        return Response.json(data);
      } catch (err) {
        logRouteError("discovery", "/api/knowledge/ingest error", err, "/api/knowledge/ingest");
      return Response.json({ error: "Video ingestion failed: " + err.message }, { status: 500 });
      }
    }

    // ── URL Ingestion ──
    if (type === "url") {
      try {
        const urlObj = new URL("/api/knowledge/ingest-url", request.url);
        const internalResponse = await fetch(urlObj.toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: content, type: "webpage" }),
        });
        const data = await internalResponse.json();
        if (!internalResponse.ok) {
          return Response.json(data, { status: internalResponse.status });
        }
        return Response.json(data);
      } catch (err) {
        logRouteError("discovery", "/api/knowledge/ingest error", err, "/api/knowledge/ingest");
      return Response.json({ error: "Failed to process URL: " + err.message }, { status: 500 });
      }
    }

    // ── Text / File Ingestion ──
    let processedContent = content;
    let finalTitle = title;

    if (type === "file") {
      try {
        processedContent = Buffer.from(content, "base64").toString("utf-8");
        finalTitle = fileName || title || "Uploaded File";
      } catch (err) {
        logRouteError("discovery", "/api/knowledge/ingest error", err, "/api/knowledge/ingest");
      return Response.json({ error: "Failed to decode file content" }, { status: 400 });
      }
    }

    // Classify the content
    const classification = await classifyContent(processedContent, finalTitle);

    // Create staging entry
    const entry = createStagingEntry({
      content: processedContent,
      title: finalTitle,
      type,
      source,
      classification,
    });

    // Persist to Firestore
    await adminDb.collection("ingestion").doc(entry.id).set(entry);

    // Update knowledge stats
    await adminDb.collection("system").doc("knowledge_stats").set(
      {
        documentsIngested: FieldValue.increment(1),
        documentsStaged: FieldValue.increment(1),
        lastIngest: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Cross-reference analysis
    let crossrefAnalysis = null;
    try {
      const crossrefUrl = new URL("/api/knowledge/crossref", request.url);
      const crossrefRes = await fetch(crossrefUrl.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: finalTitle,
          content: processedContent,
          source: source,
        }),
      });
      if (crossrefRes.ok) {
        const crossrefData = await crossrefRes.json();
        crossrefAnalysis = crossrefData.data?.analysis || null;
      }
    } catch (err) {
      logRouteError("discovery", "/api/knowledge/ingest error", err, "/api/knowledge/ingest");
      console.warn("[knowledge/ingest] Internal crossref call failed:", err);
    }

    // Auto-generate notebook config (pending approval)
    let notebookGenerated = null;
    try {
      const { generateNotebook } = await import("@/lib/notebookGenerator");
      notebookGenerated = await generateNotebook(entry);
    } catch (err) {
      logRouteError("discovery", "/api/knowledge/ingest error", err, "/api/knowledge/ingest");
      console.warn("[knowledge/ingest] Notebook generation skipped:", err.message);
    }

    return Response.json({
      success: true,
      entry: {
        id: entry.id,
        title: entry.title,
        type: entry.type,
        category: classification.category,
        confidence: classification.confidence,
        summary: classification.summary,
        tags: classification.tags,
        status: entry.status,
        crossref: crossrefAnalysis,
        notebook: notebookGenerated ? { id: notebookGenerated.id, name: notebookGenerated.name, status: "pending" } : null,
      },
      message: `Content staged for review. Category: ${classification.category} (${(classification.confidence * 100).toFixed(0)}% confidence)`,
    });
  } catch (error) {
    console.error("[/api/knowledge/ingest]", error);
    logRouteError("discovery", "/api/knowledge/ingest error", error, "/api/knowledge/ingest");
    return Response.json(
      { error: error.message || "Ingestion failed" },
      { status: 500 }
    );
  }
}
