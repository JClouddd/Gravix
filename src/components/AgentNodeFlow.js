"use client";

import { motion, AnimatePresence } from "framer-motion";

export default function AgentNodeFlow({ nodes, onMoveNode, status }) {
  return (
    <div className="agent-flow" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <AnimatePresence>
        {nodes.map((node) => (
          <motion.div
            key={node.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="card-glass"
            style={{
              padding: "15px",
              border: "1px solid var(--glass-border)",
              borderRadius: "8px",
              background: "var(--bg-elevated)",
              color: "var(--text-primary)"
            }}
          >
            <h4 style={{ margin: "0 0 10px 0" }}>{node.agent || "Agent Action"}</h4>
            <p style={{ margin: "0 0 15px 0", fontSize: "14px", color: "var(--text-secondary)" }}>{node.action || "Executing..."}</p>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              {status !== "pending" && (
                <button
                  onClick={() => onMoveNode(node.id, "pending")}
                  style={{ background: "transparent", border: "1px solid var(--glass-border)", color: "var(--text-primary)", borderRadius: "4px", padding: "4px 8px", cursor: "pointer", fontSize: "12px" }}
                >
                  Pending
                </button>
              )}
              {status !== "active" && (
                <button
                  onClick={() => onMoveNode(node.id, "active")}
                  style={{ background: "var(--accent-glow)", border: "1px solid var(--accent)", color: "var(--accent)", borderRadius: "4px", padding: "4px 8px", cursor: "pointer", fontSize: "12px" }}
                >
                  Active
                </button>
              )}
              {status !== "completed" && (
                <button
                  onClick={() => onMoveNode(node.id, "completed")}
                  style={{ background: "var(--success-subtle)", border: "1px solid var(--success)", color: "var(--success)", borderRadius: "4px", padding: "4px 8px", cursor: "pointer", fontSize: "12px" }}
                >
                  Complete
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      {nodes.length === 0 && (
        <p style={{ color: "var(--text-secondary)", fontSize: "14px", textAlign: "center" }}>No {status} nodes</p>
      )}
    </div>
  );
}
