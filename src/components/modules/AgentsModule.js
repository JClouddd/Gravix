"use client";

import { useState, useEffect } from "react";

const TABS = ["Roster", "Orchestrator", "Task Board", "Sentinel"];

export default function AgentsModule() {
  const [activeTab, setActiveTab] = useState("Roster");

  // Roster state
  const [agents, setAgents] = useState([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);

  // Orchestrator state
  const [routeQuery, setRouteQuery] = useState("");
  const [routingState, setRoutingState] = useState("idle"); // idle, analyzing, routed
  const [routeDecision, setRouteDecision] = useState(null);

  // Task Board state
  const [tasks, setTasks] = useState([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [newTaskPrompt, setNewTaskPrompt] = useState("");
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  // Fetch initial data
  useEffect(() => {
    async function fetchRoster() {
      try {
        const res = await fetch("/api/agents/roster");
        if (res.ok) {
          const data = await res.json();
          setAgents(data.agents || []);
        }
      } catch (err) {
        console.error("Failed to fetch agents", err);
      } finally {
        setIsLoadingAgents(false);
      }
    }

    async function fetchTasks() {
      try {
        const res = await fetch("/api/jules/tasks");
        if (res.ok) {
          const data = await res.json();
          setTasks(Array.isArray(data) ? data : data.sessions || []);
        }
      } catch (err) {
        console.error("Failed to fetch tasks", err);
      } finally {
        setIsLoadingTasks(false);
      }
    }

    fetchRoster();
    fetchTasks();
  }, []);

  // Orchestrator Action
  const handleRoute = () => {
    if (!routeQuery.trim()) return;
    setRoutingState("analyzing");

    setTimeout(() => {
      setRoutingState("routed");
      setRouteDecision({
        agent: "Analyst",
        reasoning: "Query involves data processing and chart generation, which matches Analyst's core skills.",
        confidence: "94%"
      });
    }, 1500);
  };

  // Task Board Action
  const handleNewTask = async () => {
    if (!newTaskPrompt.trim()) return;
    setIsSubmittingTask(true);
    try {
      const res = await fetch("/api/jules/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: newTaskPrompt })
      });
      if (res.ok) {
        const refetchRes = await fetch("/api/jules/tasks");
        if (refetchRes.ok) {
          const refetchData = await refetchRes.json();
          setTasks(Array.isArray(refetchData) ? refetchData : refetchData.sessions || []);
        }
        setNewTaskPrompt("");
      }
    } catch (err) {
      console.error("Error creating task", err);
    } finally {
      setIsSubmittingTask(false);
    }
  };

  // Helper for Kanban
  const getTasksByStatus = (statusGroup) => {
    return tasks.filter(t => {
      const s = (t.status || "").toLowerCase();
      if (statusGroup === "Pending") return s.includes('pending') || s.includes('queue') || s.includes('idle') || !s;
      if (statusGroup === "In Progress") return s.includes('progress') || s.includes('running');
      if (statusGroup === "Completed") return s.includes('complete') || s.includes('done') || s.includes('success');
      return false;
    });
  };

  return (
    <div>
      <div className="module-header">
        <div className="module-header-left">
          <div className="module-icon" style={{ background: "var(--accent-subtle)" }}>🤖</div>
          <div>
            <h1 className="module-title">Agent Orchestrator</h1>
            <p className="module-subtitle">7 agents — deploy, monitor, and orchestrate</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <select className="input" style={{ width: 140, padding: "6px 10px" }}>
            <option>Step Mode</option>
            <option>Batch Mode</option>
            <option>Autonomous</option>
          </select>
        </div>
      </div>

      <div style={{
        display: "flex",
        gap: 4,
        marginBottom: 24,
        borderBottom: "1px solid var(--card-border)",
        paddingBottom: 0,
      }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "10px 18px",
              fontSize: 14,
              fontWeight: activeTab === tab ? 600 : 400,
              color: activeTab === tab ? "var(--accent-hover)" : "var(--text-secondary)",
              borderBottom: activeTab === tab ? "2px solid var(--accent)" : "2px solid transparent",
              transition: "all var(--duration-fast) var(--ease-out)",
              background: "none",
              cursor: "pointer",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Roster" && (
        <div className="grid-auto">
          {isLoadingAgents ? (
            <div style={{ padding: 24, color: "var(--text-secondary)" }}>Loading agents...</div>
          ) : agents.map((agent) => {
            const isOnline = agent.status === "active";
            const isBusy = agent.status === "busy";
            return (
              <div
                key={agent.id}
                className="card"
                style={{
                  borderTop: `3px solid ${agent.color}`,
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <span style={{ fontSize: 28 }}>{agent.icon}</span>
                  <div>
                    <div className="h4">{agent.name}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span className={`status-dot ${isOnline ? "online" : isBusy ? "warning" : "offline"}`} />
                      <span className="caption">
                        {isOnline ? "Online" : isBusy ? "Busy" : "Offline"}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="body-sm" style={{ color: "var(--text-secondary)", marginBottom: 4 }}>
                  {agent.role}
                </p>
                <p className="caption" style={{ color: "var(--text-secondary)", marginBottom: 12 }}>
                  Model: Gemini 1.5 Pro
                </p>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                  <span className="badge" style={{ fontSize: 11, background: "var(--bg-secondary)" }}>Planning</span>
                  <span className="badge" style={{ fontSize: 11, background: "var(--bg-secondary)" }}>Execution</span>
                </div>

                <div className="badge badge-info" style={{ fontSize: 11 }}>
                  🧬 {agent.selfImprove}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "Orchestrator" && (
        <div className="card">
          <h4 className="h4" style={{ marginBottom: 16 }}>Agent Routing</h4>
          <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
            <input
              type="text"
              className="input"
              style={{ flex: 1 }}
              placeholder="What do you need help with?"
              value={routeQuery}
              onChange={(e) => setRouteQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRoute()}
            />
            <button className="button button-primary" onClick={handleRoute}>
              Route
            </button>
          </div>

          {routingState === "analyzing" && (
            <div className="empty-state" style={{ padding: 32 }}>
              <div className="status-dot online" style={{ marginBottom: 16, width: 12, height: 12 }} />
              <p className="body-sm">Conductor is analyzing the request...</p>
            </div>
          )}

          {routingState === "routed" && routeDecision && (
            <div style={{ background: "var(--bg-secondary)", padding: 16, borderRadius: 8, border: "1px solid var(--card-border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16, color: "var(--text-secondary)" }}>
                <span>Request</span>
                <span>→</span>
                <span style={{ color: "var(--accent)" }}>Conductor</span>
                <span>→</span>
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{routeDecision.agent}</span>
              </div>
              <p className="body-sm" style={{ marginBottom: 8 }}>
                <strong>Reasoning:</strong> {routeDecision.reasoning}
              </p>
            </div>
          )}

          {routingState === "idle" && (
            <div className="empty-state">
              <div className="empty-state-icon">🔀</div>
              <p className="empty-state-title">Routing Visualizer</p>
              <p className="empty-state-desc">
                Type a request to see how Conductor routes it to the appropriate agent.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === "Task Board" && (
        <div>
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", gap: 12 }}>
              <input
                type="text"
                className="input"
                style={{ flex: 1 }}
                placeholder="New task prompt..."
                value={newTaskPrompt}
                onChange={(e) => setNewTaskPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleNewTask()}
                disabled={isSubmittingTask}
              />
              <button
                className="button button-primary"
                onClick={handleNewTask}
                disabled={isSubmittingTask}
              >
                {isSubmittingTask ? "Submitting..." : "New Task"}
              </button>
            </div>
          </div>

          <div className="grid-3">
            {["Pending", "In Progress", "Completed"].map((col) => {
              const colTasks = getTasksByStatus(col);
              return (
                <div key={col} className="card" style={{ minHeight: 300, background: "var(--bg-secondary)" }}>
                  <h4 className="h4" style={{ marginBottom: 16, display: "flex", justifyContent: "space-between" }}>
                    {col}
                    <span className="badge">{colTasks.length}</span>
                  </h4>
                  {isLoadingTasks ? (
                    <p className="caption">Loading...</p>
                  ) : colTasks.length === 0 ? (
                    <div className="empty-state" style={{ padding: 24, background: "var(--bg-primary)" }}>
                      <p className="caption">No tasks</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {colTasks.map((t, idx) => (
                        <div key={t.id || t.sessionId || idx} className="card" style={{ padding: 12, background: "var(--bg-primary)", border: "1px solid var(--card-border)" }}>
                          <p className="body-sm" style={{ fontWeight: 500, marginBottom: 8 }}>{t.title || (t.prompt && t.prompt.slice(0, 40)) || "Untitled Task"}</p>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <a
                              href={`https://jules.google.com/sessions/${t.sessionId || t.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="caption"
                              style={{ color: "var(--accent)", textDecoration: "none" }}
                            >
                              {t.sessionId || t.id || "Unknown ID"}
                            </a>
                            <span className="caption" style={{ color: "var(--text-secondary)" }}>
                              {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "Just now"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "Sentinel" && (
        <div className="grid-auto">
          <div className="card">
            <h4 className="h4" style={{ marginBottom: 16 }}>API Uptime</h4>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 32, fontWeight: 700, color: "var(--success)" }}>99.98%</span>
              <span className="caption">Last 30 days</span>
            </div>
            <div style={{ marginTop: 16, height: 4, background: "var(--bg-secondary)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: "99.98%", height: "100%", background: "var(--success)" }} />
            </div>
          </div>

          <div className="card">
            <h4 className="h4" style={{ marginBottom: 16 }}>Error Rate</h4>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 32, fontWeight: 700, color: "var(--warning)" }}>0.12%</span>
              <span className="caption">14 anomalies</span>
            </div>
            <div style={{ marginTop: 16, height: 4, background: "var(--bg-secondary)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: "0.12%", height: "100%", background: "var(--warning)" }} />
            </div>
          </div>

          <div className="card">
            <h4 className="h4" style={{ marginBottom: 16 }}>Cost Alerts</h4>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 32, fontWeight: 700 }}>$14.20</span>
              <span className="caption">/ $50.00 limit</span>
            </div>
            <div style={{ marginTop: 16, height: 4, background: "var(--bg-secondary)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: "28%", height: "100%", background: "var(--accent)" }} />
            </div>
          </div>

          <div className="card">
            <h4 className="h4" style={{ marginBottom: 16 }}>Agent Health Checks</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {["Conductor", "Forge", "Scholar", "Sentinel"].map(name => (
                <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="body-sm">{name}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span className="status-dot online" />
                    <span className="caption">Healthy</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
