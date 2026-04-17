import { estimateCost } from "@/lib/geminiClient";

/**
 * GET /api/costs/summary
 * Returns current period cost summary
 */
export async function GET() {
  // TODO: Pull from Firestore once token tracking is wired
  const summary = {
    period: new Date().toISOString().slice(0, 7), // YYYY-MM
    totalSpend: 0,
    credits: {
      cloud: { used: 0, total: 100, unit: "USD" },
      genai: { used: 0, total: 1000, unit: "USD" },
    },
    perModel: {
      flash: { calls: 0, tokens: 0, cost: 0 },
      pro: { calls: 0, tokens: 0, cost: 0 },
      deep: { calls: 0, tokens: 0, cost: 0 },
    },
    perAgent: {
      conductor: 0,
      forge: 0,
      scholar: 0,
      analyst: 0,
      courier: 0,
      sentinel: 0,
      builder: 0,
    },
  };

  return Response.json(summary);
}

/**
 * POST /api/costs/estimate
 * Estimate cost before executing
 */
export async function POST(request) {
  try {
    const { modelTier, inputTokens, estimatedOutputTokens } = await request.json();
    const estimate = estimateCost(
      modelTier || "flash",
      inputTokens || 0,
      estimatedOutputTokens || 500
    );
    return Response.json(estimate);
  } catch (error) {
    console.error("[/api/costs/estimate]", error);
    return Response.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
