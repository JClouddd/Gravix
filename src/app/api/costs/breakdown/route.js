import { getUsageSummary } from "@/lib/costTracker";

/**
 * GET /api/costs/breakdown — Real per-API, per-model, per-agent cost breakdown
 * Pulls live data from Firestore api_usage collection
 */
export async function GET() {
  try {
    const summary = await getUsageSummary();
    const period = new Date().toISOString().slice(0, 7);

    // Convert perRoute map to array for easier frontend consumption
    const perRoute = Object.entries(summary.perRoute || {}).map(
      ([route, data]) => ({
        route,
        calls: data.calls || 0,
        cost: data.cost || 0,
      })
    );

    // Ensure all model tiers are represented
    const perModel = {
      flash: {
        calls: summary.perModel?.flash?.calls || 0,
        tokens: summary.perModel?.flash?.tokens || 0,
        cost: summary.perModel?.flash?.cost || 0,
      },
      pro: {
        calls: summary.perModel?.pro?.calls || 0,
        tokens: summary.perModel?.pro?.tokens || 0,
        cost: summary.perModel?.pro?.cost || 0,
      },
      deep: {
        calls: summary.perModel?.deep?.calls || 0,
        tokens: summary.perModel?.deep?.tokens || 0,
        cost: summary.perModel?.deep?.cost || 0,
      },
    };

    // Ensure all agents are represented
    const agentIds = [
      "conductor",
      "forge",
      "scholar",
      "analyst",
      "courier",
      "sentinel",
      "builder",
    ];
    const perAgent = {};
    for (const id of agentIds) {
      perAgent[id] = {
        invocations: 0,
        cost: summary.perAgent?.[id] || 0,
      };
    }

    // Calculate projected monthly from daily trend
    const recentDays = summary.dailyTrend?.slice(-7) || [];
    const avgDaily =
      recentDays.length > 0
        ? recentDays.reduce((sum, d) => sum + d.cost, 0) / recentDays.length
        : 0;
    const projectedMonthly = avgDaily * 30;

    return Response.json({
      period,
      totalSpend: summary.totalSpendCurrentMonth || 0,
      perRoute,
      perModel,
      perAgent,
      dailyTrend: summary.dailyTrend || [],
      projectedMonthly: Math.round(projectedMonthly * 100) / 100,
    });
  } catch (error) {
    console.error("[/api/costs/breakdown]", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
