/**
 * POST /api/colab/execute — Execute a notebook (Deprecated)
 * GET /api/colab/execute — List available notebooks (Deprecated)
 */

export async function GET() {
  return Response.json(
    { error: "Deprecated: Colab routes have been retired in favor of e2b code interpreter." },
    { status: 410 }
  );
}

export async function POST() {
  return Response.json(
    { error: "Deprecated: Colab routes have been retired in favor of e2b code interpreter." },
    { status: 410 }
  );
}
