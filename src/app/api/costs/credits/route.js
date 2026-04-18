import { getUsageSummary } from "@/lib/costTracker";

const JULES_API_BASE = "https://jules.googleapis.com/v1alpha";

/**
 * Fetch Jules session usage for today.
 * Returns { used, total, remaining }
 */
async function getJulesQuota() {
  const key = process.env.JULES_API_KEY;
  if (!key) {
    return { used: 0, total: 600, remaining: 600, error: "JULES_API_KEY not set" };
  }

  try {
    const res = await fetch(`${JULES_API_BASE}/sessions`, {
      headers: { "X-Goog-Api-Key": key },
    });

    if (!res.ok) {
      return { used: 0, total: 600, remaining: 600, error: `API error: ${res.status}` };
    }

    const data = await res.json();
    const sessions = data.sessions || [];

    // Count sessions created today (UTC)
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const todaySessions = sessions.filter(s => {
      const created = new Date(s.createTime);
      return created >= todayStart;
    });

    const totalDaily = 600;
    const used = todaySessions.length;

    return {
      used,
      total: totalDaily,
      remaining: Math.max(0, totalDaily - used),
      todaySessions: todaySessions.length,
      totalSessions: sessions.length,
    };
  } catch (err) {
    return { used: 0, total: 600, remaining: 600, error: err.message };
  }
}

export async function GET() {
  try {
    const [summary, julesQuota] = await Promise.all([
      getUsageSummary(),
      getJulesQuota(),
    ]);

    const used = summary.totalSpendCurrentMonth || 0;

    const cloudTotal = 100;
    const cloudUsed = 0;

    const genaiTotal = 1000;
    const genaiUsed = used;

    const budgetMonthly = 90;
    const budgetUsed = used;

    const data = {
      cloudCredit: {
        total: cloudTotal,
        used: cloudUsed,
        remaining: Math.max(0, cloudTotal - cloudUsed)
      },
      genaiCredit: {
        total: genaiTotal,
        used: genaiUsed,
        remaining: Math.max(0, genaiTotal - genaiUsed)
      },
      budget: {
        monthly: budgetMonthly,
        used: budgetUsed,
        percentage: Math.min((budgetUsed / budgetMonthly) * 100, 100)
      },
      jules: {
        dailySessions: julesQuota.used,
        dailyLimit: julesQuota.total,
        remaining: julesQuota.remaining,
        totalSessions: julesQuota.totalSessions || 0,
        error: julesQuota.error || null,
      },
    };

    return Response.json(data);
  } catch (error) {
    console.error("[/api/costs/credits] GET Error", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
