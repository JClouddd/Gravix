"use client";

import React, { useState, useEffect } from "react";
import DynamicRenderer from "@/components/DynamicRenderer";

export default function YouTubeModule() {
  const [matrixData, setMatrixData] = useState(null);
  const [marketSnapshot, setMarketSnapshot] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingCached, setLoadingCached] = useState(true);
  const [error, setError] = useState(null);
  const [expandedNiche, setExpandedNiche] = useState(null);
  const [focusArea, setFocusArea] = useState("");
  const [metadata, setMetadata] = useState(null);
  const [activeTab, setActiveTab] = useState("intelligence");
  const [apiCaps, setApiCaps] = useState(null);
  const [authStatus, setAuthStatus] = useState("disconnected");

  const loadCachedMatrix = async () => {
    try {
      const res = await fetch("/api/youtube/niche-matrix");
      if (!res.ok) return;
      const data = await res.json();
      if (data.status === "cached" && data.data) {
        setMatrixData(data.data);
        setMetadata(data.metadata);
        setMarketSnapshot(data.marketSnapshot || "");
        setApiCaps(data.vaultBaseline || null);
      }
    } catch (e) {} finally { setLoadingCached(false); }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("auth") === "success") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAuthStatus("connected");
      window.history.replaceState({}, document.title, window.location.pathname + "?module=youtube");
    }

    loadCachedMatrix();
  }, []);

  const generateNicheMatrix = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/youtube/niche-matrix", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ focusArea: focusArea.trim() || null, includeSubNiches: true, depth: "deep" }) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      const result = await res.json();
      setMatrixData(result.data?.niches || []);
      setMarketSnapshot(result.data?.marketSnapshot || "");
      setApiCaps(result.data?.apiCapabilities || null);
      setMetadata(result.metadata);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const compColor = (level) => {
    const m = { Low: { bg: "rgba(34,197,94,0.1)", c: "#86efac" }, Medium: { bg: "rgba(245,158,11,0.1)", c: "#fcd34d" }, High: { bg: "rgba(239,68,68,0.1)", c: "#fca5a5" }, "Very High": { bg: "rgba(239,68,68,0.2)", c: "#f87171" } };
    return m[level] || m["Medium"];
  };
  const trendIcon = (t) => { if (!t) return "—"; const l = t.toLowerCase(); if (l.includes("grow") || l.includes("emerg")) return "📈"; if (l.includes("stable")) return "➡️"; if (l.includes("declin")) return "📉"; return "🔄"; };

  const tabs = [
    { id: "intelligence", label: "Niche Intelligence", icon: "🧠" },
    { id: "pipeline", label: "Channel Pipeline", icon: "🚀" },
    { id: "analytics", label: "Analytics", icon: "📊" },
    { id: "quota", label: "Quota & API", icon: "⚡" },
  ];

  return (
    <div style={{ padding: "30px", height: "100%", overflowY: "auto", color: "#e2e8f0" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: "600", marginBottom: "6px", background: "linear-gradient(to right, #f97316, #ec4899)", WebkitBackgroundClip: "text", color: "transparent" }}>YouTube Factory</h1>
          <p style={{ color: "#94a3b8", fontSize: "0.875rem" }}>Hybrid Intelligence — Vault Baseline × Live Market Signal</p>
        </div>
        {authStatus === "disconnected" ? (
          <button onClick={() => (window.location.href = "/api/youtube/auth")} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: "500" }}>Connect YouTube</button>
        ) : (
          <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", color: "#86efac", padding: "10px 20px", borderRadius: "8px", fontWeight: "500" }}>✓ Connected</div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "24px", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "0" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ padding: "10px 20px", background: activeTab === t.id ? "rgba(255,255,255,0.06)" : "transparent", border: "none", borderBottom: activeTab === t.id ? "2px solid #a78bfa" : "2px solid transparent", color: activeTab === t.id ? "#e2e8f0" : "#64748b", cursor: "pointer", fontSize: "0.875rem", fontWeight: "500", transition: "all 0.2s" }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ═══ TAB: Niche Intelligence ═══ */}
      {activeTab === "intelligence" && (
        <>
          {/* Metric Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px", marginBottom: "24px" }}>
            <div className="card-glass" style={{ padding: "18px" }}><div style={{ color: "#94a3b8", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>Niches Found</div><div style={{ fontSize: "1.75rem", fontWeight: "bold" }}>{matrixData?.length || 0}</div></div>
            <div className="card-glass" style={{ padding: "18px" }}><div style={{ color: "#94a3b8", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>Data Sources</div><div style={{ fontSize: "1.75rem", fontWeight: "bold" }}>3</div><div style={{ color: "#a78bfa", fontSize: "0.75rem" }}>Vault + Tavily + Google</div></div>
            <div className="card-glass" style={{ padding: "18px" }}><div style={{ color: "#94a3b8", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>Research Time</div><div style={{ fontSize: "1.75rem", fontWeight: "bold" }}>{metadata?.researchTimeMs ? `${(metadata.researchTimeMs / 1000).toFixed(1)}s` : "—"}</div></div>
            <div className="card-glass" style={{ padding: "18px" }}><div style={{ color: "#94a3b8", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>Active Channels</div><div style={{ fontSize: "1.75rem", fontWeight: "bold" }}>0</div><div style={{ color: "#fbbf24", fontSize: "0.75rem" }}>Awaiting Incubation</div></div>
          </div>

          {/* Market Snapshot */}
          {marketSnapshot && (
            <div className="card-glass" style={{ padding: "18px", marginBottom: "20px", borderLeft: "3px solid #a78bfa" }}>
              <div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "#a78bfa", marginBottom: "6px", letterSpacing: "0.05em" }}>Live Market Snapshot</div>
              <p style={{ color: "#cbd5e1", lineHeight: "1.6", margin: 0, fontSize: "0.9rem" }}>{marketSnapshot}</p>
            </div>
          )}

          {/* Research Controls */}
          <div className="card-glass" style={{ padding: "20px", marginBottom: "20px" }}>
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: "200px" }}>
                <label style={{ display: "block", color: "#94a3b8", fontSize: "0.7rem", textTransform: "uppercase", marginBottom: "6px" }}>Focus Area (Optional)</label>
                <input type="text" value={focusArea} onChange={(e) => setFocusArea(e.target.value)} placeholder="e.g. tech, finance, health..." style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "10px 14px", color: "#e2e8f0", outline: "none" }} />
              </div>
              <button onClick={generateNicheMatrix} disabled={loading} style={{ background: loading ? "rgba(168,85,247,0.05)" : "linear-gradient(135deg, rgba(249,115,22,0.2), rgba(236,72,153,0.2))", border: "1px solid rgba(249,115,22,0.3)", color: loading ? "#94a3b8" : "#fdba74", padding: "10px 24px", borderRadius: "6px", cursor: loading ? "wait" : "pointer", fontWeight: "600", whiteSpace: "nowrap" }}>
                {loading ? "⏳ Scanning..." : "🔍 Run Deep Research"}
              </button>
            </div>
            {metadata?.stale && <div style={{ marginTop: "10px", color: "#fbbf24", fontSize: "0.8rem" }}>⚠ Data is {metadata.ageHours}h old. Run a fresh scan.</div>}
          </div>

          {error && <div style={{ background: "rgba(239,68,68,0.1)", borderLeft: "4px solid #ef4444", padding: "14px", marginBottom: "20px", borderRadius: "4px" }}><p style={{ color: "#fca5a5", margin: 0 }}>{error}</p></div>}

          {!matrixData && !loading && !error && !loadingCached && (
            <div className="card-glass" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "220px", color: "#64748b" }}>
              <div style={{ fontSize: "3rem", marginBottom: "12px" }}>🌐</div>
              <p>Click &quot;Run Deep Research&quot; to scan global YouTube markets.</p>
            </div>
          )}

          {/* Matrix Table */}
          {matrixData && Array.isArray(matrixData) && matrixData.length > 0 && (
            <div className="card-glass" style={{ padding: "0", overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <h2 style={{ fontSize: "1.1rem", fontWeight: "600", margin: 0 }}>Niche Profitability Matrix</h2>
                <p style={{ color: "#94a3b8", fontSize: "0.75rem", marginTop: "2px" }}>Vault baseline × Live signal • Click row to expand</p>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8", fontSize: "0.7rem", textTransform: "uppercase" }}>
                      <th style={{ padding: "12px 16px" }}>#</th>
                      <th style={{ padding: "12px" }}>Niche</th>
                      <th style={{ padding: "12px" }}>Vault CPM</th>
                      <th style={{ padding: "12px" }}>Live CPM</th>
                      <th style={{ padding: "12px" }}>Competition</th>
                      <th style={{ padding: "12px" }}>AI Score</th>
                      <th style={{ padding: "12px" }}>Trend</th>
                      <th style={{ padding: "12px" }}>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matrixData.map((item, idx) => {
                      const cc = compColor(item.competition);
                      const isExp = expandedNiche === idx;
                      return (
                        <React.Fragment key={idx}>
                          <tr onClick={() => setExpandedNiche(isExp ? null : idx)} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer", background: isExp ? "rgba(255,255,255,0.03)" : "transparent" }}>
                            <td style={{ padding: "14px 16px", color: "#64748b", fontWeight: "600" }}>{item.rank || idx + 1}</td>
                            <td style={{ padding: "14px 12px" }}>
                              <div style={{ fontWeight: "500", color: "#fff" }}>{item.niche}</div>
                              <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "2px" }}>{item.contentFormat}</div>
                              {item.quickWin && <span style={{ background: "rgba(34,197,94,0.1)", color: "#86efac", padding: "2px 6px", borderRadius: "3px", fontSize: "0.6rem", fontWeight: "600", marginTop: "4px", display: "inline-block" }}>QUICK WIN</span>}
                            </td>
                            <td style={{ padding: "14px 12px", color: "#94a3b8", fontSize: "0.85rem" }}>{item.vaultCpmRange || "—"}</td>
                            <td style={{ padding: "14px 12px", color: "#4ade80", fontWeight: "500" }}>{item.liveCpmEstimate ? `$${item.liveCpmEstimate.low}–$${item.liveCpmEstimate.high}` : "—"}</td>
                            <td style={{ padding: "14px 12px" }}><span style={{ padding: "3px 8px", borderRadius: "4px", fontSize: "0.7rem", background: cc.bg, color: cc.c }}>{item.competition}</span></td>
                            <td style={{ padding: "14px 12px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <div style={{ width: "50px", background: "rgba(255,255,255,0.08)", height: "5px", borderRadius: "3px", overflow: "hidden" }}><div style={{ width: `${(item.automationScore || 0) * 10}%`, background: "linear-gradient(90deg, #a78bfa, #ec4899)", height: "100%" }} /></div>
                                <span style={{ fontSize: "0.8rem", color: "#cbd5e1" }}>{item.automationScore}/10</span>
                              </div>
                            </td>
                            <td style={{ padding: "14px 12px", fontSize: "0.8rem" }}>{trendIcon(item.trendDirection)} {item.trendDirection}</td>
                            <td style={{ padding: "14px 12px" }}><span style={{ fontSize: "1rem", fontWeight: "bold", color: item.compositeScore >= 8 ? "#4ade80" : item.compositeScore >= 6 ? "#fbbf24" : "#94a3b8" }}>{item.compositeScore || "—"}</span></td>
                          </tr>
                          {isExp && (
                            <tr><td colSpan={8} style={{ padding: "0 16px 16px", background: "rgba(255,255,255,0.02)" }}>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", paddingTop: "10px" }}>
                                <div>
                                  {item.reasoning && <div style={{ marginBottom: "12px" }}><div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "#a78bfa", marginBottom: "4px" }}>Analysis</div><p style={{ color: "#cbd5e1", fontSize: "0.8rem", lineHeight: "1.5", margin: 0 }}>{item.reasoning}</p></div>}
                                  {item.automationTools && <div style={{ marginBottom: "12px" }}><div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "#60a5fa", marginBottom: "4px" }}>AI Tools</div><div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>{item.automationTools.map((t, i) => <span key={i} style={{ background: "rgba(96,165,250,0.1)", padding: "3px 8px", borderRadius: "4px", fontSize: "0.7rem", color: "#93c5fd" }}>{t}</span>)}</div></div>}
                                  {item.facelessRisk && <div style={{ marginBottom: "12px" }}><div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "#ef4444", marginBottom: "4px" }}>⚠ Faceless Risk</div><p style={{ color: "#fca5a5", fontSize: "0.8rem", margin: 0 }}>{item.facelessRisk}</p></div>}
                                  {item.revenueStack && <div style={{ marginBottom: "12px" }}><div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "#fbbf24", marginBottom: "4px" }}>Revenue Stack</div>{Object.entries(item.revenueStack).map(([k, v]) => <div key={k} style={{ fontSize: "0.8rem", color: "#cbd5e1", marginBottom: "2px" }}><strong style={{ color: "#fcd34d" }}>{k}:</strong> {v}</div>)}</div>}
                                </div>
                                <div>
                                  {item.subNiches?.length > 0 && <>
                                    <div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "#f97316", marginBottom: "8px" }}>Sub-Niches</div>
                                    {item.subNiches.map((s, si) => <div key={si} style={{ background: "rgba(255,255,255,0.03)", borderRadius: "6px", padding: "10px", marginBottom: "6px", borderLeft: "2px solid rgba(249,115,22,0.3)" }}><div style={{ fontWeight: "500", color: "#fff", fontSize: "0.85rem" }}>{s.name}</div><div style={{ color: "#94a3b8", fontSize: "0.7rem", marginTop: "3px" }}>{s.whyBetter}</div><div style={{ display: "flex", gap: "10px", marginTop: "4px", fontSize: "0.7rem" }}><span style={{ color: "#4ade80" }}>CPM: {s.cpmModifier}</span><span style={{ color: "#fcd34d" }}>{s.competitionLevel}</span></div></div>)}
                                  </>}
                                  {item.seasonality && <div style={{ marginTop: "10px" }}><div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "#06b6d4", marginBottom: "4px" }}>Seasonality</div><p style={{ color: "#cbd5e1", fontSize: "0.8rem", margin: 0 }}>{item.seasonality}</p></div>}
                                  {item.timeToFirstRevenue && <div style={{ marginTop: "8px" }}><div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "#94a3b8", marginBottom: "4px" }}>Time to Revenue</div><p style={{ color: "#e2e8f0", fontSize: "0.85rem", fontWeight: "500", margin: 0 }}>{item.timeToFirstRevenue}</p></div>}
                                </div>
                              </div>

                              {/* Geographic CPM Breakdown */}
                              {item.geoCpm && (
                                <div style={{ marginTop: "14px", background: "rgba(255,255,255,0.02)", borderRadius: "6px", padding: "14px" }}>
                                  <div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "#34d399", marginBottom: "10px" }}>🌍 Geographic CPM Breakdown</div>
                                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                                    {["tier1", "tier2", "tier3"].map(tier => {
                                      const t = item.geoCpm[tier];
                                      if (!t) return null;
                                      const colors = { tier1: "#4ade80", tier2: "#fbbf24", tier3: "#f87171" };
                                      return (
                                        <div key={tier} style={{ background: "rgba(255,255,255,0.03)", borderRadius: "4px", padding: "10px", borderTop: `2px solid ${colors[tier]}` }}>
                                          <div style={{ fontSize: "0.7rem", color: colors[tier], fontWeight: "600", marginBottom: "4px" }}>{tier.toUpperCase()}</div>
                                          <div style={{ fontSize: "0.9rem", fontWeight: "600", color: "#fff", marginBottom: "4px" }}>{t.cpmRange}</div>
                                          <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>{t.countries?.join(", ")}</div>
                                          <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "2px" }}>{t.multiplier}</div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  {item.geoCpm.note && <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "8px", fontStyle: "italic" }}>{item.geoCpm.note}</div>}
                                </div>
                              )}

                              {/* Content Format Rates */}
                              {item.formatRates && (
                                <div style={{ marginTop: "14px", background: "rgba(255,255,255,0.02)", borderRadius: "6px", padding: "14px" }}>
                                  <div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "#818cf8", marginBottom: "10px" }}>🎬 Content Format Rates</div>
                                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "8px" }}>
                                    {["longForm", "shorts", "tutorials", "listicles"].map(fmt => {
                                      const f = item.formatRates[fmt];
                                      if (!f) return null;
                                      const isBest = item.formatRates.bestFormat && item.formatRates.bestFormat.toLowerCase().includes(fmt.toLowerCase());
                                      return (
                                        <div key={fmt} style={{ background: isBest ? "rgba(129,140,248,0.08)" : "rgba(255,255,255,0.03)", borderRadius: "4px", padding: "10px", border: isBest ? "1px solid rgba(129,140,248,0.3)" : "1px solid transparent" }}>
                                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                                            <span style={{ fontSize: "0.75rem", fontWeight: "600", color: "#e2e8f0" }}>{f.format}</span>
                                            {isBest && <span style={{ fontSize: "0.6rem", background: "rgba(129,140,248,0.2)", color: "#a5b4fc", padding: "2px 5px", borderRadius: "3px" }}>BEST</span>}
                                          </div>
                                          <div style={{ fontSize: "0.85rem", fontWeight: "600", color: "#4ade80" }}>{f.cpm}</div>
                                          <div style={{ fontSize: "0.65rem", color: "#94a3b8", marginTop: "2px" }}>{f.why}</div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  {item.formatRates.formatStrategy && <div style={{ fontSize: "0.75rem", color: "#a5b4fc", marginTop: "8px" }}>💡 {item.formatRates.formatStrategy}</div>}
                                </div>
                              )}

                              <div style={{ marginTop: "14px", display: "flex", gap: "10px" }}>
                                <button onClick={() => setActiveTab("pipeline")} style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.15), rgba(236,72,153,0.15))", border: "1px solid rgba(168,85,247,0.3)", color: "#d8b4fe", padding: "8px 18px", borderRadius: "6px", cursor: "pointer", fontWeight: "500", fontSize: "0.85rem" }}>Incubate Channel</button>
                                <button style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", padding: "8px 18px", borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem" }}>Deep Dive</button>
                              </div>
                            </td></tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══ TAB: Channel Pipeline ═══ */}
      {activeTab === "pipeline" && (
        <div style={{ minHeight: "300px" }}>
          <DynamicRenderer schemaId="youtube_incubation_modal" />
        </div>
      )}

      {/* ═══ TAB: Analytics ═══ */}
      {activeTab === "analytics" && (
        <div style={{ minHeight: "300px" }}>
          <DynamicRenderer schemaId="youtube_analytics_dashboard" />
        </div>
      )}

      {/* ═══ TAB: Quota & API ═══ */}
      {activeTab === "quota" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div className="card-glass" style={{ padding: "24px" }}>
            <h3 style={{ fontSize: "1rem", marginBottom: "16px" }}>YouTube Data API v3 Quota</h3>
            <div style={{ marginBottom: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}><span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>Daily Budget</span><span style={{ color: "#e2e8f0", fontSize: "0.8rem" }}>0 / 10,000 units</span></div>
              <div style={{ width: "100%", background: "rgba(255,255,255,0.08)", height: "8px", borderRadius: "4px" }}><div style={{ width: "0%", background: "#4ade80", height: "100%", borderRadius: "4px" }} /></div>
            </div>
            <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
              <div style={{ marginBottom: "4px" }}>• <strong>videos.insert:</strong> 1,600 units each</div>
              <div style={{ marginBottom: "4px" }}>• <strong>Max uploads/day:</strong> ~6 videos</div>
              <div>• <strong>thumbnails.set:</strong> 50 units each</div>
            </div>
          </div>
          <div className="card-glass" style={{ padding: "24px" }}>
            <h3 style={{ fontSize: "1rem", marginBottom: "16px" }}>Available Operations</h3>
            {["videos.insert — Upload video + metadata", "thumbnails.set — Custom thumbnail", "playlistItems.insert — Add to playlist", "channels.list — Channel info"].map((op, i) => (
              <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: "0.8rem", color: "#cbd5e1" }}>{op}</div>
            ))}
          </div>
          <div className="card-glass" style={{ padding: "24px", gridColumn: "1 / -1" }}>
            <h3 style={{ fontSize: "1rem", marginBottom: "12px" }}>Multi-Channel Routing</h3>
            <p style={{ color: "#94a3b8", fontSize: "0.85rem", lineHeight: "1.6" }}>Each channel uses a separate OAuth refresh token stored in Google Cloud Secret Manager. The system routes uploads to the correct channel by matching <code style={{ background: "rgba(255,255,255,0.08)", padding: "2px 6px", borderRadius: "3px" }}>channel_id → refresh_token_secret_name</code> from the channels registry.</p>
          </div>
        </div>
      )}
    </div>
  );
}
