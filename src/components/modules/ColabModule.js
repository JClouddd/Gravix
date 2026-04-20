/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useCallback } from "react";
import HelpTooltip from "@/components/HelpTooltip";

/**
 * Colab Module — Notebook runner + Results viewer + Pending notebook review
 */

export default function ColabModule() {
  const [notebooks, setNotebooks] = useState([]);
  const [pendingNotebooks, setPendingNotebooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Execution flow state
  const [selectedNotebook, setSelectedNotebook] = useState(null);
  const [parameters, setParameters] = useState({});
  const [executionStatus, setExecutionStatus] = useState("idle");
  const [executionMessage, setExecutionMessage] = useState("");

  // Results history state
  const [executionHistory, setExecutionHistory] = useState([]);

  // Pending review state
  const [reviewingNotebook, setReviewingNotebook] = useState(null);
  const [reviewContent, setReviewContent] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  // Notebook Section Tabs & Multi-select
  const [selectedPendingNotebooks, setSelectedPendingNotebooks] = useState([]);
  const [activeReviewTab, setActiveReviewTab] = useState("Overview");

  // Supplementary Input Form State
  const [isSupplementaryFormExpanded, setIsSupplementaryFormExpanded] = useState(false);
  const [suppRepoUrl, setSuppRepoUrl] = useState("");
  const [suppDocUrl, setSuppDocUrl] = useState("");
  const [suppPrompt, setSuppPrompt] = useState("");
  const [suppNotes, setSuppNotes] = useState("");

  const fetchNotebooks = useCallback(async () => {
    try {
      const response = await fetch("/api/colab/execute");
      const data = await response.json();
      if (data.notebooks) {
        setNotebooks(data.notebooks);
      }
      if (data.pendingNotebooks) {
        setPendingNotebooks(data.pendingNotebooks);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { Promise.resolve().then(() => fetchNotebooks()); }, [fetchNotebooks]);

  const handleRunClick = (notebook) => {
    setSelectedNotebook(notebook);
    const initialParams = {};
    if (notebook.parameters) {
      notebook.parameters.forEach(p => {
        initialParams[p.name] = p.default !== undefined ? p.default : "";
      });
    }
    setParameters(initialParams);
    setExecutionStatus("idle");
    setExecutionMessage("");
  };

  const handleParamChange = (name, value) => {
    setParameters(prev => ({ ...prev, [name]: value }));
  };

  const handleCancelRun = () => {
    setSelectedNotebook(null);
    setExecutionStatus("idle");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setExecutionStatus("queued");
    setExecutionMessage("Execution queued...");

    const formattedParams = { ...parameters };
    if (selectedNotebook?.parameters) {
      selectedNotebook.parameters.forEach(p => {
        if (p.type === "array" && typeof formattedParams[p.name] === "string") {
          formattedParams[p.name] = formattedParams[p.name].split(",").map(s => s.trim());
        }
      });
    }

    try {
      const response = await fetch("/api/colab/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notebookId: selectedNotebook.id, parameters: formattedParams }),
      });
      const result = await response.json();

      if (!response.ok) {
        setExecutionStatus("error");
        setExecutionMessage(result.error || "Execution failed");
      } else {
        setExecutionStatus("completed");
        setExecutionMessage("Execution completed");
        setExecutionHistory(prev => [
          {
            id: `exec_${Date.now()}`,
            notebook: result.notebook || selectedNotebook.name,
            status: "completed",
            time: new Date().toLocaleString(),
            executionTime: result.executionTime,
            parameters: result.parameters || formattedParams,
            message: "Execution finished.",
            results: result.results,
            chartUrls: result.chartUrls,
          },
          ...prev,
        ]);
        setTimeout(() => setSelectedNotebook(null), 2000);
      }
    } catch (err) {
      setExecutionStatus("error");
      setExecutionMessage(err.message);
    }
  };

  /* ── Review Pending Notebook ──────────────────────────────── */
  const handleReviewContent = async (nb) => {
    if (reviewingNotebook === nb.id) {
      setReviewingNotebook(null);
      setReviewContent(null);
      return;
    }
    setReviewingNotebook(nb.id);
    setReviewLoading(true);
    try {
      const res = await fetch(`/api/colab/notebooks/approve?id=${nb.id}`);
      const data = await res.json();
      setReviewContent(data);
    } catch (err) {
      setReviewContent({ error: err.message });
    } finally {
      setReviewLoading(false);
    }
  };


  const handleTogglePendingSelect = (id) => {
    setSelectedPendingNotebooks(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBatchApprove = async () => {
    for (const id of selectedPendingNotebooks) {
      await handleApproveReject(id, "approve");
    }
    setSelectedPendingNotebooks([]);
  };

  const handleBatchReject = async () => {
    for (const id of selectedPendingNotebooks) {
      await handleApproveReject(id, "reject");
    }
    setSelectedPendingNotebooks([]);
  };

  const handleBatchSendToJules = async () => {
    // In a real implementation this would call POST /api/jules/tasks
    // Constructing a prompt based on the selected notebooks
    const selectedNbs = pendingNotebooks.filter(nb => selectedPendingNotebooks.includes(nb.id));
    for (const nb of selectedNbs) {
      try {
        await fetch("/api/jules/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: `Review and integrate the notebook analysis for: ${nb.name}. ${nb.description}`,
            title: `Integrate ${nb.name}`
          })
        });
      } catch (e) {
        console.error("Failed to send to Jules", e);
      }
    }
    // We could potentially mark them as sent or archived here
    setSelectedPendingNotebooks([]);
  };

  const handleBatchArchive = () => {
    // Just clear selection for now, or implement archive logic
    setSelectedPendingNotebooks([]);
  };

  const handleApproveReject = async (notebookId, action) => {
    try {
      await fetch("/api/colab/notebooks/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notebookId, action }),
      });
      setReviewingNotebook(null);
      setReviewContent(null);
      fetchNotebooks(); // Refresh
    } catch (err) {
      console.error("Approve/reject failed:", err);
    }
  };

  return (
    <div>
      <div className="module-header">
        <div className="module-header-left">
          <div className="module-icon" style={{ background: "hsla(280, 65%, 55%, 0.12)" }}>📊</div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h1 className="module-title">Colab</h1>
              <HelpTooltip module="colab" />
            </div>
            <p className="module-subtitle">Notebook execution and data analysis — powered by Analyst</p>
          </div>
        </div>
      </div>


      {/* ── Supplementary Input Form ───────────────────────────── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
          onClick={() => setIsSupplementaryFormExpanded(!isSupplementaryFormExpanded)}
        >
          <h3 className="h5" style={{ margin: 0 }}>➕ Supplementary Context</h3>
          <span style={{ transform: isSupplementaryFormExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
            ▼
          </span>
        </div>

        {isSupplementaryFormExpanded && (
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label className="caption" style={{ display: "block", marginBottom: 4 }}>Add Repo URL</label>
                <input
                  type="text"
                  className="input"
                  value={suppRepoUrl}
                  onChange={(e) => setSuppRepoUrl(e.target.value)}
                  placeholder="https://github.com/..."
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className="caption" style={{ display: "block", marginBottom: 4 }}>Add Doc URL</label>
                <input
                  type="text"
                  className="input"
                  value={suppDocUrl}
                  onChange={(e) => setSuppDocUrl(e.target.value)}
                  placeholder="https://docs..."
                />
              </div>
            </div>

            <div>
              <label className="caption" style={{ display: "block", marginBottom: 4 }}>Add Prompt/Instructions</label>
              <textarea
                className="input"
                value={suppPrompt}
                onChange={(e) => setSuppPrompt(e.target.value)}
                placeholder="Specific instructions for analysis..."
                rows={3}
                style={{ resize: "vertical" }}
              />
            </div>

            <div>
              <label className="caption" style={{ display: "block", marginBottom: 4 }}>Notes</label>
              <textarea
                className="input"
                value={suppNotes}
                onChange={(e) => setSuppNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={2}
                style={{ resize: "vertical" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  // In a real app, this would post to an ingestion API
                  console.log("Submit supplementary context", { suppRepoUrl, suppDocUrl, suppPrompt, suppNotes });
                  // Reset form or show success toast
                }}
              >
                Submit Context
              </button>
            </div>
          </div>
        )}
      </div>

{/* ── Pending Notebooks Review ──────────────────────────── */}
      {pendingNotebooks.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 className="h4" style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            📋 Pending Review
            <span className="badge badge-warning">{pendingNotebooks.length}</span>
          </h3>

          {selectedPendingNotebooks.length > 0 && (
            <div style={{
              position: "sticky",
              top: 16,
              zIndex: 10,
              background: "var(--bg-secondary)",
              border: "1px solid var(--card-border)",
              borderRadius: "var(--radius-md)",
              padding: "12px 16px",
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
            }}>
              <div className="h5" style={{ margin: 0 }}>
                {selectedPendingNotebooks.length} selected
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={handleBatchSendToJules}>
                  🤖 Send to Jules
                </button>
                <button className="btn btn-sm" style={{ background: "var(--success-subtle, rgba(34,197,94,0.1))", color: "var(--success)" }} onClick={handleBatchApprove}>
                  ✅ Approve All
                </button>
                <button className="btn btn-secondary btn-sm" onClick={handleBatchArchive}>
                  Archive
                </button>
                <button className="btn btn-sm" style={{ background: "var(--error-subtle, rgba(239,68,68,0.1))", color: "var(--error)" }} onClick={handleBatchReject}>
                  ❌ Deny
                </button>
              </div>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {pendingNotebooks.map((nb) => {
              const TYPE_COLORS = {
                tool_analysis: { bg: "#4285f422", color: "#4285f4", label: "🔧 Tool Analysis" },
                competitive_intel: { bg: "#ea433522", color: "#ea4335", label: "🏁 Competitive Intel" },
                tutorial_extraction: { bg: "#34a85322", color: "#34a853", label: "📖 Tutorial" },
                skill_reference: { bg: "#fbbc0522", color: "#fbbc05", label: "⚡ Skill Reference" },
                research_note: { bg: "#9aa0a622", color: "#9aa0a6", label: "📝 Research Note" },
              };
              const typeInfo = TYPE_COLORS[nb.notebookType] || TYPE_COLORS.research_note;
              const relatedNbs = nb.relatedNotebooks || [];
              const mergeCandidate = nb.mergeCandidate;

              return (

              <div key={nb.id} className="card" style={{ borderLeft: `3px solid ${typeInfo.color}`, position: "relative", paddingLeft: 40 }}>
                <div style={{ position: "absolute", left: 12, top: 16 }}>
                  <input
                    type="checkbox"
                    checked={selectedPendingNotebooks.includes(nb.id)}
                    onChange={() => handleTogglePendingSelect(nb.id)}
                    style={{ cursor: "pointer", width: 16, height: 16 }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div className="h5">{nb.name}</div>
                    <p className="body-sm" style={{ color: "var(--text-secondary)", marginTop: 4 }}>{nb.description}</p>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span className="badge" style={{ background: typeInfo.bg, color: typeInfo.color, fontSize: 10, border: `1px solid ${typeInfo.color}44` }}>
                      {typeInfo.label}
                    </span>
                    <span className="badge badge-warning" style={{ fontSize: 10 }}>pending</span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                  <span className="badge badge-info">{nb.sourceType === "video_transcript" ? "🎬 Video" : "📄 " + (nb.sourceType || "text")}</span>
                  <span className="badge" style={{ background: "var(--bg-tertiary)" }}>from: {nb.sourceTitle}</span>
                  {nb.estimatedCost && <span className="badge badge-success">{nb.estimatedCost}</span>}
                  {nb.classification?.tags?.map((tag) => (
                    <span key={tag} className="badge" style={{ background: "var(--bg-tertiary)", fontSize: 11 }}>{tag}</span>
                  ))}
                </div>

                {nb.expectedOutputs?.length > 0 && (
                  <div className="body-sm" style={{ color: "var(--text-secondary)", marginBottom: 8 }}>
                    <strong>Expected outputs:</strong> {nb.expectedOutputs.join(", ")}
                  </div>
                )}

                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleReviewContent(nb)}>
                    {reviewingNotebook === nb.id ? "Hide Content" : "Review Content"}
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={() => handleApproveReject(nb.id, "approve")}>
                    ✅ Approve
                  </button>
                  <button className="btn btn-sm" style={{ background: "var(--error-subtle, rgba(239,68,68,0.1))", color: "var(--error)" }} onClick={() => handleApproveReject(nb.id, "reject")}>
                    ❌ Reject
                  </button>
                </div>

                {/* Related Notebooks */}
                {relatedNbs.length > 0 && (
                  <div style={{ marginTop: 10, padding: 8, borderRadius: 6, background: "var(--bg-secondary)", border: "1px solid var(--card-border)" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>🔗 Related Notebooks ({relatedNbs.length})</div>
                    {relatedNbs.map((rel) => (
                      <div key={rel.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderBottom: "1px solid var(--card-border)" }}>
                        <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{rel.name}</span>
                        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                          <span className="badge" style={{ fontSize: 9, background: rel.overlap > 60 ? "#ea433522" : "var(--bg-tertiary)", color: rel.overlap > 60 ? "#ea4335" : "var(--text-secondary)" }}>
                            {rel.overlap}% overlap
                          </span>
                        </div>
                      </div>
                    ))}
                    {mergeCandidate && (
                      <button
                        className="btn btn-sm"
                        style={{ marginTop: 8, fontSize: 10, background: "#ea433522", color: "#ea4335", border: "1px solid #ea433544", width: "100%" }}
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await fetch("/api/colab/notebooks/merge", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ targetId: mergeCandidate.id, sourceId: nb.id }),
                            });
                            fetchNotebooks();
                          } catch (err) {
                            console.error("Merge failed:", err);
                          }
                        }}
                      >
                        🔀 Merge into &quot;{mergeCandidate.name}&quot;
                      </button>
                    )}
                  </div>
                )}


                {/* ── Full Content Review ── */}
                {reviewingNotebook === nb.id && (
                  <div style={{ marginTop: 12, padding: 16, background: "var(--bg-secondary)", borderRadius: "var(--radius-md)", border: "1px solid var(--card-border)" }}>
                    {reviewLoading ? (
                      <div className="body-sm">Loading content...</div>
                    ) : reviewContent?.error ? (
                      <div className="badge badge-error">{reviewContent.error}</div>
                    ) : (
                      <div>
                        {/* Tabs Navigation */}
                        <div style={{
                          display: "flex",
                          gap: 4,
                          marginBottom: 16,
                          borderBottom: "1px solid var(--card-border)",
                          paddingBottom: 0,
                          overflowX: "auto"
                        }}>
                          {["Overview", "Research", "Visuals", "Build Plan", "Validation", "Raw"].map((tab) => (
                            <button
                              key={tab}
                              onClick={() => setActiveReviewTab(tab)}
                              style={{
                                padding: "6px 12px",
                                fontSize: 13,
                                fontWeight: activeReviewTab === tab ? 600 : 400,
                                color: activeReviewTab === tab ? "#fff" : "var(--text-secondary)",

                                transition: "all var(--duration-fast) var(--ease-out)",
                                background: activeReviewTab === tab ? "var(--accent)" : "var(--bg-tertiary)", borderRadius: "var(--radius-full)", border: "1px solid var(--card-border)",
                                cursor: "pointer",
                                whiteSpace: "nowrap"
                              }}
                            >
                              {tab}
                            </button>
                          ))}
                        </div>

                        {/* Tab Content */}
                        <div style={{ maxHeight: 500, overflowY: "auto", paddingRight: 8 }}>
                          {activeReviewTab === "Overview" && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                              <div className="h5">{reviewContent?.name}</div>

                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                                <span className="body-sm" style={{ color: "var(--text-secondary)" }}>Source:</span>
                                <span className="badge" style={{ background: "var(--bg-tertiary)" }}>{reviewContent?.sourceTitle}</span>

                                <span className="body-sm" style={{ color: "var(--text-secondary)", marginLeft: 8 }}>Type:</span>
                                <span className="badge badge-info">{reviewContent?.sourceType || "document"}</span>

                                {reviewContent?.analysis?.confidence_score && (
                                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 8 }}>
                                    <div style={{
                                      width: 8, height: 8, borderRadius: "50%",
                                      background: reviewContent.analysis.confidence_score > 0.8 ? "var(--success)" :
                                                  reviewContent.analysis.confidence_score > 0.5 ? "var(--warning)" : "var(--error)"
                                    }} />
                                    <span className="caption">Confidence</span>
                                  </div>
                                )}
                              </div>

                              {reviewContent?.classification?.tags && (
                                <div>
                                  <span className="body-sm" style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>Domain Tags:</span>
                                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                    {reviewContent.classification.tags.map(tag => (
                                      <span key={tag} className="badge" style={{ background: "var(--bg-tertiary)", fontSize: 11 }}>{tag}</span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="body-sm">
                                <strong>Description:</strong> {reviewContent?.description}
                              </div>
                            </div>
                          )}

                          {activeReviewTab === "Research" && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                              {reviewContent?.analysis?.tools_and_software?.length > 0 && (
                                <div>
                                  <h4 className="h5" style={{ marginBottom: 8 }}>🔧 Tool Profiles</h4>
                                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    {reviewContent.analysis.tools_and_software.map((tool, i) => (
                                      <div key={i} style={{ padding: 12, background: "var(--bg-primary)", borderRadius: "var(--radius-sm)", border: "1px solid var(--card-border)" }}>
                                        <strong>{tool.name}</strong>
                                        <p className="body-sm" style={{ margin: "4px 0 0 0", color: "var(--text-secondary)" }}>{tool.description}</p>
                                        {tool.url && <a href={tool.url} target="_blank" rel="noreferrer" className="caption" style={{ color: "var(--accent)" }}>{tool.url}</a>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {reviewContent?.analysis?.integrations_and_apis?.length > 0 && (
                                <div>
                                  <h4 className="h5" style={{ marginBottom: 8 }}>🔌 API References</h4>
                                  <ul className="body-sm" style={{ paddingLeft: 20, margin: 0, color: "var(--text-secondary)" }}>
                                    {reviewContent.analysis.integrations_and_apis.map((api, i) => (
                                      <li key={i}>{api.name || api}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {reviewContent?.analysis?.code_patterns_and_config?.length > 0 && (
                                <div>
                                  <h4 className="h5" style={{ marginBottom: 8 }}>💵 Pricing / Config</h4>
                                  <ul className="body-sm" style={{ paddingLeft: 20, margin: 0, color: "var(--text-secondary)" }}>
                                    {reviewContent.analysis.code_patterns_and_config.map((pattern, i) => (
                                      <li key={i}>{pattern.description || pattern}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {(!reviewContent?.analysis?.tools_and_software?.length && !reviewContent?.analysis?.integrations_and_apis?.length && !reviewContent?.analysis?.code_patterns_and_config?.length) && (
                                <div className="body-sm" style={{ color: "var(--text-tertiary)" }}>No research data available.</div>
                              )}
                            </div>
                          )}

                          {activeReviewTab === "Visuals" && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                              <h4 className="h5" style={{ marginBottom: 4 }}>🖼 Visual References</h4>
                              {reviewContent?.analysis?.visual_elements?.length > 0 ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                  {reviewContent.analysis.visual_elements.map((vis, i) => (
                                    <div key={i} style={{ display: "flex", gap: 12, padding: 12, background: "var(--bg-primary)", borderRadius: "var(--radius-sm)", border: "1px solid var(--card-border)" }}>
                                      {vis.timestamp && (
                                        <span className="badge badge-info" style={{ fontFamily: "monospace", alignSelf: "flex-start" }}>{vis.timestamp}</span>
                                      )}
                                      <div>
                                        <strong>{vis.type || "Visual"}</strong>
                                        <p className="body-sm" style={{ margin: "4px 0 0 0", color: "var(--text-secondary)" }}>{vis.description}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="body-sm" style={{ color: "var(--text-tertiary)" }}>No visual references found.</div>
                              )}
                            </div>
                          )}

                          {activeReviewTab === "Build Plan" && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                              {reviewContent?.analysis?.actionable_items?.length > 0 && (
                                <div>
                                  <h4 className="h5" style={{ marginBottom: 8 }}>✅ Actionable Items</h4>
                                  <ul className="body-sm" style={{ paddingLeft: 20, margin: 0, color: "var(--text-primary)" }}>
                                    {reviewContent.analysis.actionable_items.map((item, i) => (
                                      <li key={i} style={{ marginBottom: 6 }}>{item.task || item}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {reviewContent?.analysis?.beta_preview_features?.length > 0 && (
                                <div>
                                  <h4 className="h5" style={{ marginBottom: 8 }}>⚠️ Prerequisites & Beta Features</h4>
                                  <ul className="body-sm" style={{ paddingLeft: 20, margin: 0, color: "var(--text-secondary)" }}>
                                    {reviewContent.analysis.beta_preview_features.map((item, i) => (
                                      <li key={i}>{item.feature || item}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {(!reviewContent?.analysis?.actionable_items?.length && !reviewContent?.analysis?.beta_preview_features?.length) && (
                                <div className="body-sm" style={{ color: "var(--text-tertiary)" }}>No build plan items found.</div>
                              )}
                            </div>
                          )}

                          {activeReviewTab === "Validation" && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                              <h4 className="h5" style={{ marginBottom: 4 }}>📈 Validation Info</h4>

                              {reviewContent?.analysis?.youtube_metadata?.publishedAt && (
                                <div className="body-sm">
                                  <strong>Published At:</strong> {new Date(reviewContent.analysis.youtube_metadata.publishedAt).toLocaleDateString()}
                                </div>
                              )}

                              <div className="body-sm">
                                <strong>Recency Status:</strong> {reviewContent?.analysis?.recency_status || "Unknown"}
                              </div>

                              <div className="body-sm">
                                <strong>Version Info:</strong> {reviewContent?.analysis?.version_info || "Not specified"}
                              </div>
                            </div>
                          )}

                          {activeReviewTab === "Raw" && (
                            <div>
                              <div className="body-sm" style={{ marginBottom: 8 }}>
                                <strong>Analysis Prompt:</strong>
                                <pre style={{ whiteSpace: "pre-wrap", margin: "4px 0", padding: 8, background: "var(--bg-primary)", borderRadius: "var(--radius-sm)", fontSize: 12 }}>
                                  {reviewContent?.analysisPrompt || "No prompt provided"}
                                </pre>
                              </div>
                              <div className="body-sm" style={{ marginBottom: 8 }}>
                                <strong>Raw Content ({(reviewContent?.rawContentLength || 0).toLocaleString()} chars):</strong>
                              </div>
                              <pre style={{ whiteSpace: "pre-wrap", margin: 0, padding: 12, background: "var(--bg-primary)", borderRadius: "var(--radius-sm)", fontSize: 12, lineHeight: 1.5 }}>
                                {reviewContent?.rawContent || "No raw content"}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

</div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Active Notebooks ──────────────────────────────────── */}
      {loading ? (
        <div className="empty-state">
          <div className="status-dot pulse" style={{ width: 24, height: 24, background: "var(--accent)" }}></div>
          <p>Loading notebooks...</p>
        </div>
      ) : error ? (
        <div className="empty-state">
          <p className="badge badge-error">{error}</p>
        </div>
      ) : (
        <div className="grid-auto" style={{ marginBottom: 24 }}>
          {notebooks.map((nb) => (
            <div key={nb.id || nb.name} className="card" style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 24 }}>{nb.icon || "📓"}</span>
                <div className="h4">{nb.name}</div>
              </div>
              <p className="body-sm" style={{ color: "var(--text-secondary)", marginBottom: 12 }}>
                {nb.description || nb.desc}
              </p>

              {nb.sourceTitle && (
                <div className="body-sm" style={{ color: "var(--text-tertiary)", marginBottom: 8 }}>
                  Source: {nb.sourceTitle}
                </div>
              )}

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                {nb.costEstimate && <span className="badge badge-success">~{nb.costEstimate}</span>}
              </div>

              {nb.parameters && nb.parameters.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p className="body-sm" style={{ fontWeight: 600, marginBottom: 4 }}>Parameters:</p>
                  <ul className="body-sm" style={{ paddingLeft: 20, color: "var(--text-secondary)", margin: 0 }}>
                    {nb.parameters.map(p => (
                      <li key={p.name}>
                        <code>{p.name}</code> {p.required ? <span style={{ color: "var(--error)" }}>*</span> : ""}
                        {p.description && <span> - {p.description}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={{ marginTop: "auto" }}>
                {selectedNotebook?.id === nb.id ? (
                  <form onSubmit={handleSubmit} style={{ background: "var(--bg-secondary)", padding: 16, borderRadius: "var(--radius-md)", marginTop: 12 }}>
                    <h4 className="h5" style={{ marginBottom: 12 }}>Configure Run</h4>
                    {nb.parameters?.map(p => (
                      <div key={p.name} style={{ marginBottom: 12 }}>
                        <label className="body-sm" style={{ display: "block", marginBottom: 4 }}>
                          {p.name} {p.required && <span style={{ color: "var(--error)" }}>*</span>}
                        </label>
                        <input
                          className="input"
                          type="text"
                          value={parameters[p.name] || ""}
                          onChange={(e) => handleParamChange(p.name, e.target.value)}
                          placeholder={p.default || (p.type === "array" ? "comma separated list" : "")}
                          required={p.required}
                        />
                      </div>
                    ))}
                    {executionMessage && (
                      <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }} className="body-sm">
                        {(executionStatus === "queued" || executionStatus === "running") && (
                          <div style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>↻</div>
                        )}
                        <span className={executionStatus === "error" ? "badge badge-error" : executionStatus === "completed" ? "badge badge-success" : "badge badge-info"}>
                          {executionStatus}: {executionMessage}
                        </span>
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="submit" className="btn btn-primary btn-sm" disabled={executionStatus === "queued" || executionStatus === "running"}>
                        Start Execution
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={handleCancelRun} disabled={executionStatus === "queued" || executionStatus === "running"}>
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <button className="btn btn-primary btn-sm" onClick={() => handleRunClick(nb)}>
                    ▶ Run
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Results ──────────────────────────────────────────── */}
      <div className="card">
        <h3 className="h4" style={{ marginBottom: 16 }}>Results</h3>
        {executionHistory.length === 0 ? (
          <div className="empty-state" style={{ padding: 32 }}>
            <div className="empty-state-icon">🧪</div>
            <p className="empty-state-title">No results yet</p>
            <p className="empty-state-desc">Run a notebook to see outputs, charts, and analysis results here.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {executionHistory.map(exec => (
              <div key={exec.id} style={{ padding: 16, border: "1px solid var(--card-border)", borderRadius: "var(--radius-md)", background: "var(--bg-secondary)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <h4 className="h5">{exec.notebook}</h4>
                    <p className="body-sm" style={{ color: "var(--text-tertiary)" }}>{exec.time}</p>
                  </div>
                  <span className={`badge ${exec.status === "completed" ? "badge-success" : "badge-error"}`}>{exec.status}</span>
                </div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 8 }}>
                  {Object.entries(exec.parameters || {}).map(([k, v]) => (
                    <span key={k} className="body-sm" style={{ background: "var(--bg-tertiary)", padding: "2px 8px", borderRadius: "var(--radius-sm)" }}>
                      <strong>{k}:</strong> {Array.isArray(v) ? v.join(", ") : String(v)}
                    </span>
                  ))}
                </div>
                <p className="body-sm" style={{ color: "var(--text-secondary)" }}>{exec.message}</p>
                {exec.executionTime && (
                  <p className="body-sm" style={{ color: "var(--text-tertiary)", marginTop: 4 }}>
                    Execution Time: {(exec.executionTime / 1000).toFixed(2)}s
                  </p>
                )}
                {exec.results && (
                  <div style={{ marginTop: 12, padding: 12, background: "var(--bg-primary)", borderRadius: "var(--radius-sm)", border: "1px solid var(--card-border)", overflowX: "auto" }}>
                    <pre className="body-sm" style={{ margin: 0 }}>
                      {typeof exec.results === "object" ? JSON.stringify(exec.results, null, 2) : exec.results}
                    </pre>
                  </div>
                )}
                {exec.chartUrls && exec.chartUrls.length > 0 && (
                  <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {exec.chartUrls.map((url, i) => (
                      <img key={i} src={url} alt={`Chart ${i + 1}`} style={{ maxWidth: "100%", borderRadius: "var(--radius-md)" }} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
