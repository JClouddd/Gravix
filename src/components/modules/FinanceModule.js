"use client";

import { useState, useEffect } from "react";
import HelpTooltip from "@/components/HelpTooltip";

/**
 * Finance Module
 * Income tracker + Cost dashboard + Credit allocation
 */
const TABS = ["Overview", "By Model", "By Agent"];

export default function FinanceModule() {
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState("Overview");
  const [summary, setSummary] = useState(null);
  const [breakdown, setBreakdown] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [credits, setCredits] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/costs/summary").then((r) => r.json()),
      fetch("/api/costs/breakdown").then((r) => r.json()),
      fetch("/api/costs/history?period=30d&groupBy=day").then((r) => r.json()),
      fetch("/api/costs/credits").then((r) => r.json()),
    ])
      .then(([summaryData, breakdownData, historyRes, creditsRes]) => {
        setSummary(summaryData);
        setBreakdown(breakdownData);
        setHistoryData(historyRes);
        setCredits(creditsRes);
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
        <OverviewTab summary={summary} historyData={historyData} credits={credits} breakdown={breakdown} />
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

function OverviewTab({ summary, credits, historyData, breakdown }) {
  const [stockTicker, setStockTicker] = useState("");
  const [stockRunning, setStockRunning] = useState(false);
  const [stockResult, setStockResult] = useState(null);

  const handleRunStockAnalysis = async (e) => {
    e.preventDefault();
    if (!stockTicker) return;
    setStockRunning(true);
    setStockResult(null);
    try {
      const response = await fetch("/api/colab/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notebookId: "stock_analysis",
          parameters: { ticker: stockTicker, period: "1y" }
        })
      });
      const data = await response.json();
      setStockResult(data);
    } catch (err) {
      setStockResult({ error: err.message });
    } finally {
      setStockRunning(false);
    }
  };

  const totalSpend = summary?.totalSpend || 0;

  // Calculate projected cost dynamically
  const now = new Date();
  const currentDay = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projectedCost = currentDay > 0 ? (totalSpend / currentDay) * daysInMonth : 0;

  const cloudCredit = credits?.cloudCredit || { total: 100, used: 0, remaining: 100 };
  const genaiCredit = credits?.genaiCredit || { total: 1000, used: 0, remaining: 1000 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 className="h4">Quick Actions</h3>
          <div style={{ position: 'relative' }}>
             <button className="btn btn-secondary btn-sm" onClick={() => setShowExportDropdown(!showExportDropdown)} >Export Reports ▾</button>
             {showExportDropdown && (
               <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-md)', padding: '8px', minWidth: '180px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '4px' }}>
               <button className="btn btn-ghost btn-sm" style={{ textAlign: 'left', width: '100%' }} onClick={() => window.open('/api/export?type=costs&format=csv')}>Export Costs CSV</button>
               <button className="btn btn-ghost btn-sm" style={{ textAlign: 'left', width: '100%' }} onClick={() => window.open('/api/export?type=income&format=csv')}>Export Income CSV</button>
               <button className="btn btn-ghost btn-sm" style={{ textAlign: 'left', width: '100%' }} onClick={() => window.open('/api/export?type=finance_full&format=json')}>Export Full Report JSON</button>
               </div>
             )}
          </div>
        </div>
        <form onSubmit={handleRunStockAnalysis} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <input
            type="text"
            className="input"
            placeholder="Ticker (e.g. AAPL)"
            value={stockTicker}
            onChange={e => setStockTicker(e.target.value)}
            style={{ maxWidth: 200 }}
            required
          />
          <button type="submit" className="btn btn-primary" disabled={stockRunning}>
            {stockRunning ? "Running..." : "Run Stock Analysis"}
          </button>
        </form>
        {stockResult && (
          <div style={{ marginTop: 16, padding: 16, background: "var(--bg-secondary)", borderRadius: "var(--radius-md)", border: "1px solid var(--card-border)" }}>
            {stockResult.error ? (
              <div className="badge badge-error">Error: {stockResult.error}</div>
            ) : (
              <div>
                <p className="body-sm" style={{ fontWeight: 600, marginBottom: 8 }}>Analysis for {stockTicker.toUpperCase()}:</p>
                {stockResult.executionTime && <p className="body-sm" style={{ color: "var(--text-tertiary)", marginBottom: 8 }}>Time: {(stockResult.executionTime / 1000).toFixed(2)}s</p>}
                <div style={{ overflowX: "auto" }}>
                  <pre className="body-sm" style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                    {typeof stockResult.results === 'object' ? JSON.stringify(stockResult.results, null, 2) : stockResult.results}
                  </pre>
                </div>
                {stockResult.chartUrls && stockResult.chartUrls.length > 0 && (
                  <div style={{ marginTop: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {stockResult.chartUrls.map((url, i) => (
                      <img key={i} src={url} alt={`Chart ${i+1}`} style={{ maxWidth: '100%', borderRadius: "var(--radius-md)" }} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid-3">
        <div className="card" style={{ padding: 20 }}>
          <div className="caption" style={{ marginBottom: 6 }}>Monthly Spend</div>
          <div className="h2" style={{ color: "var(--error)" }}>
            <AnimatedCounter value={totalSpend} />
          </div>
          <div className="caption" style={{ marginTop: 4 }}>
            Projected: ${projectedCost.toFixed(2)}
          </div>
        </div>

        <CircularGaugeCard
          title="Cloud Credit"
          total={cloudCredit.total}
          used={cloudCredit.used}
        />

        <CircularGaugeCard
          title="GenAI Credit"
          total={genaiCredit.total}
          used={genaiCredit.used}
        />
      </div>

      <CostTrendsChart historyData={historyData} />

      <PerApiBreakdownTable breakdown={breakdown} />

    </div>
  );
}

function PerApiBreakdownTable({ breakdown }) {
  const routes = breakdown?.perRoute || [];

  if (routes.length === 0) {
    return null;
  }

  // Sort by cost descending
  const sortedRoutes = [...routes].sort((a, b) => b.cost - a.cost);

  return (
    <div className="card">
      <div className="h3" style={{ marginBottom: 16 }}>Per-API Breakdown</div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--card-border)", color: "var(--text-secondary)" }}>
              <th style={{ padding: "12px 8px", fontWeight: 500 }}>Route</th>
              <th style={{ padding: "12px 8px", fontWeight: 500, textAlign: "right" }}>Calls</th>
              <th style={{ padding: "12px 8px", fontWeight: 500, textAlign: "right" }}>Avg Cost</th>
              <th style={{ padding: "12px 8px", fontWeight: 500, textAlign: "right" }}>Total Cost</th>
            </tr>
          </thead>
          <tbody>
            {sortedRoutes.map((r, i) => {
              const avgCost = r.calls > 0 ? r.cost / r.calls : 0;
              return (
                <tr key={r.route} style={{ borderBottom: i === sortedRoutes.length - 1 ? "none" : "1px solid var(--card-border)" }}>
                  <td style={{ padding: "12px 8px" }}><span className="badge" style={{ background: "var(--bg-tertiary)" }}>{r.route}</span></td>
                  <td style={{ padding: "12px 8px", textAlign: "right" }}>{r.calls.toLocaleString()}</td>
                  <td style={{ padding: "12px 8px", textAlign: "right", color: "var(--text-secondary)" }}>${avgCost.toFixed(5)}</td>
                  <td style={{ padding: "12px 8px", textAlign: "right", color: "var(--accent)", fontWeight: 600 }}>${r.cost.toFixed(4)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CostTrendsChart({ historyData }) {
  if (!historyData || !historyData.history || historyData.history.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-icon">📈</div>
          <p className="empty-state-title">No Cost Data</p>
          <p className="empty-state-desc">Waiting for API usage to populate trends.</p>
        </div>
      </div>
    );
  }

  const history = [...historyData.history].reverse(); // oldest to newest for left-to-right
  const maxCost = Math.max(...history.map(d => d.totalCost), 0.01); // avoid division by zero

  return (
    <div className="card">
      <div className="h3" style={{ marginBottom: 16 }}>Cost Trends</div>
      <div style={{ display: "flex", alignItems: "flex-end", height: 200, gap: 4, paddingBottom: 24, position: "relative" }}>
        {history.map((day, i) => {
          const heightPct = (day.totalCost / maxCost) * 100;
          return (
            <div
              key={day.date}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                position: "relative",
                height: "100%",
                group: "bar"
              }}
              title={`${day.date}: $${day.totalCost.toFixed(4)}`}
            >
              <div
                style={{
                  width: "100%",
                  height: `${heightPct}%`,
                  background: "var(--accent)",
                  borderRadius: "4px 4px 0 0",
                  minHeight: day.totalCost > 0 ? 2 : 0,
                  transition: "height 0.3s ease",
                  cursor: "pointer"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = "var(--accent-hover)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "var(--accent)";
                }}
              />
              {/* Show dates sparsely */}
              {i % Math.ceil(history.length / 5) === 0 && (
                <div style={{
                  position: "absolute",
                  bottom: -20,
                  left: "50%",
                  transform: "translateX(-50%)",
                  fontSize: 10,
                  color: "var(--text-secondary)",
                  whiteSpace: "nowrap"
                }}>
                  {day.date.slice(5)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CircularGaugeCard({ title, total, used }) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  let color = "var(--success)";
  if (pct >= 80) color = "var(--error)";
  else if (pct >= 50) color = "var(--warning)";

  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div className="card" style={{ padding: 20, display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{ position: "relative", width: 80, height: 80 }}>
        <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: "rotate(-90deg)" }}>
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="transparent"
            stroke="var(--bg-tertiary)"
            strokeWidth="6"
          />
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.6s var(--ease-out)" }}
          />
        </svg>
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          fontWeight: 600
        }}>
          {Math.round(pct)}%
        </div>
      </div>
      <div>
        <div className="h4">{title}</div>
        <div className="caption" style={{ marginTop: 4 }}>
          Used: ${used.toFixed(2)}<br/>
          Total: ${total.toFixed(0)}
        </div>
      </div>
    </div>
  );
}
