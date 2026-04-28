"use client";

import React, { useEffect, useState } from "react";
import HelpTooltip from "@/components/HelpTooltip";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function ArchitectureModule() {
  const [activeNode, setActiveNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [nodeData, setNodeData] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [zoomedNode, setZoomedNode] = useState(null);
  const [dynamicNodes, setDynamicNodes] = useState([]);

  // Live Auto-Discovery API Registry
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "system_architecture"), (snapshot) => {
      const liveNodes = [];
      snapshot.forEach(doc => {
        liveNodes.push({ id: doc.id, ...doc.data(), isDynamic: true });
      });
      setDynamicNodes(liveNodes);
    }, (err) => console.error("Architecture Auto-Discovery Error:", err));
    return () => unsub();
  }, []);

  // Elaborate Data Fetching for Selected Node
  useEffect(() => {
    if (!selectedNode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNodeData(null);
      return;
    }
     
    setLoadingData(true);
    let url = "";

    if (selectedNode.id === "pillar-brain" || selectedNode.id === "matrix-schedule" || selectedNode.id === "matrix-knowledge") {
      url = "/api/agents/roster";
    } else if (selectedNode.id === "api-jules") {
      url = "/api/jules/tasks";
    } else if (selectedNode.id === "pillar-storage") {
      url = "/api/knowledge/status";
    } else if (selectedNode.id === "pillar-ingest") {
      url = "/api/knowledge/status";
    }

    if (url) {
      fetch(url)
        .then(r => r.json())
        .then(data => {
          setNodeData(data);
          setLoadingData(false);
        })
        .catch(err => {
          console.error("Node Fetch Error:", err);
          setNodeData({ error: "Failed to load live telemetry." });
          setLoadingData(false);
        });
    } else {
      setNodeData({ info: "No active API telemetry configured for this node." });
      setLoadingData(false);
    }
  }, [selectedNode]);


  // Fixed Core Nodes (4 Pillars + Pipelines + Matrices)
  const coreNodes = [
    // 4 Essential Pillars
    { id: "pillar-ui", label: "Antigravity Hub", type: "hub", desc: "Headless Schema-Driven UI Router", orbit: 0, angle: 0 },
    { id: "pillar-brain", label: "The Brain (Vertex AI)", type: "ai", desc: "Enterprise LLM Routing & Agent Swarm", orbit: 1, angle: 90 },
    { id: "pillar-storage", label: "Omni-Vault (BigQuery)", type: "data", desc: "Structured Data Lake & RAG Foundation", orbit: 1, angle: 210 },
    { id: "pillar-ingest", label: "Ingestion Swarm", type: "pipeline", desc: "Cloud Batch Autonomous Processing", orbit: 1, angle: 330, hasChildren: true },
    
    // Matrices (Phase E)
    { id: "matrix-schedule", label: "Scheduling Matrix", type: "ai", desc: "Constraint-Based Task Logic", orbit: 2, angle: 45 },
    { id: "matrix-knowledge", label: "Knowledge Matrix", type: "ai", desc: "Predictive Text & Interactive Nodes", orbit: 2, angle: 135 },
    
    // External Base APIs (Hardcoded fallback if registry is empty)
    { id: "api-jules", label: "Jules CI/CD", type: "ai", desc: "Autonomous Pipeline", orbit: 2, angle: 225, hasChildren: true },
    { id: "api-calendar", label: "Calendar API", type: "external", desc: "Bi-Directional Sync", orbit: 2, angle: 315 },
  ];

  // Micro-nodes shown only when Zoomed
  const childNodes = {
    "pillar-ingest": [
      { id: "ingest-ffmpeg", label: "FFMPEG Chunker", type: "pipeline", desc: "Splits videos to bypass quotas", orbit: 1, angle: 0 },
      { id: "ingest-gemini", label: "Gemini Sorter", type: "ai", desc: "Flash 2.5 JSON Synthesis", orbit: 1, angle: 120 },
      { id: "ingest-vertex", label: "Vertex Sync", type: "external", desc: "Incremental Webhook", orbit: 1, angle: 240 },
    ],
    "api-jules": [
      { id: "jules-pr", label: "GitHub PR Queue", type: "external", desc: "Pull Request Automation", orbit: 1, angle: 0 },
      { id: "jules-locks", label: "File Lock System", type: "data", desc: "Prevents Merge Conflicts", orbit: 1, angle: 180 },
    ]
  };

  // Combine Core + Dynamic, but assign dynamic nodes to Orbit 3
  const allTopLevelNodes = [...coreNodes];
  dynamicNodes.forEach((dn, i) => {
    // Prevent duplicates if already in core
    if (!allTopLevelNodes.find(n => n.id === dn.id)) {
      allTopLevelNodes.push({
        ...dn,
        orbit: 3,
        angle: (i * (360 / Math.max(dynamicNodes.length, 1))) % 360
      });
    }
  });

  // Determine which nodes to render based on Zoom State
  const nodesToRender = zoomedNode ? childNodes[zoomedNode] || [] : allTopLevelNodes;
  
  // Center Hub changes if zoomed
  const centerNode = zoomedNode 
    ? allTopLevelNodes.find(n => n.id === zoomedNode) 
    : coreNodes[0];

  const handleNodeClick = (node) => {
    setSelectedNode(node);
    if (node.hasChildren) {
      setZoomedNode(node.id);
    }
  };

  return (
    <div className="card" style={{ position: "relative", height: "600px", display: "flex", flexDirection: "row", overflow: "hidden", background: "var(--bg-secondary)", border: "1px solid var(--card-border)" }}>
      {/* Orbital Graph Area (Left side) */}
      <div style={{ flex: selectedNode ? "0 0 65%" : "1", position: "relative", display: "flex", flexDirection: "column", transition: "all 0.4s ease" }}>
        {/* Header Controls */}
        <div style={{ position: "absolute", top: 20, left: 20, zIndex: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="module-icon" style={{ background: "var(--accent-subtle)", width: 32, height: 32, fontSize: 16 }}>🪐</div>
            <h3 className="h4" style={{ margin: 0 }}>Omni-Flow Architecture</h3>
            <HelpTooltip module="architecture" />
          </div>
          {zoomedNode && (
            <button className="btn btn-secondary btn-sm" onClick={() => { setZoomedNode(null); setSelectedNode(null); }} style={{ alignSelf: "flex-start", marginTop: 8 }}>
              ← Back to Galaxy
            </button>
          )}
        </div>

        <div style={{ position: "absolute", top: 20, right: 20, zIndex: 10 }}>
          <span className="badge badge-accent pulse">Live Telemetry Active</span>
        </div>

        <div style={{ 
          flex: 1, 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center",
          position: "relative",
          background: "radial-gradient(circle at center, rgba(15, 52, 96, 0.2) 0%, transparent 70%)"
        }}>
          
          {/* Center Node */}
          <div style={{
            position: "absolute",
            width: 100,
            height: 100,
            borderRadius: "50%",
            background: centerNode?.type === "hub" ? "linear-gradient(135deg, #00d4ff, var(--accent))" : "linear-gradient(135deg, #a855f7, #ec4899)",
            boxShadow: "0 0 40px rgba(0, 212, 255, 0.4), inset 0 0 20px rgba(255,255,255,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            zIndex: 5,
            transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)"
          }}>
            <span style={{ fontSize: 24, fontWeight: "bold", color: "white", textAlign: "center", padding: "0 10px", lineHeight: 1.2 }}>
              {centerNode?.label.split(" ")[0]}
            </span>
          </div>

          {/* Orbit Rings */}
          {!zoomedNode && (
            <>
              <div className="orbit-ring" style={{ width: 280, height: 280, animationDirection: "normal" }}></div>
              <div className="orbit-ring" style={{ width: 440, height: 440, animationDirection: "reverse", animationDuration: "120s" }}></div>
              <div className="orbit-ring" style={{ width: 600, height: 600, animationDirection: "normal", animationDuration: "180s", opacity: 0.3 }}></div>
            </>
          )}
          {zoomedNode && (
            <div className="orbit-ring" style={{ width: 300, height: 300, animationDirection: "normal", animationDuration: "40s" }}></div>
          )}

          {/* Nodes */}
          {nodesToRender.map((node) => {
            if (node.orbit === 0) return null; // Center node
            
            const radius = zoomedNode ? 150 : (node.orbit === 1 ? 140 : node.orbit === 2 ? 220 : 300);
            const rad = (node.angle * Math.PI) / 180;
            const x = Math.cos(rad) * radius;
            const y = Math.sin(rad) * radius;

            let color = "#fff";
            let glow = "rgba(255,255,255,0.2)";
            if (node.type === "ai") { color = "#a855f7"; glow = "rgba(168,85,247,0.5)"; }
            if (node.type === "data") { color = "#ec4899"; glow = "rgba(236,72,153,0.5)"; }
            if (node.type === "external") { color = "#f59e0b"; glow = "rgba(245,158,11,0.5)"; }
            if (node.type === "pipeline") { color = "#10b981"; glow = "rgba(16,185,129,0.5)"; }

            const isSelected = selectedNode?.id === node.id;

            return (
              <div key={node.id} style={{
                position: "absolute",
                transform: `translate(${x}px, ${y}px)`,
                zIndex: isSelected ? 15 : 3,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                cursor: "pointer",
                transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)"
              }}
              className={`node-hover ${node.hasChildren ? "has-children" : ""}`}
              onClick={() => handleNodeClick(node)}
              onMouseEnter={() => setActiveNode(node)}
              onMouseLeave={() => setActiveNode(null)}
              >
                <div style={{
                  width: isSelected ? 48 : 40,
                  height: isSelected ? 48 : 40,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${color}, #1a1a2e)`,
                  border: isSelected ? `3px solid white` : `2px solid ${color}`,
                  boxShadow: isSelected ? `0 0 25px ${color}` : `0 0 15px ${glow}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: 10,
                  fontWeight: "bold",
                  marginBottom: 6,
                  transition: "all 0.2s ease"
                }}>
                  {node.type === "ai" && "AI"}
                  {node.type === "data" && "DB"}
                  {node.type === "external" && "API"}
                  {node.type === "pipeline" && "⚙️"}
                </div>
                <div style={{
                  background: "rgba(0,0,0,0.7)",
                  padding: "2px 6px",
                  borderRadius: 4,
                  backdropFilter: "blur(4px)",
                  border: isSelected ? `1px solid ${color}` : "1px solid rgba(255,255,255,0.1)",
                  color: isSelected ? color : "white",
                  fontSize: 10,
                  fontWeight: 600,
                  whiteSpace: "nowrap"
                }}>
                  {node.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Global Styles */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes spin {
            100% { transform: rotate(360deg); }
          }
          .orbit-ring {
            position: absolute;
            border-radius: 50%;
            border: 1px dashed rgba(255, 255, 255, 0.15);
            z-index: 1;
            animation: spin 80s linear infinite;
          }
          .node-hover {
            opacity: 0.9;
          }
          .node-hover:hover {
            transform: translate(calc(var(--x, 0px) * 1.05), calc(var(--y, 0px) * 1.05)) scale(1.15) !important;
            z-index: 10 !important;
            opacity: 1;
          }
          .has-children {
            filter: drop-shadow(0 0 8px rgba(255,255,255,0.3));
          }
          .has-children:hover {
            filter: drop-shadow(0 0 12px rgba(255,255,255,0.8));
          }
        `}} />
      </div>

      {/* Elaborate Details Panel (Right side) */}
      {selectedNode && (
        <div style={{
          flex: "0 0 35%",
          borderLeft: "1px solid var(--card-border)",
          background: "var(--bg-primary)",
          display: "flex",
          flexDirection: "column",
          animation: "slideInRight 0.3s ease-out",
          overflow: "auto"
        }}>
          <div style={{ padding: 20, borderBottom: "1px solid var(--card-border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h3 className="h3" style={{ margin: "0 0 8px 0" }}>{selectedNode.label}</h3>
              <p className="caption" style={{ color: "var(--text-secondary)", margin: 0 }}>{selectedNode.desc}</p>
            </div>
            <button className="btn-icon" onClick={() => setSelectedNode(null)} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}>
              ✕
            </button>
          </div>
          
          <div style={{ padding: 20, flex: 1 }}>
            <h4 className="h5" style={{ color: "var(--text-secondary)", marginBottom: 12 }}>Live Telemetry</h4>
            
            {loadingData ? (
              <div className="skeleton skeleton-text" style={{ width: "100%", height: 100 }}></div>
            ) : nodeData ? (
              <div className="card-glass" style={{ padding: 16, background: "rgba(0,0,0,0.2)" }}>
                {/* Brain / Agent Nodes */}
                {nodeData.agents && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span className="caption text-secondary">Active Agents</span>
                      <span className="badge badge-success">{nodeData.agents.length} Online</span>
                    </div>
                    {nodeData.agents.slice(0, 3).map(agent => (
                      <div key={agent.id} style={{ fontSize: 12, borderLeft: "2px solid var(--accent)", paddingLeft: 8 }}>
                        <strong>{agent.name}</strong> - {agent.model}
                      </div>
                    ))}
                    {nodeData.agents.length > 3 && <div className="caption text-tertiary">+{nodeData.agents.length - 3} more agents</div>}
                  </div>
                )}

                {/* Jules Node */}
                {nodeData.sessions !== undefined && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span className="caption text-secondary">Jules Queue</span>
                      <span className="badge badge-accent">{nodeData.sessions.length} Tasks</span>
                    </div>
                    {nodeData.sessions.length === 0 ? (
                      <span className="caption text-tertiary">All pipelines clear.</span>
                    ) : (
                      nodeData.sessions.map(t => (
                         <div key={t.id} style={{ fontSize: 12, borderLeft: "2px solid var(--urgent, #ff4d4f)", paddingLeft: 8 }}>
                           {t.title || "Anonymous PR"}
                         </div>
                      ))
                    )}
                    <button className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={() => fetch("/api/sentinel/diagnose", { method: "POST" })}>
                      Trigger Diagnostics
                    </button>
                  </div>
                )}

                {/* Knowledge / Storage Node */}
                {nodeData.stats && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span className="caption text-secondary">Documents</span>
                      <span className="badge badge-info">{nodeData.stats.documentsIngested || 0}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span className="caption text-secondary">Data Store</span>
                      <span className={`badge ${nodeData.dataStore?.deployed ? "badge-success" : "badge-warning"}`}>
                        {nodeData.dataStore?.deployed ? "Live" : "Pending"}
                      </span>
                    </div>
                  </div>
                )}

                {/* Generic / Error */}
                {nodeData.error && <div style={{ color: "var(--urgent, #ff4d4f)", fontSize: 12 }}>{nodeData.error}</div>}
                {nodeData.info && <div style={{ color: "var(--text-tertiary)", fontSize: 12 }}>{nodeData.info}</div>}
              </div>
            ) : null}

            {/* Matrix Properties */}
            <div style={{ marginTop: 24 }}>
              <h4 className="h5" style={{ color: "var(--text-secondary)", marginBottom: 12 }}>Node Metadata</h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <span className="badge badge-neutral">Orbit {selectedNode.orbit}</span>
                <span className="badge badge-neutral">Type: {selectedNode.type}</span>
                {selectedNode.isDynamic && <span className="badge badge-accent pulse">Auto-Discovered</span>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
