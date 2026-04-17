"use client";

import { useState, useEffect } from "react";

/**
 * Home / Dashboard Module
 * Live data from API routes — credit bar, agent summary, recent activity
 */
export default function HomeModule() {
  const [agents, setAgents] = useState([]);
  const [costs, setCosts] = useState(null);
  const [knowledge, setKnowledge] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/agents/roster").then((r) => r.json()),
      fetch("/api/costs/summary").then((r) => r.json()),
      fetch("/api/knowledge/status").then((r) => r.json()),
    ])
      .then(([agentsData, costsData, knowledgeData]) => {
        setAgents(agentsData.agents || []);
        setCosts(costsData);
        setKnowledge(knowledgeData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div className="grid-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton skeleton-card" style={{ height: 100 }} />
          ))}
        </div>
        <div className="skeleton skeleton-card" style={{ height: 200 }} />
        <div className="skeleton skeleton-card" style={{ height: 160 }} />
      </div>
    );
  }

  return (
    <div>
      {/* Module Header */}
      <div className="module-header">
        <div className="module-header-left">
          <div className="module-icon" style={{ background: "var(--accent-subtle)" }}>🏠</div>
          <div>
            <h1 className="module-title">Dashboard</h1>
            <p className="module-subtitle">Welcome back — here&apos;s your system overview</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <span className="badge badge-accent">Gravix v0.1.0</span>
        </div>
      </div>

      {/* Credit Gauges */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        <CreditCard
          title="Cloud Credits"
          used={costs?.credits?.cloud?.used || 0}
          total={costs?.credits?.cloud?.total || 100}
          unit="$"
          color="var(--info)"
        />
        <CreditCard
          title="GenAI Credits"
          used={costs?.credits?.genai?.used || 0}
          total={costs?.credits?.genai?.total || 1000}
          unit="$"
          color="var(--accent)"
        />
        <CreditCard
          title="Knowledge Base"
          used={knowledge?.stats?.documentsIngested || 0}
          total={15}
          unit=""
          color="var(--agent-scholar)"
          label="docs ingested"
        />
      </div>

      {/* System Status */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <h3 className="h4" style={{ marginBottom: 16 }}>System Status</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { label: "GCP Project", value: "antigravity-hub-jcloud", status: "online" },
              { label: "Vertex AI", value: "APIs Enabled", status: "online" },
              { label: "Data Store", value: knowledge?.dataStore?.deployed ? "Active" : "Pending Setup", status: knowledge?.dataStore?.deployed ? "online" : "busy" },
              { label: "Cloud Scheduler", value: knowledge?.scheduler?.status === "active" ? "Configured" : "Not Configured", status: knowledge?.scheduler?.status === "active" ? "online" : "offline" },
              { label: "Agents Deployed", value: `${agents.filter((a) => a.status === "active").length}/${agents.length}`, status: agents.some((a) => a.status === "active") ? "online" : "offline" },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="body-sm">{item.label}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="mono" style={{ fontSize: 12 }}>{item.value}</span>
                  <span className={`status-dot ${item.status}`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="h4" style={{ marginBottom: 16 }}>Quick Actions</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button className="btn btn-secondary btn-sm w-full" style={{ justifyContent: "flex-start" }}>
              📝 Ingest a Document
            </button>
            <button className="btn btn-secondary btn-sm w-full" style={{ justifyContent: "flex-start" }}>
              💬 Chat with Scholar
            </button>
            <button className="btn btn-secondary btn-sm w-full" style={{ justifyContent: "flex-start" }}>
              📊 Run Analysis Notebook
            </button>
            <button className="btn btn-secondary btn-sm w-full" style={{ justifyContent: "flex-start" }}>
              🤖 Deploy an Agent
            </button>
          </div>
        </div>
      </div>

      {/* Agent Roster */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 className="h4" style={{ marginBottom: 16 }}>Agent Roster</h3>
        <div className="grid-auto" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
          {agents.map((agent) => (
            <div
              key={agent.name}
              className="card"
              style={{
                padding: "16px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                borderLeft: `3px solid ${agent.color}`,
              }}
            >
              <span style={{ fontSize: 24 }}>{agent.icon}</span>
              <div>
                <div className="body-sm" style={{ fontWeight: 600 }}>{agent.name}</div>
                <div className="caption" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span className={`status-dot ${agent.status === "active" ? "online pulse" : "offline"}`} />
                  {agent.status === "active" ? "Active" : "Not deployed"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h3 className="h4" style={{ marginBottom: 16 }}>Recent Activity</h3>
        <div className="empty-state" style={{ padding: "40px 20px" }}>
          <div className="empty-state-icon">📋</div>
          <p className="empty-state-title">No activity yet</p>
          <p className="empty-state-desc">
            Activity from agents, tasks, and system events will appear here as Gravix comes online.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Credit Card Sub-component ─────────────────────────────── */
function CreditCard({ title, used, total, unit, color, label }) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;

  return (
    <div className="card" style={{ padding: "20px" }}>
      <div className="caption" style={{ marginBottom: 8 }}>{title}</div>
      <div className="h2" style={{ color }}>
        {unit}{used}
        <span style={{ fontSize: 14, color: "var(--text-tertiary)", fontWeight: 400 }}>
          {" / "}{unit}{total} {label || ""}
        </span>
      </div>
      <div
        style={{
          marginTop: 12,
          height: 6,
          background: "var(--bg-tertiary)",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color,
            borderRadius: 3,
            transition: "width 0.6s var(--ease-out)",
          }}
        />
      </div>
    </div>
  );
}
