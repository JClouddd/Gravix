import { logUsage, getUsageSummary } from "@/lib/costTracker";

import { adminDb } from "@/lib/firebaseAdmin";
import { logRouteError } from "@/lib/errorLogger";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const periodParam = searchParams.get("period") || "30d"; // 7d, 30d, 90d
    const groupByParam = searchParams.get("groupBy") || "day"; // day, week

    let daysToFetch = 30;
    if (periodParam === "7d") daysToFetch = 7;
    else if (periodParam === "90d") daysToFetch = 90;

    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - daysToFetch);
    startDate.setHours(0, 0, 0, 0);

    const usageRef = adminDb.collection("api_usage");
    const q = usageRef.where("timestamp", ">=", startDate);

    const querySnapshot = await q.get();

    let totalSpend = 0;
    const historyMap = {};

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const docDate = data.timestamp ? data.timestamp.toDate() : new Date();
      const cost = data.cost || 0;
      const model = data.model || data.modelTier || "unknown";

      totalSpend += cost;

      let dateKey;
      if (groupByParam === "week") {
        // Group by week start (Sunday)
        const dayOfWeek = docDate.getDay();
        const startOfWeek = new Date(docDate);
        startOfWeek.setDate(docDate.getDate() - dayOfWeek);
        dateKey = startOfWeek.toISOString().split("T")[0];
      } else {
        // Group by day
        dateKey = docDate.toISOString().split("T")[0];
      }

      if (!historyMap[dateKey]) {
        historyMap[dateKey] = {
          date: dateKey,
          totalCost: 0,
          breakdown: {},
        };
      }

      historyMap[dateKey].totalCost += cost;
      if (!historyMap[dateKey].breakdown[model]) {
        historyMap[dateKey].breakdown[model] = 0;
      }
      historyMap[dateKey].breakdown[model] += cost;
    });

    // Fill in missing dates to ensure continuous chart
    if (groupByParam === "day") {
      for (let i = 0; i < daysToFetch; i++) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        if (!historyMap[dateStr]) {
          historyMap[dateStr] = {
            date: dateStr,
            totalCost: 0,
            breakdown: {}
          };
        }
      }
    }

    const history = Object.values(historyMap).sort((a, b) => b.date.localeCompare(a.date)); // Sort descending

    return Response.json({
      history,
      period: periodParam,
      totalSpend
    });
  } catch (error) {
    console.error("[/api/costs/history] GET Error", error);
    logRouteError("runtime", "/api/costs/history error", error, "/api/costs/history");
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { model, tokens, cost, route, timestamp } = body;

    const id = await logUsage({
      route,
      model,
      tokens,
      cost,
      timestamp,
    });

    return Response.json({ success: true, id });
  } catch (error) {
    console.error("[/api/costs/history] POST Error", error);
    logRouteError("runtime", "/api/costs/history error", error, "/api/costs/history");
    return Response.json({ error: error.message }, { status: 500 });
  }
}
