import Image from "next/image";
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import HelpTooltip from "@/components/HelpTooltip";

/**
 * Colab Module — Notebook runner + Results viewer
 */
import Image from 'next/image';

export default function ColabModule() {
  const [notebooks, setNotebooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Execution flow state
  const [selectedNotebook, setSelectedNotebook] = useState(null);
  const [parameters, setParameters] = useState({});
  const [executionStatus, setExecutionStatus] = useState("idle"); // idle, queued, running, completed, error
  const [executionMessage, setExecutionMessage] = useState("");

  // Results history state
  const [executionHistory, setExecutionHistory] = useState([
    {
      id: "mock_exec_1",
      notebook: "Health Trends",
      status: "completed",
      time: "Just now",
      parameters: { date_range: "30d" },
      message: "Analysis completed. 3 anomalies found."
    }
  ]);

  useEffect(() => {
    async function fetchNotebooks() {
      try {
        const response = await fetch("/api/colab/execute");
        const data = await response.json();
        if (data.notebooks) {
          setNotebooks(data.notebooks);
        } else {
          setError("Failed to load notebooks");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchNotebooks();
  }, []);

  const handleRunClick = (notebook) => {
    setSelectedNotebook(notebook);

    // Initialize parameters with defaults
    const initialParams = {};
    if (notebook.parameters) {
      notebook.parameters.forEach(p => {
        if (p.default !== undefined) {
          initialParams[p.name] = p.default;
        } else {
          initialParams[p.name] = "";
        }
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

    // Convert comma-separated string back to array if type is array
    // Wait, the API specifies parameter types: { name: "holdings", type: "array" }
    // If we just send a string from the input, the API might fail or handle it badly,
    // though the post endpoint currently only checks required fields and returns a mock response.
    // Let's do a simple parse if needed, but for now we can just send the raw parameters
    // and let the user input be whatever they typed.
    const formattedParams = { ...parameters };
    if (selectedNotebook && selectedNotebook.parameters) {
       selectedNotebook.parameters.forEach(p => {
         if (p.type === 'array' && typeof formattedParams[p.name] === 'string') {
             formattedParams[p.name] = formattedParams[p.name].split(',').map(s => s.trim());
         }
       });
    }

    try {
      const response = await fetch("/api/colab/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          notebookId: selectedNotebook.id,
          parameters: formattedParams
        })
      });

      const result = await response.json();

      if (!response.ok) {
        setExecutionStatus("error");
        setExecutionMessage(result.error || "Execution failed");
      } else {
        setExecutionStatus("completed");
        setExecutionMessage("Execution completed");

        // Add to history
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
          ...prev
        ]);

        // Clear selection after a short delay
        setTimeout(() => setSelectedNotebook(null), 2000);
      }
    } catch (err) {
      setExecutionStatus("error");
      setExecutionMessage(err.message);
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
                <span style={{ fontSize: 24 }}>{nb.icon}</span>
                <div className="h4">{nb.name}</div>
              </div>
              <p className="body-sm" style={{ color: "var(--text-secondary)", marginBottom: 12 }}>
                {nb.description || nb.desc}
              </p>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                {nb.runtime && <span className="badge badge-info">runtime: {nb.runtime}</span>}
                {nb.estimatedDuration && <span className="badge badge-warning">~{nb.estimatedDuration}</span>}
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
                          type={p.type === "string" ? "text" : "text"}
                          value={parameters[p.name] || ""}
                          onChange={(e) => handleParamChange(p.name, e.target.value)}
                          placeholder={p.default || (p.type === 'array' ? "comma separated list" : "")}
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
                      <button
                        type="submit"
                        className="btn btn-primary btn-sm"
                        disabled={executionStatus === "queued" || executionStatus === "running"}
                      >
                        Start Execution
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={handleCancelRun}
                        disabled={executionStatus === "queued" || executionStatus === "running"}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleRunClick(nb)}
                  >
                    ▶ Run
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h3 className="h4" style={{ marginBottom: 16 }}>Results</h3>
        {executionHistory.length === 0 ? (
          <div className="empty-state" style={{ padding: 32 }}>
            <div className="empty-state-icon">🧪</div>
            <p className="empty-state-title">No results yet</p>
            <p className="empty-state-desc">
              Run a notebook to see outputs, charts, and analysis results here.
            </p>
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
                  <span className={`badge ${exec.status === 'completed' ? 'badge-success' : 'badge-error'}`}>
                    {exec.status}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 8 }}>
                  {Object.entries(exec.parameters || {}).map(([k, v]) => (
                    <span key={k} className="body-sm" style={{ background: "var(--bg-tertiary)", padding: "2px 8px", borderRadius: "var(--radius-sm)" }}>
                      <strong>{k}:</strong> {Array.isArray(v) ? v.join(", ") : String(v)}
                    </span>
                  ))}
                </div>

                <p className="body-sm" style={{ color: "var(--text-secondary)" }}>
                  {exec.message}
                </p>
                {exec.executionTime && (
                  <p className="body-sm" style={{ color: "var(--text-tertiary)", marginTop: 4 }}>
                    Execution Time: {(exec.executionTime / 1000).toFixed(2)}s
                  </p>
                )}
                {exec.results && (
                  <div style={{ marginTop: 12, padding: 12, background: "var(--bg-primary)", borderRadius: "var(--radius-sm)", border: "1px solid var(--card-border)", overflowX: "auto" }}>
                    <pre className="body-sm" style={{ margin: 0 }}>
                      {typeof exec.results === 'object' ? JSON.stringify(exec.results, null, 2) : exec.results}
                    </pre>
                  </div>
                )}
                {exec.chartUrls && exec.chartUrls.length > 0 && (
                  <div style={{ marginTop: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {exec.chartUrls.map((url, i) => (
                      <Image unoptimized key={i} src={url} alt={`Chart ${i+1}`} width={500} height={300} style={{ maxWidth: '100%', height: 'auto', borderRadius: "var(--radius-md)" }} />
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
