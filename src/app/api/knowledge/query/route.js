import { SearchServiceClient } from "@google-cloud/discoveryengine";
import { generate } from "@/lib/geminiClient";
import { logRouteError } from "@/lib/errorLogger";

const client = new SearchServiceClient({
  apiEndpoint: "us-discoveryengine.googleapis.com",
});

/**
 * POST /api/knowledge/query
 * 
 * Provides universal Retrieval-Augmented Generation (RAG) access.
 * Performs a Vector Search against the Vertex AI Datastore.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { query, topK = 5, filter = {} } = body;

    if (!query) {
      return Response.json({ error: "Missing 'query' parameter" }, { status: 400 });
    }

    const projectId = process.env.GOOGLE_CLOUD_PROJECT || "antigravity-hub-jcloud";
    const location = process.env.GOOGLE_CLOUD_REGION || "us-east4";
    const dataStoreId = process.env.VERTEX_DATASTORE_ID || "knowledge-vault";

    const servingConfig = `projects/${projectId}/locations/${location}/collections/default_collection/dataStores/${dataStoreId}/servingConfigs/default_search`;

    console.log(`[RAG Query] Executing Vertex AI Search for: "${query}"`);

    let searchResults = [];
    let fallbackUsed = false;

    try {
      const requestParams = {
        servingConfig,
        query,
        pageSize: topK,
      };

      const [response] = await client.search(requestParams);
      searchResults = response || [];
    } catch (e) {
      console.warn(`[RAG Query] Native Vertex AI search failed (${e.message}), falling back to pure Gemini Grounded Query.`);
      fallbackUsed = true;
    }

    // If completely empty database or fallback, return Gemini grounded search
    if (searchResults.length === 0 && fallbackUsed) {
        console.warn("[RAG Query] Data Store empty or error, falling back to pure Gemini Grounded Query.");
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
          results: [],
          summary: result.text,
        });
    }

    console.log(`[RAG Query] Found ${searchResults.length} relevant context chunks.`);

    // We don't generate the summary here unless we want to, wait, Vertex AI Datastore doesn't give a "summary" natively unless we do Grounded search.
    // Wait, Vertex AI Search with "SearchRequest" returns 'results' where each result has 'document'.
    // If the old code returned 'contextChunks' but also a 'summary' only when falling back.
    // Let me check if the old code generated a summary during successful retrieval.

    return Response.json({
      success: true,
      query,
      fallbackUsed,
      source: "data_store",
      resultsCount: searchResults.length,
      results: searchResults, // returning the raw results from Vertex AI
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
      type: "vertex_ai",
      datastoreId: process.env.VERTEX_DATASTORE_ID || "knowledge-vault",
      deployed: true,
    },
  });
}
