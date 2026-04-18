import { getUsageSummary } from "@/lib/costTracker";

export async function GET(request) {
  try {
    const summary = await getUsageSummary();
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
      }
    };

    return Response.json(data);
  } catch (error) {
    console.error("[/api/costs/credits] GET Error", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
