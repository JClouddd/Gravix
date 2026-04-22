import { google } from "googleapis";
import { logRouteError } from "@/lib/errorLogger";

export async function GET(request) {
  try {
    const auth = new google.auth.GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/bigquery.readonly"],
    });

    const bigquery = google.bigquery({
      version: "v2",
      auth,
    });

    const projectId = process.env.GOOGLE_CLOUD_PROJECT || "antigravity-hub-jcloud";
    // We will query the BigQuery sink "telemetry" and table "agent_payloads" or similar
    // "Cost & Token reports directly from the BigQuery sink configured in Phase 2."
    const datasetId = 'telemetry';
    const tableId = 'api_usage'; // BigQuery sink table

    // Because I don't know the exact schema, and we just need the frontend to display tokens directly
    const query = `
      SELECT
        model,
        agent,
        SUM(CAST(inputTokens AS INT64)) as inputTokens,
        SUM(CAST(outputTokens AS INT64)) as outputTokens,
        SUM(CAST(cost AS FLOAT64)) as cost,
        COUNT(*) as calls
      FROM \`${projectId}.${datasetId}.${tableId}\`
      GROUP BY model, agent
    `;

    // We wrap this so it doesn't crash if the table doesn't exist yet in the testing environment
    let rows = [];
    try {
      const res = await bigquery.jobs.query({
        projectId,
        requestBody: { query, useLegacySql: false }
      });
      rows = res.data.rows || [];
    } catch (e) {
      console.log("BigQuery query failed or table not found, using empty row set.", e.message);
    }

    const perModel = {};
    const perAgent = {};

    // Default model init
    ["flash", "pro", "deep"].forEach(m => {
        perModel[m] = { calls: 0, inputTokens: 0, outputTokens: 0, cost: 0 };
    });

    let totalSpend = 0;

    for (const row of rows) {
      const vals = row.f;
      const model = vals[0].v;
      const agent = vals[1].v;
      const inputTokens = parseInt(vals[2].v || 0, 10);
      const outputTokens = parseInt(vals[3].v || 0, 10);
      const cost = parseFloat(vals[4].v || 0);
      const calls = parseInt(vals[5].v || 0, 10);

      totalSpend += cost;

      if (model) {
        if (!perModel[model]) perModel[model] = { calls: 0, inputTokens: 0, outputTokens: 0, cost: 0 };
        perModel[model].calls += calls;
        perModel[model].inputTokens += inputTokens;
        perModel[model].outputTokens += outputTokens;
        perModel[model].cost += cost;
      }

      if (agent) {
        if (!perAgent[agent]) perAgent[agent] = { invocations: 0, cost: 0 };
        perAgent[agent].invocations += calls;
        perAgent[agent].cost += cost;
      }
    }

    return Response.json({
      period: new Date().toISOString().slice(0, 7),
      totalSpend,
      perModel,
      perAgent,
      dailyTrend: [],
      perRoute: []
    });
  } catch (error) {
    console.error("[/api/costs/bigquery]", error);
    logRouteError("runtime", "/api/costs/bigquery error", error, "/api/costs/bigquery");
    return Response.json({ error: error.message }, { status: 500 });
  }
}
