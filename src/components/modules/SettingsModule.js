"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { requestPermission } from "@/lib/notifications";
import HelpTooltip from "@/components/HelpTooltip";
import { useAuth } from "@/lib/authProvider";

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
  { name: "Plaid API", status: "configured", dot: "online", meta: "Env: Sandbox" },
  { name: "Colab Enterprise", status: "not connected", dot: "offline", comingSoon: true },
];

export default function SettingsModule() {
  // Profile State from Firebase Auth
  const { user } = useAuth();
  
  // Local fallback if user isn't loaded yet
  const [profile, setProfile] = useState({ 
    name: user?.displayName || "Loading...", 
    email: user?.email || "loading..." 
  });

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProfile({ name: user.displayName || "User", email: user.email || "" });
    }
  }, [user]);

  // PWA Install State
  const [installed, setInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // Check if app is running as PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInstalled(isStandalone);

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

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
  // Removed fake states

  // Appearance State
  const [theme, setTheme] = useState("dark");
  // Removed fake accent and font size states

  // Notifications State
  const [pushEnabled, setPushEnabled] = useState(
    typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted"
  );
  const [fcmTokenStatus, setFcmTokenStatus] = useState(
    typeof window !== "undefined" && "Notification" in window
      ? (Notification.permission === "granted" ? "connected" : "not connected")
      : "unsupported"
  );
  const [notificationPrefs, setNotificationPrefs] = useState({
    costAlerts: true,
    healthAlerts: true,
    agentProposals: true,
    meetingSummaries: true,
    costThreshold: 72,
    eventArc: false
  });

  // Plaid API State
  const [plaidEnv, setPlaidEnv] = useState("sandbox");
  const [isSavingPlaid, setIsSavingPlaid] = useState(false);

  useEffect(() => {
    // Load Plaid Env
    const fetchPlaidEnv = async () => {
      try {
        const docRef = doc(db, "settings", "plaid_config");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().environment) {
          setPlaidEnv(docSnap.data().environment);
        }
      } catch (err) {
        console.error("Failed to load plaid config:", err);
      }
    };
    fetchPlaidEnv();
  }, []);

  const savePlaidEnv = async (env) => {
    setIsSavingPlaid(true);
    setPlaidEnv(env);
    try {
      await setDoc(doc(db, "settings", "plaid_config"), { environment: env }, { merge: true });
    } catch (err) {
      console.error("Failed to save plaid config:", err);
    } finally {
      setIsSavingPlaid(false);
    }
  };

  // Design Engine State
  const [designContent, setDesignContent] = useState("Loading design matrix...");
  const [isSavingDesign, setIsSavingDesign] = useState(false);

  useEffect(() => {
    fetch('/api/design/sync')
      .then(res => res.json())
      .then(data => {
        if (data.content) setDesignContent(data.content);
      })
      .catch(err => {
        console.error("Failed to load DESIGN.md:", err);
        setDesignContent("Failed to load design config.");
      });
  }, []);

  const saveDesign = async () => {
    setIsSavingDesign(true);
    try {
      const res = await fetch('/api/design/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: designContent })
      });
      if (!res.ok) throw new Error("Failed to sync");
      alert("Design Matrix Synced! Refreshing UI in 2s...");
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      console.error(err);
      alert("Failed to save design config.");
    } finally {
      setIsSavingDesign(false);
    }
  };

  useEffect(() => {
    // Load notification prefs
    const fetchPrefs = async () => {
      try {
        const docRef = doc(db, "settings", "notification_prefs");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setNotificationPrefs(prev => ({ ...prev, ...docSnap.data() }));
        }
      } catch (err) {
        console.error("Failed to load notification prefs:", err);
      }
    };
    fetchPrefs();
  }, []);

  const saveNotificationPrefs = async (newPrefs) => {
    try {
      await setDoc(doc(db, "settings", "notification_prefs"), newPrefs, { merge: true });
    } catch (err) {
      console.error("Failed to save notification prefs:", err);
    }
  };

  const handlePrefToggle = (key) => {
    const newPrefs = { ...notificationPrefs, [key]: !notificationPrefs[key] };
    setNotificationPrefs(newPrefs);
    saveNotificationPrefs(newPrefs);
  };

  const handleThresholdChange = (e) => {
    const newPrefs = { ...notificationPrefs, costThreshold: Number(e.target.value) };
    setNotificationPrefs(newPrefs);
    // Debounce this in a real app, but directly saving for now
    saveNotificationPrefs(newPrefs);
  };

  const handlePushToggle = async (e) => {
    const isChecked = e.target.checked;
    if (isChecked) {
      setFcmTokenStatus("connecting...");
      const token = await requestPermission();
      if (token) {
        setPushEnabled(true);
        setFcmTokenStatus("connected");
      } else {
        setPushEnabled(false);
        setFcmTokenStatus("failed or denied");
      }
    } else {
      // Browsers don't let you easily "revoke" permission via code,
      // but we can turn off the toggle in our UI state.
      setPushEnabled(false);
      setFcmTokenStatus("disabled");
    }
  };

  // Integration Details array remains unchanged

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
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h1 className="module-title">Settings</h1>
              <HelpTooltip module="settings" />
            </div>
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
              <button className="btn btn-primary btn-sm" style={{ alignSelf: "flex-start" }} onClick={async () => {
                try {
                  await fetch('/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ profile })
                  });
                  alert('Profile saved!');
                } catch (err) {
                  console.error('Failed to save profile:', err);
                  alert('Failed to save profile');
                }
              }}>Save</button>
            </div>
          </div>
        </div>

        {/* Design Editor */}
        <div className="card">
          <h3 className="h4" style={{ marginBottom: 16 }}>Vibe-Driven Design Engine</h3>
          <p className="caption" style={{ marginBottom: 16 }}>
            Edit the <code>DESIGN.md</code> configuration to instantly update the Omni-Hub&apos;s aesthetic. The 60-30-10 color rule and C.R.A.P principles are enforced globally.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <textarea
              className="input mono"
              style={{ minHeight: "250px", resize: "vertical", fontSize: "12px", lineHeight: "1.4", background: "var(--bg-tertiary)" }}
              value={designContent}
              onChange={e => setDesignContent(e.target.value)}
            />
            <button 
              className="btn btn-primary btn-sm" 
              style={{ alignSelf: "flex-end" }} 
              onClick={saveDesign}
              disabled={isSavingDesign}
            >
              {isSavingDesign ? "Syncing Matrix..." : "Sync UI Matrix"}
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="card">
          <h3 className="h4" style={{ marginBottom: 16 }}>Notification Preferences</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div className="body">Push Notifications</div>
                <div className="caption">Receive alerts from Sentinel and agent updates via FCM</div>
                <div className="caption" style={{ marginTop: 4 }}>
                  Status: <span style={{ color: fcmTokenStatus === "connected" ? "var(--success)" : "var(--text-secondary)" }}>{fcmTokenStatus}</span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span className="badge badge-warning">Requires PWA</span>
                <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={pushEnabled}
                    onChange={handlePushToggle}
                    disabled={fcmTokenStatus === "unsupported"}
                    style={{ width: 16, height: 16, accentColor: "var(--primary)" }}
                  />
                  <span style={{ marginLeft: 8 }} className="body-sm">{pushEnabled ? "Enabled" : "Disabled"}</span>
                </label>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div className="body">Cost Alerts</div>
                <div className="caption">Notify when spending exceeds threshold</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span className="caption">$</span>
                  <input
                    type="number"
                    className="input"
                    style={{ width: 60, padding: "4px 8px" }}
                    value={notificationPrefs.costThreshold}
                    onChange={handleThresholdChange}
                  />
                </div>
                <input type="checkbox" checked={notificationPrefs.costAlerts} onChange={() => handlePrefToggle('costAlerts')} />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div className="body">Health Alerts</div>
                <div className="caption">Notify when services go down</div>
              </div>
              <input type="checkbox" checked={notificationPrefs.healthAlerts} onChange={() => handlePrefToggle('healthAlerts')} />
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div className="body">Agent Proposals</div>
                <div className="caption">Notify when Conductor suggests new agents</div>
              </div>
              <input type="checkbox" checked={notificationPrefs.agentProposals} onChange={() => handlePrefToggle('agentProposals')} />
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div className="body">Meeting Summaries</div>
                <div className="caption">Notify after meetings are processed</div>
              </div>
              <input type="checkbox" checked={notificationPrefs.meetingSummaries} onChange={() => handlePrefToggle('meetingSummaries')} />
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div className="body">EventArc Webhooks</div>
                <div className="caption">Receive automated pushes from GCP EventArc</div>
              </div>
              <input type="checkbox" checked={!!notificationPrefs.eventArc} onChange={() => handlePrefToggle('eventArc')} />
            </div>
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

        {/* API Configurations */}
        <div className="card">
          <h3 className="h4" style={{ marginBottom: 16 }}>API Configurations</h3>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div className="body">Plaid Environment</div>
              <div className="caption">Switch between Sandbox and Development keys</div>
              {isSavingPlaid && <div className="caption" style={{ color: "var(--accent)" }}>Saving...</div>}
            </div>
            <div style={{ display: "flex", gap: 8, background: "var(--bg-tertiary)", padding: 4, borderRadius: "var(--radius-md)" }}>
              <button 
                className={`btn btn-sm ${plaidEnv === 'sandbox' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => savePlaidEnv('sandbox')}
              >
                Sandbox
              </button>
              <button 
                className={`btn btn-sm ${plaidEnv === 'development' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => savePlaidEnv('development')}
              >
                Development
              </button>
            </div>
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
            {installed ? (
              <span className="badge badge-success" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Installed
              </span>
            ) : (
              <button
                className="btn btn-primary btn-sm"
                disabled={!deferredPrompt}
                onClick={handleInstallClick}
              >
                Install
              </button>
            )}
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
              ["GCP Project", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "antigravity-hub-jcloud"],
              ["Region", "us-central1"],
              ["Service Account", `gravix-hub@${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "antigravity-hub-jcloud"}.iam.gserviceaccount.com`],
              ["Version", "1.0.0"],
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
