"use client";

import React, { useState } from "react";

export default function YouTubeModule() {
  const columns = ["Ideation", "Scripting", "Production", "Review", "Published"];

  const [trends, setTrends] = useState([]);

  const fetchTrends = async () => {
    try {
      const res = await fetch("/api/youtube/trends");
      const data = await res.json();
      setTrends(data.trends || []);
    } catch (error) {
      console.error("Failed to fetch trends", error);
    }
  };

  const simulateHeavyTask = (taskName, url, body) => {
    window.dispatchEvent(
      new CustomEvent("add-toast", {
        detail: { title: "Queued to Background", message: `${taskName} started`, type: "info" },
      })
    );
    // Asynchronous task execution without blocking the UI
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch((err) => console.error(err));
  };

  return (
    <div style={{ padding: "20px", height: "100%", overflowY: "auto" }}>
      <h2 style={{ marginBottom: "20px" }}>YouTube Factory - Pilot Sandbox</h2>

      <div style={{ marginBottom: "20px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button onClick={fetchTrends} style={{ padding: "8px 16px", cursor: "pointer" }} className="card-glass">
          Fetch Trends (Incubation)
        </button>
        <button onClick={() => simulateHeavyTask("Master Script Generation", "/api/youtube/incubation", { topic: "AI Trends", audience: "Developers" })} style={{ padding: "8px 16px", cursor: "pointer" }} className="card-glass">
          Generate Master Script
        </button>
        <button onClick={() => simulateHeavyTask("Dynamic Provider Dispatch (Veo 3)", "/api/youtube/dispatch", { provider: "veo", prompt: "A robot reading code" })} style={{ padding: "8px 16px", cursor: "pointer" }} className="card-glass">
          Dispatch Veo 3
        </button>
        <button onClick={() => simulateHeavyTask("Cloud Run FFmpeg Assembly", "/api/youtube/assembly", { assets: ["asset1", "asset2"] })} style={{ padding: "8px 16px", cursor: "pointer" }} className="card-glass">
          Assemble Video
        </button>
      </div>

      {trends.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <h4>Trending Topics:</h4>
          <ul>
            {trends.map((t, idx) => <li key={idx}>{t}</li>)}
          </ul>
        </div>
      )}

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
