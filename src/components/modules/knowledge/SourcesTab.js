export default function SourcesTab({ status }) {
  return (
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
  );
}
