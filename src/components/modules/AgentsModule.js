"use client";

import { useState, useEffect } from "react";

const TABS = ["Roster", "Workflow", "Tasks", "Proposals"];

export default function AgentsModule() {
  const [activeTab, setActiveTab] = useState("Roster");

  // Roster state
  const [agents, setAgents] = useState([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);
  const [agentCosts, setAgentCosts] = useState({});
  const [executionMode, setExecutionMode] = useState("Step");
  const [rosterChatInput, setRosterChatInput] = useState("");
  const [rosterChatStatus, setRosterChatStatus] = useState("idle");
  const [rosterChatResult, setRosterChatResult] = useState(null);

  // Workflow state
  const [highlightedAgent, setHighlightedAgent] = useState(null);

  // Task Board state
  const [tasks, setTasks] = useState([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [newTaskPrompt, setNewTaskPrompt] = useState("");
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  // Proposals state
  const [proposals, setProposals] = useState([]);
  const [isLoadingProposals, setIsLoadingProposals] = useState(true);

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

    async function fetchCosts() {
      try {
        const res = await fetch("/api/costs/breakdown");
        if (res.ok) {
          const data = await res.json();
          setAgentCosts(data.perAgent || {});
        }
      } catch (err) {
        console.error("Failed to fetch agent costs", err);
      }
    }

    async function fetchProposals() {
      try {
        const res = await fetch("/api/agents/conductor/analyze");
        if (res.ok) {
          const data = await res.json();
          setProposals(data.proposals?.filter(p => p.status === "pending") || []);
        }
      } catch (err) {
        console.error("Failed to fetch proposals", err);
      } finally {
        setIsLoadingProposals(false);
      }
    }

    fetchRoster();
    fetchTasks();
    fetchCosts();
    fetchProposals();
  }, []);

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

  const handleProposalDecision = async (id, status) => {
    try {
      const res = await fetch("/api/agents/conductor/analyze", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status })
      });
      if (res.ok) {
        setProposals(prev => prev.filter(p => p.id !== id));
      }
    } catch (err) {
      console.error("Error updating proposal status", err);
    }
  };

  // Helper for Kanban
  const getTasksByStatus = (statusGroup) => {
    return tasks.filter(t => {
      const s = (t.status || "").toLowerCase();
      if (statusGroup === "Queued") return s.includes('awaiting_user_feedback') || s.includes('pending') || s.includes('queue') || s.includes('idle') || !s;
      if (statusGroup === "In Progress") return s.includes('in_progress') || s.includes('progress') || s.includes('running');
      if (statusGroup === "Completed") return s.includes('completed') || s.includes('done') || s.includes('success');
      return false;
    });
  };

  const handleRosterChat = async () => {
    if (!rosterChatInput.trim()) return;
    setRosterChatStatus("routing");
    setRosterChatResult(null);

    try {
      const res = await fetch("/api/agents/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: rosterChatInput,
          execute: true,
          mode: executionMode
        })
      });
      if (res.ok) {
        const data = await res.json();
        setRosterChatResult(data);
        setRosterChatInput("");
      } else {
        setRosterChatResult({ error: "Failed to route request." });
      }
    } catch (err) {
      console.error("Error in roster chat", err);
      setRosterChatResult({ error: err.message });
    } finally {
      setRosterChatStatus("idle");
    }
  };

  return (
    <div>
      <div className="module-header">
        <div className="module-header-left">
          <div className="module-icon" style={{ background: "var(--accent-subtle)" }}>🤖</div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <h1 className="module-title">Agent Orchestrator</h1>
              <span className="badge badge-info">{executionMode} Mode</span>
            </div>
            <p className="module-subtitle">7 agents — deploy, monitor, and orchestrate</p>
          </div>
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
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
            {["Step", "Batch", "Autonomous"].map(mode => (
              <button
                key={mode}
                className={`button ${executionMode === mode ? "button-primary" : ""}`}
                style={{
                  background: executionMode === mode ? "var(--accent)" : "var(--bg-secondary)",
                  color: executionMode === mode ? "#fff" : "var(--text-primary)",
                  border: "1px solid var(--card-border)"
                }}
                onClick={() => setExecutionMode(mode)}
              >
                {mode}
              </button>
            ))}
          </div>

          <div className="grid-auto">
            {isLoadingAgents ? (
              <div style={{ padding: 24, color: "var(--text-secondary)" }}>Loading agents...</div>
            ) : agents.map((agent) => {
              const isOnline = agent.status === "active";
              const isBusy = agent.status === "busy";

              const costVal = agentCosts[agent.id]?.cost || 0;
              const costBadgeClass = costVal < 0.01 ? "badge-success" : costVal < 0.10 ? "badge-warning" : "badge-error";
              const costLabel = costVal === 0 ? "$0.00" : `$${costVal.toFixed(3)} this month`;

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
                  <span className={`badge ${costBadgeClass}`} style={{ fontSize: 11 }}>
                    {costLabel}
                  </span>
                </div>

                <div className="badge badge-info" style={{ fontSize: 11 }}>
                  🧬 {agent.selfImprove}
                </div>
              </div>
            );
          })}
          </div>

          <div className="card" style={{ marginTop: 32 }}>
            <h4 className="h4" style={{ marginBottom: 16 }}>Test & Execute</h4>
            <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
              <input
                type="text"
                className="input"
                style={{ flex: 1 }}
                placeholder="Ask Conductor to route a request..."
                value={rosterChatInput}
                onChange={(e) => setRosterChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRosterChat()}
              />
              <button className="button button-primary" onClick={handleRosterChat}>
                Send
              </button>
            </div>

            {rosterChatStatus === "routing" && (
              <div className="empty-state" style={{ padding: 32 }}>
                <div className="status-dot online" style={{ marginBottom: 16, width: 12, height: 12 }} />
                <p className="body-sm">Conductor is executing...</p>
              </div>
            )}

            {rosterChatResult && rosterChatStatus !== "routing" && (
              <div style={{ background: "var(--bg-secondary)", padding: 16, borderRadius: 8, border: "1px solid var(--card-border)" }}>
                {rosterChatResult.error ? (
                  <p className="body-sm" style={{ color: "var(--error)" }}>{rosterChatResult.error}</p>
                ) : (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16, color: "var(--text-secondary)" }}>
                      <span>Result</span>
                      <span>→</span>
                      <span style={{ color: "var(--accent)" }}>Conductor</span>
                      {rosterChatResult.routing?.agent && (
                        <>
                          <span>→</span>
                          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{rosterChatResult.routing.agent}</span>
                        </>
                      )}
                    </div>
                    {rosterChatResult.response?.text ? (
                       <p className="body-sm" style={{ marginBottom: 8, whiteSpace: "pre-wrap" }}>
                         {rosterChatResult.response.text}
                       </p>
                    ) : (
                       <p className="body-sm" style={{ marginBottom: 8 }}>
                         {rosterChatResult.message || JSON.stringify(rosterChatResult)}
                       </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}


      {activeTab === "Workflow" && (
        <div className="card" style={{ padding: 32, position: "relative", minHeight: 600, overflow: "hidden" }}>
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes pulse-line {
              0% { stroke-opacity: 0.3; stroke-width: 2; }
              50% { stroke-opacity: 1; stroke-width: 3; }
              100% { stroke-opacity: 0.3; stroke-width: 2; }
            }
            .connection-line {
              stroke: var(--card-border);
              stroke-width: 2;
              transition: stroke 0.3s ease;
            }
            .connection-line.highlighted {
              stroke: var(--accent);
              animation: pulse-line 2s infinite ease-in-out;
            }
            .node-card {
              position: absolute;
              transform: translate(-50%, -50%);
              width: 140px;
              padding: 12px;
              display: flex;
              flex-direction: column;
              align-items: center;
              text-align: center;
              gap: 8px;
              cursor: pointer;
              z-index: 10;
              transition: border-color 0.2s ease, transform 0.2s ease;
            }
            .node-card:hover {
              transform: translate(-50%, -50%) scale(1.05);
            }
            .node-card.highlighted {
              border-color: var(--accent);
              box-shadow: 0 0 0 1px var(--accent);
            }
            .domain-card {
              position: absolute;
              transform: translate(-50%, -50%);
              width: 120px;
              padding: 8px;
              text-align: center;
              background: var(--bg-secondary);
              border: 1px dashed var(--card-border);
              border-radius: 8px;
              z-index: 5;
            }
          `}} />

          <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
            {/* Conductor to Agents */}
            <line x1="50%" y1="10%" x2="16%" y2="40%" className={`connection-line ${highlightedAgent === 'Scholar' || highlightedAgent === 'Conductor' ? 'highlighted' : ''}`} />
            <line x1="50%" y1="10%" x2="30%" y2="40%" className={`connection-line ${highlightedAgent === 'Courier' || highlightedAgent === 'Conductor' ? 'highlighted' : ''}`} />
            <line x1="50%" y1="10%" x2="44%" y2="40%" className={`connection-line ${highlightedAgent === 'Builder' || highlightedAgent === 'Conductor' ? 'highlighted' : ''}`} />
            <line x1="50%" y1="10%" x2="58%" y2="40%" className={`connection-line ${highlightedAgent === 'Sentinel' || highlightedAgent === 'Conductor' ? 'highlighted' : ''}`} />
            <line x1="50%" y1="10%" x2="72%" y2="40%" className={`connection-line ${highlightedAgent === 'Forge' || highlightedAgent === 'Conductor' ? 'highlighted' : ''}`} />
            <line x1="50%" y1="10%" x2="86%" y2="40%" className={`connection-line ${highlightedAgent === 'Analyst' || highlightedAgent === 'Conductor' ? 'highlighted' : ''}`} />

            {/* Agents to Domains */}
            <line x1="16%" y1="40%" x2="16%" y2="75%" className={`connection-line ${highlightedAgent === 'Scholar' ? 'highlighted' : ''}`} />
            <line x1="30%" y1="40%" x2="30%" y2="75%" className={`connection-line ${highlightedAgent === 'Courier' ? 'highlighted' : ''}`} />
            <line x1="44%" y1="40%" x2="44%" y2="75%" className={`connection-line ${highlightedAgent === 'Builder' ? 'highlighted' : ''}`} />
            <line x1="58%" y1="40%" x2="58%" y2="75%" className={`connection-line ${highlightedAgent === 'Sentinel' ? 'highlighted' : ''}`} />
            <line x1="72%" y1="40%" x2="72%" y2="75%" className={`connection-line ${highlightedAgent === 'Forge' ? 'highlighted' : ''}`} />
            <line x1="86%" y1="40%" x2="86%" y2="75%" className={`connection-line ${highlightedAgent === 'Analyst' ? 'highlighted' : ''}`} />
          </svg>

          {/* Conductor Node */}
          <div
            className={`card card-glass node-card ${highlightedAgent === 'Conductor' ? 'highlighted' : ''}`}
            style={{ top: "10%", left: "50%" }}
            onClick={() => setHighlightedAgent(highlightedAgent === 'Conductor' ? null : 'Conductor')}
          >
            <div style={{ fontSize: 24 }}>🔀</div>
            <div className="body-sm" style={{ fontWeight: 600 }}>Conductor</div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span className="status-dot online" />
              <span className="caption">Router</span>
            </div>
          </div>

          {/* Agent Nodes */}
          {[
            { name: "Scholar", icon: "📚", left: "16%", role: "Research" },
            { name: "Courier", icon: "✉️", left: "30%", role: "Comms" },
            { name: "Builder", icon: "🔨", left: "44%", role: "Code" },
            { name: "Sentinel", icon: "🛡️", left: "58%", role: "Monitor" },
            { name: "Forge", icon: "☁️", left: "72%", role: "Infra" },
            { name: "Analyst", icon: "📊", left: "86%", role: "Data" },
          ].map(agent => (
            <div
              key={agent.name}
              className={`card card-glass node-card ${highlightedAgent === agent.name ? 'highlighted' : ''}`}
              style={{ top: "40%", left: agent.left }}
              onClick={() => setHighlightedAgent(highlightedAgent === agent.name ? null : agent.name)}
            >
              <div style={{ fontSize: 24 }}>{agent.icon}</div>
              <div className="body-sm" style={{ fontWeight: 600 }}>{agent.name}</div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span className="status-dot online" />
                <span className="caption">{agent.role}</span>
              </div>
            </div>
          ))}

          {/* Domain Nodes */}
          {[
            { name: "Knowledge Data Store", icon: "🗄️", left: "16%" },
            { name: "Gmail / Calendar", icon: "📅", left: "30%" },
            { name: "Jules / GitHub", icon: "💻", left: "44%" },
            { name: "Cost Tracker", icon: "💰", left: "58%" },
            { name: "GCP Infra", icon: "🌐", left: "72%" },
            { name: "Colab", icon: "📓", left: "86%" },
          ].map(domain => (
            <div
              key={domain.name}
              className="domain-card"
              style={{ top: "75%", left: domain.left }}
            >
              <div style={{ fontSize: 20, marginBottom: 4 }}>{domain.icon}</div>
              <div className="caption" style={{ color: "var(--text-secondary)" }}>{domain.name}</div>
            </div>
          ))}
        </div>
      )}
{activeTab === "Tasks" && (
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
            {["Queued", "In Progress", "Completed"].map((col) => {
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
                        <div key={t.id || t.sessionId || idx} className="card card-glass" style={{ padding: 12 }}>
                          <p className="body-sm" style={{ fontWeight: 500, marginBottom: 8 }}>{t.title || (t.prompt && t.prompt.slice(0, 40)) || "Untitled Task"}</p>

                          {t.agent && (
                            <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>
                              <span className="caption">Agent:</span>
                              <span className="badge" style={{ background: "var(--bg-secondary)" }}>{t.agent}</span>
                            </div>
                          )}

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              <span className="badge" style={{ fontSize: 10, padding: "2px 6px" }}>{t.status || 'Queue'}</span>
                            </div>
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

      {activeTab === "Proposals" && (
        <div>
          <div className="card" style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 className="h3">Conductor Proposals</h3>
              <p className="caption" style={{ color: "var(--text-secondary)", marginTop: 4 }}>
                Based on recent routing patterns, Conductor has identified the following gaps and proposes these new agents.
              </p>
            </div>
            <div className="badge">{proposals.length} Pending</div>
          </div>

          {isLoadingProposals ? (
             <p className="caption">Loading proposals...</p>
          ) : proposals.length === 0 ? (
            <div className="empty-state card" style={{ padding: 48, textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
              <h4 className="h4" style={{ marginBottom: 8 }}>No New Proposals</h4>
              <p className="body-sm" style={{ color: "var(--text-secondary)" }}>
                We need more routing data to make intelligent agent proposals. Check back later.
              </p>
            </div>
          ) : (
            <div className="grid-2">
              {proposals.map(proposal => (
                <div key={proposal.id} className="card card-glass" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <h4 className="h4">{proposal.name}</h4>
                      <span className="badge badge-primary">{proposal.role}</span>
                    </div>
                    <p className="body-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>
                      {proposal.reason}
                    </p>
                  </div>

                  <div style={{ display: "flex", gap: 12, marginTop: "auto" }}>
                    <button
                      className="button button-primary"
                      style={{ flex: 1 }}
                      onClick={() => handleProposalDecision(proposal.id, "approved")}
                    >
                      Approve
                    </button>
                    <button
                      className="button button-danger"
                      style={{ flex: 1, background: "transparent", border: "1px solid var(--error)", color: "var(--error)" }}
                      onClick={() => handleProposalDecision(proposal.id, "dismissed")}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
          </div>
  );
}
