import { useState } from "react";


export default function KnowledgeVaultTab({ status, setActiveTab }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);
  const [searchResults, setSearchResults] = useState(null);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!searchTerm.trim()) return;

    setIsSearching(true);
    setError(null);
    setSearchResults(null);

    try {
      const res = await fetch("/api/knowledge/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchTerm }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");

      setSearchResults(data);
    } catch (err) {
      console.error("[KnowledgeVaultTab] Search failed:", err.message);
      setError(err.message);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Search Bar */}
      <div className="card">
        <form onSubmit={handleSearch} style={{ display: "flex", gap: 12 }}>
          <input
            type="text"
            className="input"
            style={{ flex: 1 }}
            placeholder="Ask Scholar a question..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={isSearching}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSearching || !searchTerm.trim()}
          >
            {isSearching ? "Searching..." : "Search"}
          </button>
        </form>
      </div>

      {/* Loading Skeleton */}
      {isSearching && (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="skeleton" style={{ height: 24, width: "30%" }} />
          <div className="skeleton" style={{ height: 60, width: "100%" }} />
          <div className="skeleton" style={{ height: 60, width: "100%" }} />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="card" style={{ borderLeft: "4px solid var(--error)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h4 style={{ color: "var(--error)", marginBottom: 4 }}>Search Failed</h4>
              <p className="body-sm">{error}</p>
            </div>
            <button className="btn btn-secondary" onClick={handleSearch}>
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Results Display */}
      {!isSearching && searchResults && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Summary / Grounded Answer */}
          {searchResults.summary && (
            <div className="card card-glass" style={{ border: "1px solid var(--accent-subtle)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <h3 className="h4" style={{ color: "var(--accent)" }}>Scholar Response</h3>
                <div style={{ display: "flex", gap: 8 }}>
                  <span className="badge badge-info">{searchResults.source === "data_store" ? "Data Store" : "Gemini"}</span>
                  {searchResults.model && <span className="badge">{searchResults.model}</span>}
                </div>
              </div>
              <p className="body-md" style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                {searchResults.summary}
              </p>
              {searchResults.tokens && (
                <div className="caption" style={{ color: "var(--text-tertiary)", marginTop: 12, textAlign: "right" }}>
                  Tokens: {searchResults.tokens}
                </div>
              )}
            </div>
          )}

          {/* Sources / Citations */}
          {searchResults.results && searchResults.results.length > 0 ? (
            <div>
              <h4 className="h4" style={{ marginBottom: 12 }}>Sources</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {searchResults.results.map((result, idx) => {
                  const doc = result.document || {};
                  const derived = doc.derivedStructData || {};
                  const struct = doc.structData || {};
                  const title = derived.title || struct.title || doc.name || "Untitled Document";
                  const link = derived.link || struct.link || "";

                  let snippet = "No snippet available.";
                  if (derived.snippets && derived.snippets.length > 0) {
                    snippet = derived.snippets[0].snippet;
                  } else if (derived.extractive_answers && derived.extractive_answers.length > 0) {
                    snippet = derived.extractive_answers[0].content;
                  } else if (struct.snippet) {
                    snippet = struct.snippet;
                  }

                  return (
                  <div key={idx} className="card" style={{ padding: 16 }}>
                    <a
                      href={link || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--text-primary)", textDecoration: "none" }}
                    >
                      <h4 style={{ color: "var(--accent-hover)", marginBottom: 4 }}>{title}</h4>
                    </a>
                    <p className="body-sm" style={{ color: "var(--text-secondary)" }}>
                      {typeof snippet === "string" ? snippet.replace(/<b>/g, "").replace(/<\/b>/g, "") : snippet}
                    </p>
                    {link && (
                      <div className="caption" style={{ color: "var(--text-tertiary)", marginTop: 8, wordBreak: "break-all" }}>
                        🔗 {link}
                      </div>
                    )}
                  </div>
                )})}
              </div>
            </div>
          ) : (
            !searchResults.summary && (
              <div className="card">
                <div className="empty-state">
                  <div className="empty-state-icon">🔍</div>
                  <p className="empty-state-title">No matching knowledge found</p>
                  <p className="empty-state-desc">Try rephrasing your question or check your ingestion status.</p>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* Initial Empty State (No search yet) */}
      {!isSearching && !searchResults && !error && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📖</div>
            <p className="empty-state-title">Brain Vault</p>
            <p className="empty-state-desc">
              {status?.stats?.documentsIngested
                ? `${status.stats.documentsIngested} documents in the vault. Use the search to query.`
                : "Your knowledge base is empty. Start by ingesting documentation or adding content in the Ingestion tab."}
            </p>
            {!status?.stats?.documentsIngested && (
              <button
                className="btn btn-primary"
                style={{ marginTop: 16 }}
                onClick={() => setActiveTab("Ingestion")}
              >
                Start Ingesting
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
