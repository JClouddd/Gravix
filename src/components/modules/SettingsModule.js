"use client";

import { useState } from "react";

/**
 * Settings Module
 * PWA install, notification prefs, agent mode defaults, API key mgmt
 */
const INTEGRATIONS = [
  { name: "Gemini API", status: "connected", dot: "online" },
  { name: "Firebase Auth", status: "connected", dot: "online" },
  { name: "Cloud Firestore", status: "connected", dot: "online" },
  { name: "Vertex AI Data Store", status: "connected", dot: "online", meta: "ID: gravix-knowledge" },
  { name: "Scholar Search Engine", status: "connected", dot: "online", meta: "ID: gravix-scholar" },
  { name: "Cloud Storage", status: "connected", dot: "online", meta: "bucket: gs://gravix-knowledge-docs" },
  { name: "Jules", status: "connected", dot: "online", meta: "repo: JClouddd/Gravix" },
  { name: "Dialogflow CX", status: "connected", dot: "online", meta: "7 agents deployed" },
  { name: "Gmail API", status: "not connected", dot: "busy", needsOAuth: true },
  { name: "Google Calendar", status: "not connected", dot: "busy", needsOAuth: true },
  { name: "Google Tasks", status: "not connected", dot: "busy", needsOAuth: true },
  { name: "Colab Enterprise", status: "not connected", dot: "offline", comingSoon: true },
];

export default function SettingsModule() {
  const [theme, setTheme] = useState("dark");

  const handleThemeToggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
  };

  return (
    <div>
      <div className="module-header">
        <div className="module-header-left">
          <div className="module-icon" style={{ background: "var(--bg-tertiary)" }}>⚙️</div>
          <div>
            <h1 className="module-title">Settings</h1>
            <p className="module-subtitle">System preferences and configuration</p>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Appearance */}
        <div className="card">
          <h3 className="h4" style={{ marginBottom: 16 }}>Appearance</h3>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div className="body">Theme</div>
              <div className="caption">Toggle between dark and light mode</div>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleThemeToggle}
            >
              {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="card">
          <h3 className="h4" style={{ marginBottom: 16 }}>Notifications</h3>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div className="body">Push Notifications</div>
              <div className="caption">Receive alerts from Sentinel and agent updates via FCM</div>
            </div>
            <span className="badge badge-warning">Requires PWA</span>
          </div>
        </div>

        {/* Agent Defaults */}
        <div className="card">
          <h3 className="h4" style={{ marginBottom: 16 }}>Agent Defaults</h3>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div className="body">Default Execution Mode</div>
              <div className="caption">How agents process tasks by default</div>
            </div>
            <select className="input" style={{ width: 160, padding: "6px 10px" }}>
              <option>Step (confirm each)</option>
              <option>Batch (confirm set)</option>
              <option>Autonomous</option>
            </select>
          </div>
        </div>

        {/* PWA */}
        <div className="card">
          <h3 className="h4" style={{ marginBottom: 16 }}>Install App</h3>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div className="body">Install Gravix as PWA</div>
              <div className="caption">Add to home screen for native app experience</div>
            </div>
            <button className="btn btn-primary btn-sm" disabled>
              Install
            </button>
          </div>
        </div>

        {/* Integrations */}
        <div className="card">
          <h3 className="h4" style={{ marginBottom: 16 }}>Integrations</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {INTEGRATIONS.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: i !== INTEGRATIONS.length - 1 ? 12 : 0, borderBottom: i !== INTEGRATIONS.length - 1 ? "1px solid var(--card-border)" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div className={`status-dot ${item.dot}`} />
                  <div>
                    <div className="body">{item.name}</div>
                    <div className="caption" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span>{item.status}</span>
                      {item.meta && <span style={{ color: "var(--text-tertiary)" }}>• {item.meta}</span>}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {item.comingSoon && <span className="badge badge-info">coming soon</span>}
                  {item.needsOAuth && (
                    <>
                      <span className="badge badge-warning">Requires OAuth</span>
                      <a href="/api/auth/connect" className="btn btn-secondary btn-sm" style={{ textDecoration: "none" }}>
                        Connect
                      </a>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Info */}
        <div className="card">
          <h3 className="h4" style={{ marginBottom: 16 }}>System Info</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              ["GCP Project", "antigravity-hub-jcloud"],
              ["Region", "us-central1"],
              ["Service Account", "gravix-hub@antigravity-hub-jcloud.iam.gserviceaccount.com"],
              ["Version", "0.1.0"],
            ].map(([key, val]) => (
              <div key={key} style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="body-sm" style={{ color: "var(--text-secondary)" }}>{key}</span>
                <span className="mono" style={{ color: "var(--text-primary)" }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
