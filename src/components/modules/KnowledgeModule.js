"use client";

import { useState, useEffect } from "react";
import HelpTooltip from "@/components/HelpTooltip";
import KnowledgeVaultTab from "./knowledge/KnowledgeVaultTab";
import IngestionTab from "./knowledge/IngestionTab";
import ScholarChatTab from "./knowledge/ScholarChatTab";
import SourcesTab from "./knowledge/SourcesTab";
import DriveTab from "./knowledge/DriveTab";

/**
 * Knowledge Module — Brain Vault + Ingestion staging + Scholar chat
 * Fully wired to /api/knowledge/* endpoints
 */
const TABS = ["Knowledge", "Drive", "Ingestion", "Scholar", "Sources"];

export default function KnowledgeModule() {
  const [activeTab, setActiveTab] = useState("Knowledge");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stagedEntries, setStagedEntries] = useState([]);

  // Fetch knowledge status
  useEffect(() => {
    fetch("/api/knowledge/status")
      .then((r) => r.json())
      .then((data) => {
        setStatus(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton skeleton-card" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="module-header">
        <div className="module-header-left">
          <div className="module-icon" style={{ background: "hsla(170, 70%, 45%, 0.12)" }}>🧠</div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h1 className="module-title">Knowledge</h1>
              <HelpTooltip module="knowledge" />
            </div>
            <p className="module-subtitle">
              {status?.stats?.documentsIngested || 0} documents ingested •{" "}
              {status?.scheduledSources?.length || 0} sources configured
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <span className={`badge ${status?.dataStore?.deployed ? "badge-success" : "badge-warning"}`}>
            {status?.dataStore?.deployed ? "Data Store Active" : "Data Store Pending"}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex",
        gap: 4,
        marginBottom: 24,
        borderBottom: "1px solid var(--card-border)",
      }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "10px 18px",
              fontSize: 14,
              fontWeight: activeTab === tab ? 600 : 400,
              color: activeTab === tab ? "var(--accent-hover)" : "var(--text-secondary)",
              borderBottom: activeTab === tab ? "2px solid var(--accent)" : "2px solid transparent",
              transition: "all var(--duration-fast) var(--ease-out)",
              background: "none",
              cursor: "pointer",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ display: activeTab === "Knowledge" ? "block" : "none" }}>
        <KnowledgeVaultTab status={status} setActiveTab={setActiveTab} />
      </div>

      <div style={{ display: activeTab === "Ingestion" ? "block" : "none" }}>
        <IngestionTab
          stagedEntries={stagedEntries}
          setStagedEntries={setStagedEntries}
          setActiveTab={setActiveTab}
        />
      </div>

      <div style={{ display: activeTab === "Scholar" ? "block" : "none" }}>
        <ScholarChatTab stagedEntries={stagedEntries} />
      </div>

      <div style={{ display: activeTab === "Sources" ? "block" : "none" }}>
        <SourcesTab status={status} />
      </div>

      <div style={{ display: activeTab === "Drive" ? "block" : "none" }}>
        <DriveTab />
      </div>
    </div>
  );
}
