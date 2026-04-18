"use client";

import { useState, useEffect, useCallback } from "react";
import HelpTooltip from "@/components/HelpTooltip";

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
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
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

  // Handle file drop
  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (!file) return;

    const allowedTypes = ['.txt', '.md', '.json', '.csv'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!allowedTypes.includes(fileExtension) && file.type !== "text/plain" && file.type !== "application/json" && file.type !== "text/csv") {
      setIngestionError("Unsupported file type. Please upload .txt, .md, .json, or .csv files.");
      return;
    }

    setIngesting(true);
    setIngestionError("");
    setLastEntry(null);
    setUploadProgress(10); // Start progress

    try {
      const reader = new FileReader();

      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentLoaded = Math.round((event.loaded / event.total) * 40); // Reader phase up to 50%
          setUploadProgress(10 + percentLoaded);
        }
      };

      reader.onload = async (event) => {
        try {
          const content = event.target.result;
          // Encode content to base64
          const base64Content = btoa(unescape(encodeURIComponent(content)));

          setUploadProgress(60); // Preparing request

          const res = await fetch("/api/knowledge/ingest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: base64Content,
              type: "file",
              fileName: file.name,
              source: "manual",
            }),
          });

          setUploadProgress(90); // Waiting for response

          const data = await res.json();
          setUploadProgress(100);

          if (res.ok && data.success) {
            setStagedEntries((prev) => [data.entry || data, ...prev]);
            setLastEntry(data.entry || data);
            setIngestionTitle("");
            setTimeout(() => setUploadProgress(0), 1500); // Reset after delay
          } else {
            setIngestionError(data.error || "Ingestion failed");
            setUploadProgress(0);
          }
        } catch (err) {
          setIngestionError("Error processing file content: " + err.message);
          setUploadProgress(0);
        }
        setIngesting(false);
      };

      reader.onerror = () => {
        setIngestionError("Error reading file.");
        setIngesting(false);
        setUploadProgress(0);
      };

      reader.readAsText(file);
    } catch (error) {
      console.error("File processing failed:", error);
      setIngestionError(error.message || "An unexpected error occurred");
      setIngesting(false);
      setUploadProgress(0);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  // Handle ingestion submission
  const handleIngest = useCallback(async () => {
    if (!ingestionInput.trim()) return;
    setIngesting(true);
    setIngestionError("");
    setLastEntry(null);
    setUploadProgress(30);
    try {
      const endpoint = ingestionType === "url" ? "/api/knowledge/ingest-url" : "/api/knowledge/ingest";
      const payload = ingestionType === "url"
        ? { url: ingestionInput, type: "webpage" } // assuming webpage for now, could be improved
        : {
            content: ingestionInput,
            type: ingestionType,
            title: ingestionTitle,
            source: "manual",
          };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setUploadProgress(80);
      const data = await res.json();
      setUploadProgress(100);

      if (res.ok && (data.success || data.ingested)) {
        setStagedEntries((prev) => [data.entry, ...prev]);
        setLastEntry(data.entry);
        setIngestionInput("");
        setIngestionTitle("");
        setTimeout(() => setUploadProgress(0), 1500);
      } else {
        setIngestionError(data.error || "Ingestion failed");
        setUploadProgress(0);
      }
    } catch (error) {
      console.error("Ingestion failed:", error);
      setIngestionError(error.message || "An unexpected error occurred");
      setUploadProgress(0);
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
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h1 className="module-title">Knowledge</h1>
              <HelpTooltip module="knowledge" />
            </div>
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

          {/* Drag and Drop Zone */}
          <div
            className="card"
            style={{
              border: isDragging ? "2px dashed var(--accent)" : "2px dashed var(--card-border)",
              background: isDragging ? "var(--accent-subtle)" : "var(--bg-secondary)",
              transition: "all var(--duration-fast) var(--ease-out)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "40px 20px",
              cursor: "pointer"
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => {
              // Trigger hidden file input if needed (optional)
              document.getElementById('file-upload-input')?.click();
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 16 }}>📥</div>
            <h3 className="h4">Drag & Drop Files Here</h3>
            <p className="body-sm" style={{ color: "var(--text-secondary)", marginTop: 8 }}>
              Supports .txt, .md, .json, .csv files
            </p>
            <input
              type="file"
              id="file-upload-input"
              style={{ display: 'none' }}
              accept=".txt,.md,.json,.csv"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  // Simulate drop event logic
                  const event = {
                    preventDefault: () => {},
                    dataTransfer: { files: e.target.files }
                  };
                  handleDrop(event);
                }
              }}
            />
          </div>

          {/* Upload Progress Indicator */}
          {uploadProgress > 0 && (
            <div className="card" style={{ padding: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span className="caption">Uploading & Processing...</span>
                <span className="caption">{uploadProgress}%</span>
              </div>
              <div style={{ width: "100%", height: 6, background: "var(--bg-tertiary)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${uploadProgress}%`,
                  background: "var(--accent)",
                  transition: "width 0.3s ease-out"
                }} />
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="card">
            <h3 className="h4" style={{ marginBottom: 16 }}>Submit Content or URL</h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
              <select
                className="input"
                value={ingestionType}
                onChange={(e) => setIngestionType(e.target.value)}
              >
                <option value="text">Text Input</option>
                <option value="url">Ingest URL (Webpage / YouTube)</option>
                <option value="pdf_transcript">PDF Transcript</option>
              </select>

              {ingestionType !== "url" && (
                <input
                  type="text"
                  className="input"
                  placeholder="Title (Optional)"
                  value={ingestionTitle}
                  onChange={(e) => setIngestionTitle(e.target.value)}
                />
              )}

              {ingestionType === "url" ? (
                <input
                  type="text"
                  className="input"
                  placeholder="Enter Webpage or YouTube URL..."
                  value={ingestionInput}
                  onChange={(e) => setIngestionInput(e.target.value)}
                />
              ) : (
                <textarea
                  className="input"
                  rows={4}
                  placeholder="Paste content or document text..."
                  value={ingestionInput}
                  onChange={(e) => setIngestionInput(e.target.value)}
                  style={{ resize: "vertical" }}
                />
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                className="btn btn-primary"
                onClick={handleIngest}
                disabled={ingesting || !ingestionInput.trim()}
              >
                {ingesting ? "⏳ Processing..." : (ingestionType === "url" ? "Ingest URL" : "Submit for Review")}
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
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: lastEntry.crossref ? 12 : 0 }}>
                  {lastEntry.tags?.map((tag) => (
                    <span key={tag} className="badge badge-accent" style={{ fontSize: 11 }}>
                      {tag}
                    </span>
                  ))}
                  {lastEntry.crossref?.suggestedTags?.filter(tag => !lastEntry.tags?.includes(tag)).map(tag => (
                    <span key={tag} className="badge badge-accent" style={{ fontSize: 11, border: "1px dashed var(--accent)" }}>
                      {tag}*
                    </span>
                  ))}
                </div>
                {lastEntry.crossref && (
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
                    {lastEntry.crossref.relatedDocs?.length > 0 && (
                      <div>
                        <div className="caption" style={{ fontWeight: 600, marginBottom: 4 }}>🔗 Related Knowledge</div>
                        {lastEntry.crossref.relatedDocs.map((doc, idx) => (
                          <div key={idx} className="body-sm" style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)" }}>
                            <span>• {doc.title}</span>
                            <span className="caption">{doc.relevance}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {lastEntry.crossref.contradictions?.length > 0 && (
                      <div>
                        <div className="caption" style={{ fontWeight: 600, marginBottom: 4, color: "var(--warning)" }}>⚠️ Potential Contradictions</div>
                        {lastEntry.crossref.contradictions.map((contra, idx) => (
                          <div key={idx} style={{ background: "rgba(255, 170, 0, 0.1)", borderLeft: "2px solid var(--warning)", padding: "4px 8px", marginBottom: 4 }}>
                            <div className="caption" style={{ color: "var(--warning)" }}>{contra.description}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {lastEntry.crossref.updateSuggestions?.length > 0 && (
                      <div>
                        <div className="caption" style={{ fontWeight: 600, marginBottom: 4, color: "var(--info)" }}>💡 Update Suggestions</div>
                        {lastEntry.crossref.updateSuggestions.map((sugg, idx) => (
                          <div key={idx} className="body-sm" style={{ color: "var(--text-secondary)" }}>
                            <strong>{sugg.target}:</strong> {sugg.suggestion}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
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
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: entry.crossref ? 12 : 0 }}>
                      {entry.tags?.map((tag) => (
                        <span key={tag} className="badge badge-accent" style={{ fontSize: 11 }}>
                          {tag}
                        </span>
                      ))}
                      {entry.crossref?.suggestedTags?.filter(tag => !entry.tags?.includes(tag)).map(tag => (
                        <span key={tag} className="badge badge-accent" style={{ fontSize: 11, border: "1px dashed var(--accent)" }}>
                          {tag}*
                        </span>
                      ))}
                    </div>
                    {entry.crossref && (
                      <div style={{ background: "var(--bg-tertiary)", padding: 12, borderRadius: "var(--radius-sm)", marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                        {entry.crossref.relatedDocs?.length > 0 && (
                          <div>
                            <div className="caption" style={{ fontWeight: 600, marginBottom: 2 }}>🔗 Related</div>
                            {entry.crossref.relatedDocs.map((doc, idx) => (
                              <div key={idx} className="caption" style={{ color: "var(--text-secondary)" }}>• {doc.title} ({doc.relevance})</div>
                            ))}
                          </div>
                        )}
                        {entry.crossref.contradictions?.length > 0 && (
                          <div>
                            <div className="caption" style={{ fontWeight: 600, marginBottom: 2, color: "var(--warning)" }}>⚠️ Contradictions</div>
                            {entry.crossref.contradictions.map((contra, idx) => (
                              <div key={idx} className="caption" style={{ color: "var(--warning)" }}>• {contra.description}</div>
                            ))}
                          </div>
                        )}
                        {entry.crossref.updateSuggestions?.length > 0 && (
                          <div>
                            <div className="caption" style={{ fontWeight: 600, marginBottom: 2, color: "var(--info)" }}>💡 Suggestions</div>
                            {entry.crossref.updateSuggestions.map((sugg, idx) => (
                              <div key={idx} className="caption" style={{ color: "var(--text-secondary)" }}>• Update &apos;{sugg.target}&apos;: {sugg.suggestion}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
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
