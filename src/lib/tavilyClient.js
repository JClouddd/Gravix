/**
 * Tavily Search Client — Phase 1.4
 *
 * AI-optimized web search for structured knowledge extraction.
 * Used alongside Google Search grounding for dual-source verification.
 *
 * Free tier: 1,000 searches/month
 */

const TAVILY_API_URL = "https://api.tavily.com/search";

/**
 * Search the web via Tavily and return structured, LLM-ready results.
 *
 * @param {string} query - Natural language search query
 * @param {object} options - Search configuration
 * @param {string} options.searchDepth - "basic" (fast) or "advanced" (thorough)
 * @param {number} options.maxResults - Number of results (1-10)
 * @param {boolean} options.includeAnswer - Whether to include AI-generated answer
 * @param {string[]} options.includeDomains - Limit to specific domains
 * @param {string[]} options.excludeDomains - Exclude specific domains
 * @returns {object} { answer, results: [{ title, url, content, score }], searchTime }
 */
export async function tavilySearch(query, options = {}) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.warn("[Tavily] No API key set — returning empty results");
    return { answer: null, results: [], searchTime: 0, error: "NO_API_KEY" };
  }

  const {
    searchDepth = "basic",
    maxResults = 5,
    includeAnswer = true,
    includeDomains = [],
    excludeDomains = [],
  } = options;

  const startTime = Date.now();

  try {
    const response = await fetch(TAVILY_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: searchDepth,
        max_results: maxResults,
        include_answer: includeAnswer,
        include_domains: includeDomains.length > 0 ? includeDomains : undefined,
        exclude_domains: excludeDomains.length > 0 ? excludeDomains : undefined,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Tavily] API error ${response.status}: ${errorText}`);
      return { answer: null, results: [], searchTime: Date.now() - startTime, error: `HTTP_${response.status}` };
    }

    const data = await response.json();
    const searchTime = Date.now() - startTime;

    console.log(`[Tavily] "${query}" → ${data.results?.length || 0} results in ${searchTime}ms`);

    return {
      answer: data.answer || null,
      results: (data.results || []).map((r) => ({
        title: r.title,
        url: r.url,
        content: r.content,
        score: r.score,
      })),
      searchTime,
    };
  } catch (err) {
    console.error(`[Tavily] Request failed: ${err.message}`);
    return { answer: null, results: [], searchTime: Date.now() - startTime, error: err.message };
  }
}

/**
 * Specialized YouTube niche research query.
 * Searches for monetization data, CPM benchmarks, and competition analysis.
 */
export async function tavilyNicheResearch(nicheName) {
  return tavilySearch(
    `${nicheName} YouTube niche CPM revenue potential 2026 competition analysis`,
    {
      searchDepth: "advanced",
      maxResults: 8,
      includeAnswer: true,
      includeDomains: [
        "socialblade.com",
        "tubefilter.com",
        "vidiq.com",
        "tubebuddy.com",
        "blog.youtube",
      ],
    }
  );
}

/**
 * Search for technical API documentation.
 */
export async function tavilyTechSearch(query) {
  return tavilySearch(query, {
    searchDepth: "advanced",
    maxResults: 5,
    includeAnswer: true,
    includeDomains: [
      "cloud.google.com",
      "developers.google.com",
      "firebase.google.com",
      "ai.google.dev",
    ],
  });
}
