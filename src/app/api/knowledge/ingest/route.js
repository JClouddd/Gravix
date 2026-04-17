import { classifyContent, processUrl, createStagingEntry } from "@/lib/knowledgeEngine";

/**
 * POST /api/knowledge/ingest
 * Submit content for ingestion — processes, classifies, and stages for review
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { content, type = "text", title = "", source = "manual", fileName = "" } = body;

    if (!content) {
      return Response.json(
        { error: "content is required (text, URL, or file content)" },
        { status: 400 }
      );
    }

    // Redirect to /api/knowledge/ingest-url if type is URL
    if (type === "url") {
      try {
        const urlObj = new URL('/api/knowledge/ingest-url', request.url);
        // We will call the other route internally
        const internalResponse = await fetch(urlObj.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: content, type: "webpage" }) // Assuming webpage by default
        });

        const data = await internalResponse.json();

        if (!internalResponse.ok) {
          return Response.json(data, { status: internalResponse.status });
        }

        return Response.json(data);
      } catch (err) {
        return Response.json({ error: "Failed to process URL internally: " + err.message }, { status: 500 });
      }
    }

    let processedContent = content;
    let processedMeta = {};
    let finalTitle = title;

    if (type === "file") {
      // Decode base64
      try {
        processedContent = Buffer.from(content, 'base64').toString('utf-8');
        finalTitle = fileName || title || "Uploaded File";
      } catch (err) {
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

    // TODO: Save to Firestore `ingestion/` collection
    // const db = getFirestore();
    // await db.collection('ingestion').doc(entry.id).set(entry);

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
        ...processedMeta,
      },
      message: `Content staged for review. Category: ${classification.category} (${(classification.confidence * 100).toFixed(0)}% confidence)`,
    });
  } catch (error) {
    console.error("[/api/knowledge/ingest]", error);
    return Response.json(
      { error: error.message || "Ingestion failed" },
      { status: 500 }
    );
  }
}
