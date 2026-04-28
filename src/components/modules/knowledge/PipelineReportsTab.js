import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function PipelineReportsTab() {
  const [pipelines, setPipelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDeploying, setIsDeploying] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "ingestion_pipelines"), orderBy("updatedAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const p = [];
      snapshot.forEach(doc => {
        p.push({ id: doc.id, ...doc.data() });
      });
      setPipelines(p);
      setLoading(false);
    }, (err) => {
      console.error("Pipeline Reports Error:", err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleDeploySwarm = async () => {
    if (!confirm("Deploy a new Cloud Batch Swarm instance? This will consume compute resources.")) return;
    setIsDeploying(true);
    try {
      const res = await fetch("/api/swarm/batch", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urls: [
            "https://www.youtube.com/watch?v=41EfOY0LnyA", // DSPy
            "https://www.youtube.com/watch?v=wXzEQ2vE52c", // Reflexion
            "https://www.youtube.com/watch?v=L58TzH3a2tU", // GC Next '24 Autonomous Agents
            "https://www.youtube.com/watch?v=R8KB-Zcynxc"  // LangGraph
          ]
        })
      });
      if (!res.ok) throw new Error("Failed to deploy swarm");
    } catch (err) {
      console.error(err);
      alert("Swarm deployment failed: " + err.message);
    } finally {
      setIsDeploying(false);
    }
  };

  if (loading) {
    return <div className="skeleton skeleton-card" style={{ height: 200 }} />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h3 className="h4" style={{ margin: 0 }}>Live Pipeline Reports</h3>
            <p className="body-sm" style={{ color: "var(--text-secondary)", margin: "4px 0 0 0" }}>
              Real-time telemetry from the Cloud Batch autonomous ingestion swarm.
            </p>
          </div>
          <button 
            className="btn btn-primary" 
            onClick={handleDeploySwarm}
            disabled={isDeploying}
          >
            {isDeploying ? "Deploying..." : "Deploy Cloud Swarm"}
          </button>
        </div>

        {pipelines.length === 0 ? (
          <div className="empty-state" style={{ padding: 40 }}>
            <div className="empty-state-icon">📡</div>
            <p className="empty-state-title">No Active Pipelines</p>
            <p className="empty-state-desc">Trigger a Cloud Batch ingestion to see live progress here.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", background: "var(--bg-secondary)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
            {/* Table Header */}
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "2fr 1fr 2fr", 
              gap: 16, 
              padding: "12px 16px", 
              borderBottom: "1px solid var(--card-border)",
              color: "var(--text-secondary)",
              fontWeight: 600,
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.05em"
            }}>
              <div>Pipeline / ID</div>
              <div>Status</div>
              <div style={{ textAlign: "right" }}>Progress</div>
            </div>

            {/* Table Body */}
            {pipelines.map(pipeline => (
              <div key={pipeline.id} style={{ 
                display: "grid", 
                gridTemplateColumns: "2fr 1fr 2fr", 
                gap: 16,
                padding: "16px", 
                borderBottom: "1px solid var(--card-border)", 
                alignItems: "center",
                transition: "background 0.2s ease"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                {/* Col 1 */}
                <div>
                  <h4 className="body" style={{ fontWeight: 600, margin: 0, color: "var(--text-primary)" }}>{pipeline.title || pipeline.vid_id}</h4>
                  <span className="caption" style={{ color: "var(--text-secondary)" }}>{pipeline.vid_id}</span>
                </div>

                {/* Col 2 */}
                <div>
                  <span className={`badge ${pipeline.progress === 100 ? "badge-success" : pipeline.status.includes("Failed") ? "badge-error" : "badge-accent pulse"}`}>
                    {pipeline.status}
                  </span>
                </div>

                {/* Col 3: Right Aligned Progress */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "flex-end" }}>
                  <div style={{ width: 100, height: 6, background: "var(--bg-tertiary)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ 
                      height: "100%", 
                      width: `${pipeline.progress || 0}%`, 
                      background: pipeline.status.includes("Failed") ? "var(--error)" : pipeline.progress === 100 ? "var(--success)" : "var(--accent)",
                      transition: "width 0.5s ease"
                    }} />
                  </div>
                  <span className="mono" style={{ fontWeight: 600, width: 40, textAlign: "right", color: "var(--text-primary)" }}>
                    {pipeline.progress || 0}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
