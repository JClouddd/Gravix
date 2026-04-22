"use client";

import React from "react";

export default function YouTubeModule() {
  const columns = ["Ideation", "Scripting", "Production", "Review", "Published"];

  return (
    <div style={{ padding: "20px", height: "100%", overflowY: "auto" }}>
      <h2 style={{ marginBottom: "20px" }}>YouTube Factory</h2>
      <div
        style={{
          display: "flex",
          gap: "20px",
          overflowX: "auto",
          paddingBottom: "10px",
          height: "calc(100% - 60px)",
        }}
      >
        {columns.map((col) => (
          <div
            key={col}
            className="card-glass"
            style={{
              flex: "0 0 300px",
              display: "flex",
              flexDirection: "column",
              padding: "15px",
            }}
          >
            <h3 style={{ borderBottom: "1px solid #333", paddingBottom: "10px", marginBottom: "15px" }}>
              {col}
            </h3>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px" }}>
              {/* Items will go here */}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
