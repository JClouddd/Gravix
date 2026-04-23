import { classifyContent, processUrl, createStagingEntry } from "@/lib/knowledgeEngine";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { logRouteError } from "@/lib/errorLogger";
import { DocumentServiceClient } from "@google-cloud/discoveryengine";

const documentClient = new DocumentServiceClient({
  apiEndpoint: "us-discoveryengine.googleapis.com",
});

/**
 * POST /api/knowledge/ingest
 * Submit content for ingestion — processes, classifies, and stages for review.
 * Supports: text, url, youtube, file, urls
 * Auto-detects YouTube URLs when type is "url"
 */
export async function POST(request) {
  try {
    const body = await request.json();
    let { content, type = "text", title = "", source = "manual", fileName = "", urls = [] } = body;

    if (!content && (!urls || urls.length === 0)) {
      return Response.json(
        { error: "content or urls array is required" },
        { status: 400 }
      );
    }

    // ── Batch URLs Ingestion & Indexing ──
    if (type === "urls" && Array.isArray(urls) && urls.length > 0) {
      try {
        const projectId = process.env.GOOGLE_CLOUD_PROJECT || "antigravity-hub-jcloud";
        const location = process.env.GOOGLE_CLOUD_REGION || "us-east4";
        const dataStoreId = process.env.VERTEX_DATASTORE_ID || "knowledge-vault";
        const parent = `projects/${projectId}/locations/${location}/collections/default_collection/dataStores/${dataStoreId}/branches/default_branch`;

        const documents = [];

        for (const url of urls) {
          try {
             const urlObj = new URL("/api/knowledge/ingest-url", request.url);
             const urlRes = await fetch(urlObj.toString(), {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({ url, type: "webpage" }),
             });

             if (urlRes.ok) {
               const data = await urlRes.json();
               const scrapedContent = data.entry?.content || data.summary || url;
               const scrapedTitle = data.title || url;

               const docId = Buffer.from(url).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 63);
               documents.push({
                 id: docId,
                 jsonData: JSON.stringify({
                   title: scrapedTitle,
                   content: scrapedContent,
                   url: url
                 })
               });
             }
          } catch (err) {
             console.warn(`[knowledge/ingest] Failed to scrape ${url}`, err);
          }
        }

        if (documents.length > 0) {
          const importRequest = {
            parent,
            inlineSource: {
              documents,
            },
          };

          const [operation] = await documentClient.importDocuments(importRequest);

          return Response.json({
            success: true,
            message: `Batch ingestion started for ${documents.length} URLs.`,
            operationName: operation.name,
          });
        } else {
          return Response.json({ error: "Failed to scrape any of the provided URLs." }, { status: 400 });
        }
      } catch (err) {
        logRouteError("discovery", "/api/knowledge/ingest batch error", err, "/api/knowledge/ingest");
        return Response.json({ error: "Batch URL ingestion failed: " + err.message }, { status: 500 });
      }
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
