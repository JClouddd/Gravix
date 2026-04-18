"use client";

import { useState, useEffect } from "react";
import HelpTooltip from "@/components/HelpTooltip";

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
      .catch((error) => {
        console.error("Error fetching finance data:", error);
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
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h1 className="module-title">Finance</h1>
              <HelpTooltip module="finance" />
            </div>
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
        <OverviewTab summary={summary} />
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
                <span className="text-secondary">Input Tokens</span>
                <span className="mono">{data.inputTokens?.toLocaleString() || 0}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="text-secondary">Output Tokens</span>
                <span className="mono">{data.outputTokens?.toLocaleString() || 0}</span>
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

  const getCostColor = (cost) => {
    if (cost < 1) return "var(--success)";
    if (cost < 10) return "var(--warning)";
    return "var(--error)";
  };

  return (
    <div className="grid-auto" style={{ marginBottom: 24 }}>
      {agentKeys.map((agentKey) => {
        const data = agents[agentKey];
        const displayName = agentKey.charAt(0).toUpperCase() + agentKey.slice(1);
        const costColor = getCostColor(data.cost);

        return (
          <div key={agentKey} className="card" style={{ borderLeft: `3px solid var(--agent-${agentKey.toLowerCase()}, var(--accent))` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div className="h4">{displayName}</div>
              <div className="badge" style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}>
                {data.invocations.toLocaleString()} calls
              </div>
            </div>

            <div>
              <div className="caption" style={{ marginBottom: 4 }}>Total Cost</div>
              <div className="h2" style={{ color: costColor }}>
                ${data.cost.toFixed(4)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OverviewTab({ summary }) {
  const totalSpend = summary?.totalSpend || 0;

  // Calculate projected cost dynamically
  const now = new Date();
  const currentDay = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projectedCost = currentDay > 0 ? (totalSpend / currentDay) * daysInMonth : 0;

  const cloudTotal = summary?.credits?.cloud?.total || 100;
  const cloudUsed = summary?.credits?.cloud?.used || 0;
  const cloudRemaining = Math.max(0, cloudTotal - cloudUsed);
  const cloudPct = cloudTotal > 0 ? Math.min((cloudUsed / cloudTotal) * 100, 100) : 0;

  const genaiTotal = summary?.credits?.genai?.total || 1000;
  const genaiUsed = summary?.credits?.genai?.used || 0;
  const genaiRemaining = Math.max(0, genaiTotal - genaiUsed);
  const genaiPct = genaiTotal > 0 ? Math.min((genaiUsed / genaiTotal) * 100, 100) : 0;

  return (
    <div className="grid-3" style={{ marginBottom: 24 }}>
      <div className="card" style={{ padding: 20 }}>
        <div className="caption" style={{ marginBottom: 6 }}>Monthly Spend</div>
        <div className="h2" style={{ color: "var(--error)" }}>
          <AnimatedCounter value={totalSpend} />
        </div>
        <div className="caption" style={{ marginTop: 4 }}>
          Projected: ${projectedCost.toFixed(2)}
        </div>
      </div>

      <GaugeCard
        title="Cloud Credits Remaining"
        remaining={cloudRemaining}
        used={cloudUsed}
        total={cloudTotal}
        color="var(--info)"
      />

      <GaugeCard
        title="GenAI Credits Remaining"
        remaining={genaiRemaining}
        used={genaiUsed}
        total={genaiTotal}
        color="var(--accent)"
      />
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
