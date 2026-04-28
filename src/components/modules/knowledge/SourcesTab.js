import { useState, useMemo } from "react";

const YOUTUBE_REGEX = /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/;
const VIDEO_COST = 0.05; // ~$0.04-0.06 per video

export default function SourcesTab({ status }) {
  const [ingesting, setIngesting] = useState(false);
  const [results, setResults] = useState(null);
  const [costConfirmed, setCostConfirmed] = useState(false);

  const pendingSources = useMemo(() => {
    return (status?.scheduledSources || []).filter(s => s.status !== "ingested");
  }, [status]);

  const videoSources = useMemo(() => {
    return pendingSources.filter(s => YOUTUBE_REGEX.test(s.url));
  }, [pendingSources]);

  const docSources = useMemo(() => {
    return pendingSources.filter(s => !YOUTUBE_REGEX.test(s.url));
  }, [pendingSources]);

  const estimatedCost = videoSources.length * VIDEO_COST;
  const hasVideos = videoSources.length > 0;

  const handleIngestAll = async () => {
    if (pendingSources.length === 0) return;
    if (hasVideos && !costConfirmed) return;

    setIngesting(true);
    setResults(null);
    const outcomes = [];
    try {
      for (const source of pendingSources) {
        const res = await fetch("/api/knowledge/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: source.url, type: "url", title: source.name, source: "scheduled" })
        });
        const data = await res.json();
        outcomes.push({ name: source.name, success: res.ok, message: data.message || data.error });
      }
      const succeeded = outcomes.filter(o => o.success).length;
      setResults({ message: `Ingested ${succeeded}/${pendingSources.length} sources`, outcomes });
    } catch (err) {
      setResults({ error: err.message });
    } finally {
      setIngesting(false);
      setCostConfirmed(false);
    }
  };

  const handleForceSync = async () => {
    if (!confirm("Trigger the Sync-All webhook? This will force a refresh of all scheduled sources in the background.")) return;
    try {
      const res = await fetch("/api/knowledge/sync-all", { method: "POST" });
      if (!res.ok) throw new Error("Sync failed");
      alert("Sync triggered successfully. Check Pipeline Reports for progress.");
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  // Build button label
  const buttonLabel = ingesting
    ? "⏳ Ingesting..."
    : `🔄 Ingest All (${docSources.length} docs${hasVideos ? `, ${videoSources.length} videos ~$${estimatedCost.toFixed(2)}` : ""})`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 className="h4">Documentation Sources ({status?.scheduledSources?.length || 0})</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleForceSync}
            >
              Force Sync Webhook
            </button>
            <button
              className="btn btn-primary btn-sm"
              disabled={ingesting || pendingSources.length === 0 || (hasVideos && !costConfirmed)}
              onClick={handleIngestAll}
            >
              {buttonLabel}
            </button>
          </div>
        </div>

        {/* Video cost confirmation */}
        {hasVideos && pendingSources.length > 0 && (
          <div style={{ marginTop: 12, padding: 10, background: "rgba(255, 170, 0, 0.08)", borderRadius: "var(--radius-md)", border: "1px solid rgba(255, 170, 0, 0.25)", display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="checkbox"
              id="sources-cost-confirm"
              checked={costConfirmed}
              onChange={(e) => setCostConfirmed(e.target.checked)}
              style={{ width: 16, height: 16, cursor: "pointer" }}
            />
            <label htmlFor="sources-cost-confirm" className="body-sm" style={{ cursor: "pointer" }}>
              🎬 <strong>{videoSources.length} video source{videoSources.length > 1 ? "s" : ""}</strong> detected. Estimated cost: <span style={{ color: "var(--warning)", fontWeight: 600 }}>~${estimatedCost.toFixed(2)}</span>. Check to confirm.
            </label>
          </div>
        )}

        {results && (
          <div style={{ marginTop: 12, padding: 12, borderRadius: "var(--radius-md)", background: results.error ? "var(--error-subtle, rgba(239,68,68,0.1))" : "var(--success-subtle, rgba(16,185,129,0.1))" }}>
            <span className="body-sm">{results.error || results.message || "Ingestion complete"}</span>
          </div>
        )}
      </div>
      {status?.scheduledSources?.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", background: "var(--bg-secondary)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
          {/* Table Header */}
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "3fr 1fr", 
            gap: 16, 
            padding: "12px 16px", 
            borderBottom: "1px solid var(--card-border)",
            color: "var(--text-secondary)",
            fontWeight: 600,
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: "0.05em"
          }}>
            <div>Source URL</div>
            <div style={{ textAlign: "right" }}>Status</div>
          </div>

          {/* Table Body */}
          {status.scheduledSources.map((source) => {
            const isVideo = YOUTUBE_REGEX.test(source.url);
            return (
              <div key={source.id} style={{ 
                display: "grid", 
                gridTemplateColumns: "3fr 1fr", 
                gap: 16,
                padding: "12px 16px", 
                borderBottom: "1px solid var(--card-border)", 
                alignItems: "center",
                transition: "background 0.2s ease"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                {/* Col 1 */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4, overflow: "hidden" }}>
                  <div className="body" style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 8, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {isVideo && <span className="badge badge-info" style={{ fontSize: 10, padding: "2px 6px" }}>🎬 Video</span>}
                    {source.name}
                  </div>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="caption truncate"
                    style={{ color: "var(--info)", textDecoration: "none" }}
                  >
                    {source.url}
                  </a>
                </div>

                {/* Col 2 */}
                <div style={{ textAlign: "right" }}>
                  <span className={`badge ${source.status === "ingested" ? "badge-success" : "badge-warning"}`}>
                    {source.status === "ingested" ? "✅ Ingested" : "⏳ Pending"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
