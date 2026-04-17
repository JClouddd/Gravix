"use client";

import { useState } from "react";

/**
 * Settings Module
 * PWA install, notification prefs, agent mode defaults, API key mgmt
 */
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
