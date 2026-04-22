"use client";

import { useState, useEffect } from "react";
import HelpTooltip from "@/components/HelpTooltip";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";


/**
 * Home / Dashboard Module
 * Live data from API routes — credit bar, agent summary, recent activity
 */
export default function HomeModule({ setActiveModule }) {
  const [agents, setAgents] = useState([]);
  const [costs, setCosts] = useState(null);
  const [knowledge, setKnowledge] = useState(null);
  const [julesTasks, setJulesTasks] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [healthData, setHealthData] = useState(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Activity Feed state
  const [activityFeed, setActivityFeed] = useState([]);
  const [feedError, setFeedError] = useState(null);
  const [showAllFeed, setShowAllFeed] = useState(false);

  const fetchHealth = () => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((data) => setHealthData(data))
      .catch((err) => console.error("Health fetch error:", err));
  };

  const fetchActivityFeed = () => {
    fetch("/api/activity/feed")
      .then((r) => r.json())
      .then((data) => {
        if (data.feed) setActivityFeed(data.feed);
      })
      .catch((err) => {
        console.error("Activity feed fetch error:", err);
        setFeedError(err.message);
      });
  };

  useEffect(() => {
    let timeoutId;
    if (searchQuery.length >= 2) {
      timeoutId = setTimeout(() => {
        setIsSearching(true);
        setShowSearchDropdown(true);
        fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
          .then((r) => r.json())
          .then((data) => {
            setSearchResults(data.results || []);
            setIsSearching(false);
          })
          .catch((err) => {
            console.error("Search error:", err);
            setIsSearching(false);
          });
      }, 300);
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchResults([]);
      setShowSearchDropdown(false);
    }
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

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
    fetchActivityFeed();
  }, []);

useEffect(() => {
    // Listen for live workspace webhooks (emails/events)
    const q = query(collection(db, "workspace_webhooks"), orderBy("timestamp", "desc"), limit(5));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Find new docs
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();

          // Construct feed item based on the webhook payload
          const newItem = {
            type: "workspace",
            icon: data.type === "email" ? "✉️" : "📅",
            title: data.type === "email" ? `New Email: ${data.subject || "No Subject"}` : `New Event: ${data.summary || "No Summary"}`,
            description: data.snippet || data.description || "Received via Workspace Webhook",
            timestamp: data.timestamp || new Date().toISOString()
          };

          // Prepend to activity feed
          setActivityFeed((prevFeed) => {
            // Check if already in feed to prevent duplicates
            const exists = prevFeed.some(item =>
              item.title === newItem.title && item.timestamp === newItem.timestamp
            );
            if (!exists) {
              const newFeed = [newItem, ...prevFeed];
              // Keep only max 15 items
              return newFeed.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 15);
            }
            return prevFeed;
          });
        }
      });
    }, (err) => {
      console.error("Webhook listener error:", err);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Listen for new client emails
    const emailQ = query(collection(db, "client_emails"), orderBy("timestamp", "desc"), limit(5));
    const unsubEmail = onSnapshot(emailQ, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          const newItem = {
            type: "email",
            icon: "✉️",
            title: `Email: ${data.subject || "No Subject"}`,
            description: data.snippet || "New incoming email",
            timestamp: data.timestamp || new Date().toISOString()
          };
          setActivityFeed(prev => {
            if (!prev.some(item => item.title === newItem.title && item.timestamp === newItem.timestamp)) {
              return [newItem, ...prev].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 15);
            }
            return prev;
          });
        }
      });
    }, (err) => console.error(err));

    return () => {
      unsubEmail();
    };
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
      {/* Search Bar */}
      <div style={{ position: "relative", marginBottom: "24px", zIndex: 100 }}>
        <div style={{ position: "relative", width: "100%", maxWidth: "600px", margin: "0 auto" }}>
          <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "18px", color: "var(--text-secondary)" }}>
            🔍
          </span>
          <input
            type="text"
            className="input w-full"
            placeholder="Search agents, docs, clients, or commands..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchQuery.length >= 2) setShowSearchDropdown(true);
            }}
            onBlur={() => {
              // Delay hiding to allow clicks
              setTimeout(() => setShowSearchDropdown(false), 200);
            }}
            style={{ paddingLeft: "40px", fontSize: "16px" }}
          />
        </div>

        {showSearchDropdown && (
          <div className="card" style={{
            position: "absolute",
            top: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "100%",
            maxWidth: "600px",
            marginTop: "8px",
            maxHeight: "400px",
            overflowY: "auto",
            zIndex: 1000,
            padding: "8px 0"
          }}>
            {isSearching ? (
              <div style={{ padding: "16px", textAlign: "center", color: "var(--text-secondary)" }}>
                Searching...
              </div>
            ) : searchResults.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {searchResults.map((result, idx) => (
                  <div
                    key={`${result.action}-${idx}`}
                    style={{
                      padding: "12px 16px",
                      display: "flex",
                      gap: "12px",
                      alignItems: "center",
                      cursor: "pointer",
                      borderBottom: idx < searchResults.length - 1 ? "1px solid var(--card-border)" : "none"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--bg-secondary)"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                    onClick={() => {
                      setSearchQuery("");
                      setShowSearchDropdown(false);
                      // In a real app we'd use Next.js router or a context action,
                      // but since we are relying on window location hash or top-level layout state,
                      // let's simulate navigation via a hash change or a global event, or just simple href update
                      // Looking at CommandPalette.js, it seems to take `setActiveModule` as a prop.
                      // Since we don't have setActiveModule passed to HomeModule,
                      // let's just trigger a hash change if Gravix uses it, or log a useful message for the user
                      // that handles module switching.
                      // Actually, let's just set window.location.hash = result.module
                      if (setActiveModule && result.module) {
                        setActiveModule(result.module);
                      }
                    }}
                  >
                    <span style={{ fontSize: "20px" }}>{result.icon}</span>
                    <div>
                      <div className="body-sm" style={{ fontWeight: 600 }}>{result.title}</div>
                      <div className="caption" style={{ color: "var(--text-secondary)" }}>
                        {result.type} • {result.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: "16px", textAlign: "center", color: "var(--text-secondary)" }}>
                No results found for &quot;{searchQuery}&quot;
              </div>
            )}
          </div>
        )}
      </div>

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
            <button className="btn btn-secondary btn-sm w-full" style={{ justifyContent: "flex-start" }} onClick={() => setActiveModule && setActiveModule("knowledge")}>
              📝 Ingest a Document
            </button>
            <button className="btn btn-secondary btn-sm w-full" style={{ justifyContent: "flex-start" }} onClick={() => setActiveModule && setActiveModule("agents")}>
              💬 Chat with Scholar
            </button>
            <button className="btn btn-secondary btn-sm w-full" style={{ justifyContent: "flex-start" }} onClick={() => setActiveModule && setActiveModule("colab")}>
              📊 Run Analysis Notebook
            </button>
            <button className="btn btn-secondary btn-sm w-full" style={{ justifyContent: "flex-start" }} onClick={() => setActiveModule && setActiveModule("agents")}>
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
            {/* GCP Uptime Checks */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--bg-secondary)", borderRadius: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className={`status-dot online`} />
                <span className="body-sm" style={{ fontWeight: 500 }}>GCP Uptime Checks</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span className="caption" style={{ color: "var(--text-secondary)" }}>
                  {healthData.uptime || "Operational"}
                </span>
              </div>
            </div>

            {/* Cloud Error Reporting */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--bg-secondary)", borderRadius: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className={`status-dot ${healthData.status === "healthy" ? "online" : "offline"}`} />
                <span className="body-sm" style={{ fontWeight: 500 }}>Cloud Error Reporting</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span className="caption" style={{ color: "var(--text-secondary)" }}>
                  Active Alerts: {healthData.status === "healthy" ? 0 : 1}
                </span>
              </div>
            </div>

            {/* Dynamic Services (including Jules CI/CD pipeline mapped from backend) */}
            {Object.entries(healthData.services || {}).map(([serviceName, data]) => {
              const dotClass = data.status === "pass" ? "online" : "offline";
              let extraMeta = null;
              if (serviceName === "jules") {
                extraMeta = `Pipelines: ${data.pipelines || 0}`;
              }

              return (
                <div key={serviceName} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--bg-secondary)", borderRadius: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, textTransform: "capitalize" }}>
                    <span className={`status-dot ${dotClass}`} />
                    <span className="body-sm" style={{ fontWeight: 500 }}>
                       {serviceName === "jules" ? "Jules CI/CD Pipeline" : serviceName}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    {extraMeta && (
                      <span className="caption" style={{ color: "var(--text-secondary)", marginRight: 8 }}>
                        {extraMeta}
                      </span>
                    )}
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
            <p className="empty-state-title" style={{ color: "var(--error)" }}>Failed to load task activity</p>
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
            <p className="empty-state-title">No task activity yet</p>
            <p className="empty-state-desc">
              Task activity will appear here.
            </p>
          </div>
        )}
      </div>

      {/* Activity Feed */}
      <div className="card" style={{ marginTop: 24 }}>
        <h3 className="h4" style={{ marginBottom: 16 }}>System Activity Feed</h3>
        {feedError ? (
          <div className="empty-state" style={{ padding: "20px" }}>
            <div className="empty-state-icon" style={{ color: "var(--error)" }}>⚠️</div>
            <p className="empty-state-title" style={{ color: "var(--error)" }}>Failed to load activity feed</p>
            <p className="empty-state-desc">{feedError}</p>
          </div>
        ) : activityFeed && activityFeed.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {(showAllFeed ? activityFeed.slice(0, 15) : activityFeed.slice(0, 5)).map((item, idx) => {
              const date = new Date(item.timestamp);
              const isToday = date.toDateString() === new Date().toDateString();
              const timeString = isToday
                ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

              return (
                <div key={idx} style={{ display: "flex", gap: "16px" }}>
                  <div style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    background: "var(--bg-secondary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "20px",
                    flexShrink: 0
                  }}>
                    {item.icon}
                  </div>
                  <div style={{ flex: 1, borderBottom: idx < (showAllFeed ? Math.min(activityFeed.length, 15) : Math.min(activityFeed.length, 5)) - 1 ? "1px solid var(--card-border)" : "none", paddingBottom: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                      <span className="body-sm" style={{ fontWeight: 600 }}>{item.title}</span>
                      <span className="caption" style={{ color: "var(--text-tertiary)" }}>{timeString}</span>
                    </div>
                    <div className="caption" style={{ color: "var(--text-secondary)" }}>
                      {item.description}
                    </div>
                  </div>
                </div>
              );
            })}
            {activityFeed.length > 5 && !showAllFeed && (
              <button
                className="btn btn-secondary btn-sm"
                style={{ alignSelf: "center", marginTop: "8px" }}
                onClick={() => setShowAllFeed(true)}
              >
                Show More Activity
              </button>
            )}
            {showAllFeed && (
              <button
                className="btn btn-secondary btn-sm"
                style={{ alignSelf: "center", marginTop: "8px" }}
                onClick={() => setShowAllFeed(false)}
              >
                Show Less
              </button>
            )}
          </div>
        ) : (
          <div className="empty-state" style={{ padding: "40px 20px" }}>
            <div className="empty-state-icon">📡</div>
            <p className="empty-state-title">No activity yet</p>
            <p className="empty-state-desc">
              System events, routing logs, and data ingestion will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Credit Card Sub-component ─────────────────────────────── */
function CreditCard({ title, used: rawUsed, total: rawTotal, unit, color, label }) {
  const used = typeof rawUsed === "number" && !isNaN(rawUsed) ? rawUsed : (parseFloat(rawUsed) || 0);
  const total = typeof rawTotal === "number" && !isNaN(rawTotal) ? rawTotal : (parseFloat(rawTotal) || 1);
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;

  return (
    <div className="card" style={{ padding: "20px" }}>
      <div className="caption" style={{ marginBottom: 8 }}>{title}</div>
      <div className="h2" style={{ color }}>
        {unit}{unit === "$" ? Number(used).toFixed(2) : used}
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
