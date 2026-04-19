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

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount pattern
  useEffect(() => { fetchNotebooks(); }, [fetchNotebooks]);

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

      {/* ── Pending Notebooks Review ──────────────────────────── */}
      {pendingNotebooks.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 className="h4" style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            📋 Pending Review
            <span className="badge badge-warning">{pendingNotebooks.length}</span>
          </h3>
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
              <div key={nb.id} className="card" style={{ borderLeft: `3px solid ${typeInfo.color}` }}>
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

                {/* ── Research Dossier (Phase A-D) ── */}
                {nb.hasResearch && (
                  <div style={{ marginTop: 8, marginBottom: 8 }}>
                    {/* Skill Spec Badge */}
                    {nb.skillSpec && (
                      <div style={{ padding: 10, borderRadius: 8, background: "linear-gradient(135deg, var(--accent-subtle, rgba(66,133,244,0.08)), var(--bg-secondary))", border: "1px solid var(--accent-border, rgba(66,133,244,0.2))", marginBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>⚡ {nb.skillSpec.skillName}</span>
                          {nb.validation && (
                            <span className="badge" style={{
                              fontSize: 10,
                              background: nb.validation.overallStatus === "verified" ? "#34a85322" : nb.validation.overallStatus === "caution" ? "#fbbc0522" : "#9aa0a622",
                              color: nb.validation.overallStatus === "verified" ? "#34a853" : nb.validation.overallStatus === "caution" ? "#fbbc05" : "#9aa0a6",
                              border: `1px solid ${nb.validation.overallStatus === "verified" ? "#34a85344" : nb.validation.overallStatus === "caution" ? "#fbbc0544" : "#9aa0a644"}`
                            }}>
                              {nb.validation.overallStatus === "verified" ? "🟢" : nb.validation.overallStatus === "caution" ? "🟡" : "🔵"} {nb.validation.overallStatus || "pending"}
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "0 0 6px" }}>{nb.skillSpec.description}</p>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {nb.skillSpec.domainTags?.map(tag => (
                            <span key={tag} className="badge" style={{ fontSize: 9, background: "var(--accent-subtle, rgba(66,133,244,0.1))", color: "var(--accent)" }}>{tag}</span>
                          ))}
                          {nb.skillSpec.antigravityTranslation?.migrationComplexity && (
                            <span className="badge" style={{ fontSize: 9, background: nb.skillSpec.antigravityTranslation.migrationComplexity === "easy" ? "#34a85322" : "#fbbc0522", color: nb.skillSpec.antigravityTranslation.migrationComplexity === "easy" ? "#34a853" : "#fbbc05" }}>
                              {nb.skillSpec.antigravityTranslation.migrationComplexity}
                            </span>
                          )}
                          {nb.skillSpec.antigravityTranslation?.estimatedBuildTime && (
                            <span className="badge" style={{ fontSize: 9, background: "var(--bg-tertiary)" }}>⏱ {nb.skillSpec.antigravityTranslation.estimatedBuildTime}</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Tool Dossier Summary */}
                    {nb.researchDossier && nb.researchDossier.length > 0 && (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                        {nb.researchDossier.map((tool, i) => (
                          <span key={i} className="badge" style={{ fontSize: 10, background: "var(--bg-tertiary)", border: "1px solid var(--card-border)" }}>
                            {tool.category === "api" ? "🔌" : tool.category === "platform" ? "☁️" : tool.category === "library" ? "📦" : "🔧"} {tool.toolName}
                            {tool.pricing?.hasFreeTeir && <span style={{ marginLeft: 4, color: "#34a853" }}>Free</span>}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Google Translation Map */}
                    {nb.googleTranslation?.mappings?.length > 0 && (
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
                        {nb.googleTranslation.mappings.map((m, i) => (
                          <span key={i} className="badge" style={{
                            fontSize: 9,
                            background: m.recommendation === "replace" ? "#34a85315" : m.recommendation === "keep" ? "#fbbc0515" : "#4285f415",
                            color: m.recommendation === "replace" ? "#34a853" : m.recommendation === "keep" ? "#fbbc05" : "#4285f4",
                            border: `1px solid ${m.recommendation === "replace" ? "#34a85330" : m.recommendation === "keep" ? "#fbbc0530" : "#4285f430"}`
                          }}>
                            {m.source} → {m.googleEquivalent || "keep"} ({m.recommendation})
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Research Meta */}
                    {nb.researchMeta && (
                      <div className="caption" style={{ color: "var(--text-tertiary)", fontSize: 10 }}>
                        📊 {nb.researchMeta.toolsResearched} tools researched • {nb.researchMeta.cost} • {nb.researchMeta.executionTime}
                      </div>
                    )}
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
                        🔀 Merge into &ldquo;{mergeCandidate.name}&rdquo;
                      </button>
                    )}
                  </div>
                )}

                {/* ── Full Content Review ── */}
                {reviewingNotebook === nb.id && (
                  <div style={{ marginTop: 12, padding: 16, background: "var(--bg-secondary)", borderRadius: "var(--radius-md)", border: "1px solid var(--card-border)", maxHeight: 500, overflowY: "auto" }}>
                    {reviewLoading ? (
                      <div className="body-sm">Loading content...</div>
                    ) : reviewContent?.error ? (
                      <div className="badge badge-error">{reviewContent.error}</div>
                    ) : (
                      <div>
                        <div className="body-sm" style={{ marginBottom: 8 }}>
                          <strong>Analysis Prompt:</strong>
                          <pre style={{ whiteSpace: "pre-wrap", margin: "4px 0", padding: 8, background: "var(--bg-primary)", borderRadius: "var(--radius-sm)", fontSize: 12 }}>
                            {reviewContent?.analysisPrompt}
                          </pre>
                        </div>
                        <div className="body-sm" style={{ marginBottom: 8 }}>
                          <strong>Raw Content ({(reviewContent?.rawContentLength || 0).toLocaleString()} chars):</strong>
                        </div>
                        <pre style={{ whiteSpace: "pre-wrap", margin: 0, padding: 12, background: "var(--bg-primary)", borderRadius: "var(--radius-sm)", fontSize: 12, lineHeight: 1.5, maxHeight: 350, overflowY: "auto" }}>
                          {reviewContent?.rawContent}
                        </pre>
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
