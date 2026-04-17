import { getFirestore, collection, addDoc, query, where, getDocs, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

export async function logUsage({
  route,
  model,
  modelTier,
  inputTokens,
  outputTokens,
  totalTokens,
  cost,
  agent
}) {
  try {
    const data = {
      route,
      model,
      modelTier,
      inputTokens,
      outputTokens,
      totalTokens,
      cost,
      timestamp: serverTimestamp()
    };
    if (agent) {
      data.agent = agent;
    }
    const docRef = await addDoc(collection(db, "api_usage"), data);
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

  // We query from the earlier of (startOfMonth, 30 days ago) to get all needed data.
  const earliestDate = startOfMonth < thirtyDaysAgo ? startOfMonth : thirtyDaysAgo;

  const usageRef = collection(db, "api_usage");
  const q = query(
    usageRef,
    where("timestamp", ">=", Timestamp.fromDate(earliestDate))
  );

  const querySnapshot = await getDocs(q);

  let totalSpendCurrentMonth = 0;
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
    }

    // Per model breakdown
    if (data.modelTier) {
      if (!perModel[data.modelTier]) {
        perModel[data.modelTier] = { calls: 0, tokens: 0, cost: 0 };
      }
      perModel[data.modelTier].calls += 1;
      perModel[data.modelTier].tokens += (data.totalTokens || 0);
      perModel[data.modelTier].cost += (data.cost || 0);
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

    // Daily trend (last 30 days)
    if (docDate >= thirtyDaysAgo) {
      const dateStr = docDate.toISOString().split("T")[0]; // YYYY-MM-DD
      if (!dailyTrendMap[dateStr]) {
        dailyTrendMap[dateStr] = { cost: 0, calls: 0 };
      }
      dailyTrendMap[dateStr].cost += (data.cost || 0);
      dailyTrendMap[dateStr].calls += 1;
    }
  });

  const dailyTrend = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    dailyTrend.push({
      date: dateStr,
      cost: dailyTrendMap[dateStr]?.cost || 0,
      calls: dailyTrendMap[dateStr]?.calls || 0
    });
  }

  return {
    totalSpendCurrentMonth,
    perModel,
    perRoute,
    perAgent,
    dailyTrend,
  };
}
