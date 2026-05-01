"use client";

import React from "react";

export default function NotebooksTab() {
  return (
    <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
      <div style={{ fontSize: "3rem", marginBottom: "16px" }}>📓</div>
      <h3>Notebooks</h3>
      <p>Interactive notebooks and scratchpads linked to Agent Skills.</p>
      <div style={{ marginTop: "24px" }} className="badge badge-warning">Coming Soon</div>
    </div>
  );
}
