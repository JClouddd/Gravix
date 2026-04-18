"use client";

import { useState, useEffect } from "react";
import HelpTooltip from "@/components/HelpTooltip";

/**
 * Home / Dashboard Module
 * Live data from API routes — credit bar, agent summary, recent activity
 */
export default function HomeModule() {
  const [agents, setAgents] = useState([]);
  const [costs, setCosts] = useState(null);
  const [knowledge, setKnowledge] = useState(null);
  const [julesTasks, setJulesTasks] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [healthData, setHealthData] = useState(null);

  const fetchHealth = () => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((data) => setHealthData(data))
      .catch((err) => console.error("Health fetch error:", err));
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/agents/roster").then((r) => r.json()),
      fetch("/api/costs/summary").then((r) => r.json()),
      fetch("/api/knowledge/status").then((r) => r.json()),
      fetch("/api/jules/tasks").then((r) => r.json()),
    ])
      .then(([agentsData, costsData, knowledgeData, julesData]) => {
        setAgents(agentsData.agents || []);
        setCosts(costsData);
        setKnowledge(knowledgeData);

        if (julesData?.error || julesData?.connected === false) {
          setFetchError(julesData.error || "Failed to load tasks");
          setJulesTasks([]);
        } else {
          setJulesTasks(julesData?.sessions || []);
        }

        setLoading(false);
      })
      .catch((err) => {
        setFetchError(err.message);
        setLoading(false);
      });

    fetchHealth();
    const interval = setInterval(fetchHealth, 60000);
    return () => clearInterval(interval);
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
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h1 className="module-title">Dashboard</h1>
              <HelpTooltip module="home" />
            </div>
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

      {/* System Health Section */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 className="h4">System Health Dashboard</h3>
          {healthData && (
            <span className={`badge ${healthData.status === "healthy" ? "badge-success" : healthData.status === "degraded" ? "badge-warning" : "badge-error"}`} style={{ textTransform: "capitalize" }}>
              Status: {healthData.status}
            </span>
          )}
        </div>

        {healthData ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="caption" style={{ marginBottom: 8, color: "var(--text-secondary)" }}>
              Last checked: {new Date(healthData.timestamp).toLocaleString()}
            </div>
            {Object.entries(healthData.services || {}).map(([serviceName, data]) => {
              const statusColor = data.status === "pass" ? "green" : "red";
              const dotClass = data.status === "pass" ? "online" : "offline";

              return (
                <div key={serviceName} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--bg-secondary)", borderRadius: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, textTransform: "capitalize" }}>
                    <span className={`status-dot ${dotClass}`} />
                    <span className="body-sm" style={{ fontWeight: 500 }}>{serviceName}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    {data.latency !== undefined && (
                      <span className="mono" style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                        {data.latency}ms
                      </span>
                    )}
                    {data.error && (
                      <span className="caption" style={{ color: "var(--error)" }}>
                        {data.error}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="skeleton" style={{ height: 100, borderRadius: 8 }} />
        )}
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h3 className="h4" style={{ marginBottom: 16 }}>Recent Activity</h3>
        {fetchError ? (
          <div className="empty-state" style={{ padding: "20px" }}>
            <div className="empty-state-icon" style={{ color: "var(--error)" }}>⚠️</div>
            <p className="empty-state-title" style={{ color: "var(--error)" }}>Failed to load activity</p>
            <p className="empty-state-desc">{fetchError}</p>
          </div>
        ) : julesTasks && julesTasks.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {julesTasks.slice(0, 5).map((task, index) => (
              <div
                key={task.name || index}
                className="card"
                style={{ padding: "12px 16px" }}
              >
                <div className="body-sm" style={{ fontWeight: 600, marginBottom: 4 }}>
                  {task.title || task.name || "Task"}
                </div>
                <div className="caption" style={{ color: "var(--text-secondary)" }}>
                  {task.state || "Unknown Status"}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state" style={{ padding: "40px 20px" }}>
            <div className="empty-state-icon">📋</div>
            <p className="empty-state-title">No activity yet</p>
            <p className="empty-state-desc">
              Activity from agents, tasks, and system events will appear here as Gravix comes online.
            </p>
          </div>
        )}
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
