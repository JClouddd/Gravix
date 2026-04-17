"use client";

import { useState, useEffect } from "react";

/**
 * Finance Module
 * Income tracker + Cost dashboard + Credit allocation
 */
const TABS = ["Overview", "By Model", "By Agent"];

export default function FinanceModule() {
  const [activeTab, setActiveTab] = useState("Overview");
  const [summary, setSummary] = useState(null);
  const [breakdown, setBreakdown] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/costs/summary").then((r) => r.json()),
      fetch("/api/costs/breakdown").then((r) => r.json()),
    ])
      .then(([summaryData, breakdownData]) => {
        setSummary(summaryData);
        setBreakdown(breakdownData);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching finance data:", err);
        setError(true);
        setLoading(false);
      });
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
      </div>
    );
  }

  return (
    <div>
      <div className="module-header">
        <div className="module-header-left">
          <div className="module-icon" style={{ background: "var(--success-subtle)" }}>💰</div>
          <div>
            <h1 className="module-title">Finance</h1>
            <p className="module-subtitle">Income, API costs, and credit allocation</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="badge badge-error" style={{ marginBottom: 24, alignSelf: "flex-start", padding: "8px 12px" }}>
          Failed to load finance data.
        </div>
      )}

      {/* Tabs */}
      <div style={{
        display: "flex",
        gap: 4,
        marginBottom: 24,
        borderBottom: "1px solid var(--card-border)",
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

      {activeTab === "Overview" && (
        <OverviewTab summary={summary} breakdown={breakdown} />
      )}

      {activeTab === "By Model" && (
        <ByModelTab breakdown={breakdown} />
      )}

      {activeTab === "By Agent" && (
        <ByAgentTab breakdown={breakdown} />
      )}
    </div>
  );
}

function AnimatedCounter({ value }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 1000;
    const increment = value / (duration / 16);

    // Use setTimeout to avoid synchronous setState warning
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(start);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value]);

  return <span>${displayValue.toFixed(2)}</span>;
}

function ByModelTab({ breakdown }) {
  const models = breakdown?.perModel || {};
  const modelKeys = Object.keys(models);

  if (modelKeys.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <p className="empty-state-title">No API usage yet</p>
          <p className="empty-state-desc">
            Per-model cost breakdown will appear once API calls start flowing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid-3" style={{ marginBottom: 24 }}>
      {modelKeys.map((modelKey) => {
        const data = models[modelKey];
        const displayName = modelKey.charAt(0).toUpperCase() + modelKey.slice(1);
        return (
          <div key={modelKey} className="card-glass">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div className="h3">{displayName}</div>
              <div className="badge badge-accent">Model</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="text-secondary">Calls</span>
                <span className="mono">{data.calls.toLocaleString()}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="text-secondary">Tokens</span>
                <span className="mono">{data.tokens?.toLocaleString() || 0}</span>
              </div>
            </div>

            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--card-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="caption">Total Cost</span>
              <span className="h3" style={{ color: "var(--accent)" }}>${data.cost.toFixed(4)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ByAgentTab({ breakdown }) {
  const agents = breakdown?.perAgent || {};
  const agentKeys = Object.keys(agents);

  if (agentKeys.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-icon">🤖</div>
          <p className="empty-state-title">No Agent usage yet</p>
          <p className="empty-state-desc">
            Per-agent cost breakdown will appear once agents start executing tasks.
          </p>
        </div>
      </div>
    );
  }

  const maxCost = Math.max(...agentKeys.map(k => agents[k].cost || 0), 0.0001); // avoid div by zero

  const getCostColor = (cost) => {
    if (cost < 1) return "var(--success)";
    if (cost < 10) return "var(--warning)";
    return "var(--error)";
  };

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <div className="h3" style={{ marginBottom: 16 }}>Per-Agent Cost</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {agentKeys.map((agentKey) => {
          const data = agents[agentKey];
          const displayName = agentKey.charAt(0).toUpperCase() + agentKey.slice(1);
          const costColor = getCostColor(data.cost);
          const pct = Math.min((data.cost / maxCost) * 100, 100);

          return (
            <div key={agentKey} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 2, background: `var(--agent-${agentKey.toLowerCase()}, var(--accent))` }} />
                  <span style={{ fontWeight: 500, fontSize: 14 }}>{displayName}</span>
                  <span className="caption" style={{ color: "var(--text-secondary)" }}>
                    {data.invocations?.toLocaleString() || 0} calls
                  </span>
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: costColor }}>
                  ${data.cost.toFixed(4)}
                </div>
              </div>
              <div style={{ height: 6, background: "var(--bg-tertiary)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: costColor, borderRadius: 3, transition: "width 0.6s var(--ease-out)" }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OverviewTab({ summary, breakdown }) {
  const totalSpendCurrentMonth = summary?.totalSpendCurrentMonth || 0;
  const totalThisWeek = summary?.totalThisWeek || 0;
  const averageDailyCost = summary?.averageDailyCost || 0;
  const totalCalls = summary?.totalCalls || 0;
  const topRoute = summary?.topRoute || "N/A";
  const budget = summary?.budget || { limit: 1000, used: 0, remaining: 1000 };
  const perRoute = breakdown?.perRoute || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, marginBottom: 24 }}>
      <div className="grid-3">
        <div className="card" style={{ padding: 20 }}>
          <div className="caption" style={{ marginBottom: 6 }}>Monthly Spend</div>
          <div className="h2" style={{ color: "var(--error)" }}>
            <AnimatedCounter value={totalSpendCurrentMonth} />
          </div>
          <div className="caption" style={{ marginTop: 4, display: "flex", justifyContent: "space-between" }}>
            <span>Week: ${totalThisWeek.toFixed(2)}</span>
            <span>Avg/Day: ${averageDailyCost.toFixed(2)}</span>
          </div>
        </div>

        <GaugeCard
          title="Budget Remaining"
          remaining={budget.remaining}
          used={budget.used}
          total={budget.limit}
          color="var(--accent)"
        />

        <div className="card" style={{ padding: 20 }}>
          <div className="caption" style={{ marginBottom: 6 }}>Usage Stats</div>
          <div className="h2" style={{ color: "var(--info)" }}>
            {totalCalls.toLocaleString()}
          </div>
          <div className="caption" style={{ marginTop: 4 }}>
            Top Route: {topRoute}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="h3" style={{ marginBottom: 16 }}>Per-Route Breakdown</div>
        {perRoute.length === 0 ? (
          <div className="text-secondary" style={{ fontSize: 14 }}>No route data available.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--card-border)", textAlign: "left" }}>
                  <th style={{ padding: "12px 8px", color: "var(--text-secondary)", fontWeight: 500 }}>Route</th>
                  <th style={{ padding: "12px 8px", color: "var(--text-secondary)", fontWeight: 500 }}>Calls</th>
                  <th style={{ padding: "12px 8px", color: "var(--text-secondary)", fontWeight: 500 }}>Cost</th>
                </tr>
              </thead>
              <tbody>
                {perRoute.map((r) => (
                  <tr key={r.route} style={{ borderBottom: "1px solid var(--card-border)" }}>
                    <td style={{ padding: "12px 8px", display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="status-dot" style={{ background: "var(--accent)" }} />
                      {r.route}
                    </td>
                    <td style={{ padding: "12px 8px", fontFamily: "var(--font-mono)" }}>
                      {r.calls.toLocaleString()}
                    </td>
                    <td style={{ padding: "12px 8px", fontFamily: "var(--font-mono)", color: "var(--error)" }}>
                      ${r.cost.toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function GaugeCard({ title, remaining, used, total, color }) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;

  return (
    <div className="card" style={{ padding: 20 }}>
      <div className="caption" style={{ marginBottom: 6 }}>{title}</div>
      <div className="h2" style={{ color }}>
        ${remaining.toFixed(2)}
      </div>
      <div className="caption" style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
        <span>Used: ${used.toFixed(2)}</span>
        <span>Total: ${total.toFixed(0)}</span>
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
