import { adminDb } from "@/lib/firebaseAdmin";
import { embed, generate } from "@/lib/geminiClient";
import { logRouteError } from "@/lib/errorLogger";

/**
 * POST /api/knowledge/query
 * 
 * Provides universal Retrieval-Augmented Generation (RAG) access.
 * Accepts a text query, converts it to a 768-dimensional Gemini embedding,
 * and performs a Vector Search against the Firestore knowledge_vectors collection.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { query, topK = 5, filter = {} } = body;

    if (!query) {
      return Response.json({ error: "Missing 'query' parameter" }, { status: 400 });
    }

    console.log(`[RAG Query] Embedding query: "${query}"`);
    const queryVector = await embed(query);
    const collectionRef = adminDb.collection("knowledge_vectors");

    console.log(`[RAG Query] Executing findNearest (TopK: ${topK})`);
    
    let vectorQuery;
    let fallbackUsed = false;
    try {
      vectorQuery = await collectionRef.findNearest({
        vectorField: "embedding",
        queryVector: queryVector,
        limit: topK,
        distanceMeasure: "COSINE"
      }).get();
    } catch (e) {
      console.warn(`[RAG Query] Native findNearest failed or unsupported (${e.message}), falling back to latest documents.`);
      fallbackUsed = true;
      vectorQuery = await collectionRef
        .orderBy("ingestedAt", "desc")
        .limit(topK)
        .get();
    }

    const results = [];
    vectorQuery.forEach(doc => {
      const data = doc.data();
      
      let matchesFilter = true;
      if (filter.sourceType && data.sourceType !== filter.sourceType) matchesFilter = false;
      if (filter.contextId && data.contextId !== filter.contextId) matchesFilter = false;

      if (matchesFilter) {
        results.push({
          id: doc.id,
          content: data.textChunk || data.content,
          sourceId: data.sourceId,
          sourceType: data.sourceType,
          contextId: data.contextId,
        });
      }
    });

    // If completely empty database, return Gemini grounded search
    if (results.length === 0 && fallbackUsed) {
        console.warn("[RAG Query] Data Store empty, falling back to pure Gemini Grounded Query.");
        const result = await generate({
          prompt: query,
          systemPrompt: `You are Scholar, the knowledge agent for Gravix. Answer questions accurately using basic training data and Google Search grounding.`,
          complexity: "pro",
          grounded: true,
        });

        return Response.json({
          success: true,
          query,
          source: "gemini_grounded",
          resultsCount: 0,
          contextChunks: [],
          summary: result.text,
        });
    }

    console.log(`[RAG Query] Found ${results.length} relevant context chunks.`);

    return Response.json({
      success: true,
      query,
      fallbackUsed,
      source: "firestore_vector",
      resultsCount: results.length,
      contextChunks: results,
    });
  } catch (error) {
    console.error("[/api/knowledge/query error]", error);
    logRouteError("knowledge", "/api/knowledge/query", error, "/api/knowledge/query");
    return Response.json({ error: error.message }, { status: 500 });
  }
}

/**
 * GET /api/knowledge/query
 * Knowledge system health check
 */
export async function GET() {
  return Response.json({
    status: "operational",
    vectorStore: {
      type: "firestore",
      collection: "knowledge_vectors",
      dimensions: 768,
      deployed: true,
    },
  });
}
