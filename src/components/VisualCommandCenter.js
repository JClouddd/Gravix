"use client";

import { useEffect, useState } from "react";
import AgentNodeFlow from "./AgentNodeFlow";

export default function VisualCommandCenter() {
  const [nodes, setNodes] = useState([]);

  useEffect(() => {
    const connectSSE = () => {
      const eventSource = new EventSource('/api/events/sse');

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "agent_action" || data.type === "node_update") {
            const newNode = {
              id: data.payload.id || crypto.randomUUID(),
              status: data.payload.status || "pending",
              ...data.payload
            };
            setNodes((prev) => {
              // Update if exists, else append
              const exists = prev.find(n => n.id === newNode.id);
              if (exists) {
                return prev.map(n => n.id === newNode.id ? newNode : n);
              }
              return [...prev, newNode];
            });
          }
        } catch (e) {
          console.error("SSE parse error:", e);
        }
      };

      return () => eventSource.close();
    };

    const cleanup = connectSSE();
    return cleanup;
  }, []);

  const moveNode = (id, newStatus) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, status: newStatus } : n));
  };

  const columns = ["pending", "active", "completed"];

  return (
    <div className="vcc-container" style={{ padding: "20px" }}>
      <h2 style={{ color: "var(--text-primary)", marginBottom: "20px" }}>Visual Command Center</h2>
      <div style={{ display: "flex", gap: "20px", overflowX: "auto" }}>
        {columns.map(status => (
          <div key={status} style={{ flex: 1, minWidth: "300px", background: "var(--bg-secondary)", padding: "15px", borderRadius: "8px" }}>
            <h3 style={{ color: "var(--text-primary)", textTransform: "capitalize", marginBottom: "15px" }}>{status}</h3>
            <AgentNodeFlow
              nodes={nodes.filter(n => n.status === status)}
              onMoveNode={moveNode}
              status={status}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
