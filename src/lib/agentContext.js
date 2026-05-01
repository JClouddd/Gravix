import { BigQuery } from "@google-cloud/bigquery";
import { getModelForTask, getThinkingBudget } from "@/lib/modelRouter";

const bq = new BigQuery({ projectId: "antigravity-hub-jcloud" });

/**
 * Agent Context Protocol — Phase 1.5
 *
 * Provides automatic knowledge injection for any agent operation.
 * Agents call `getContext(task, query)` and receive relevant knowledge
 * from the RAG system without needing to understand the search internals.
 */

/**
 * Retrieve relevant context for an agent task.
 * Performs hybrid RRF search and returns formatted context chunks.
 *
 * @param {string} query - The agent's current question or task description
 * @param {object} options - Configuration
 * @param {number} options.topK - Number of context chunks (default: 3)
 * @param {string[]} options.filterTags - Only return results with these tags
 * @param {string[]} options.filterTypes - Only return these entity types
 * @returns {{ context: string, sources: object[], confidence: number }}
 */
export async function getContext(query, options = {}) {
  const { topK = 3, filterTags = [], filterTypes = [] } = options;
  const sanitizedQuery = query.replace(/[-]/g, " ");

  try {
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
          top_k => 15)
      ),
      keyword AS (
        SELECT source_uri, entity_type, content, tags,
          ROW_NUMBER() OVER () AS kw_rank
        FROM \`antigravity_lake.omni_vault_with_embeddings\`
        WHERE SEARCH(content, @sanitized_query)
        LIMIT 15
      ),
      fused AS (
        SELECT
          COALESCE(s.source_uri, k.source_uri) AS source_uri,
          COALESCE(s.entity_type, k.entity_type) AS entity_type,
          COALESCE(s.content, k.content) AS content,
          COALESCE(s.tags, k.tags) AS tags,
          1.0/(60 + COALESCE(s.sem_rank, 1000))
          + 1.0/(60 + COALESCE(k.kw_rank, 1000)) AS rrf_score
        FROM semantic s FULL OUTER JOIN keyword k USING (source_uri)
      )
      SELECT * FROM fused ORDER BY rrf_score DESC LIMIT @top_k
    `;

    const [rows] = await bq.query({
      query: rrfSQL,
      params: { query, sanitized_query: sanitizedQuery, top_k: topK + 5 },
      location: "us-east4",
    });

    // Apply filters
    let filtered = rows;
    if (filterTypes.length > 0) {
      filtered = filtered.filter((r) => filterTypes.includes(r.entity_type));
    }
    if (filterTags.length > 0) {
      filtered = filtered.filter(
        (r) => r.tags && r.tags.some((t) => filterTags.includes(t))
      );
    }
    // Ensure we have at least some results
    if (filtered.length === 0) filtered = rows;

    // Take top K
    const topResults = filtered.slice(0, topK);

    // Format context for injection
    const context = topResults
      .map(
        (r, i) =>
          `[KB-${i + 1}: ${r.source_uri} (${r.entity_type}, score: ${r.rrf_score?.toFixed(4)})]\n${r.content?.substring(0, 1200)}`
      )
      .join("\n\n---\n\n");

    // Calculate confidence based on top score
    const topScore = topResults[0]?.rrf_score || 0;
    const confidence = Math.min(1.0, topScore * 30); // Normalize RRF to 0-1 range

    return {
      context,
      sources: topResults.map((r) => ({
        source_uri: r.source_uri,
        entity_type: r.entity_type,
        rrf_score: r.rrf_score,
        tags: r.tags,
      })),
      confidence,
      resultCount: topResults.length,
    };
  } catch (err) {
    console.error(`[AgentContext] Search failed: ${err.message}`);
    return { context: "", sources: [], confidence: 0, resultCount: 0, error: err.message };
  }
}

/**
 * Extract structured entities from text content.
 * Uses Flash-Lite for cost efficiency (~$0.00002 per call).
 *
 * @param {string} text - Content to extract entities from
 * @returns {{ entities: { people: string[], tools: string[], concepts: string[], metrics: object[] } }}
 */
export async function extractEntities(text) {
  const { model } = getModelForTask("entity_extraction");

  try {
    // Use the Gemini API directly for entity extraction
    const { GoogleGenAI } = await import("@google/genai");
    const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const result = await genai.models.generateContent({
      model,
      contents: `Extract structured entities from this text. Return ONLY valid JSON with these keys:
{
  "people": ["names mentioned"],
  "tools": ["software, APIs, platforms mentioned"],
  "concepts": ["business/technical concepts"],
  "metrics": [{"name": "metric name", "value": "value if given"}],
  "categories": ["matching categories from: youtube_strategy, monetization, ai_ml, cloud_infrastructure, api_integration, seo_optimization, analytics, automation, content_creation, niche_research, audience_growth, business_operations, financial_tracking"]
}

TEXT:
${text.substring(0, 2000)}`,
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(result.text || "{}");
    return { entities: parsed };
  } catch (err) {
    console.error(`[EntityExtraction] Failed: ${err.message}`);
    return { entities: { people: [], tools: [], concepts: [], metrics: [], categories: [] } };
  }
}

/**
 * Score an agent's output for quality using LLM-as-Judge.
 * Returns a confidence score (0.0-1.0) and feedback.
 *
 * @param {string} question - Original question/task
 * @param {string} answer - Agent's output
 * @param {string} context - Source material used
 * @returns {{ score: number, feedback: string }}
 */
export async function judgeOutput(question, answer, context) {
  try {
    const { GoogleGenAI } = await import("@google/genai");
    const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const result = await genai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are a strict quality judge. Score the following answer on factual groundedness against the provided sources.

Return ONLY valid JSON: {"score": 0.0-1.0, "feedback": "brief reason"}

Scoring guide:
- 1.0: Fully grounded, all claims match sources
- 0.7-0.9: Mostly grounded, minor unsupported claims
- 0.4-0.6: Partially grounded, significant unsupported claims
- 0.0-0.3: Mostly hallucinated or contradicts sources

QUESTION: ${question.substring(0, 500)}

SOURCES:
${context.substring(0, 2000)}

ANSWER:
${answer.substring(0, 1000)}`,
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(result.text || '{"score": 0, "feedback": "parse error"}');
    return parsed;
  } catch (err) {
    console.error(`[Judge] Scoring failed: ${err.message}`);
    return { score: 0, feedback: `Error: ${err.message}` };
  }
}

/**
 * Recycle an agent's high-quality output back into the knowledge base.
 * Only stores outputs with judge score >= 0.7.
 *
 * @param {object} params - Output to recycle
 * @param {string} params.query - Original query
 * @param {string} params.answer - Generated answer
 * @param {number} params.judgeScore - Quality score (0-1)
 * @param {string} params.agentId - Which agent generated this
 * @param {string[]} params.tags - Classification tags
 */
export async function recycleOutput({ query, answer, judgeScore, agentId, tags = [] }) {
  if (judgeScore < 0.7) {
    console.log(`[OutputRecycling] Skipped — score ${judgeScore} below 0.7 threshold`);
    return { recycled: false, reason: "below_threshold" };
  }

  try {
    const row = {
      source_uri: `agent_output_${agentId}_${Date.now()}`,
      entity_type: "agent_insight",
      tags: [...tags, "auto_recycled", `agent:${agentId}`],
      ingested_at: new Date().toISOString(),
      payload: JSON.stringify({
        query,
        answer: answer.substring(0, 5000),
        judge_score: judgeScore,
        agent_id: agentId,
        generated_at: new Date().toISOString(),
      }),
    };

    await bq.dataset("antigravity_lake").table("omni_vault").insert([row]);
    console.log(`[OutputRecycling] Stored agent insight (score: ${judgeScore})`);
    return { recycled: true };
  } catch (err) {
    console.error(`[OutputRecycling] Insert failed: ${err.message}`);
    return { recycled: false, reason: err.message };
  }
}
