/**
 * POST /api/knowledge/query
 * Query the Knowledge Agent / Brain Vault
 */
export async function POST(request) {
  try {
    const { query, source = "all" } = await request.json();

    if (!query) {
      return Response.json(
        { error: "query is required" },
        { status: 400 }
      );
    }

    // TODO: Wire to Vertex AI Data Store once set up in Phase 5
    return Response.json({
      status: "not_deployed",
      message: "Knowledge Agent is not yet deployed. Complete Phase 5 to enable knowledge queries.",
      query,
      source,
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
 * Get knowledge status / health
 */
export async function GET() {
  return Response.json({
    status: "not_deployed",
    dataStore: null,
    documentsIngested: 0,
    lastSync: null,
    sources: [],
  });
}
