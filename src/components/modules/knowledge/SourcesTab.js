import { useState } from "react";

export default function SourcesTab({ status }) {
  const [ingesting, setIngesting] = useState(false);
  const [results, setResults] = useState(null);

  const handleIngestAll = async () => {
    const pending = (status?.scheduledSources || []).filter(s => s.status !== "ingested");
    if (pending.length === 0) return;

    setIngesting(true);
    setResults(null);
    try {
      const res = await fetch("/api/knowledge/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sources: pending.map(s => ({ url: s.url, name: s.name })) })
      });
      const data = await res.json();
      setResults(data);
    } catch (err) {
      setResults({ error: err.message });
    } finally {
      setIngesting(false);
    }
  };

  const pendingCount = (status?.scheduledSources || []).filter(s => s.status !== "ingested").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 className="h4">Documentation Sources ({status?.scheduledSources?.length || 0})</h3>
          <button
            className="btn btn-primary btn-sm"
            disabled={ingesting || pendingCount === 0}
            onClick={handleIngestAll}
          >
            {ingesting ? "⏳ Ingesting..." : `🔄 Ingest All (${pendingCount})`}
          </button>
        </div>
        {results && (
          <div style={{ marginTop: 12, padding: 12, borderRadius: "var(--radius-md)", background: results.error ? "var(--error-subtle, rgba(239,68,68,0.1))" : "var(--success-subtle, rgba(16,185,129,0.1))" }}>
            <span className="body-sm">{results.error || results.message || "Ingestion complete"}</span>
          </div>
        )}
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
  );
}
