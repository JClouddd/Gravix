"use client";

import { useState, useEffect } from "react";
import HelpTooltip from "@/components/HelpTooltip";

const TABS = ["Roster", "Skills", "Workflow", "Tasks", "Proposals", "History"];

export default function AgentsModule() {
  const [activeTab, setActiveTab] = useState("Roster");

  // Roster state
  const [agents, setAgents] = useState([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);
  const [agentCosts, setAgentCosts] = useState({});
  const [executionMode, setExecutionMode] = useState("Step");
  const [expandedAgent, setExpandedAgent] = useState(null);
  const [skillFilter, setSkillFilter] = useState("all");
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
  const [draggedTask, setDraggedTask] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [contextMenu, setContextMenu] = useState(null); // { x, y, task, shortId }

  // Proposals state
  const [proposals, setProposals] = useState([]);
  const [isLoadingProposals, setIsLoadingProposals] = useState(true);

  // History state
  const [historyAgent, setHistoryAgent] = useState("conductor");
  const [agentHistory, setAgentHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);

  // Jules quota state
  const [julesQuota, setJulesQuota] = useState(null);

  // Review data state (replaces window.__julesReview)
  const [reviewData, setReviewData] = useState(null);

  // Pipeline Monitor state
  const [pipelineAlerts, setPipelineAlerts] = useState([]);
  const [ciStatus, setCiStatus] = useState(null); // { status, conclusion, sha, url }

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
        // Fetch both legacy tasks and categorized review data in parallel
        const [tasksRes, reviewRes] = await Promise.allSettled([
          fetch("/api/jules/tasks"),
          fetch("/api/jules/review"),
        ]);

        if (tasksRes.status === "fulfilled" && tasksRes.value.ok) {
          const data = await tasksRes.value.json();
          setTasks(Array.isArray(data) ? data : data.sessions || []);
        }

        if (reviewRes.status === "fulfilled" && reviewRes.value.ok) {
          const revData = await reviewRes.value.json();
          setReviewData(revData);
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

    // Pipeline Monitor: poll for state changes and CI status
    const pipelineInterval = setInterval(async () => {
      try {
        // Poll Jules review data for state changes
        const reviewRes = await fetch("/api/jules/review");
        if (reviewRes.ok) {
          const revData = await reviewRes.json();
          setReviewData(prev => {
            // Check for state changes and generate alerts
            if (prev && revData.summary) {
              const newAlerts = [];
              if ((revData.summary.completed || 0) > (prev.summary?.completed || 0)) {
                newAlerts.push({ id: Date.now(), type: "success", message: "✅ A Jules task completed!", ts: new Date() });
              }
              if ((revData.summary.failed || 0) > (prev.summary?.failed || 0)) {
                newAlerts.push({ id: Date.now() + 1, type: "error", message: "❌ A Jules task failed!", ts: new Date() });
              }
              if (newAlerts.length > 0) {
                setPipelineAlerts(a => [...a, ...newAlerts]);
              }
            }
            return revData;
          });
        }

        // Poll GitHub CI status (via API route)
        const ciRes = await fetch("/api/jules/ci-status");
        if (ciRes.ok) {
          const ciData = await ciRes.json();
          setCiStatus(ciData);
          if (ciData.conclusion === "failure") {
            setPipelineAlerts(a => {
              // Don't duplicate CI alerts for same sha
              if (a.some(al => al.sha === ciData.sha)) return a;
              return [...a, { id: Date.now() + 2, type: "ci-fail", message: `🔴 CI failed on ${ciData.branch} (${ciData.sha?.slice(0, 7)})`, ts: new Date(), sha: ciData.sha }];
            });
          }
        }
      } catch (err) {
        // Silent fail for polling
      }
    }, 60000);
    fetchCosts();
    fetchProposals();

    // Fetch Jules quota
    async function fetchJulesQuota() {
      try {
        const res = await fetch("/api/costs/credits");
        if (res.ok) {
          const data = await res.json();
          if (data.jules) setJulesQuota(data.jules);
        }
      } catch (err) {
        console.error("Failed to fetch Jules quota", err);
      }
    }
    fetchJulesQuota();

    return () => clearInterval(pipelineInterval);
  }, []);

  // Fetch History whenever historyAgent or activeTab changes
  useEffect(() => {
    if (activeTab !== "History") return;

    async function fetchHistory() {
      setIsLoadingHistory(true);
      try {
        const res = await fetch(`/api/agents/memory?agentName=${historyAgent}`);
        if (res.ok) {
          const data = await res.json();
          setAgentHistory(data.conversations || []);
        } else {
          setAgentHistory([]);
        }
      } catch (err) {
        console.error("Failed to fetch agent history", err);
        setAgentHistory([]);
      } finally {
        setIsLoadingHistory(false);
      }
    }

    fetchHistory();
  }, [activeTab, historyAgent]);

  const handleClearHistory = async () => {
    if (!confirm(`Are you sure you want to clear ${historyAgent}'s history?`)) return;

    try {
      const res = await fetch(`/api/agents/memory?agentName=${historyAgent}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setAgentHistory([]);
      }
    } catch (err) {
      console.error("Failed to clear agent history", err);
    }
  };

  // Task Board Action — uses new trigger endpoint with context injection
  const handleNewTask = async () => {
    if (!newTaskPrompt.trim()) return;
    setIsSubmittingTask(true);
    try {
      const res = await fetch("/api/jules/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: newTaskPrompt,
          autoApprove: true,
        }),
      });
      if (res.ok) {
        // Refresh both tasks and review data
        const [tasksRes, reviewRes] = await Promise.allSettled([
          fetch("/api/jules/tasks"),
          fetch("/api/jules/review"),
        ]);
        if (tasksRes.status === "fulfilled" && tasksRes.value.ok) {
          const data = await tasksRes.value.json();
          setTasks(Array.isArray(data) ? data : data.sessions || []);
        }
        if (reviewRes.status === "fulfilled" && reviewRes.value.ok) {
          const revData = await reviewRes.value.json();
          setReviewData(revData);
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

  // Close context menu on click outside or escape
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setContextMenu(null);
    };
    if (contextMenu) {
      document.addEventListener("click", handleClick);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [contextMenu]);

  const handleDragOver = (e, colKey) => {
    e.preventDefault();
    setDropTarget(colKey);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDropTarget(null);
  };

  const handleDrop = async (e, targetColKey) => {
    e.preventDefault();
    setDropTarget(null);

    const sessionId = e.dataTransfer.getData("sessionId");
    const currentStatus = e.dataTransfer.getData("currentStatus");
    if (!sessionId || currentStatus === targetColKey) return;

    // Optimistic update
    // Optimistic update using React state
    setReviewData(prev => {
      if (!prev) return prev;
      const clone = JSON.parse(JSON.stringify(prev));
      const taskIndex = clone[currentStatus]?.findIndex(t => {
        const id = t.id || t.name || t.sessionId;
        const sid = typeof id === "string" && id.includes("/") ? id.split("/").pop() : id;
        return sid === sessionId;
      });
      if (taskIndex > -1) {
        const [task] = clone[currentStatus].splice(taskIndex, 1);
        if (!clone[targetColKey]) clone[targetColKey] = [];
        clone[targetColKey].push(task);
      }
      return clone;
    });

    try {
      const res = await fetch("/api/jules/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, action: "override", status: targetColKey }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      const refreshRes = await fetch("/api/jules/review");
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        setReviewData(data);
      }
    } catch (err) {
      console.error("Drag and drop update failed:", err);
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
              <HelpTooltip module="agents" />
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

              const costVal = parseFloat(agentCosts[agent.id]?.cost) || 0;
              const costBadgeClass = costVal < 0.01 ? "badge-success" : costVal < 0.10 ? "badge-warning" : "badge-error";
              const costLabel = costVal === 0 ? "$0.00" : `$${costVal.toFixed(3)} this month`;

              const isExpanded = expandedAgent === agent.id;
              const skills = agent.skills || [];
              const subAgents = agent.subAgents || [];

              const SKILL_COLORS = {
                orchestration: "#6C5CE7",
                monitoring: "#E74C3C",
                security: "#E74C3C",
                knowledge: "#00B894",
                research: "#00B894",
                devops: "#E17055",
                analytics: "#A29BFE",
                intelligence: "#A29BFE",
                comms: "#4299E1",
                coding: "#F1C40F",
              };

              return (
              <div
                key={agent.id}
                className="card"
                style={{
                  borderTop: `3px solid ${agent.color}`,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onClick={() => setExpandedAgent(isExpanded ? null : agent.id)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <span style={{ fontSize: 28 }}>{agent.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div className="h4">{agent.name}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span className={`status-dot ${isOnline ? "online" : isBusy ? "warning" : "offline"}`} />
                      <span className="caption">
                        {isOnline ? "Online" : isBusy ? "Busy" : "Offline"}
                      </span>
                    </div>
                  </div>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)", transition: "transform 0.2s", transform: isExpanded ? "rotate(180deg)" : "rotate(0)" }}>▼</span>
                </div>
                <p className="body-sm" style={{ color: "var(--text-secondary)", marginBottom: 4 }}>
                  {agent.role}
                </p>

                {/* Skill preview badges (always visible) */}
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
                  {skills.slice(0, 3).map(skill => (
                    <span key={skill.id} className="badge" style={{
                      fontSize: 10,
                      background: `${SKILL_COLORS[skill.category] || "var(--bg-secondary)"}22`,
                      color: SKILL_COLORS[skill.category] || "var(--text-secondary)",
                      border: `1px solid ${SKILL_COLORS[skill.category] || "var(--card-border)"}44`,
                    }}>{skill.name}</span>
                  ))}
                  {skills.length > 3 && (
                    <span className="badge" style={{ fontSize: 10, background: "var(--bg-secondary)" }}>+{skills.length - 3}</span>
                  )}
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                  <span className={`badge ${costBadgeClass}`} style={{ fontSize: 11 }}>
                    {costLabel}
                  </span>
                </div>

                <div className="badge badge-info" style={{ fontSize: 11 }}>
                  🧬 {agent.selfImprove}
                </div>

                {/* Expanded Skills Panel */}
                <div style={{
                  maxHeight: isExpanded ? 500 : 0,
                  overflow: "hidden",
                  transition: "max-height 0.3s ease, opacity 0.2s ease",
                  opacity: isExpanded ? 1 : 0,
                }}>
                  <div style={{ borderTop: "1px solid var(--card-border)", marginTop: 12, paddingTop: 12 }}>
                    <div className="h5" style={{ marginBottom: 8, color: "var(--text-primary)" }}>🛠 Skills ({skills.length})</div>
                    {skills.map(skill => (
                      <div key={skill.id} style={{
                        display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8,
                        padding: "6px 8px", borderRadius: 6, background: "var(--bg-secondary)",
                      }}>
                        <span style={{
                          width: 6, height: 6, borderRadius: "50%", marginTop: 6, flexShrink: 0,
                          background: SKILL_COLORS[skill.category] || "var(--text-secondary)",
                        }} />
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{skill.name}</div>
                          <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{skill.description}</div>
                        </div>
                      </div>
                    ))}

                    {subAgents.length > 0 && (
                      <>
                        <div className="h5" style={{ marginTop: 12, marginBottom: 8, color: "var(--text-primary)" }}>🤖 Sub-Agents</div>
                        {subAgents.map((sa, i) => (
                          <div key={i} className="badge" style={{ fontSize: 11, marginRight: 4 }}>{sa.name || sa}</div>
                        ))}
                      </>
                    )}

                    {subAgents.length === 0 && (
                      <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 8, fontStyle: "italic" }}>
                        No sub-agents deployed
                      </div>
                    )}
                  </div>
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


      {activeTab === "Skills" && (() => {
        const SKILL_CAT_COLORS = {
          orchestration: "#6C5CE7",
          monitoring: "#E74C3C",
          security: "#E74C3C",
          knowledge: "#00B894",
          research: "#00B894",
          devops: "#E17055",
          analytics: "#A29BFE",
          intelligence: "#A29BFE",
          comms: "#4299E1",
          coding: "#F1C40F",
        };

        // Flatten all skills with agent ownership
        const allSkills = agents.flatMap(agent =>
          (agent.skills || []).map(skill => ({ ...skill, agentId: agent.id, agentName: agent.name, agentIcon: agent.icon, agentColor: agent.color }))
        );

        // Get unique categories
        const categories = [...new Set(allSkills.map(s => s.category))];

        // Apply filter
        const filtered = skillFilter === "all" ? allSkills : allSkills.filter(s => s.category === skillFilter);

        return (
        <div>
          {/* Stats Bar */}
          <div className="card" style={{ marginBottom: 16, display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <div className="caption" style={{ color: "var(--text-secondary)" }}>Total Skills</div>
              <div className="h3" style={{ color: "var(--accent)" }}>{allSkills.length}</div>
            </div>
            <div>
              <div className="caption" style={{ color: "var(--text-secondary)" }}>Categories</div>
              <div className="h3" style={{ color: "var(--text-primary)" }}>{categories.length}</div>
            </div>
            <div>
              <div className="caption" style={{ color: "var(--text-secondary)" }}>Agents</div>
              <div className="h3" style={{ color: "var(--text-primary)" }}>{agents.length}</div>
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>Skills are dynamically learned from ingested content</div>
          </div>

          {/* Category Filter Pills */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
            <button
              className={`button ${skillFilter === "all" ? "button-primary" : ""}`}
              style={{
                fontSize: 11, padding: "4px 12px",
                background: skillFilter === "all" ? "var(--accent)" : "var(--bg-secondary)",
                color: skillFilter === "all" ? "#fff" : "var(--text-primary)",
                border: "1px solid var(--card-border)",
              }}
              onClick={() => setSkillFilter("all")}
            >
              All ({allSkills.length})
            </button>
            {categories.map(cat => {
              const count = allSkills.filter(s => s.category === cat).length;
              const isActive = skillFilter === cat;
              return (
                <button
                  key={cat}
                  className="button"
                  style={{
                    fontSize: 11, padding: "4px 12px",
                    background: isActive ? `${SKILL_CAT_COLORS[cat]}22` : "var(--bg-secondary)",
                    color: isActive ? SKILL_CAT_COLORS[cat] : "var(--text-primary)",
                    border: `1px solid ${isActive ? SKILL_CAT_COLORS[cat] : "var(--card-border)"}`,
                  }}
                  onClick={() => setSkillFilter(cat)}
                >
                  <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: SKILL_CAT_COLORS[cat] || "#999", marginRight: 6 }} />
                  {cat.charAt(0).toUpperCase() + cat.slice(1)} ({count})
                </button>
              );
            })}
          </div>

          {/* Skills Grid */}
          <div className="grid-auto">
            {filtered.map(skill => (
              <div key={`${skill.agentId}-${skill.id}`} className="card" style={{
                borderLeft: `3px solid ${SKILL_CAT_COLORS[skill.category] || "var(--card-border)"}`,
                transition: "transform 0.15s ease",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                    background: SKILL_CAT_COLORS[skill.category] || "#999",
                  }} />
                  <div className="h5" style={{ color: "var(--text-primary)" }}>{skill.name}</div>
                </div>
                <p className="body-sm" style={{ color: "var(--text-secondary)", marginBottom: 10, fontSize: 12 }}>
                  {skill.description}
                </p>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  <span className="badge" style={{
                    fontSize: 10,
                    background: `${skill.agentColor}22`,
                    color: skill.agentColor,
                    border: `1px solid ${skill.agentColor}44`,
                  }}>
                    {skill.agentIcon} {skill.agentName}
                  </span>
                  <span className="badge" style={{
                    fontSize: 10,
                    background: `${SKILL_CAT_COLORS[skill.category]}11`,
                    color: SKILL_CAT_COLORS[skill.category],
                  }}>
                    {skill.category}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="empty-state" style={{ padding: 48 }}>
              <p className="body-sm" style={{ color: "var(--text-secondary)" }}>No skills found for this filter</p>
            </div>
          )}
        </div>
        );
      })()}


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
{activeTab === "Tasks" && (() => {
        // Use the review data if available, otherwise fall back to legacy tasks
        // reviewData comes from React state (defined at top of component)
        const COLUMNS = [
          { key: "needsReview", label: "⏳ Needs Review", color: "#ff9500", icon: "⏳" },
          { key: "inProgress", label: "🔄 In Progress", color: "#007AFF", icon: "🔄" },
          { key: "completed", label: "✅ Completed", color: "#34C759", icon: "✅" },
          { key: "failed", label: "❌ Failed", color: "#FF3B30", icon: "❌" },
        ];

        return (
        <div>
          {/* Summary Bar */}
          <div className="card" style={{ marginBottom: 16, display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <div className="caption" style={{ color: "var(--text-secondary)" }}>Total Sessions</div>
              <div className="h3" style={{ color: "var(--accent)" }}>{reviewData?.summary?.total ?? tasks.length}</div>
            </div>
            {reviewData?.summary && (
              <>
                <div>
                  <div className="caption" style={{ color: "#ff9500" }}>Needs Review</div>
                  <div className="h3" style={{ color: "#ff9500" }}>{reviewData.summary.needsReview}</div>
                </div>
                <div>
                  <div className="caption" style={{ color: "#007AFF" }}>In Progress</div>
                  <div className="h3" style={{ color: "#007AFF" }}>{reviewData.summary.inProgress}</div>
                </div>
                <div>
                  <div className="caption" style={{ color: "#34C759" }}>Completed</div>
                  <div className="h3" style={{ color: "#34C759" }}>{reviewData.summary.completed}</div>
                </div>
                <div>
                  <div className="caption" style={{ color: "#FF3B30" }}>Failed</div>
                  <div className="h3" style={{ color: "#FF3B30" }}>{reviewData.summary.failed}</div>
                </div>
              </>
            )}
            <div style={{ flex: 1 }} />
            {/* Jules quota inline */}
            {julesQuota && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 12px", borderRadius: "var(--radius-md)",
                background: julesQuota.remaining < 50 ? "rgba(239,68,68,0.08)" : julesQuota.remaining < 200 ? "rgba(255,170,0,0.08)" : "rgba(16,185,129,0.08)",
                border: `1px solid ${julesQuota.remaining < 50 ? "rgba(239,68,68,0.25)" : julesQuota.remaining < 200 ? "rgba(255,170,0,0.25)" : "rgba(16,185,129,0.25)"}`,
              }}>
                <span>{julesQuota.remaining < 50 ? "🔴" : julesQuota.remaining < 200 ? "🟡" : "🟢"}</span>
                <span className="caption"><strong>{julesQuota.remaining}</strong> sessions left</span>
              </div>
            )}
          </div>

          {/* New Task Input */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", gap: 12 }}>
              <input
                type="text"
                className="input"
                style={{ flex: 1 }}
                placeholder="Describe a task for Jules (e.g. 'Add loading skeleton to PlannerModule')..."
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
                {isSubmittingTask ? "Submitting..." : "🚀 Trigger Task"}
              </button>
            </div>
            <p className="caption" style={{ marginTop: 8, color: "var(--text-secondary)" }}>
              Tasks are sent to Jules with full project context. Auto-approve is enabled — Jules will create a PR when done.
            </p>
          </div>

          {/* Kanban Board */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            {COLUMNS.map((col) => {
              const columnTasks = reviewData ? (reviewData[col.key] || []) : (col.key === "needsReview" ? getTasksByStatus("Queued") : col.key === "inProgress" ? getTasksByStatus("In Progress") : col.key === "completed" ? getTasksByStatus("Completed") : []);
              return (
                <div
                  key={col.key}
                  data-status={col.key}
                  onDragOver={(e) => handleDragOver(e, col.key)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, col.key)}
                  className={dropTarget === col.key ? "drop-zone-active" : ""}
                  style={{
                  background: dropTarget === col.key ? "rgba(var(--accent-rgb), 0.05)" : "var(--bg-secondary)",
                  borderRadius: "var(--radius-lg)",
                  padding: 16,
                  minHeight: 300,
                  border: dropTarget === col.key ? `2px dashed var(--accent)` : `1px solid var(--card-border)`,
                  borderTop: dropTarget === col.key ? `2px dashed var(--accent)` : `3px solid ${col.color}`,
                  transition: "all 0.2s ease"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <h4 className="h5" style={{ color: col.color }}>{col.label}</h4>
                    <span className="badge" style={{
                      background: `${col.color}22`,
                      color: col.color,
                      border: `1px solid ${col.color}44`,
                      fontWeight: 600,
                    }}>{columnTasks.length}</span>
                  </div>

                  {isLoadingTasks ? (
                    <p className="caption" style={{ padding: 12 }}>Loading...</p>
                  ) : columnTasks.length === 0 ? (
                    <div style={{
                      padding: 24, textAlign: "center",
                      background: "var(--bg-primary)", borderRadius: "var(--radius-md)",
                      border: "1px dashed var(--card-border)",
                    }}>
                      <p className="caption" style={{ color: "var(--text-secondary)" }}>No sessions</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {columnTasks.map((t, idx) => {
                        const sessionName = t.id || t.name || t.sessionId || `task-${idx}`;
                        // Extract just the session ID from the full resource name
                        const shortId = typeof sessionName === "string" && sessionName.includes("/")
                          ? sessionName.split("/").pop()
                          : sessionName;

                        return (
                          <div
                            key={shortId}
                            className={`card card-glass ${draggedTask === shortId ? 'dragging' : ''}`}
                            draggable={true}
                            onDragStart={(e) => {
                              setDraggedTask(shortId);
                              e.dataTransfer.setData("sessionId", shortId);
                              e.dataTransfer.setData("currentStatus", col.key);
                            }}
                            onDragEnd={() => setDraggedTask(null)}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setContextMenu({ x: e.clientX, y: e.clientY, task: t, shortId });
                            }}
                            style={{
                              padding: 12,
                              borderLeft: `3px solid ${col.color}`,
                              transition: "all 0.2s ease",
                              opacity: draggedTask === shortId ? 0.5 : 1,
                              transform: draggedTask === shortId ? "scale(0.95)" : "scale(1)",
                              cursor: "grab"
                          }}>
                            <p className="body-sm" style={{ fontWeight: 600, marginBottom: 6, lineHeight: 1.4 }}>
                              {t.title || (t.prompt && t.prompt.slice(0, 60)) || "Untitled Task"}
                            </p>

                            <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                              <span className="badge" style={{
                                fontSize: 10, padding: "2px 6px",
                                background: `${col.color}18`,
                                color: col.color,
                              }}>{t.state || t.status || "pending"}</span>
                              <span className="caption" style={{ color: "var(--text-secondary)" }}>
                                {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "Just now"}
                              </span>
                            </div>

                            {/* Approve / Reject buttons only for "Needs Review" column */}
                            {col.key === "needsReview" && (
                              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                                <button
                                  className="button"
                                  style={{
                                    flex: 1, fontSize: 11, padding: "6px 10px",
                                    background: "rgba(52, 199, 89, 0.12)",
                                    color: "#34C759",
                                    border: "1px solid rgba(52, 199, 89, 0.3)",
                                  }}
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      const res = await fetch("/api/jules/review", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ sessionId: shortId, action: "approve" }),
                                      });
                                      if (res.ok) {
                                        // Refetch review data
                                        const refreshRes = await fetch("/api/jules/review");
                                        if (refreshRes.ok) {
                                          const data = await refreshRes.json();
                                          setReviewData(data);
                                          setTasks(prev => [...prev]);
                                        }
                                      }
                                    } catch (err) {
                                      console.error("Failed to approve", err);
                                    }
                                  }}
                                >
                                  ✅ Approve
                                </button>
                                <button
                                  className="button"
                                  style={{
                                    flex: 1, fontSize: 11, padding: "6px 10px",
                                    background: "rgba(255, 59, 48, 0.12)",
                                    color: "#FF3B30",
                                    border: "1px solid rgba(255, 59, 48, 0.3)",
                                  }}
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    const reason = prompt("Rejection reason (optional):");
                                    try {
                                      const res = await fetch("/api/jules/review", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ sessionId: shortId, action: "reject", message: reason || "" }),
                                      });
                                      if (res.ok) {
                                        const refreshRes = await fetch("/api/jules/review");
                                        if (refreshRes.ok) {
                                          const data = await refreshRes.json();
                                          setReviewData(data);
                                          setTasks(prev => [...prev]);
                                        }
                                      }
                                    } catch (err) {
                                      console.error("Failed to reject", err);
                                    }
                                  }}
                                >
                                  ❌ Reject
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {contextMenu && (
            <div
              className="context-menu"
              style={{
                position: "fixed",
                top: contextMenu.y,
                left: contextMenu.x,
                zIndex: 1000,
                background: "var(--bg-primary)",
                border: "1px solid var(--card-border)",
                borderRadius: 8,
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                padding: "4px 0",
                minWidth: 160
              }}
            >
              <div style={{ padding: "8px 16px", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", borderBottom: "1px solid var(--card-border)", marginBottom: 4 }}>
                Override Status
              </div>
              {COLUMNS.map(col => (
                <div
                  key={col.key}
                  style={{ padding: "8px 16px", cursor: "pointer", fontSize: 13, transition: "background 0.2s ease" }}
                  onMouseEnter={(e) => e.target.style.background = "var(--bg-secondary)"}
                  onMouseLeave={(e) => e.target.style.background = "transparent"}
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      // Optimistic Update via React state
                      setReviewData(prev => {
                        if (!prev) return prev;
                        const clone = JSON.parse(JSON.stringify(prev));
                        let currentStatus = null;
                        for (const k of Object.keys(clone)) {
                          if (Array.isArray(clone[k])) {
                            if (clone[k].find(t => {
                              const id = t.id || t.name || t.sessionId;
                              const sid = typeof id === "string" && id.includes("/") ? id.split("/").pop() : id;
                              return sid === contextMenu.shortId;
                            })) {
                              currentStatus = k;
                              break;
                            }
                          }
                        }
                        if (currentStatus && currentStatus !== col.key) {
                          const taskIndex = clone[currentStatus].findIndex(t => {
                            const id = t.id || t.name || t.sessionId;
                            const sid = typeof id === "string" && id.includes("/") ? id.split("/").pop() : id;
                            return sid === contextMenu.shortId;
                          });
                          if (taskIndex > -1) {
                            const [task] = clone[currentStatus].splice(taskIndex, 1);
                            if (!clone[col.key]) clone[col.key] = [];
                            clone[col.key].push(task);
                          }
                        }
                        return clone;
                      });

                      setContextMenu(null);

                      const res = await fetch("/api/jules/review", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ sessionId: contextMenu.shortId, action: "override", status: col.key })
                      });

                      if (res.ok) {
                        const refreshRes = await fetch("/api/jules/review");
                        if (refreshRes.ok) {
                          const data = await refreshRes.json();
                          setReviewData(data);
                        }
                      }
                    } catch (err) {
                      console.error("Context menu override failed:", err);
                    }
                  }}
                >
                  {col.label}
                </div>
              ))}
              <div style={{ borderTop: "1px solid var(--card-border)", margin: "4px 0" }} />
              <div
                style={{ padding: "8px 16px", cursor: "pointer", fontSize: 13, transition: "background 0.2s ease" }}
                onMouseEnter={(e) => e.target.style.background = "var(--bg-secondary)"}
                onMouseLeave={(e) => e.target.style.background = "transparent"}
                onClick={() => {
                  window.open(`https://jules.google.com/session/${contextMenu.shortId}`, "_blank");
                  setContextMenu(null);
                }}
              >
                🔗 Open in Jules
              </div>
              {contextMenu.task?.pullRequest && (
                <div
                  style={{ padding: "8px 16px", cursor: "pointer", fontSize: 13, transition: "background 0.2s ease" }}
                  onMouseEnter={(e) => e.target.style.background = "var(--bg-secondary)"}
                  onMouseLeave={(e) => e.target.style.background = "transparent"}
                  onClick={() => {
                    window.open(contextMenu.task.pullRequest, "_blank");
                    setContextMenu(null);
                  }}
                >
                  🐙 View PR
                </div>
              )}
            </div>
          )}
        </div>
        );
      })()}

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

      {activeTab === "History" && (
        <div>
          <div className="card" style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <h3 className="h3">Agent Memory</h3>
              <select
                className="input"
                style={{ width: 200, padding: "8px 12px" }}
                value={historyAgent}
                onChange={(e) => setHistoryAgent(e.target.value)}
              >
                <option value="conductor">Conductor</option>
                <option value="forge">Forge</option>
                <option value="scholar">Scholar</option>
                <option value="analyst">Analyst</option>
                <option value="courier">Courier</option>
                <option value="sentinel">Sentinel</option>
                <option value="builder">Builder</option>
              </select>
            </div>

            <button
              className="button button-danger"
              style={{ background: "transparent", border: "1px solid var(--error)", color: "var(--error)" }}
              onClick={handleClearHistory}
              disabled={isLoadingHistory || agentHistory.length === 0}
            >
              Clear History
            </button>
          </div>

          {isLoadingHistory ? (
            <p className="caption">Loading history...</p>
          ) : agentHistory.length === 0 ? (
            <div className="empty-state card" style={{ padding: 48, textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🧠</div>
              <h4 className="h4" style={{ marginBottom: 8 }}>No Memories Found</h4>
              <p className="body-sm" style={{ color: "var(--text-secondary)" }}>
                {historyAgent} has no conversation history.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {agentHistory.map((conv) => (
                <div key={conv.id} className="card card-glass" style={{ padding: "16px 24px" }}>
                  <div
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                    onClick={() => setExpandedHistoryId(expandedHistoryId === conv.id ? null : conv.id)}
                  >
                    <div style={{ flex: 1 }}>
                      <p className="body-sm" style={{ fontWeight: 600, marginBottom: 4 }}>{conv.summary}</p>
                      <p className="caption" style={{ color: "var(--text-secondary)" }}>
                        {new Date(conv.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div style={{ fontSize: 18, color: "var(--text-secondary)" }}>
                      {expandedHistoryId === conv.id ? "▲" : "▼"}
                    </div>
                  </div>

                  {expandedHistoryId === conv.id && conv.messages && (
                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--card-border)", display: "flex", flexDirection: "column", gap: 12 }}>
                      {conv.messages.map((msg, idx) => (
                        <div key={idx} style={{
                          background: msg.role === "user" ? "var(--bg-secondary)" : "rgba(var(--accent-rgb), 0.05)",
                          padding: 12,
                          borderRadius: 8,
                          borderLeft: msg.role === "agent" ? "3px solid var(--accent)" : "none"
                        }}>
                          <p className="caption" style={{ fontWeight: 600, marginBottom: 4, color: msg.role === "agent" ? "var(--accent)" : "var(--text-secondary)" }}>
                            {msg.role === "user" ? "User" : historyAgent.charAt(0).toUpperCase() + historyAgent.slice(1)}
                          </p>
                          <p className="body-sm" style={{ whiteSpace: "pre-wrap" }}>{msg.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
          </div>
  );
}
