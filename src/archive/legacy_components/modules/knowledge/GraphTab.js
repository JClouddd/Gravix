import { useState, useEffect } from "react";

export default function GraphTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/knowledge/context?domains=all")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="skeleton skeleton-card" style={{ height: 300 }} />;
  }

  if (!data?.notebooks || data.notebooks.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-icon">🕸️</div>
          <p className="empty-state-title">Knowledge Graph</p>
          <p className="empty-state-desc">
            Approve notebooks to see knowledge connections
          </p>
        </div>
      </div>
    );
  }

  // Group nodes by domain/category
  // Notebooks
  const notebooksByCategory = (data.notebooks || []).reduce((acc, nb) => {
    const cat = nb.category || "uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(nb);
    return acc;
  }, {});

  // Agent Skills (passed from data if available, assuming empty for now)
  const skillsByCategory = (data.skills || []).reduce((acc, skill) => {
    const cat = skill.category || "uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(skill);
    return acc;
  }, {});

  const allCategories = Array.from(new Set([
    ...Object.keys(notebooksByCategory),
    ...Object.keys(skillsByCategory)
  ]));

  const getDomainColor = (index) => {
    const colors = ["var(--accent)", "var(--success)", "var(--warning)", "var(--agent-scholar)", "var(--agent-analyst)"];
    return colors[index % colors.length];
  };

  return (
    <div className="card">
      <h3 className="h3" style={{ marginBottom: 16 }}>Knowledge Graph</h3>
      <p className="body-sm" style={{ marginBottom: 24, color: "var(--text-secondary)" }}>
        Visualizing connections between ingested notebooks and agent skills.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        {allCategories.map((cat, i) => {
          const color = getDomainColor(i);
          const nbs = notebooksByCategory[cat] || [];
          const skills = skillsByCategory[cat] || [];

          return (
            <div key={cat} style={{
              background: `color-mix(in srgb, ${color} 10%, transparent)`,
              border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
              borderRadius: "var(--radius-lg)",
              padding: 24,
            }}>
              <h4 className="h4" style={{ marginBottom: 16, textTransform: "capitalize", color }}>
                {cat} Domain
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>

                {nbs.map((nb, j) => (
                  <div key={`nb-${j}`} className="card card-glass" style={{ borderLeft: `3px solid ${color}` }}>
                     <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                       <span style={{ fontSize: 16 }}>📓</span>
                       <p className="body-sm" style={{ fontWeight: 600 }}>{nb.name}</p>
                     </div>
                     <span className="badge" style={{ background: "var(--bg-secondary)" }}>{nb.type || "Notebook"}</span>
                  </div>
                ))}

                {skills.map((skill, k) => (
                  <div key={`skill-${k}`} className="card card-glass" style={{ borderLeft: `3px dashed ${color}` }}>
                     <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                       <span style={{ fontSize: 16 }}>⚙️</span>
                       <p className="body-sm" style={{ fontWeight: 600 }}>{skill.name}</p>
                     </div>
                     <span className="badge" style={{ background: "var(--bg-secondary)" }}>Owner: {skill.agentOwner || "Unknown"}</span>
                  </div>
                ))}

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
