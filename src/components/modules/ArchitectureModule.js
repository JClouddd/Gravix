"use client";

import React, { useEffect, useState } from "react";
import HelpTooltip from "@/components/HelpTooltip";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function ArchitectureModule() {
  const [activeNode, setActiveNode] = useState(null);
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

  const handleNodeClick = (nodeId, hasChildren) => {
    if (hasChildren) {
      setZoomedNode(nodeId);
    }
  };

  return (
    <div className="card" style={{ position: "relative", height: "600px", display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg-secondary)", border: "1px solid var(--card-border)" }}>
      {/* Header Controls */}
      <div style={{ position: "absolute", top: 20, left: 20, zIndex: 10, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="module-icon" style={{ background: "var(--accent-subtle)", width: 32, height: 32, fontSize: 16 }}>🪐</div>
          <h3 className="h4" style={{ margin: 0 }}>Omni-Flow Architecture</h3>
          <HelpTooltip module="architecture" />
        </div>
        {zoomedNode && (
          <button className="btn btn-secondary btn-sm" onClick={() => setZoomedNode(null)} style={{ alignSelf: "flex-start", marginTop: 8 }}>
            ← Back to Galaxy
          </button>
        )}
      </div>

      <div style={{ position: "absolute", top: 20, right: 20, zIndex: 10 }}>
         <span className="badge badge-accent pulse">Live Telemetry Active</span>
      </div>

      {/* Orbital Graph Area */}
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

          return (
            <div key={node.id} style={{
              position: "absolute",
              transform: `translate(${x}px, ${y}px)`,
              zIndex: 3,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              cursor: node.hasChildren ? "pointer" : "default",
              transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)"
            }}
            className={node.hasChildren ? "node-hover has-children" : "node-hover"}
            onClick={() => handleNodeClick(node.id, node.hasChildren)}
            onMouseEnter={() => setActiveNode(node)}
            onMouseLeave={() => setActiveNode(null)}
            >
              <div style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${color}, #1a1a2e)`,
                border: `2px solid ${color}`,
                boxShadow: `0 0 15px ${glow}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: 10,
                fontWeight: "bold",
                marginBottom: 6
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
                border: "1px solid rgba(255,255,255,0.1)",
                color: "white",
                fontSize: 10,
                fontWeight: 600,
                whiteSpace: "nowrap"
              }}>
                {node.label}
              </div>
            </div>
          );
        })}

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

      {/* Info Panel Overlay */}
      {activeNode && (
        <div className="card-glass" style={{
          position: "absolute",
          bottom: 20,
          right: 20,
          width: 280,
          zIndex: 20,
          animation: "fadeIn 0.2s ease-out"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <h3 className="h4" style={{ margin: 0 }}>{activeNode.label}</h3>
            {activeNode.hasChildren && <span className="badge badge-info">Click to Zoom</span>}
            {activeNode.isDynamic && <span className="badge badge-accent">Auto-Discovered</span>}
          </div>
          <p className="caption" style={{ color: "var(--text-secondary)", margin: 0 }}>{activeNode.desc}</p>
        </div>
      )}
    </div>
  );
}
