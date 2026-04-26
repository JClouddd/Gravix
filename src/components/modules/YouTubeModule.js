"use client";

import React, { useState } from "react";

export default function YouTubeModule() {
  const columns = ["Ideation", "Scripting", "Production", "Review", "Published"];

  const [trends, setTrends] = useState([]);
  const [masterScript, setMasterScript] = useState(null);
  const [dispatchStatus, setDispatchStatus] = useState(null);
  const [assemblyStatus, setAssemblyStatus] = useState(null);

  const fetchTrends = async () => {
    try {
      const res = await fetch("/api/youtube/trends");
      const data = await res.json();
      setTrends(data.trends || []);
    } catch (error) {
      console.error("Failed to fetch trends", error);
    }
  };

  const generateMasterScript = async () => {
    window.dispatchEvent(
      new CustomEvent("add-toast", {
        detail: { title: "Queued to Background", message: "Master Script Generation started", type: "info" },
      })
    );
    try {
      const res = await fetch("/api/youtube/incubation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: "AI Trends", audience: "Developers" }),
      });
      const data = await res.json();
      setMasterScript(data.data);
    } catch (error) {
      console.error("Failed to generate master script", error);
    }
  };

  const dispatchProvider = async () => {
    window.dispatchEvent(
      new CustomEvent("add-toast", {
        detail: { title: "Queued to Background", message: "Dynamic Provider Dispatch (Veo 3) started", type: "info" },
      })
    );
    try {
      const res = await fetch("/api/youtube/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "veo", prompt: "A robot reading code" }),
      });
      const data = await res.json();
      setDispatchStatus(data);
    } catch (error) {
      console.error("Failed to dispatch provider", error);
    }
  };

  const assembleVideo = async () => {
    window.dispatchEvent(
      new CustomEvent("add-toast", {
        detail: { title: "Queued to Background", message: "Cloud Run FFmpeg Assembly started", type: "info" },
      })
    );
    try {
      const res = await fetch("/api/youtube/assembly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assets: ["/tmp/asset1.mp4", "/tmp/asset2.mp4"] }),
      });
      const data = await res.json();
      setAssemblyStatus(data);
    } catch (error) {
      console.error("Failed to assemble video", error);
    }
  };

  return (
    <div style={{ padding: "20px", height: "100%", overflowY: "auto" }}>
      <h2 style={{ marginBottom: "20px" }}>YouTube Factory - Pilot Sandbox</h2>

      <div style={{ marginBottom: "20px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button onClick={fetchTrends} style={{ padding: "8px 16px", cursor: "pointer" }} className="card-glass">
          Fetch Trends (Incubation)
        </button>
        <button onClick={generateMasterScript} style={{ padding: "8px 16px", cursor: "pointer" }} className="card-glass">
          Generate Master Script
        </button>
        <button onClick={dispatchProvider} style={{ padding: "8px 16px", cursor: "pointer" }} className="card-glass">
          Dispatch Veo 3
        </button>
        <button onClick={assembleVideo} style={{ padding: "8px 16px", cursor: "pointer" }} className="card-glass">
          Assemble Video
        </button>
      </div>

      <div style={{ display: "flex", gap: "20px", marginBottom: "20px", flexWrap: "wrap" }}>
        {trends.length > 0 && (
          <div className="card-glass" style={{ padding: "15px", flex: "1 1 300px" }}>
            <h4>Trending Topics:</h4>
            <ul>
              {trends.map((t, idx) => <li key={idx}>{t}</li>)}
            </ul>
          </div>
        )}

        {masterScript && (
          <div className="card-glass" style={{ padding: "15px", flex: "1 1 300px", maxHeight: "200px", overflowY: "auto" }}>
            <h4>Master Script:</h4>
            <pre style={{ whiteSpace: "pre-wrap", fontSize: "12px" }}>{JSON.stringify(masterScript, null, 2)}</pre>
          </div>
        )}

        {dispatchStatus && (
          <div className="card-glass" style={{ padding: "15px", flex: "1 1 300px" }}>
            <h4>Dispatch Status:</h4>
            <pre style={{ whiteSpace: "pre-wrap", fontSize: "12px" }}>{JSON.stringify(dispatchStatus, null, 2)}</pre>
          </div>
        )}

        {assemblyStatus && (
          <div className="card-glass" style={{ padding: "15px", flex: "1 1 300px" }}>
            <h4>Assembly Status:</h4>
            <pre style={{ whiteSpace: "pre-wrap", fontSize: "12px" }}>{JSON.stringify(assemblyStatus, null, 2)}</pre>
          </div>
        )}
      </div>

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
