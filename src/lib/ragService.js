import { BigQuery } from "@google-cloud/bigquery";

const bq = new BigQuery({ projectId: "antigravity-hub-jcloud" });

export async function queryVault(query, top_k = 5, filter_tags = []) {
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

  // Apply tag filter if provided
  let filteredRows = rows;
  if (filter_tags.length > 0) {
    filteredRows = rows.filter(
      (r) => r.tags && r.tags.some((t) => filter_tags.includes(t))
    );
    if (filteredRows.length === 0) filteredRows = rows; // fallback to unfiltered
  }

  // Build RAG Context
  const ragContext = filteredRows
    .map(
      (r, i) =>
        `[Source ${i + 1}: ${r.source_uri} | Type: ${r.entity_type} | RRF: ${r.rrf_score?.toFixed(4)}]\n${r.content?.substring(0, 1500)}`
    )
    .join("\n\n---\n\n");

  return ragContext;
}
