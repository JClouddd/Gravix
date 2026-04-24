"use client";

import { useState } from "react";

const HELP_TEXTS = {
  home: "Your dashboard overview with system health and recent activity",
  finance: "Track API costs, credit usage, and revenue",
  email: "Gmail inbox with AI classification and smart compose",
  planner: "Calendar events and tasks from Google Workspace",
  agents: "Your 7 AI agents, workflow visualizer, and task board",
  knowledge: "Search docs, ingest new content, Scholar research",
  clients: "Client profiles, billing, and communications",
  colab: "Run data science notebooks with real computation",
  settings: "Integrations, notifications, and preferences",
};

export default function HelpTooltip({ module }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const helpText = HELP_TEXTS[module] || "Help information not available.";

  return (
    <div
      style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={() => setShowTooltip(!showTooltip)}
    >
      <button
        type="button"
        className="btn-icon"
        style={{
          width: "24px",
          height: "24px",
          borderRadius: "50%",
          background: "var(--bg-elevated)",
          border: "1px solid var(--card-border)",
          color: "var(--text-secondary)",
          fontSize: "12px",
          fontWeight: 600,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s ease",
        }}
        aria-label="Help"
      >
        ?
      </button>

      {showTooltip && (
        <div
          className="card-glass"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: "50%",
            transform: "translateX(-50%)",
            width: "220px",
            padding: "12px 16px",
            zIndex: "var(--z-tooltip, 250)",
            boxShadow: "var(--card-shadow-hover)",
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          <p className="body-sm" style={{ color: "var(--text-primary)", margin: 0, lineHeight: 1.4 }}>
            {helpText}
          </p>
        </div>
      )}
    </div>
  );
}
