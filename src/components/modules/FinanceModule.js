"use client";

import { useState } from "react";

/**
 * Finance Module
 * Income tracker + Cost dashboard + Credit allocation
 */
const TABS = ["Overview", "Cost Breakdown", "Credits"];

export default function FinanceModule() {
  const [activeTab, setActiveTab] = useState("Overview");

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
        <div className="grid-3" style={{ marginBottom: 24 }}>
          <div className="card" style={{ padding: 20 }}>
            <div className="caption" style={{ marginBottom: 6 }}>Monthly Spend</div>
            <div className="h2" style={{ color: "var(--error)" }}>$0.00</div>
            <div className="caption" style={{ marginTop: 4 }}>From credits — $0 out of pocket</div>
          </div>
          <div className="card" style={{ padding: 20 }}>
            <div className="caption" style={{ marginBottom: 6 }}>Cloud Credits Remaining</div>
            <div className="h2" style={{ color: "var(--info)" }}>$100</div>
            <div className="caption" style={{ marginTop: 4 }}>Resets monthly</div>
          </div>
          <div className="card" style={{ padding: 20 }}>
            <div className="caption" style={{ marginBottom: 6 }}>GenAI Credits Remaining</div>
            <div className="h2" style={{ color: "var(--accent)" }}>$1,000</div>
            <div className="caption" style={{ marginTop: 4 }}>Resets monthly</div>
          </div>
        </div>
      )}

      {activeTab === "Cost Breakdown" && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <p className="empty-state-title">No API usage yet</p>
            <p className="empty-state-desc">
              Per-route and per-agent cost breakdown will appear once API calls start flowing.
            </p>
          </div>
        </div>
      )}

      {activeTab === "Credits" && (
        <div className="card">
          <h3 className="h4" style={{ marginBottom: 16 }}>Credit Allocation</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { name: "Google Cloud ($100/mo)", pct: 0, color: "var(--info)" },
              { name: "GenAI Credits ($1,000)", pct: 0, color: "var(--accent)" },
            ].map((credit) => (
              <div key={credit.name}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span className="body-sm">{credit.name}</span>
                  <span className="caption">{credit.pct}% used</span>
                </div>
                <div style={{ height: 8, background: "var(--bg-tertiary)", borderRadius: 4 }}>
                  <div
                    style={{
                      width: `${credit.pct}%`,
                      height: "100%",
                      background: credit.color,
                      borderRadius: 4,
                      transition: "width 0.6s var(--ease-out)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
