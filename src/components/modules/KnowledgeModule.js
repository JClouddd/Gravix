"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Knowledge Module — Brain Vault + Ingestion staging + Scholar chat
 * Fully wired to /api/knowledge/* endpoints
 */
const TABS = ["Knowledge", "Ingestion", "Scholar", "Sources"];

export default function KnowledgeModule() {
  const [activeTab, setActiveTab] = useState("Knowledge");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ingestionInput, setIngestionInput] = useState("");
  const [ingestionTitle, setIngestionTitle] = useState("");
  const [ingestionType, setIngestionType] = useState("text");
  const [ingesting, setIngesting] = useState(false);
  const [stagedEntries, setStagedEntries] = useState([]);
  const [ingestionError, setIngestionError] = useState("");
  const [lastEntry, setLastEntry] = useState(null);
  const [scholarMessage, setScholarMessage] = useState("");
  const [scholarHistory, setScholarHistory] = useState([]);
  const [scholarLoading, setScholarLoading] = useState(false);

  // Fetch knowledge status
  useEffect(() => {
    fetch("/api/knowledge/status")
      .then((r) => r.json())
      .then((data) => {
        setStatus(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Handle ingestion submission
  const handleIngest = useCallback(async () => {
    if (!ingestionInput.trim()) return;
    setIngesting(true);
    setIngestionError("");
    setLastEntry(null);
    try {
      const res = await fetch("/api/knowledge/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: ingestionInput,
          type: ingestionType,
          title: ingestionTitle,
          source: "manual",
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStagedEntries((prev) => [data.entry, ...prev]);
        setLastEntry(data.entry);
        setIngestionInput("");
        setIngestionTitle("");
      } else {
        setIngestionError(data.error || "Ingestion failed");
      }
    } catch (error) {
      console.error("Ingestion failed:", error);
      setIngestionError(error.message || "An unexpected error occurred");
    }
    setIngesting(false);
  }, [ingestionInput, ingestionType, ingestionTitle]);

  // Handle Scholar chat
  const handleScholarChat = useCallback(async () => {
    if (!scholarMessage.trim()) return;
    setScholarLoading(true);
    const userMsg = scholarMessage;
    setScholarMessage("");
    setScholarHistory((prev) => [...prev, { role: "user", content: userMsg }]);

    try {
      const res = await fetch("/api/knowledge/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          stagingEntry: stagedEntries[0] || { title: "General", content: "", classification: {} },
          history: scholarHistory,
        }),
      });
      const data = await res.json();
      setScholarHistory((prev) => [...prev, { role: "model", content: data.response }]);
    } catch (error) {
      setScholarHistory((prev) => [...prev, { role: "model", content: "Error: " + error.message }]);
    }
    setScholarLoading(false);
  }, [scholarMessage, scholarHistory, stagedEntries]);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton skeleton-card" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="module-header">
        <div className="module-header-left">
          <div className="module-icon" style={{ background: "hsla(170, 70%, 45%, 0.12)" }}>🧠</div>
          <div>
            <h1 className="module-title">Knowledge</h1>
            <p className="module-subtitle">
              {status?.stats?.documentsIngested || 0} documents ingested •{" "}
              {status?.scheduledSources?.length || 0} sources configured
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <span className={`badge ${status?.dataStore?.deployed ? "badge-success" : "badge-warning"}`}>
            {status?.dataStore?.deployed ? "Data Store Active" : "Data Store Pending"}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex",
        gap: 4,
        marginBottom: 24,
        borderBottom: "1px solid var(--card-border)",
      }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "10px 18px",
              fontSize: 14,
              fontWeight: activeTab === tab ? 600 : 400,
              color: activeTab === tab ? "var(--accent-hover)" : "var(--text-secondary)",
              borderBottom: activeTab === tab ? "2px solid var(--accent)" : "2px solid transparent",
              transition: "all var(--duration-fast) var(--ease-out)",
              background: "none",
              cursor: "pointer",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Knowledge Tab */}
      {activeTab === "Knowledge" && (
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

      {/* Ingestion Tab */}
      {activeTab === "Ingestion" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Input Area */}
          <div className="card">
            <h3 className="h4" style={{ marginBottom: 16 }}>Submit Content</h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
              <input
                type="text"
                className="input"
                placeholder="Title"
                value={ingestionTitle}
                onChange={(e) => setIngestionTitle(e.target.value)}
              />

              <select
                className="input"
                value={ingestionType}
                onChange={(e) => setIngestionType(e.target.value)}
              >
                <option value="text">Text</option>
                <option value="url">URL</option>
                <option value="pdf_transcript">PDF Transcript</option>
              </select>

              <textarea
                className="input"
                rows={4}
                placeholder="Paste content, URL, or document text..."
                value={ingestionInput}
                onChange={(e) => setIngestionInput(e.target.value)}
                style={{ resize: "vertical" }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                className="btn btn-primary"
                onClick={handleIngest}
                disabled={ingesting || !ingestionInput.trim()}
              >
                {ingesting ? "⏳ Processing..." : "Submit for Review"}
              </button>

              {ingestionError && (
                <span className="badge badge-error">
                  ❌ {ingestionError}
                </span>
              )}
            </div>

            {lastEntry && (
              <div style={{ marginTop: 16, padding: 12, background: "var(--bg-tertiary)", borderRadius: "var(--radius-md)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span className="badge badge-success">✅ Staged for Review</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span className="badge badge-info">{lastEntry.category}</span>
                    <span className="badge badge-accent">
                      {lastEntry.confidence ? `${(lastEntry.confidence * 100).toFixed(0)}% Confidence` : "N/A"}
                    </span>
                  </div>
                </div>
                <p className="body-sm" style={{ color: "var(--text-secondary)", marginBottom: 8 }}>
                  {lastEntry.summary}
                </p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {lastEntry.tags?.map((tag) => (
                    <span key={tag} className="badge badge-accent" style={{ fontSize: 11 }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Staged Entries */}
          <div className="card">
            <h3 className="h4" style={{ marginBottom: 16 }}>
              Staging Area ({stagedEntries.length})
            </h3>
            {stagedEntries.length === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}>
                <div className="empty-state-icon">📋</div>
                <p className="empty-state-desc">
                  Ingested content will appear here for your review before being committed to the brain vault.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {stagedEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="card"
                    style={{
                      padding: 16,
                      borderLeft: "3px solid var(--agent-scholar)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div className="h4">{entry.title}</div>
                      <span className="badge badge-info">{entry.category}</span>
                    </div>
                    <p className="body-sm" style={{ color: "var(--text-secondary)", marginBottom: 8 }}>
                      {entry.summary}
                    </p>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {entry.tags?.map((tag) => (
                        <span key={tag} className="badge badge-accent" style={{ fontSize: 11 }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button className="btn btn-primary btn-sm">✅ Approve</button>
                      <button className="btn btn-ghost btn-sm">❌ Dismiss</button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setActiveTab("Scholar")}
                      >
                        💬 Review with Scholar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scholar Chat Tab */}
      {activeTab === "Scholar" && (
        <div className="card" style={{ minHeight: 500, display: "flex", flexDirection: "column" }}>
          <h3 className="h4" style={{ marginBottom: 16 }}>Chat with Scholar</h3>

          {/* Chat History */}
          <div style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            marginBottom: 16,
            padding: "0 4px",
          }}>
            {scholarHistory.length === 0 ? (
              <div className="empty-state" style={{ flex: 1 }}>
                <div className="empty-state-icon">💬</div>
                <p className="empty-state-title">Ask Scholar anything</p>
                <p className="empty-state-desc">
                  Scholar answers grounded in your ingested documentation. Ask about patterns, APIs, or review staged content.
                </p>
              </div>
            ) : (
              scholarHistory.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    padding: "12px 16px",
                    borderRadius: "var(--radius-md)",
                    background: msg.role === "user" ? "var(--accent-subtle)" : "var(--bg-tertiary)",
                    alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                    maxWidth: "80%",
                  }}
                >
                  <div className="caption" style={{ marginBottom: 4, fontWeight: 600 }}>
                    {msg.role === "user" ? "You" : "📚 Scholar"}
                  </div>
                  <div className="body-sm" style={{ whiteSpace: "pre-wrap" }}>
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            {scholarLoading && (
              <div style={{ alignSelf: "flex-start", padding: "12px 16px" }}>
                <span className="caption">Scholar is thinking...</span>
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="input"
              placeholder="Ask Scholar a question..."
              value={scholarMessage}
              onChange={(e) => setScholarMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleScholarChat()}
            />
            <button
              className="btn btn-primary"
              onClick={handleScholarChat}
              disabled={scholarLoading || !scholarMessage.trim()}
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* Sources Tab */}
      {activeTab === "Sources" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 className="h4">Documentation Sources ({status?.scheduledSources?.length || 0})</h3>
              <button className="btn btn-primary btn-sm" disabled>
                🔄 Ingest All
              </button>
            </div>
          </div>
          {status?.scheduledSources?.map((source) => (
            <div key={source.id} className="card" style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div className="body" style={{ fontWeight: 600 }}>{source.name}</div>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="caption"
                    style={{ color: "var(--info)" }}
                  >
                    {source.url}
                  </a>
                </div>
                <span className={`badge ${source.status === "ingested" ? "badge-success" : "badge-warning"}`}>
                  {source.status === "ingested" ? "✅ Ingested" : "⏳ Pending"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
