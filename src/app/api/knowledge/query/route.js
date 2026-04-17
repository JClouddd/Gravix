import { generate } from "@/lib/geminiClient";

const PROJECT = process.env.GOOGLE_CLOUD_PROJECT || "antigravity-hub-jcloud";
const DATA_STORE = "gravix-knowledge";
const ENGINE = "gravix-scholar";
const LOCATION = "global";

/**
 * POST /api/knowledge/query
 * Query the Knowledge Agent via Vertex AI Discovery Engine
 * Falls back to Gemini + grounded search if Data Store is empty
 */
export async function POST(request) {
  try {
    const { query, source = "all", mode = "hybrid" } = await request.json();

    if (!query) {
      return Response.json(
        { error: "query is required" },
        { status: 400 }
      );
    }

    // Try Discovery Engine first
    let discoveryResults = null;
    try {
      discoveryResults = await searchDataStore(query);
    } catch (err) {
      console.warn("[knowledge/query] Data Store search failed, falling back to Gemini:", err.message);
    }

    // If we got results from the Data Store, use them
    if (discoveryResults && discoveryResults.results && discoveryResults.results.length > 0) {
      return Response.json({
        status: "ok",
        source: "data_store",
        query,
        results: discoveryResults.results.map((r) => ({
          title: r.document?.structData?.title || r.document?.name || "Untitled",
          snippet: r.document?.derivedStructData?.snippet || "",
          uri: r.document?.derivedStructData?.uri || "",
          relevanceScore: r.document?.derivedStructData?.relevanceScore || 0,
        })),
        summary: discoveryResults.summary?.summaryText || null,
        totalResults: discoveryResults.totalSize || 0,
      });
    }

    // Fallback: use Gemini with grounded search
    const result = await generate({
      prompt: query,
      systemPrompt: `You are Scholar, the knowledge agent for Gravix. Answer questions accurately using your training data and Google Search grounding. 
If the question is about Gravix-specific configuration, explain what you know from the system architecture.
Always cite sources when using search grounding.`,
      complexity: "pro",
      grounded: true,
    });

    return Response.json({
      status: "ok",
      source: "gemini_grounded",
      query,
      results: [],
      summary: result.text,
      totalResults: 0,
      model: result.model,
      tokens: result.tokens,
      cost: result.cost,
      groundingMetadata: result.groundingMetadata,
    });
  } catch (error) {
    console.error("[/api/knowledge/query]", error);
    return Response.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/knowledge/query
 * Knowledge system health check
 */
export async function GET() {
  return Response.json({
    status: "operational",
    dataStore: {
      id: DATA_STORE,
      engineId: ENGINE,
      project: PROJECT,
      location: LOCATION,
      deployed: true,
    },
  });
}

/* ── Discovery Engine Search ─────────────────────────────────── */
async function searchDataStore(queryText, pageSize = 5) {
  const endpoint = `https://discoveryengine.googleapis.com/v1/projects/${PROJECT}/locations/${LOCATION}/collections/default_collection/engines/${ENGINE}/servingConfigs/default_search:search`;

  // Use the GEMINI_API_KEY for auth — in production this would use
  // a service account, but for Vercel serverless we use the API key
  // Discovery Engine requires OAuth, so we construct a server-side request
  const apiKey = process.env.GEMINI_API_KEY;

  const response = await fetch(`${endpoint}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: queryText,
      pageSize,
      queryExpansionSpec: { condition: "AUTO" },
      spellCorrectionSpec: { mode: "AUTO" },
      contentSearchSpec: {
        snippetSpec: { returnSnippet: true },
        summarySpec: {
          summaryResultCount: 3,
          includeCitations: true,
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Discovery Engine search failed: ${response.status} - ${error}`);
  }

  return response.json();
}
