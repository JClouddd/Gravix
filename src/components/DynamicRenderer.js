"use client";

import React, { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Headless Agentic Architecture: DynamicRenderer
 * 
 * Instead of Jules writing fragile React code and causing build errors,
 * Jules pushes JSON schemas to Firestore. This component reads those schemas
 * and dynamically renders the UI using a predefined component dictionary.
 * 
 * Schema Structure Example:
 * {
 *   type: "card",
 *   title: "Agent Stats",
 *   children: [
 *     { type: "text", content: "Active sessions: 5" },
 *     { type: "button", label: "Terminate", action: "API_CALL", endpoint: "/api/killswitch" }
 *   ]
 * }
 */
export default function DynamicRenderer({ schemaId }) {
  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!schemaId) return;

    const unsub = onSnapshot(doc(db, "dynamic_ui", schemaId), (docSnap) => {
      if (docSnap.exists()) {
        setSchema(docSnap.data());
      } else {
        setError(`Schema '${schemaId}' not found in Firestore.`);
      }
      setLoading(false);
    }, (err) => {
      console.error("DynamicRenderer Error:", err);
      setError("Failed to sync live UI schema.");
      setLoading(false);
    });

    return () => unsub();
  }, [schemaId]);

  if (loading) return <div className="skeleton skeleton-card" style={{ height: 150 }} />;
  if (error) return <div className="card empty-state" style={{ borderColor: "var(--error)" }}>{error}</div>;
  if (!schema) return null;

  return <SchemaRenderer node={schema} />;
}

/**
 * Recursive renderer function for JSON schema nodes.
 */
function SchemaRenderer({ node, keyPrefix = "root" }) {
  if (!node) return null;

  // Render Array of nodes
  if (Array.isArray(node)) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {node.map((child, idx) => (
          <SchemaRenderer key={`${keyPrefix}-${idx}`} node={child} keyPrefix={`${keyPrefix}-${idx}`} />
        ))}
      </div>
    );
  }

  // Handle specific node types
  switch (node.type) {
    case "card":
      return (
        <div className="card">
          {node.title && <h3 className="h4" style={{ marginBottom: 16 }}>{node.title}</h3>}
          <SchemaRenderer node={node.children} keyPrefix={keyPrefix} />
        </div>
      );

    case "grid":
      return (
        <div className={`grid-${node.columns || "auto"}`} style={{ gap: node.gap || 24 }}>
          <SchemaRenderer node={node.children} keyPrefix={keyPrefix} />
        </div>
      );

    case "text":
      return (
        <p className={node.variant === "caption" ? "caption" : "body-sm"} style={{ color: node.color || "inherit" }}>
          {node.content}
        </p>
      );

    case "badge":
      return (
        <span className={`badge badge-${node.variant || "info"}`}>
          {node.label}
        </span>
      );

    case "button":
      return (
        <button 
          className={`btn btn-${node.variant || "primary"} ${node.size ? `btn-${node.size}` : ""}`}
          onClick={async () => {
            if (node.action === "API_CALL" && node.endpoint) {
              try {
                const res = await fetch(node.endpoint, { method: node.method || "POST" });
                if (res.ok && node.successMessage) alert(node.successMessage);
              } catch (e) {
                console.error("Dynamic action failed:", e);
              }
            }
          }}
        >
          {node.label}
        </button>
      );
      
    case "gauge":
      // A simple placeholder for gauges
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, height: 8, background: "var(--bg-tertiary)", borderRadius: 4, overflow: "hidden" }}>
             <div style={{ width: `${node.progress || 0}%`, height: "100%", background: node.color || "var(--accent)" }} />
          </div>
          <span className="caption">{node.progress}%</span>
        </div>
      );

    default:
      // Fallback for unknown types
      return (
        <div style={{ padding: 8, border: "1px dashed var(--warning)", color: "var(--warning)" }}>
          Unknown component type: {node.type}
        </div>
      );
  }
}
