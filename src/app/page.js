"use client";

import React, { useState } from "react";
import AppShell from "@/components/AppShell";
import YouTubeModule from "@/components/modules/YouTubeModule";

const NAV_SECTIONS = [
  { id: "youtube", name: "YouTube Factory", icon: "▶️" }
];

export default function Home() {
  const [activeModule, setActiveModule] = useState(null);

  const renderModuleContent = () => {
    switch (activeModule) {
      case "youtube":
        return <YouTubeModule />;
      default:
        return <AppShell />;
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: 'column' }}>
      <nav style={{ display: 'flex', gap: '1rem', padding: '1rem', borderBottom: '1px solid #333', background: 'transparent' }}>
        {NAV_SECTIONS.map(sec => (
          <button
            key={sec.id}
            onClick={() => setActiveModule(sec.id)}
            style={{ padding: '8px 16px', cursor: 'pointer', background: '#222', color: '#fff', border: 'none', borderRadius: '4px' }}
          >
            {sec.icon} {sec.name}
          </button>
        ))}
        <button
          onClick={() => setActiveModule(null)}
          style={{ padding: '8px 16px', cursor: 'pointer', background: '#222', color: '#fff', border: 'none', borderRadius: '4px' }}
        >
          Back to Main App
        </button>
      </nav>
      <main style={{ flex: 1, overflow: 'hidden' }}>
        {renderModuleContent()}
      </main>
    </div>
  );
}