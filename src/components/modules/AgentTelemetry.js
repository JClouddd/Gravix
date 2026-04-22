"use client";

import { useEffect, useState, useRef } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function AgentTelemetry() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState("Connecting...");

  useEffect(() => {
    const eventSource = new EventSource(process.env.NEXT_PUBLIC_VERTEX_TELEMETRY_ENDPOINT || "/api/telemetry/sse");

    eventSource.onopen = () => {
      setConnectionStatus("Connected");
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "spawn") {
          setNodes((prev) => {
            if (prev.some(n => n.id === data.id)) return prev;
            return [...prev, {
              id: data.id || data.nodeId,
              agent: data.agent || data.model,
              status: data.status || data.state,
              timestamp: data.timestamp
            }];
          });

          if (data.parentId) {
            setEdges((prev) => {
              if (prev.some(e => e.source === data.parentId && e.target === data.id)) return prev;
              return [...prev, {
                source: data.parentId,
                target: data.id
              }];
            });
          }
        }
      } catch (err) {
        console.error("Error parsing telemetry event:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("EventSource error:", err);
      setConnectionStatus("Error / Reconnecting");
      // EventSource automatically attempts to reconnect
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <div className="telemetry-module" style={{ padding: "20px", height: "100%", display: "flex", flexDirection: "column", gap: "20px" }}>
      <header className="telemetry-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Agent Telemetry</h2>
        <div className="status-badge" style={{
          padding: "4px 8px",
          borderRadius: "4px",
          backgroundColor: connectionStatus === "Connected" ? "var(--success)" : "var(--error)",
          color: "#fff",
          fontSize: "12px"
        }}>
          {connectionStatus}
        </div>
      </header>

      <div className="dag-container card card-glass" style={{
        flex: 1,
        overflow: "auto",
        position: "relative",
        padding: "20px"
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "20px",
          position: "relative",
          zIndex: 1
        }}>
          {nodes.map(node => (
            <div key={node.id} className="dag-node" style={{
              padding: "15px",
              borderRadius: "8px",
              border: `1px solid ${node.agent === "gemini-2.5-flash" ? "var(--accent)" : "var(--agent-builder)"}`,
              backgroundColor: "var(--bg-secondary)",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
              display: "flex",
              flexDirection: "column",
              gap: "8px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: "bold", fontSize: "14px" }}>{node.id}</span>
                <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", backgroundColor: "var(--bg-primary)" }}>{node.status}</span>
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                {node.agent}
              </div>

              {/* Display child links here for simplicity without actual SVG lines */}
              <div style={{ marginTop: "10px", fontSize: "11px", color: "var(--text-tertiary)" }}>
                Parents: {edges.filter(e => e.target === node.id).map(e => e.source).join(", ") || "None"}
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                Children: {edges.filter(e => e.source === node.id).map(e => e.target).join(", ") || "None"}
              </div>
            </div>
          ))}
          {nodes.length === 0 && <div style={{ color: "var(--text-secondary)" }}>Waiting for telemetry data...</div>}
        </div>
      </div>
    </div>
  );
}
