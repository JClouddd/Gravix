import { BigQuery } from "@google-cloud/bigquery";
import { GoogleGenAI } from "@google/genai";
import { logUsage } from "@/lib/costTracker";
import { logRouteError } from "@/lib/errorLogger";

const bq = new BigQuery({ projectId: "antigravity-hub-jcloud" });
const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * POST /api/rag/query
 *
 * BigQuery-native RAG with Hybrid Search (RRF), Google Search grounding,
 * LLM-as-Judge scoring, and OpenTelemetry-ready trace IDs.
 */
export async function POST(request) {
  const traceId = `rag-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const startTime = Date.now();

  try {
    const body = await request.json();
    const {
      query,
      top_k = 5,
      include_web = true,
      thinking_level = "auto",
      filter_tags = [],
    } = body;

    if (!query) {
      return Response.json({ error: "Missing 'query' parameter" }, { status: 400 });
    }

    console.log(`[RAG ${traceId}] Query: "${query}" | top_k=${top_k} | web=${include_web}`);

    // --- Step 1: Hybrid Search (RRF) ---
    const sanitizedQuery = query.replace(/[-]/g, " ");

    const rrfSQL = `
      WITH semantic AS (
        SELECT base.source_uri, base.entity_type, base.content, base.tags,
          ROW_NUMBER() OVER (ORDER BY distance) AS sem_rank
        FROM VECTOR_SEARCH(
          TABLE \`antigravity_lake.omni_vault_with_embeddings\`, 'ml_generate_embedding_result',
          (SELECT ml_generate_embedding_result FROM ML.GENERATE_EMBEDDING(
            MODEL \`antigravity_lake.embedding_model\`,
            (SELECT @query AS content),
            STRUCT(256 AS output_dimensionality))),
          top_k => 20)
      ),
      keyword AS (
        SELECT source_uri, entity_type, content, tags,
          ROW_NUMBER() OVER () AS kw_rank
        FROM \`antigravity_lake.omni_vault_with_embeddings\`
        WHERE SEARCH(content, @sanitized_query)
        LIMIT 20
      ),
      fused AS (
        SELECT
          COALESCE(s.source_uri, k.source_uri) AS source_uri,
          COALESCE(s.entity_type, k.entity_type) AS entity_type,
          COALESCE(s.content, k.content) AS content,
          COALESCE(s.tags, k.tags) AS tags,
          s.sem_rank,
          k.kw_rank,
          1.0/(60 + COALESCE(s.sem_rank, 1000))
          + 1.0/(60 + COALESCE(k.kw_rank, 1000)) AS rrf_score
        FROM semantic s FULL OUTER JOIN keyword k USING (source_uri)
      )
      SELECT * FROM fused ORDER BY rrf_score DESC LIMIT @top_k
    `;

    const [rows] = await bq.query({
      query: rrfSQL,
      params: { query, sanitized_query: sanitizedQuery, top_k },
      location: "us-east4",
    });

    console.log(`[RAG ${traceId}] Found ${rows.length} results via RRF hybrid search`);

    // Apply tag filter if provided
    let filteredRows = rows;
    if (filter_tags.length > 0) {
      filteredRows = rows.filter(
        (r) => r.tags && r.tags.some((t) => filter_tags.includes(t))
      );
      if (filteredRows.length === 0) filteredRows = rows; // fallback to unfiltered
    }

    // --- Step 2: Build RAG Context ---
    const ragContext = filteredRows
      .map(
        (r, i) =>
          `[Source ${i + 1}: ${r.source_uri} | Type: ${r.entity_type} | RRF: ${r.rrf_score?.toFixed(4)}]\n${r.content?.substring(0, 1500)}`
      )
      .join("\n\n---\n\n");

    // --- Step 3: Generate Answer ---
    const systemPrompt = `You are Scholar, an expert YouTube business intelligence analyst for the Antigravity platform.

PRIVATE KNOWLEDGE (from BigQuery knowledge base):
${ragContext}

INSTRUCTIONS:
- Answer using ALL provided sources. Cite sources as [Source N].
- If web grounding provides additional context, cite as [WEB].
- Provide a confidence score (0.0-1.0) based on source agreement.
- Be specific with numbers, dates, and technical details.
- If the sources don't contain enough information, say so clearly.`;

    // Select thinking budget based on level
    const thinkingBudgets = { low: 512, medium: 2048, high: 8192, auto: 2048 };
    const thinkingBudget = thinkingBudgets[thinking_level] || 2048;

    const generateConfig = {
      model: "gemini-2.5-flash",
      contents: query,
      config: {
        systemInstruction: systemPrompt,
        thinkingConfig: { thinkingBudget },
      },
    };

    // Add Google Search grounding if requested
    if (include_web) {
      generateConfig.config.tools = [{ googleSearch: {} }];
    }

    const result = await genai.models.generateContent(generateConfig);
    const answer = result.text || "";

    // Token usage from response
    const usage = result.usageMetadata || {};
    const inputTokens = usage.promptTokenCount || 0;
    const outputTokens = usage.candidatesTokenCount || 0;

    // --- Step 4: LLM-as-Judge (async, non-blocking) ---
    let judgeScore = null;
    try {
      const judgeResult = await genai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Score the following answer 0.0 to 1.0 for factual groundedness against the provided sources. Return ONLY the float number, nothing else.

SOURCES:
${ragContext.substring(0, 2000)}

ANSWER:
${answer.substring(0, 1000)}`,
        config: {
          thinkingConfig: { thinkingBudget: 0 },
        },
      });
      const scoreText = (judgeResult.text || "").trim();
      const parsed = parseFloat(scoreText);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
        judgeScore = parsed;
      }
    } catch (judgeErr) {
      console.warn(`[RAG ${traceId}] Judge scoring failed: ${judgeErr.message}`);
    }

    // --- Step 5: Log cost ---
    const latencyMs = Date.now() - startTime;
    try {
      await logUsage({
        route: "/api/rag/query",
        model: "gemini-2.5-flash",
        agent: "scholar",
        inputTokens,
        outputTokens,
        cost: (inputTokens * 0.15 + outputTokens * 0.6) / 1_000_000,
      });
    } catch (costErr) {
      console.warn(`[RAG ${traceId}] Cost logging failed: ${costErr.message}`);
    }

    console.log(
      `[RAG ${traceId}] Complete | ${latencyMs}ms | ${inputTokens}+${outputTokens} tokens | judge=${judgeScore}`
    );

    // --- Step 6: Return Response ---
    return Response.json({
      answer,
      sources: filteredRows.map((r) => ({
        source_uri: r.source_uri,
        entity_type: r.entity_type,
        rrf_score: r.rrf_score,
        tags: r.tags,
      })),
      confidence: judgeScore,
      grounding_metadata: {
        web_grounding_enabled: include_web,
        web_sources: result.candidates?.[0]?.groundingMetadata?.webSearchQueries || [],
      },
      trace_id: traceId,
      judge_score: judgeScore,
      latency_ms: latencyMs,
      tokens: { input: inputTokens, output: outputTokens },
    });
  } catch (error) {
    console.error(`[RAG ${traceId}] Error:`, error);
    logRouteError("rag", "/api/rag/query", error, "/api/rag/query");
    return Response.json(
      { error: error.message, trace_id: traceId },
      { status: 500 }
    );
  }
}

/**
 * GET /api/rag/query
 * RAG system health check
 */
export async function GET() {
  try {
    const [rows] = await bq.query({
      query:
        "SELECT COUNT(*) as total FROM `antigravity_lake.omni_vault_with_embeddings`",
      location: "us-east4",
    });
    return Response.json({
      status: "operational",
      engine: "bigquery_native_rag",
      model: "text-embedding-005 (256d)",
      generation: "gemini-2.5-flash",
      search: "hybrid_rrf",
      embedded_rows: rows[0]?.total || 0,
    });
  } catch (e) {
    return Response.json({ status: "error", error: e.message }, { status: 500 });
  }
}
