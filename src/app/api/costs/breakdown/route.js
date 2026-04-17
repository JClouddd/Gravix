import { estimateCost } from "@/lib/geminiClient";

/**
 * GET /api/costs/breakdown — Per-API, per-model, per-agent cost breakdown
 */
export async function GET() {
  // TODO: Pull from Firestore cost tracking collection
  return Response.json({
    period: new Date().toISOString().slice(0, 7),
    perRoute: [
      { route: "/api/gemini/chat", calls: 0, tokens: 0, cost: 0 },
      { route: "/api/gemini/grounded", calls: 0, tokens: 0, cost: 0 },
      { route: "/api/gemini/research", calls: 0, tokens: 0, cost: 0 },
      { route: "/api/knowledge/ingest", calls: 0, tokens: 0, cost: 0 },
      { route: "/api/knowledge/review", calls: 0, tokens: 0, cost: 0 },
      { route: "/api/colab/execute", calls: 0, tokens: 0, cost: 0 },
    ],
    perModel: {
      flash: { calls: 0, inputTokens: 0, outputTokens: 0, cost: 0 },
      pro: { calls: 0, inputTokens: 0, outputTokens: 0, cost: 0 },
      deep: { calls: 0, inputTokens: 0, outputTokens: 0, cost: 0 },
    },
    perAgent: {
      conductor: { invocations: 0, cost: 0 },
      forge: { invocations: 0, cost: 0 },
      scholar: { invocations: 0, cost: 0 },
      analyst: { invocations: 0, cost: 0 },
      courier: { invocations: 0, cost: 0 },
      sentinel: { invocations: 0, cost: 0 },
      builder: { invocations: 0, cost: 0 },
    },
    dailyTrend: [],
    projectedMonthly: 0,
  });
}
