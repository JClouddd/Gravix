"use client";

import { useState } from "react";

/**
 * Agent Orchestrator Module
 * Cards, workflow visualizer, task board, Sentinel tab
 */
const AGENTS = [
  {
    name: "Conductor",
    icon: "🎯",
    role: "Orchestrator — routes requests to the right agent",
    color: "var(--agent-conductor)",
    status: "idle",
    selfImprove: "Creates new agents when gaps found",
  },
  {
    name: "Forge",
    icon: "🔧",
    role: "DevOps — MCP, secrets, IAM, APIs, health checks",
    color: "var(--agent-forge)",
    status: "idle",
    selfImprove: "Auto-configures on API changes",
  },
  {
    name: "Scholar",
    icon: "📚",
    role: "Knowledge — ingestion, research, documentation",
    color: "var(--agent-scholar)",
    status: "idle",
    selfImprove: "Self-indexes and cross-references",
  },
  {
    name: "Analyst",
    icon: "📈",
    role: "Data science — Colab, analysis, ML, charts",
    color: "var(--agent-analyst)",
    status: "idle",
    selfImprove: "Drafts new notebook templates",
  },
  {
    name: "Courier",
    icon: "📨",
    role: "Communications — email, calendar, tasks, Meet, notifications",
    color: "var(--agent-courier)",
    status: "idle",
    selfImprove: "Auto-creates communication templates",
  },
  {
    name: "Sentinel",
    icon: "🛡️",
    role: "Security — costs, monitoring, agent health, rules",
    color: "var(--agent-sentinel)",
    status: "idle",
    selfImprove: "Generates rules from anomalies",
  },
  {
    name: "Builder",
    icon: "🏗️",
    role: "Code — branches, generation, Jules integration, patterns",
    color: "var(--agent-builder)",
    status: "idle",
    selfImprove: "Extracts reusable code patterns",
  },
];

const TABS = ["Roster", "Workflows", "Task Board", "Sentinel"];

export default function AgentsModule() {
  const [activeTab, setActiveTab] = useState("Roster");

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

      {/* Tab Bar */}
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

      {/* Tab Content */}
      {activeTab === "Roster" && (
        <div className="grid-auto">
          {AGENTS.map((agent) => (
            <div
              key={agent.name}
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
                    <span className="status-dot offline" />
                    <span className="caption">Not deployed</span>
                  </div>
                </div>
              </div>
              <p className="body-sm" style={{ color: "var(--text-secondary)", marginBottom: 12 }}>
                {agent.role}
              </p>
              <div className="badge badge-info" style={{ fontSize: 11 }}>
                🧬 {agent.selfImprove}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "Workflows" && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🔀</div>
            <p className="empty-state-title">Workflow Visualizer</p>
            <p className="empty-state-desc">
              Agent connection graph will render here once agents are deployed to Vertex AI.
            </p>
          </div>
        </div>
      )}

      {activeTab === "Task Board" && (
        <div className="grid-3">
          {["To Do", "In Progress", "Done"].map((col) => (
            <div key={col} className="card" style={{ minHeight: 300 }}>
              <h4 className="h4" style={{ marginBottom: 16 }}>{col}</h4>
              <div className="empty-state" style={{ padding: 24 }}>
                <p className="caption">No tasks</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "Sentinel" && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🛡️</div>
            <p className="empty-state-title">Sentinel Health Dashboard</p>
            <p className="empty-state-desc">
              Independent monitoring of all agents, costs, deployments, and system health. Deploy Sentinel first.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
