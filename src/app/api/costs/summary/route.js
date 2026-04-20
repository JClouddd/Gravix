import { estimateCost } from "@/lib/geminiClient";
import { getUsageSummary } from "@/lib/costTracker";
import { logRouteError } from "@/lib/errorLogger";

/**
 * GET /api/costs/summary
 * Returns current period cost summary
 */
export async function GET() {
  try {
    const summary = await getUsageSummary();
    const period = new Date().toISOString().slice(0, 7); // YYYY-MM

    const responseData = {
      period,
      totalSpend: summary.totalSpendCurrentMonth,
      credits: {
        cloud: { used: 0, total: 100, unit: "USD" },
        genai: { used: summary.totalSpendCurrentMonth, total: 1000, unit: "USD" },
      },
      perModel: {
        flash: summary.perModel.flash || { calls: 0, tokens: 0, cost: 0 },
        pro: summary.perModel.pro || { calls: 0, tokens: 0, cost: 0 },
        deep: summary.perModel.deep || { calls: 0, tokens: 0, cost: 0 },
      },
      perAgent: {
        conductor: summary.perAgent.conductor || 0,
        forge: summary.perAgent.forge || 0,
        scholar: summary.perAgent.scholar || 0,
        analyst: summary.perAgent.analyst || 0,
        courier: summary.perAgent.courier || 0,
        sentinel: summary.perAgent.sentinel || 0,
        builder: summary.perAgent.builder || 0,
      },
      perRoute: summary.perRoute || {},
      dailyTrend: summary.dailyTrend || [],
    };

    return Response.json(responseData);
  } catch (error) {
    console.error("[/api/costs/summary]", error);
    logRouteError("runtime", "/api/costs/summary error", error, "/api/costs/summary");
    return Response.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
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
    logRouteError("runtime", "/api/costs/summary error", error, "/api/costs/summary");
    return Response.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
