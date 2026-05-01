import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { BigQuery } from "@google-cloud/bigquery";

/**
 * Safely coerce a cost value to a number.
 * Handles: number, string-number, cost objects from estimateCost(), null/undefined
 */
function toNumericCost(val) {
  if (val == null) return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  if (typeof val === "string") {
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
  }
  // If it's an object (from estimateCost()), extract totalCost
  if (typeof val === "object") {
    if (typeof val.totalCost === "number") return val.totalCost;
    if (typeof val.cost === "number") return val.cost;
    return 0;
  }
  return 0;
}

const bq = new BigQuery({ projectId: "antigravity-hub-jcloud" });

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
  totalTokens,
  // Phase 1.7 fields
  operation,
  thinkingLevel,
  channelId,
  videoId,
  metadata,
}) {
  try {
    let input = inputTokens !== undefined ? inputTokens : (tokens?.input || tokens?.inputTokens || 0);
    let output = outputTokens !== undefined ? outputTokens : (tokens?.output || tokens?.outputTokens || 0);
    const resolvedCost = toNumericCost(cost);
    const resolvedModel = model || modelTier || "unknown";

    // --- Firestore write (real-time UI) ---
    const data = {
      route: route || "unknown",
      model: resolvedModel,
      inputTokens: input,
      outputTokens: output,
      cost: resolvedCost,
      timestamp: FieldValue.serverTimestamp()
    };
    if (agent) {
      data.agent = agent;
    }
    if (modelTier) data.modelTier = modelTier;
    if (totalTokens !== undefined) data.totalTokens = totalTokens;

    const docRef = await adminDb.collection("api_usage").add(data);

    // --- BigQuery dual-write (async, non-blocking) ---
    try {
      const bqRow = {
        id: docRef.id,
        timestamp: new Date().toISOString(),
        service: resolvedModel.includes("gemini") ? "gemini_api" : "other",
        operation: operation || route || "unknown",
        model: resolvedModel,
        thinking_level: thinkingLevel || null,
        input_tokens: input,
        output_tokens: output,
        total_tokens: input + output,
        estimated_cost_usd: resolvedCost,
        channel_id: channelId || null,
        video_id: videoId || null,
        agent_id: agent || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        source: "api_middleware",
        tags: [route, agent, resolvedModel].filter(Boolean),
      };
      // Fire-and-forget — don't block the API response
      bq.dataset("antigravity_lake").table("cost_ledger").insert([bqRow])
        .catch((e) => console.warn(`[CostTracker] BQ write failed: ${e.message}`));
    } catch (bqErr) {
      console.warn(`[CostTracker] BQ setup error: ${bqErr.message}`);
    }

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
      totalSpendCurrentMonth += toNumericCost(data.cost);
      totalCalls += 1;

      // Per model breakdown
      const modelName = data.model || data.modelTier;
      if (modelName) {
        if (!perModel[modelName]) {
          perModel[modelName] = { calls: 0, cost: 0 };
        }
        perModel[modelName].calls += 1;
        perModel[modelName].cost += toNumericCost(data.cost);
      }

      // Per route breakdown
      if (data.route) {
        if (!perRoute[data.route]) {
          perRoute[data.route] = { calls: 0, cost: 0 };
        }
        perRoute[data.route].calls += 1;
        perRoute[data.route].cost += toNumericCost(data.cost);
      }

      // Per agent breakdown
      if (data.agent) {
        if (!perAgent[data.agent]) {
          perAgent[data.agent] = 0;
        }
        perAgent[data.agent] += toNumericCost(data.cost);
      }
    }

    // totalThisWeek
    if (docDate >= startOfWeek) {
      totalThisWeek += toNumericCost(data.cost);
    }

    // Daily trend (last 30 days)
    if (docDate >= thirtyDaysAgo) {
      const dateStr = docDate.toISOString().split("T")[0]; // YYYY-MM-DD
      if (!dailyTrendMap[dateStr]) {
        dailyTrendMap[dateStr] = { cost: 0 };
      }
      dailyTrendMap[dateStr].cost += toNumericCost(data.cost);
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
