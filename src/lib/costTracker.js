import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

export async function logUsage({
  route,
  model,
  agent,
  tokens,
  cost,
  // backwards compatibility
  modelTier,
  inputTokens,
  outputTokens,
  totalTokens
}) {
  try {
    let input = inputTokens !== undefined ? inputTokens : (tokens?.input || tokens?.inputTokens || 0);
    let output = outputTokens !== undefined ? outputTokens : (tokens?.output || tokens?.outputTokens || 0);

    const data = {
      route: route || "unknown",
      model: model || modelTier || "unknown",
      inputTokens: input,
      outputTokens: output,
      cost: cost || 0,
      timestamp: FieldValue.serverTimestamp()
    };
    if (agent) {
      data.agent = agent;
    }
    // backwards compatibility for old fields if any code still sends them
    if (modelTier) data.modelTier = modelTier;
    if (totalTokens !== undefined) data.totalTokens = totalTokens;

    const docRef = await adminDb.collection("api_usage").add(data);
    return docRef.id;
  } catch (error) {
    console.error("Error logging API usage: ", error);
    throw error;
  }
}

export async function getUsageSummary() {
  const now = new Date();

  // Calculate start of current month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Calculate 30 days ago
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  // Calculate 7 days ago
  const startOfWeek = new Date();
  startOfWeek.setDate(now.getDate() - 7);
  startOfWeek.setHours(0, 0, 0, 0);

  // We query from the earlier of (startOfMonth, 30 days ago) to get all needed data.
  const earliestDate = startOfMonth < thirtyDaysAgo ? startOfMonth : thirtyDaysAgo;

  const q = adminDb.collection("api_usage").where("timestamp", ">=", Timestamp.fromDate(earliestDate));

  const querySnapshot = await q.get();

  let totalSpendCurrentMonth = 0;
  let totalThisWeek = 0;
  let totalCalls = 0;
  const perModel = {};
  const perRoute = {};
  const perAgent = {};
  const dailyTrendMap = {};

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    const docDate = data.timestamp ? data.timestamp.toDate() : new Date();

    // Current month spend
    if (docDate >= startOfMonth) {
      totalSpendCurrentMonth += data.cost || 0;
      totalCalls += 1;

      // Per model breakdown
      const modelName = data.model || data.modelTier;
      if (modelName) {
        if (!perModel[modelName]) {
          perModel[modelName] = { calls: 0, cost: 0 };
        }
        perModel[modelName].calls += 1;
        perModel[modelName].cost += (data.cost || 0);
      }

      // Per route breakdown
      if (data.route) {
        if (!perRoute[data.route]) {
          perRoute[data.route] = { calls: 0, cost: 0 };
        }
        perRoute[data.route].calls += 1;
        perRoute[data.route].cost += (data.cost || 0);
      }

      // Per agent breakdown
      if (data.agent) {
        if (!perAgent[data.agent]) {
          perAgent[data.agent] = 0;
        }
        perAgent[data.agent] += (data.cost || 0);
      }
    }

    // totalThisWeek
    if (docDate >= startOfWeek) {
      totalThisWeek += data.cost || 0;
    }

    // Daily trend (last 30 days)
    if (docDate >= thirtyDaysAgo) {
      const dateStr = docDate.toISOString().split("T")[0]; // YYYY-MM-DD
      if (!dailyTrendMap[dateStr]) {
        dailyTrendMap[dateStr] = { cost: 0 };
      }
      dailyTrendMap[dateStr].cost += (data.cost || 0);
    }
  });

  const dailyTrend = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    dailyTrend.push({
      date: dateStr,
      cost: dailyTrendMap[dateStr]?.cost || 0
    });
  }

  const daysInMonth = now.getDate();
  const averageDailyCost = totalSpendCurrentMonth / Math.max(1, daysInMonth);

  let topRoute = null;
  let maxRouteCost = -1;
  for (const [route, stats] of Object.entries(perRoute)) {
    if (stats.cost > maxRouteCost) {
      maxRouteCost = stats.cost;
      topRoute = route;
    }
  }

  const budgetLimit = 90;
  const budget = {
    limit: budgetLimit,
    used: totalSpendCurrentMonth,
    remaining: Math.max(0, budgetLimit - totalSpendCurrentMonth)
  };

  return {
    totalSpendCurrentMonth,
    totalThisWeek,
    averageDailyCost,
    totalCalls,
    topRoute,
    perRoute,
    perModel,
    perAgent,
    dailyTrend,
    budget
  };
}

export async function checkBudget() {
  const summary = await getUsageSummary();
  const used = summary.totalSpendCurrentMonth;
  const limit = 90;
  return {
    withinBudget: used <= limit,
    used,
    remaining: Math.max(0, limit - used),
    percentUsed: (used / limit) * 100
  };
}
