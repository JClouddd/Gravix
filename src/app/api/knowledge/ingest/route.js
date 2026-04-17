import { classifyContent, processUrl, createStagingEntry } from "@/lib/knowledgeEngine";

/**
 * POST /api/knowledge/ingest
 * Submit content for ingestion — processes, classifies, and stages for review
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { content, type = "text", title = "", source = "manual" } = body;

    if (!content) {
      return Response.json(
        { error: "content is required (text, URL, or file content)" },
        { status: 400 }
      );
    }

    let processedContent = content;
    let processedMeta = {};

    // If URL, fetch and process
    if (type === "url") {
      const urlResult = await processUrl(content);
      processedContent = urlResult.content;
      processedMeta = {
        originalUrl: content,
        processingTokens: urlResult.tokens,
        processingCost: urlResult.cost,
      };
    }

    // Classify the content
    const classification = await classifyContent(processedContent, title);

    // Create staging entry
    const entry = createStagingEntry({
      content: processedContent,
      title,
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
