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
      const res = await fetch("/api/swarm/trigger", { method: "POST" });
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
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {pipelines.map(pipeline => (
              <div key={pipeline.id} style={{ 
                padding: 16, 
                border: "1px solid var(--card-border)", 
                borderRadius: "var(--radius-md)",
                background: "var(--bg-secondary)"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div>
                    <h4 className="body" style={{ fontWeight: 600, margin: 0 }}>{pipeline.title || pipeline.vid_id}</h4>
                    <span className="caption" style={{ color: "var(--text-secondary)" }}>ID: {pipeline.vid_id} • Last Updated: {new Date(pipeline.updatedAt).toLocaleTimeString()}</span>
                  </div>
                  <span className={`badge ${pipeline.progress === 100 ? "badge-success" : pipeline.status.includes("Failed") ? "badge-error" : "badge-accent pulse"}`}>
                    {pipeline.status}
                  </span>
                </div>

                {/* Progress Bar */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1, height: 8, background: "var(--bg-tertiary)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ 
                      height: "100%", 
                      width: `${pipeline.progress || 0}%`, 
                      background: pipeline.status.includes("Failed") ? "var(--error)" : pipeline.progress === 100 ? "var(--success)" : "var(--accent)",
                      transition: "width 0.5s ease"
                    }} />
                  </div>
                  <span className="caption" style={{ fontWeight: 600, width: 40, textAlign: "right" }}>
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
