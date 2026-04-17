"use client";

/**
 * Colab Module — Notebook runner + Results viewer
 */
export default function ColabModule() {
  return (
    <div>
      <div className="module-header">
        <div className="module-header-left">
          <div className="module-icon" style={{ background: "hsla(280, 65%, 55%, 0.12)" }}>📊</div>
          <div>
            <h1 className="module-title">Colab</h1>
            <p className="module-subtitle">Notebook execution and data analysis — powered by Analyst</p>
          </div>
        </div>
        <button className="btn btn-primary btn-sm">▶ Run Notebook</button>
      </div>

      <div className="grid-auto" style={{ marginBottom: 24 }}>
        {[
          { name: "Stock Analysis", icon: "📈", desc: "Market data, trends, and signals" },
          { name: "Portfolio Optimizer", icon: "💼", desc: "Asset allocation and rebalancing" },
          { name: "Health Trends", icon: "❤️", desc: "Nutrition and biometric analysis" },
          { name: "Document Processor", icon: "📄", desc: "Batch NLP processing" },
          { name: "Data Pipeline", icon: "🔄", desc: "Generic ETL workflows" },
        ].map((nb) => (
          <div key={nb.name} className="card" style={{ cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 24 }}>{nb.icon}</span>
              <div className="h4">{nb.name}</div>
            </div>
            <p className="body-sm" style={{ color: "var(--text-secondary)", marginBottom: 12 }}>
              {nb.desc}
            </p>
            <span className="badge badge-accent">Not deployed</span>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 className="h4" style={{ marginBottom: 16 }}>Results</h3>
        <div className="empty-state" style={{ padding: 32 }}>
          <div className="empty-state-icon">🧪</div>
          <p className="empty-state-title">No results yet</p>
          <p className="empty-state-desc">
            Run a notebook to see outputs, charts, and analysis results here.
          </p>
        </div>
      </div>
    </div>
  );
}
