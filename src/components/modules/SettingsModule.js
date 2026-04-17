"use client";

import { useState } from "react";

const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    style={{
      width: 40,
      height: 24,
      borderRadius: 12,
      background: checked ? "var(--success)" : "var(--bg-tertiary)",
      border: "none",
      cursor: "pointer",
      position: "relative",
      transition: "background 0.2s",
      padding: 0
    }}
  >
    <div style={{
      width: 20,
      height: 20,
      borderRadius: "50%",
      background: "white",
      position: "absolute",
      top: 2,
      left: checked ? 18 : 2,
      transition: "left 0.2s",
      boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
    }} />
  </button>
);

export default function SettingsModule() {
  // Profile State
  const [profile, setProfile] = useState({ name: "Jane Doe", email: "jane.doe@example.com" });

  // Integrations State
  const [integrations, setIntegrations] = useState({
    gmail: true,
    calendar: false,
    tasks: true,
    firebase: true,
    vertexAi: false,
    jules: true
  });

  // Security State
  const [showApiKey, setShowApiKey] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState("30");
  const [twoFactor, setTwoFactor] = useState(false);

  // Appearance State
  const [theme, setTheme] = useState("dark");
  const [accentColor, setAccentColor] = useState("#3b82f6");
  const [fontSize, setFontSize] = useState(14);

  const presetColors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

  const handleIntegrationToggle = (key) => {
    setIntegrations(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDeleteAccount = () => {
    if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      alert("Account deleted.");
    }
  };

  const handleExportData = () => {
    alert("Data export started.");
  };

  const integrationDetails = [
    { id: "gmail", name: "Gmail", desc: "Read and send emails autonomously" },
    { id: "calendar", name: "Google Calendar", desc: "Manage your events and schedule" },
    { id: "tasks", name: "Google Tasks", desc: "Organize and track your to-dos" },
    { id: "firebase", name: "Firebase", desc: "Data sync and remote configuration" },
    { id: "vertexAi", name: "Vertex AI", desc: "Advanced enterprise LLM routing" },
    { id: "jules", name: "Jules", desc: "AI assistant core integration" }
  ];

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

        {/* Profile */}
        <div className="card">
          <h3 className="h4" style={{ marginBottom: 16 }}>Profile</h3>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%", background: "var(--accent)",
              color: "white", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 24, fontWeight: "bold", flexShrink: 0
            }}>
              {profile.name.split(" ").map(n => n[0]).join("").toUpperCase() || "U"}
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label className="caption" style={{ display: "block", marginBottom: 4 }}>Name</label>
                <input
                  type="text"
                  className="input"
                  value={profile.name}
                  onChange={e => setProfile({...profile, name: e.target.value})}
                />
              </div>
              <div>
                <label className="caption" style={{ display: "block", marginBottom: 4 }}>Email</label>
                <input
                  type="email"
                  className="input"
                  value={profile.email}
                  onChange={e => setProfile({...profile, email: e.target.value})}
                />
              </div>
              <button className="btn btn-primary btn-sm" style={{ alignSelf: "flex-start" }}>Save</button>
            </div>
          </div>
        </div>

        {/* Integrations */}
        <div className="card">
          <h3 className="h4" style={{ marginBottom: 16 }}>Integrations</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {integrationDetails.map((intg, index) => (
              <div key={intg.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                paddingBottom: index < integrationDetails.length - 1 ? 16 : 0,
                borderBottom: index < integrationDetails.length - 1 ? "1px solid var(--card-border)" : "none"
              }}>
                <div>
                  <div className="body" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {intg.name}
                    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-secondary)" }}>
                      <span className={`status-dot ${integrations[intg.id] ? 'online' : 'error'}`} />
                      {integrations[intg.id] ? "Connected" : "Disconnected"}
                    </div>
                  </div>
                  <div className="caption">{intg.desc}</div>
                </div>
                <Toggle checked={integrations[intg.id]} onChange={() => handleIntegrationToggle(intg.id)} />
              </div>
            ))}
          </div>
        </div>

        {/* Security */}
        <div className="card">
          <h3 className="h4" style={{ marginBottom: 16 }}>Security</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label className="caption" style={{ display: "block", marginBottom: 4 }}>API Key</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type={showApiKey ? "text" : "password"}
                  className="input"
                  value="sk-gravix-ABCDEFGHIJKLMNOPQRSTUVWXYZ123456"
                  readOnly
                />
                <button className="btn btn-secondary" onClick={() => setShowApiKey(!showApiKey)}>
                  {showApiKey ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div className="body">Session Timeout</div>
                <div className="caption">Automatically log out after inactivity</div>
              </div>
              <select className="input" style={{ width: 120, padding: "6px 10px" }} value={sessionTimeout} onChange={(e) => setSessionTimeout(e.target.value)}>
                <option value="15">15 mins</option>
                <option value="30">30 mins</option>
                <option value="60">1 hour</option>
                <option value="never">Never</option>
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div className="body">Two-Factor Authentication</div>
                <div className="caption">Add an extra layer of security</div>
              </div>
              <Toggle checked={twoFactor} onChange={setTwoFactor} />
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="card">
          <h3 className="h4" style={{ marginBottom: 16 }}>Appearance</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div className="body">Theme</div>
                <div className="caption">Toggle between dark, light, and system</div>
              </div>
              <select className="input" style={{ width: 120, padding: "6px 10px" }} value={theme} onChange={(e) => {
                const val = e.target.value;
                setTheme(val);
                if (val !== "system") {
                  document.documentElement.setAttribute("data-theme", val);
                } else {
                  document.documentElement.removeAttribute("data-theme");
                }
              }}>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="system">System</option>
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div className="body">Accent Color</div>
                <div className="caption">Choose your primary color</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {presetColors.map(color => (
                  <div
                    key={color}
                    onClick={() => setAccentColor(color)}
                    style={{
                      width: 24, height: 24, borderRadius: "50%", background: color, cursor: "pointer",
                      border: accentColor === color ? "2px solid white" : "2px solid transparent",
                      boxShadow: accentColor === color ? "0 0 0 2px var(--text-primary)" : "none"
                    }}
                  />
                ))}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div className="body">Font Size</div>
                <div className="caption">{fontSize}px</div>
              </div>
              <input
                type="range"
                min="12"
                max="24"
                value={fontSize}
                onChange={e => setFontSize(parseInt(e.target.value))}
                style={{ width: 120 }}
              />
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="card" style={{ border: "1px solid var(--error)" }}>
          <h3 className="h4" style={{ marginBottom: 16, color: "var(--error)" }}>Danger Zone</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div className="body">Export Data</div>
                <div className="caption">Download a copy of all your data</div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={handleExportData}>Export</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div className="body">Delete Account</div>
                <div className="caption">Permanently remove your account and data</div>
              </div>
              <button
                className="btn btn-primary btn-sm"
                style={{ background: "var(--error)" }}
                onClick={handleDeleteAccount}
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
