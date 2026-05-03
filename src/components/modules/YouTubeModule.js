"use client";

import React, { useState, useEffect } from "react";

export default function YouTubeModule() {
  const [matrixData, setMatrixData] = useState(null);
  const [marketSnapshot, setMarketSnapshot] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingCached, setLoadingCached] = useState(true);
  const [error, setError] = useState(null);
  const [expandedNiche, setExpandedNiche] = useState(null);
  const [focusArea, setFocusArea] = useState("");
  const [optimizationWeights, setOptimizationWeights] = useState({
    cpm: 5,
    competition: 5,
    evergreen: 5,
    growth: 5,
    offPlatform: 5,
    crossPlatform: 5,
    aiViable: 5
  });
  const [metadata, setMetadata] = useState(null);
  const [activeTab, setActiveTab] = useState("intelligence");
  const [apiCaps, setApiCaps] = useState(null);
  const [authStatus, setAuthStatus] = useState("disconnected");

  // Incubation Wizard State
  const [showWizard, setShowWizard] = useState(false);
  const [wizardNiche, setWizardNiche] = useState(null);
  const [wizardConfig, setWizardConfig] = useState({
    schedules: { shorts: "0", long_form: "0" },
    vibe: "",
    targetSubNiche: "none",
    revenue: {
      adsense: true,
      digitalProducts: false,
      affiliates: false,
      patreon: false
    }
  });
  const [incubating, setIncubating] = useState(false);

  // Deep Dive & Sub-Niche Loading State
  const [fetchingSubNiches, setFetchingSubNiches] = useState(false);
  const [fetchingDeepDive, setFetchingDeepDive] = useState(false);
  const [showBlueprint, setShowBlueprint] = useState(false);
  const [activeBlueprint, setActiveBlueprint] = useState(null);

  // MOCK DATA for Phase 4 UI Build
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [activeChannelTab, setActiveChannelTab] = useState("performance"); // performance, pipeline, orchestration
  const [learningMode, setLearningMode] = useState("manual_approval"); // For orchestration tab mock
  const [compiling, setCompiling] = useState(false);
  
  // Real-time state for the selected channel's learning ledger
  const [learningLedger, setLearningLedger] = useState([
    { id: "L1", insight: "Fast-paced hooks increase retention by 14%. Enforce sub-5-second intros.", actionableRule: "Rule: Ensure the first 5 seconds feature rapid visual cuts and a strong hook.", targetAgent: "visuals" }
  ]);
  const [proposalInbox, setProposalInbox] = useState([
    { id: "P1", insight: "Data shows viewers drop when discussing abstract theory for too long.", reasoning: "Average View Duration drops by 40% when screen is static and script explains theory.", actionableRule: "Rule: Keep abstract theory under 10% of runtime and use on-screen text to break up pacing.", targetAgent: "script" }
  ]);
  
  const mockChannels = [
    { id: "c1", name: "AI Manga Tales", niche: "Anime Automation", status: "Monetized", rev: "$4,120", progress: 100, format: "funnel" },
    { id: "c2", name: "SaaS Builders", niche: "B2B Tech", status: "Monetized", rev: "$10,130", progress: 100, format: "independent_long" },
    { id: "c3", name: "Silent Stoic", niche: "Philosophy", status: "Incubating", rev: "$0", progress: 40, format: "independent_shorts" }
  ];

  const mockPipelineTasks = [
    {
      id: "v1", channelId: "c1", channelName: "AI Manga Tales", topic: "Episode 14: The Demon King's Fall", status: "in_progress",
      stages: {
        script: { status: "completed", progress: 100, label: "Level 4 Script" },
        audio: { status: "in_progress", progress: 33, label: "Voiceover & SFX (1/3)" },
        visuals: { status: "queued", progress: 0, label: "Midjourney Scenes (0/45)" },
        assembly: { status: "queued", progress: 0, label: "Timeline Sync" }
      },
      overallProgress: 25
    },
    {
      id: "v2", channelId: "c2", channelName: "SaaS Builders", topic: "How to Build a CRM in Next.js", status: "in_progress",
      stages: {
        script: { status: "completed", progress: 100, label: "Level 4 Script" },
        audio: { status: "completed", progress: 100, label: "Voiceover (1/1)" },
        visuals: { status: "in_progress", progress: 66, label: "Screen Caps (8/12)" },
        assembly: { status: "in_progress", progress: 20, label: "Timeline Sync" }
      },
      overallProgress: 70
    }
  ];

  const renderPipelineTask = (task) => (
    <div key={task.id} style={{ background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "16px", marginBottom: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
        <div>
          <div style={{ fontSize: "0.75rem", color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>{task.channelName}</div>
          <h4 style={{ margin: 0, fontSize: "1.1rem", color: "#fff" }}>{task.topic}</h4>
        </div>
        <div style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#4ade80" }}>{task.overallProgress}%</div>
      </div>
      
      {/* Overall Progress Bar */}
      <div style={{ width: "100%", background: "rgba(255,255,255,0.08)", height: "6px", borderRadius: "3px", marginBottom: "16px", overflow: "hidden" }}>
        <div style={{ width: `${task.overallProgress}%`, background: "linear-gradient(90deg, #a78bfa, #ec4899)", height: "100%" }} />
      </div>

      {/* Granular Stages */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
        {Object.entries(task.stages).map(([stageKey, stageData]) => {
          const isDone = stageData.progress === 100;
          const isDoing = stageData.progress > 0 && stageData.progress < 100;
          const color = isDone ? "#4ade80" : isDoing ? "#fbbf24" : "#64748b";
          return (
            <div key={stageKey}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: color, marginBottom: "4px", textTransform: "uppercase" }}>
                <span>{stageKey}</span>
                <span>{stageData.progress}%</span>
              </div>
              <div style={{ width: "100%", background: "rgba(255,255,255,0.08)", height: "4px", borderRadius: "2px", overflow: "hidden", marginBottom: "4px" }}>
                <div style={{ width: `${stageData.progress}%`, background: color, height: "100%" }} />
              </div>
              <div style={{ fontSize: "0.65rem", color: "#94a3b8" }}>{stageData.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );

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
      setTimeout(() => setAuthStatus("connected"), 0); 
      window.history.replaceState({}, document.title, window.location.pathname + "?module=youtube"); 
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCachedMatrix();
  }, []);

  const generateNicheMatrix = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/youtube/niche-matrix", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ focusArea: focusArea.trim() || null, includeSubNiches: true, depth: "deep", optimizationWeights }) });
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

  const handleIncubate = async () => {
    setIncubating(true);
    try {
      const res = await fetch("/api/agents/incubate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche: wizardNiche, config: wizardConfig })
      });
      // In a real flow, we would handle the response and switch to the Pipeline or Dashboard tab
      setShowWizard(false);
      
      // Auto-transition to Portfolio drill-down and prime the UI for orchestration
      setSelectedChannel({
        id: "new_channel_tmp",
        name: wizardNiche?.niche || "Incubating Channel...",
        niche: wizardNiche?.niche,
        status: "Incubating",
        rev: "$0",
        progress: 0,
        schedules: wizardConfig.schedules
      });
      setActiveChannelTab("pipeline");
      setActiveTab("portfolio");
    } catch (e) {
      console.error(e);
    } finally {
      setIncubating(false);
    }
  };

  const runMetaCompiler = async () => {
    if (!selectedChannel) return;
    setCompiling(true);
    try {
      const res = await fetch("/api/agents/meta-compiler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: selectedChannel.id })
      });
      const result = await res.json();
      if (result.success && result.insight) {
        const newInsight = {
          id: "I" + Date.now(),
          ...result.insight
        };
        
        if (learningMode === "autonomous") {
          setLearningLedger(prev => [newInsight, ...prev]);
        } else if (learningMode === "manual_approval") {
          setProposalInbox(prev => [newInsight, ...prev]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCompiling(false);
    }
  };

  const approveProposal = (proposal) => {
    setLearningLedger(prev => [proposal, ...prev]);
    setProposalInbox(prev => prev.filter(p => p.id !== proposal.id));
  };

  const rejectProposal = (proposalId) => {
    setProposalInbox(prev => prev.filter(p => p.id !== proposalId));
  };

  const handleFindMoreSubNiches = async (nicheItem, index) => {
    setFetchingSubNiches(true);
    try {
      const res = await fetch("/api/youtube/more-subniches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentNiche: nicheItem.niche, currentSubNiches: nicheItem.subNiches?.map(s => s.name) || [] })
      });
      if (!res.ok) throw new Error("Failed to fetch more sub-niches");
      const data = await res.json();
      
      setMatrixData(prev => {
        const newData = [...prev];
        const newSubNiches = data.subNiches || [];
        newData[index].subNiches = [...(newData[index].subNiches || []), ...newSubNiches];
        return newData;
      });
    } catch (e) {
      console.error(e);
      alert("Error finding more sub-niches: " + e.message);
    } finally {
      setFetchingSubNiches(false);
    }
  };

  const handleDeepDive = async (nicheItem) => {
    setFetchingDeepDive(true);
    try {
      const res = await fetch("/api/youtube/deep-dive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentNiche: nicheItem.niche, targetAudienceVibe: nicheItem.targetAudienceVibe })
      });
      if (!res.ok) throw new Error("Failed to run deep dive");
      const data = await res.json();
      
      setActiveBlueprint({
        ...data.blueprint,
        nicheName: nicheItem.niche,
        sourceItem: nicheItem
      });
      setShowBlueprint(true);
    } catch (e) {
      console.error(e);
      alert("Error running deep dive: " + e.message);
    } finally {
      setFetchingDeepDive(false);
    }
  };

  const tabs = [
    { id: "intelligence", label: "Intelligence Engine", icon: "🧠" },
    { id: "dashboard", label: "Empire Dashboard", icon: "📊" },
    { id: "portfolio", label: "Channel Portfolio", icon: "🗂️" },
    { id: "pipeline", label: "Swarm Pipeline", icon: "🚀" },
    { id: "quota", label: "Infrastructure & API", icon: "⚡" },
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

      {/* ═══ TAB: Intelligence Engine ═══ */}
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
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap", marginBottom: "20px" }}>
              <div style={{ flex: 1, minWidth: "200px" }}>
                <label style={{ display: "block", color: "#94a3b8", fontSize: "0.7rem", textTransform: "uppercase", marginBottom: "6px" }}>Focus Area (Optional)</label>
                <input type="text" value={focusArea} onChange={(e) => setFocusArea(e.target.value)} placeholder="e.g. tech, finance, health..." style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "10px 14px", color: "#e2e8f0", outline: "none" }} />
              </div>
              <button onClick={generateNicheMatrix} disabled={loading} style={{ background: loading ? "rgba(168,85,247,0.05)" : "linear-gradient(135deg, rgba(249,115,22,0.2), rgba(236,72,153,0.2))", border: "1px solid rgba(249,115,22,0.3)", color: loading ? "#94a3b8" : "#fdba74", padding: "10px 24px", borderRadius: "6px", cursor: loading ? "wait" : "pointer", fontWeight: "600", whiteSpace: "nowrap", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span>{loading ? "⏳ Scanning..." : "🔍 Run Deep Research"}</span>
                {!loading && <span style={{ fontSize: "0.6rem", color: "rgba(253,186,116,0.7)", marginTop: "2px" }}>(~$0.02)</span>}
              </button>
            </div>
            
            {/* Optimization Strategy Sliders */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "16px" }}>
              <div style={{ color: "#a78bfa", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px", fontWeight: "600" }}>Optimization Strategy</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
                {[
                  { key: "cpm", label: "Maximize CPM", desc: "Direct AdSense revenue" },
                  { key: "competition", label: "Minimize Competition", desc: "Ease of entry" },
                  { key: "evergreen", label: "Evergreen Lifespan", desc: "Long-tail shelf life" },
                  { key: "growth", label: "Fastest Growth", desc: "Current viral velocity" },
                  { key: "offPlatform", label: "Off-Platform Monetization", desc: "Sponsorships, Skool, Affiliates" },
                  { key: "crossPlatform", label: "Cross-Platform Virality", desc: "TikTok / Reels Syndication" },
                  { key: "aiViable", label: "AI/Faceless Viability", desc: "Fully automatable" }
                ].map(metric => (
                  <div key={metric.key} style={{ background: "rgba(0,0,0,0.2)", padding: "12px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.03)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ fontSize: "0.8rem", color: "#e2e8f0", fontWeight: "500" }}>{metric.label}</span>
                      <span style={{ fontSize: "0.8rem", color: "#a78bfa", fontWeight: "bold" }}>{optimizationWeights[metric.key]}/10</span>
                    </div>
                    <input 
                      type="range" min="0" max="10" 
                      value={optimizationWeights[metric.key]} 
                      onChange={(e) => setOptimizationWeights(prev => ({ ...prev, [metric.key]: parseInt(e.target.value) }))}
                      style={{ width: "100%", accentColor: "#a78bfa", cursor: "pointer" }} 
                    />
                    <div style={{ fontSize: "0.65rem", color: "#64748b", marginTop: "4px" }}>{metric.desc}</div>
                  </div>
                ))}
              </div>
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
                      <th style={{ padding: "12px" }}>Priority Match</th>
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
                            <td style={{ padding: "14px 12px" }}>
                              {item.priorityMatchScore ? (
                                <span style={{ fontSize: "1rem", fontWeight: "bold", color: item.priorityMatchScore >= 80 ? "#ec4899" : "#a78bfa" }}>{item.priorityMatchScore}%</span>
                              ) : "—"}
                            </td>
                          </tr>
                          {isExp && (
                            <tr><td colSpan={9} style={{ padding: "0 16px 16px", background: "rgba(255,255,255,0.02)" }}>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", paddingTop: "10px" }}>
                                <div>
                                  {item.reasoning && <div style={{ marginBottom: "12px" }}><div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "#a78bfa", marginBottom: "4px" }}>Analysis</div><p style={{ color: "#cbd5e1", fontSize: "0.8rem", lineHeight: "1.5", margin: 0 }}>{item.reasoning}</p></div>}
                                  {item.priorityMatchReason && <div style={{ marginBottom: "12px", background: "rgba(236, 72, 153, 0.05)", padding: "10px", borderRadius: "6px", borderLeft: "2px solid #ec4899" }}><div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "#f472b6", marginBottom: "4px", display: "flex", alignItems: "center", gap: "4px" }}><span>🎯</span> Priority Match Reason</div><p style={{ color: "#e2e8f0", fontSize: "0.8rem", lineHeight: "1.5", margin: 0 }}>{item.priorityMatchReason}</p></div>}
                                  {item.trendDetails && <div style={{ marginBottom: "12px", background: "rgba(16, 185, 129, 0.05)", padding: "10px", borderRadius: "6px", borderLeft: "2px solid #10b981" }}><div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "#34d399", marginBottom: "4px", display: "flex", alignItems: "center", gap: "4px" }}><span>📈</span> Search Volume & Trends</div><p style={{ color: "#e2e8f0", fontSize: "0.8rem", lineHeight: "1.5", margin: 0 }}>{item.trendDetails}</p></div>}
                                  {item.targetAudienceVibe && <div style={{ marginBottom: "12px", background: "rgba(236, 72, 153, 0.05)", padding: "10px", borderRadius: "6px", borderLeft: "2px solid #ec4899" }}><div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "#f472b6", marginBottom: "4px", display: "flex", alignItems: "center", gap: "4px" }}><span>🎭</span> Target Audience Vibe</div><p style={{ color: "#e2e8f0", fontSize: "0.8rem", lineHeight: "1.5", margin: 0 }}>{item.targetAudienceVibe}</p></div>}
                                  {item.automationTools && <div style={{ marginBottom: "12px" }}><div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "#60a5fa", marginBottom: "4px" }}>AI Tools</div><div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>{item.automationTools.map((t, i) => <span key={i} style={{ background: "rgba(96,165,250,0.1)", padding: "3px 8px", borderRadius: "4px", fontSize: "0.7rem", color: "#93c5fd" }}>{t}</span>)}</div></div>}
                                  {item.facelessRisk && <div style={{ marginBottom: "12px" }}><div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "#ef4444", marginBottom: "4px" }}>⚠ Faceless Risk</div><p style={{ color: "#fca5a5", fontSize: "0.8rem", margin: 0 }}>{item.facelessRisk}</p></div>}
                                  {item.revenueStack && <div style={{ marginBottom: "12px" }}><div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "#fbbf24", marginBottom: "4px" }}>Revenue Stack</div>{Object.entries(item.revenueStack).map(([k, v]) => <div key={k} style={{ fontSize: "0.8rem", color: "#cbd5e1", marginBottom: "2px" }}><strong style={{ color: "#fcd34d" }}>{k}:</strong> {v}</div>)}</div>}
                                </div>
                                <div>
                                  {/* Sub-niches moved to bottom */}
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

                              {/* Sub-Niches Full Width Block */}
                              {item.subNiches?.length > 0 && (
                                <div style={{ marginTop: "20px", background: "rgba(0,0,0,0.15)", borderRadius: "6px", padding: "16px", border: "1px solid rgba(249,115,22,0.2)" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                                    <div style={{ fontSize: "0.8rem", textTransform: "uppercase", color: "#f97316", fontWeight: "600", letterSpacing: "0.05em" }}>Sub-Niches to Target</div>
                                    <button onClick={(e) => { e.stopPropagation(); handleFindMoreSubNiches(item, idx); }} disabled={fetchingSubNiches} style={{ background: fetchingSubNiches ? "rgba(249,115,22,0.1)" : "transparent", border: "1px solid rgba(249,115,22,0.4)", color: fetchingSubNiches ? "#fb923c" : "#fdba74", padding: "4px 12px", borderRadius: "4px", fontSize: "0.75rem", cursor: fetchingSubNiches ? "wait" : "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                                      <span>{fetchingSubNiches ? "⏳ Searching..." : "➕ Find More Sub-Niches"}</span>
                                      {!fetchingSubNiches && <span style={{ color: "rgba(253,186,116,0.6)", fontSize: "0.6rem" }}>(~$0.01)</span>}
                                    </button>
                                  </div>
                                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "10px" }}>
                                    {item.subNiches.map((s, si) => (
                                      <div key={si} style={{ background: "rgba(255,255,255,0.03)", borderRadius: "6px", padding: "12px", borderLeft: "2px solid rgba(249,115,22,0.5)" }}>
                                        <div style={{ fontWeight: "600", color: "#fff", fontSize: "0.9rem" }}>{s.name}</div>
                                        <div style={{ color: "#94a3b8", fontSize: "0.75rem", marginTop: "4px", lineHeight: "1.4" }}>{s.whyBetter}</div>
                                        <div style={{ display: "flex", gap: "12px", marginTop: "8px", fontSize: "0.75rem", fontWeight: "500" }}>
                                          <span style={{ color: "#4ade80" }}>CPM: {s.cpmModifier}</span>
                                          <span style={{ color: "#fcd34d" }}>Comp: {s.competitionLevel}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div style={{ marginTop: "20px", display: "flex", gap: "12px", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "16px" }}>
                                <button onClick={(e) => { e.stopPropagation(); setWizardNiche(item); setWizardConfig(prev => ({...prev, vibe: item.targetAudienceVibe || "", targetSubNiche: "none"})); setShowWizard(true); }} style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.15), rgba(236,72,153,0.15))", border: "1px solid rgba(168,85,247,0.3)", color: "#d8b4fe", padding: "10px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "0.9rem" }}>
                                  Incubate Channel
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); handleDeepDive(item); }} disabled={fetchingDeepDive} style={{ background: fetchingDeepDive ? "rgba(56,189,248,0.05)" : "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.3)", color: fetchingDeepDive ? "#38bdf8" : "#7dd3fc", padding: "10px 20px", borderRadius: "6px", cursor: fetchingDeepDive ? "wait" : "pointer", fontSize: "0.9rem", fontWeight: "500", display: "flex", alignItems: "center", gap: "8px" }}>
                                  <span>{fetchingDeepDive ? "⏳ Generating Blueprint..." : "🎯 Deep Dive Blueprint"}</span>
                                  {!fetchingDeepDive && <span style={{ color: "rgba(125,211,252,0.6)", fontSize: "0.65rem" }}>(~$0.03)</span>}
                                </button>
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

      {/* ═══ TAB: Swarm Pipeline ═══ */}
      {activeTab === "pipeline" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "1.25rem", color: "#fff", fontWeight: "600", margin: 0 }}>Global Swarm Pipeline</h2>
            <div style={{ display: "flex", gap: "10px" }}>
              <span style={{ fontSize: "0.85rem", color: "#94a3b8", background: "rgba(255,255,255,0.05)", padding: "4px 10px", borderRadius: "4px" }}>{mockPipelineTasks.length} Active Tasks</span>
            </div>
          </div>
          <div className="card-glass" style={{ padding: "20px" }}>
            {mockPipelineTasks.map(task => renderPipelineTask(task))}
          </div>
        </div>
      )}

      {/* ═══ TAB: Empire Dashboard ═══ */}
      {activeTab === "dashboard" && (
        <div>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "20px", color: "#fff", fontWeight: "600" }}>Empire Net Worth</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px", marginBottom: "24px" }}>
            <div className="card-glass" style={{ padding: "24px" }}>
              <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#a78bfa", letterSpacing: "0.05em", marginBottom: "8px" }}>Total Empire Revenue</div>
              <div style={{ fontSize: "2.5rem", fontWeight: "bold", background: "linear-gradient(135deg, #a78bfa, #ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>$14,250.00</div>
              <div style={{ color: "#4ade80", fontSize: "0.85rem", marginTop: "8px" }}>↑ +12.5% this month</div>
            </div>
            <div className="card-glass" style={{ padding: "24px" }}>
              <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#60a5fa", letterSpacing: "0.05em", marginBottom: "8px" }}>Total Empire Views</div>
              <div style={{ fontSize: "2.5rem", fontWeight: "bold", color: "#fff" }}>2.4M</div>
              <div style={{ color: "#4ade80", fontSize: "0.85rem", marginTop: "8px" }}>↑ +8.2% this month</div>
            </div>
            <div className="card-glass" style={{ padding: "24px" }}>
              <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#34d399", letterSpacing: "0.05em", marginBottom: "8px" }}>Total Subscribers</div>
              <div style={{ fontSize: "2.5rem", fontWeight: "bold", color: "#fff" }}>142K</div>
              <div style={{ color: "#4ade80", fontSize: "0.85rem", marginTop: "8px" }}>↑ +4.1% this month</div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB: Channel Portfolio ═══ */}
      {activeTab === "portfolio" && (
        <div>
          {!selectedChannel ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ fontSize: "1.1rem", color: "#e2e8f0", margin: 0 }}>Channel Portfolio</h3>
                <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Click a channel to manage its Global Lore and Pipeline</span>
              </div>
              <div className="card-glass" style={{ padding: "0", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8", fontSize: "0.75rem", textTransform: "uppercase" }}>
                      <th style={{ padding: "16px 20px" }}>Channel Name</th>
                      <th style={{ padding: "16px 20px" }}>Niche</th>
                      <th style={{ padding: "16px 20px" }}>Status</th>
                      <th style={{ padding: "16px 20px" }}>Monthly Rev</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockChannels.map(c => (
                      <tr key={c.id} onClick={() => setSelectedChannel(c)} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer", transition: "background 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.02)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                        <td style={{ padding: "16px 20px", fontWeight: "500", color: "#fff" }}>{c.name}</td>
                        <td style={{ padding: "16px 20px", color: "#94a3b8", fontSize: "0.85rem" }}>{c.niche}</td>
                        <td style={{ padding: "16px 20px" }}>
                          <span style={{ background: c.progress === 100 ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)", color: c.progress === 100 ? "#4ade80" : "#fbbf24", padding: "4px 8px", borderRadius: "4px", fontSize: "0.75rem" }}>
                            {c.status} {c.progress < 100 && `(${c.progress}%)`}
                          </span>
                        </td>
                        <td style={{ padding: "16px 20px", fontWeight: "600", color: c.progress === 100 ? "#4ade80" : "#94a3b8" }}>{c.rev}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            // Individual Channel Drill-Down
            <div>
              <button onClick={() => setSelectedChannel(null)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem", marginBottom: "20px", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>←</span> Back to Portfolio
              </button>
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "16px" }}>
                <div>
                  <h2 style={{ fontSize: "1.8rem", color: "#fff", margin: "0 0 4px 0", background: "linear-gradient(to right, #a78bfa, #ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{selectedChannel.name}</h2>
                  <div style={{ color: "#94a3b8", fontSize: "0.9rem" }}>{selectedChannel.niche}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.75rem", color: "#a78bfa", textTransform: "uppercase", marginBottom: "4px" }}>Monthly Revenue</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#4ade80" }}>{selectedChannel.rev}</div>
                </div>
              </div>

              {/* Sub-Tabs for Channel Drill-Down */}
              <div style={{ display: "flex", gap: "4px", marginBottom: "20px", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "0" }}>
                {[
                  { id: "performance", label: "Performance Metrics" },
                  { id: "pipeline", label: "Local Pipeline" },
                  { id: "orchestration", label: "Control Center" }
                ].map(t => (
                  <button key={t.id} onClick={() => setActiveChannelTab(t.id)} style={{ padding: "8px 16px", background: activeChannelTab === t.id ? "rgba(255,255,255,0.06)" : "transparent", border: "none", borderBottom: activeChannelTab === t.id ? "2px solid #ec4899" : "2px solid transparent", color: activeChannelTab === t.id ? "#e2e8f0" : "#64748b", cursor: "pointer", fontSize: "0.8rem", fontWeight: "500", transition: "all 0.2s" }}>
                    {t.label}
                  </button>
                ))}
              </div>

              {activeChannelTab === "performance" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  <div className="card-glass" style={{ padding: "20px" }}>
                    <h3 style={{ fontSize: "1rem", color: "#e2e8f0", marginBottom: "16px", marginTop: 0 }}>Monetization Progress</h3>
                    <div style={{ marginBottom: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "4px" }}><span>Subscribers</span><span>1,000 / 1,000</span></div>
                      <div style={{ width: "100%", background: "rgba(255,255,255,0.08)", height: "6px", borderRadius: "3px" }}><div style={{ width: "100%", background: "#4ade80", height: "100%" }} /></div>
                    </div>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "4px" }}><span>Watch Hours</span><span>{4000 * (selectedChannel.progress/100)} / 4,000</span></div>
                      <div style={{ width: "100%", background: "rgba(255,255,255,0.08)", height: "6px", borderRadius: "3px" }}><div style={{ width: `${selectedChannel.progress}%`, background: selectedChannel.progress === 100 ? "#4ade80" : "#fbbf24", height: "100%" }} /></div>
                    </div>
                  </div>

                  <div className="card-glass" style={{ padding: "20px" }}>
                    <h3 style={{ fontSize: "1rem", color: "#e2e8f0", marginBottom: "16px", marginTop: 0 }}>Active Features</h3>
                    {["AdSense", "Digital Products", "Patreon"].map(f => (
                      <div key={f} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <span style={{ fontSize: "0.85rem", color: "#cbd5e1" }}>{f}</span>
                        <div style={{ width: "36px", height: "20px", background: f === "AdSense" ? "#a78bfa" : "rgba(255,255,255,0.1)", borderRadius: "10px", position: "relative", cursor: "pointer" }}>
                          <div style={{ width: "16px", height: "16px", background: "#fff", borderRadius: "50%", position: "absolute", top: "2px", left: f === "AdSense" ? "18px" : "2px", transition: "all 0.2s" }} />
                        </div>
                      </div>
                    ))}
                    <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "12px", fontStyle: "italic" }}>Toggle features to update the Global Lore.</div>
                  </div>
                </div>
              )}

              {activeChannelTab === "pipeline" && (
                <div className="card-glass" style={{ padding: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <h3 style={{ fontSize: "1rem", color: "#e2e8f0", margin: 0 }}>Local Production Pipeline</h3>
                    <button style={{ background: "linear-gradient(135deg, rgba(167,139,250,0.2), rgba(236,72,153,0.2))", border: "1px solid rgba(167,139,250,0.3)", color: "#d8b4fe", padding: "6px 12px", borderRadius: "6px", fontSize: "0.8rem", cursor: "pointer" }}>+ Request Video</button>
                  </div>
                  
                  {mockPipelineTasks.filter(t => t.channelId === selectedChannel.id).length === 0 ? (
                    <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748b", fontSize: "0.9rem" }}>No active video tasks for this channel.</div>
                  ) : (
                    mockPipelineTasks.filter(t => t.channelId === selectedChannel.id).map(task => renderPipelineTask(task))
                  )}
                </div>
              )}

              {activeChannelTab === "orchestration" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  {/* Left Col: Control Chat */}
                  <div className="card-glass" style={{ padding: "20px", display: "flex", flexDirection: "column", height: "450px" }}>
                    <h3 style={{ fontSize: "1rem", color: "#e2e8f0", margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: "8px" }}>
                      ✨ Gemini Orchestrator
                    </h3>
                    <div style={{ flex: 1, background: "rgba(0,0,0,0.2)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)", padding: "16px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
                      <div style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)", padding: "12px", borderRadius: "8px", alignSelf: "flex-start", maxWidth: "85%" }}>
                        <p style={{ margin: 0, fontSize: "0.85rem", color: "#e2e8f0", lineHeight: "1.5" }}>I am locked into the Global Lore for <strong>{selectedChannel.name}</strong>. How should we steer the next batch of scripts?</p>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <input type="text" placeholder="Prompt the Swarm Engine..." style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "10px 14px", color: "#e2e8f0", outline: "none", fontSize: "0.85rem" }} />
                      <button style={{ background: "linear-gradient(135deg, #a78bfa, #ec4899)", border: "none", color: "#fff", padding: "0 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}>Send</button>
                    </div>
                  </div>

                  {/* Right Col: Self-Learning Ledger */}
                  <div className="card-glass" style={{ padding: "20px", display: "flex", flexDirection: "column", height: "450px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                      <h3 style={{ fontSize: "1rem", color: "#e2e8f0", margin: 0 }}>Learning Ledger</h3>
                      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        <button onClick={runMetaCompiler} disabled={compiling || learningMode === "off"} style={{ background: compiling ? "rgba(255,255,255,0.05)" : "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: compiling ? "#94a3b8" : "#4ade80", padding: "4px 8px", borderRadius: "4px", fontSize: "0.7rem", cursor: compiling || learningMode === "off" ? "not-allowed" : "pointer" }}>
                           {compiling ? "⏳ Compiling..." : "⚡ Run Compiler Analysis"}
                        </button>
                        <select value={learningMode} onChange={(e) => setLearningMode(e.target.value)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0", borderRadius: "4px", padding: "4px 8px", fontSize: "0.75rem", outline: "none" }}>
                          <option value="autonomous">Auto-Learn</option>
                          <option value="manual_approval">Manual Approval</option>
                          <option value="off">Off</option>
                        </select>
                      </div>
                    </div>
                    
                    <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
                      {learningLedger.length === 0 && proposalInbox.length === 0 && (
                        <div style={{ textAlign: "center", color: "#64748b", fontSize: "0.85rem", marginTop: "40px" }}>No insights or proposals yet.</div>
                      )}

                      {learningLedger.map(item => (
                        <div key={item.id} style={{ background: "rgba(255,255,255,0.03)", padding: "12px", borderRadius: "6px", borderLeft: "2px solid #4ade80" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                            <div style={{ fontSize: "0.7rem", color: "#4ade80", textTransform: "uppercase", fontWeight: "600" }}>Active Insight</div>
                            <span style={{ fontSize: "0.6rem", background: "rgba(255,255,255,0.1)", color: "#cbd5e1", padding: "2px 5px", borderRadius: "3px" }}>TARGET: {item.targetAgent?.toUpperCase() || "GLOBAL"}</span>
                          </div>
                          <div style={{ fontSize: "0.8rem", color: "#cbd5e1", lineHeight: "1.4" }}>{item.actionableRule || item.insight}</div>
                        </div>
                      ))}

                      {learningMode === "manual_approval" && proposalInbox.map(proposal => (
                        <div key={proposal.id} style={{ background: "rgba(245,158,11,0.05)", padding: "12px", borderRadius: "6px", borderLeft: "2px solid #fbbf24", border: "1px solid rgba(245,158,11,0.2)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                            <span style={{ fontSize: "0.7rem", color: "#fbbf24", textTransform: "uppercase", fontWeight: "600" }}>Proposal Inbox</span>
                            <span style={{ fontSize: "0.6rem", background: "rgba(245,158,11,0.1)", color: "#fcd34d", padding: "2px 6px", borderRadius: "3px" }}>AWAITING REVIEW</span>
                          </div>
                          <div style={{ fontSize: "0.8rem", color: "#e2e8f0", lineHeight: "1.4", marginBottom: "4px" }}><strong>Insight:</strong> {proposal.insight}</div>
                          <div style={{ fontSize: "0.75rem", color: "#94a3b8", lineHeight: "1.4", marginBottom: "10px" }}><em>Reasoning:</em> {proposal.reasoning}</div>
                          <div style={{ fontSize: "0.8rem", color: "#4ade80", lineHeight: "1.4", marginBottom: "10px", background: "rgba(34,197,94,0.1)", padding: "6px", borderRadius: "4px" }}><strong>Rule:</strong> {proposal.actionableRule}</div>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button onClick={() => approveProposal(proposal)} style={{ flex: 1, background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", color: "#86efac", padding: "6px", borderRadius: "4px", fontSize: "0.75rem", cursor: "pointer" }}>Approve</button>
                            <button onClick={() => rejectProposal(proposal.id)} style={{ flex: 1, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", padding: "6px", borderRadius: "4px", fontSize: "0.75rem", cursor: "pointer" }}>Reject</button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB: Infrastructure & API ═══ */}
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

      {/* ═══ Incubation Wizard Modal ═══ */}
      {showWizard && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="card-glass" style={{ width: "600px", maxWidth: "90vw", maxHeight: "90vh", overflowY: "auto", padding: "30px", borderTop: "2px solid #a78bfa" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "1.5rem", margin: 0, background: "linear-gradient(to right, #a78bfa, #ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Channel Profile Manager</h2>
              <button onClick={() => setShowWizard(false)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "1.5rem" }}>&times;</button>
            </div>
            
            <p style={{ color: "#cbd5e1", fontSize: "0.9rem", marginBottom: "24px" }}>
              Configure the deployment parameters for <strong style={{ color: "#fff" }}>{wizardNiche?.niche || "this channel"}</strong>.
            </p>

            {/* Sub-Niche Selection */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", color: "#94a3b8", fontSize: "0.75rem", textTransform: "uppercase", marginBottom: "10px", letterSpacing: "0.05em" }}>Target Sub-Niche</label>
              <select value={wizardConfig.targetSubNiche} onChange={(e) => setWizardConfig({...wizardConfig, targetSubNiche: e.target.value})} style={{ width: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "12px", color: "#fff", outline: "none", fontSize: "0.85rem" }}>
                <option value="none">None (Decide Later in Orchestrator)</option>
                {wizardNiche?.subNiches?.map((s, i) => (
                  <option key={i} value={s.name}>{s.name} (CPM: {s.cpmModifier})</option>
                ))}
              </select>
            </div>

            {/* Pipeline Scheduler */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", color: "#94a3b8", fontSize: "0.75rem", textTransform: "uppercase", marginBottom: "10px", letterSpacing: "0.05em" }}>Content Pipeline Rules</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div style={{ padding: "14px", borderRadius: "8px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <span style={{ fontWeight: "500", color: "#e2e8f0", fontSize: "0.85rem" }}>Shorts Frequency</span>
                    <span style={{ fontSize: "0.7rem", color: "#a78bfa" }}>per week</span>
                  </div>
                  <select value={wizardConfig.schedules.shorts} onChange={(e) => setWizardConfig({...wizardConfig, schedules: {...wizardConfig.schedules, shorts: e.target.value}})} style={{ width: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", padding: "8px", color: "#fff", outline: "none" }}>
                    <option value="0">0 (Off)</option>
                    <option value="1">1 Short</option>
                    <option value="3">3 Shorts</option>
                    <option value="7">7 Shorts (Daily)</option>
                  </select>
                </div>
                <div style={{ padding: "14px", borderRadius: "8px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <span style={{ fontWeight: "500", color: "#e2e8f0", fontSize: "0.85rem" }}>Long-Form Frequency</span>
                    <span style={{ fontSize: "0.7rem", color: "#a78bfa" }}>per week</span>
                  </div>
                  <select value={wizardConfig.schedules.long_form} onChange={(e) => setWizardConfig({...wizardConfig, schedules: {...wizardConfig.schedules, long_form: e.target.value}})} style={{ width: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", padding: "8px", color: "#fff", outline: "none" }}>
                    <option value="0">0 (Off)</option>
                    <option value="1">1 Video</option>
                    <option value="2">2 Videos</option>
                    <option value="3">3 Videos</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Revenue Stack */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", color: "#94a3b8", fontSize: "0.75rem", textTransform: "uppercase", marginBottom: "10px", letterSpacing: "0.05em" }}>Revenue Stack Toggles</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {[
                  { id: "adsense", label: "AdSense (Default)" },
                  { id: "patreon", label: "Patreon / Memberships" },
                  { id: "digitalProducts", label: "Digital Products" },
                  { id: "affiliates", label: "Affiliate Links" }
                ].map(opt => (
                  <label key={opt.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", cursor: "pointer", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <input type="checkbox" checked={wizardConfig.revenue[opt.id]} onChange={(e) => setWizardConfig({...wizardConfig, revenue: {...wizardConfig.revenue, [opt.id]: e.target.checked}})} style={{ accentColor: "#a78bfa", width: "16px", height: "16px" }} />
                    <span style={{ fontSize: "0.85rem", color: "#cbd5e1" }}>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Vibe Override */}
            <div style={{ marginBottom: "30px" }}>
              <label style={{ display: "block", color: "#94a3b8", fontSize: "0.75rem", textTransform: "uppercase", marginBottom: "10px", letterSpacing: "0.05em" }}>Target Audience Vibe (Optional)</label>
              <textarea value={wizardConfig.vibe} onChange={(e) => setWizardConfig({...wizardConfig, vibe: e.target.value})} placeholder="e.g. 'Dark, gritty anime style' or 'Highly professional B2B SaaS tone'..." style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "12px", color: "#e2e8f0", outline: "none", minHeight: "80px", resize: "vertical", fontFamily: "inherit", fontSize: "0.85rem" }} />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button onClick={() => setShowWizard(false)} style={{ padding: "10px 20px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", borderRadius: "6px", cursor: "pointer", fontWeight: "500" }}>Cancel</button>
              <button onClick={handleIncubate} disabled={incubating} style={{ padding: "10px 24px", background: incubating ? "rgba(167,139,250,0.5)" : "linear-gradient(135deg, #a78bfa, #ec4899)", border: "none", color: "#fff", borderRadius: "6px", cursor: incubating ? "wait" : "pointer", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px" }}>
                {incubating ? "🚀 Handing off to Swarm..." : "🚀 Confirm & Incubate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Strategic Blueprint Modal ═══ */}
      {showBlueprint && activeBlueprint && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", zIndex: 1050, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div className="card-glass" style={{ width: "900px", maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto", padding: "0", borderTop: "3px solid #38bdf8", borderBottom: "3px solid #ec4899", display: "flex", flexDirection: "column" }}>
            
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 30px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}>
              <div>
                <div style={{ fontSize: "0.8rem", textTransform: "uppercase", color: "#38bdf8", fontWeight: "600", letterSpacing: "0.05em", marginBottom: "4px" }}>Strategic Channel Blueprint</div>
                <h2 style={{ fontSize: "1.8rem", margin: 0, color: "#fff" }}>{activeBlueprint.nicheName}</h2>
              </div>
              <button onClick={() => setShowBlueprint(false)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "1.5rem" }}>&times;</button>
            </div>

            <div style={{ padding: "30px", display: "flex", flexDirection: "column", gap: "24px" }}>
              
              {/* Hero Hook (Channel Lore) */}
              <div style={{ background: "linear-gradient(135deg, rgba(56,189,248,0.1), rgba(168,85,247,0.1))", borderRadius: "12px", padding: "24px", border: "1px solid rgba(56,189,248,0.2)" }}>
                <div style={{ fontSize: "0.8rem", textTransform: "uppercase", color: "#7dd3fc", fontWeight: "600", marginBottom: "8px" }}>Unique Value Proposition</div>
                <h3 style={{ fontSize: "1.4rem", color: "#fff", margin: "0 0 16px 0", lineHeight: "1.4", fontWeight: "500", fontStyle: "italic" }}>&quot;{activeBlueprint.channelLore?.uniqueValueProposition}&quot;</h3>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <span style={{ background: "rgba(56,189,248,0.15)", color: "#7dd3fc", padding: "6px 12px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: "500" }}>🎨 {activeBlueprint.channelLore?.theme}</span>
                  <span style={{ background: "rgba(168,85,247,0.15)", color: "#d8b4fe", padding: "6px 12px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: "500" }}>🎬 {activeBlueprint.channelLore?.visualStyle}</span>
                </div>
              </div>

              {/* Tactical Split (Market Successes vs Gaps) */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <div style={{ background: "rgba(16,185,129,0.05)", borderRadius: "12px", padding: "20px", border: "1px solid rgba(16,185,129,0.2)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                    <span style={{ fontSize: "1.2rem" }}>✅</span>
                    <h4 style={{ margin: 0, color: "#34d399", fontSize: "1rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Market Successes (Replicate)</h4>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: "20px", color: "#e2e8f0", fontSize: "0.9rem", lineHeight: "1.6", display: "flex", flexDirection: "column", gap: "8px" }}>
                    {activeBlueprint.marketSuccesses?.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>

                <div style={{ background: "rgba(236,72,153,0.05)", borderRadius: "12px", padding: "20px", border: "1px solid rgba(236,72,153,0.2)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                    <span style={{ fontSize: "1.2rem" }}>🎯</span>
                    <h4 style={{ margin: 0, color: "#f472b6", fontSize: "1rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Market Gaps (Exploit)</h4>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: "20px", color: "#e2e8f0", fontSize: "0.9rem", lineHeight: "1.6", display: "flex", flexDirection: "column", gap: "8px" }}>
                    {activeBlueprint.marketGaps?.map((g, i) => <li key={i}>{g}</li>)}
                  </ul>
                </div>
              </div>

              {/* Target Persona Card */}
              <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "12px", padding: "20px", border: "1px solid rgba(255,255,255,0.05)", display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px" }}>
                <div>
                  <h4 style={{ margin: "0 0 16px 0", color: "#cbd5e1", fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Target Audience</h4>
                  <div style={{ marginBottom: "12px" }}>
                    <div style={{ fontSize: "0.7rem", color: "#94a3b8", textTransform: "uppercase", marginBottom: "2px" }}>Demographics</div>
                    <div style={{ color: "#fff", fontSize: "0.85rem" }}>{activeBlueprint.targetAudience?.demographics}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.7rem", color: "#94a3b8", textTransform: "uppercase", marginBottom: "2px" }}>Psychographics</div>
                    <div style={{ color: "#fff", fontSize: "0.85rem" }}>{activeBlueprint.targetAudience?.psychographics}</div>
                  </div>
                </div>
                <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: "8px", padding: "16px", borderLeft: "3px solid #f59e0b" }}>
                  <div style={{ fontSize: "0.7rem", color: "#fbbf24", textTransform: "uppercase", marginBottom: "8px", fontWeight: "600" }}>Ideal Viewer Persona</div>
                  <p style={{ margin: 0, color: "#e2e8f0", fontSize: "0.9rem", lineHeight: "1.6", fontStyle: "italic" }}>&quot;{activeBlueprint.targetAudience?.idealViewerPersona}&quot;</p>
                </div>
              </div>

              {/* KPI Footer (Success Metrics) */}
              <div>
                <h4 style={{ margin: "0 0 12px 0", color: "#cbd5e1", fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Success Metrics & Targets</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                  <div style={{ background: "rgba(255,255,255,0.03)", padding: "16px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)", textAlign: "center" }}>
                    <div style={{ fontSize: "0.7rem", color: "#94a3b8", textTransform: "uppercase", marginBottom: "6px" }}>Target CTR</div>
                    <div style={{ fontSize: "1.4rem", color: "#4ade80", fontWeight: "bold" }}>{activeBlueprint.successMetrics?.targetCtr}</div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.03)", padding: "16px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)", textAlign: "center" }}>
                    <div style={{ fontSize: "0.7rem", color: "#94a3b8", textTransform: "uppercase", marginBottom: "6px" }}>Target AVD</div>
                    <div style={{ fontSize: "1.4rem", color: "#38bdf8", fontWeight: "bold" }}>{activeBlueprint.successMetrics?.targetAvd}</div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.03)", padding: "16px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)", textAlign: "center" }}>
                    <div style={{ fontSize: "0.7rem", color: "#94a3b8", textTransform: "uppercase", marginBottom: "6px" }}>Primary Monetization</div>
                    <div style={{ fontSize: "1.1rem", color: "#f472b6", fontWeight: "600" }}>{activeBlueprint.successMetrics?.primaryMonetization}</div>
                  </div>
                </div>
              </div>

            </div>

            {/* Footer Actions */}
            <div style={{ padding: "20px 30px", background: "rgba(0,0,0,0.2)", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button onClick={() => setShowBlueprint(false)} style={{ padding: "10px 20px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", borderRadius: "6px", cursor: "pointer", fontWeight: "500" }}>Close</button>
              <button onClick={() => {
                setShowBlueprint(false);
                setWizardNiche(activeBlueprint.sourceItem);
                setWizardConfig(prev => ({
                  ...prev, 
                  vibe: `THEME: ${activeBlueprint.channelLore?.theme}\nSTYLE: ${activeBlueprint.channelLore?.visualStyle}\nPERSONA: ${activeBlueprint.targetAudience?.idealViewerPersona}`,
                  targetSubNiche: "none"
                }));
                setShowWizard(true);
              }} style={{ padding: "10px 24px", background: "linear-gradient(135deg, #38bdf8, #ec4899)", border: "none", color: "#fff", borderRadius: "6px", cursor: "pointer", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 4px 15px rgba(236,72,153,0.3)" }}>
                🚀 Incubate Channel with Blueprint
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
