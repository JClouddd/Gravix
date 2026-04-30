"use client";

import { useState, useEffect, useCallback } from "react";
import HelpTooltip from "@/components/HelpTooltip";
import ModuleSettingsPanel, { GearButton } from "@/components/shared/ModuleSettingsPanel";
import KnowledgeVaultTab from "./knowledge/KnowledgeVaultTab";
import IngestionTab from "./knowledge/IngestionTab";
import ScholarChatTab from "./knowledge/ScholarChatTab";
import SourcesTab from "./knowledge/SourcesTab";
import GraphTab from "./knowledge/GraphTab";
import PipelineReportsTab from "./knowledge/PipelineReportsTab";
import NotebooksTab from "./knowledge/NotebooksTab";

/**
 * Knowledge Module — Brain Vault + Ingestion staging + Scholar chat
 * Fully wired to /api/knowledge/* endpoints
 */
const TABS = ["Knowledge", "Graph", "Notebooks", "Ingestion", "Pipeline Reports", "Scholar", "Sources"];

export default function KnowledgeModule() {
  const [activeTab, setActiveTab] = useState("Knowledge");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stagedEntries, setStagedEntries] = useState([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const KNOWLEDGE_SETTINGS_SCHEMA = [];

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (!file) return;

    setUploadProgress(10);
    try {
      const fileName = `${Date.now()}_${file.name}`;

      const signedUrlRes = await fetch("/api/knowledge/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName, fileType: file.type })
      });

      if (!signedUrlRes.ok) {
        throw new Error("Failed to get signed URL");
      }

      const { url, gcsUri } = await signedUrlRes.json();

      setUploadProgress(40);

      const uploadRes = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload to GCS");
      }

      setUploadProgress(70);

      const res = await fetch("/api/knowledge/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: gcsUri,
          type: "file",
          fileName: file.name,
          source: "manual",
        }),
      });

      setUploadProgress(90);
      const data = await res.json();
      setUploadProgress(100);

      if (res.ok && data.success) {
        setStagedEntries((prev) => [data.entry || data, ...prev]);
        setActiveTab("Ingestion");
        setTimeout(() => setUploadProgress(0), 1500);
      } else {
        setUploadProgress(0);
        console.error("Ingestion failed:", data.error);
      }
    } catch (err) {
      console.error("Upload error:", err);
      setUploadProgress(0);
    }
  }, []);

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
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      style={{ position: "relative", minHeight: "100%" }}
    >
      {isDragging && (
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "4px dashed var(--accent)",
          borderRadius: "var(--radius-lg)"
        }}>
          <h2 style={{ color: "white" }}>Drop files to upload directly to GCS</h2>
        </div>
      )}

      {uploadProgress > 0 && (
        <div className="card" style={{ padding: "16px", marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span className="caption">Uploading & Processing...</span>
            <span className="caption">{uploadProgress}%</span>
          </div>
          <div style={{ width: "100%", height: 6, background: "var(--bg-tertiary)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${uploadProgress}%`,
              background: "var(--accent)",
              transition: "width 0.3s ease-out"
            }} />
          </div>
        </div>
      )}

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
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className={`badge ${status?.dataStore?.deployed ? "badge-success" : "badge-warning"}`}>
            {status?.dataStore?.deployed ? "Data Store Active" : "Data Store Pending"}
          </span>
          <GearButton onClick={() => setIsSettingsOpen(!isSettingsOpen)} />
        </div>
      </div>

      <ModuleSettingsPanel
        moduleId="knowledge"
        title="Knowledge Module Settings"
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={KNOWLEDGE_SETTINGS_SCHEMA}
      />

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

      <div style={{ display: activeTab === "Graph" ? "block" : "none" }}>
        <GraphTab />
      </div>

      <div style={{ display: activeTab === "Notebooks" ? "block" : "none" }}>
        <NotebooksTab />
      </div>

      <div style={{ display: activeTab === "Ingestion" ? "block" : "none" }}>
        <IngestionTab
          status={status}
          stagedEntries={stagedEntries}
          setStagedEntries={setStagedEntries}
          setActiveTab={setActiveTab}
        />
      </div>

      <div style={{ display: activeTab === "Pipeline Reports" ? "block" : "none" }}>
        <PipelineReportsTab />
      </div>

      <div style={{ display: activeTab === "Scholar" ? "block" : "none" }}>
        <ScholarChatTab />
      </div>

      <div style={{ display: activeTab === "Sources" ? "block" : "none" }}>
        <SourcesTab status={status} />
      </div>
    </div>
  );
}
