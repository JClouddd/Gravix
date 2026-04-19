"use client";

import { useState, useEffect, useCallback } from "react";

function getIconForMimeType(mimeType) {
  if (!mimeType) return "📎";
  if (mimeType.includes("folder")) return "📁";
  if (mimeType.includes("document")) return "📄";
  if (mimeType.includes("spreadsheet")) return "📊";
  if (mimeType.includes("presentation")) return "📝";
  if (mimeType.includes("image")) return "🖼️";
  if (mimeType.includes("pdf")) return "📄";
  return "📎";
}

function formatSize(bytes) {
  if (!bytes) return "";
  const size = parseInt(bytes, 10);
  if (isNaN(size)) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRelativeTime(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 172800) return "Yesterday";
  return date.toLocaleDateString();
}

function truncateName(name, maxLength = 30) {
  if (!name) return "";
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength) + "...";
}

export default function DriveModule() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // "grid" or "list"
  const [sortBy, setSortBy] = useState("modifiedTime"); // "name", "modifiedTime", "size"

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchFiles = useCallback(async (query = "") => {
    setLoading(true);
    setError(null);
    try {
      let url = "/api/drive/files";
      if (query) {
        // Simple search query string building based on the instructions
        url += `?q=${encodeURIComponent(`name contains '${query}'`)}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.message || data.error || "Failed to fetch files");
      }

      setFiles(data.files || []);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => fetchFiles(debouncedQuery));
  }, [debouncedQuery, fetchFiles]);

  const handleRefresh = () => {
    fetchFiles(debouncedQuery);
  };

  const sortedFiles = [...files].sort((a, b) => {
    if (sortBy === "name") {
      return (a.name || "").localeCompare(b.name || "");
    }
    if (sortBy === "size") {
      const sizeA = parseInt(a.size || "0", 10);
      const sizeB = parseInt(b.size || "0", 10);
      return sizeB - sizeA;
    }
    // Default: modifiedTime
    const timeA = new Date(a.modifiedTime || 0).getTime();
    const timeB = new Date(b.modifiedTime || 0).getTime();
    return timeB - timeA;
  });

  return (
    <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px", height: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem" }}>Drive</h1>
        <div style={{ display: "flex", gap: "10px", flex: 1, maxWidth: "400px" }}>
          <input
            type="text"
            placeholder="Search Drive..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid var(--card-border)",
              background: "var(--bg-secondary)",
              color: "var(--text-primary)"
            }}
          />
          <button
            onClick={handleRefresh}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid var(--card-border)",
              background: "var(--bg-secondary)",
              color: "var(--text-primary)",
              cursor: "pointer"
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "10px", borderBottom: "1px solid var(--card-border)" }}>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => setViewMode("grid")}
            style={{
              padding: "6px 10px",
              borderRadius: "6px",
              border: "none",
              background: viewMode === "grid" ? "var(--bg-secondary)" : "transparent",
              color: viewMode === "grid" ? "var(--text-primary)" : "var(--text-secondary)",
              cursor: "pointer",
              fontWeight: viewMode === "grid" ? "bold" : "normal"
            }}
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode("list")}
            style={{
              padding: "6px 10px",
              borderRadius: "6px",
              border: "none",
              background: viewMode === "list" ? "var(--bg-secondary)" : "transparent",
              color: viewMode === "list" ? "var(--text-primary)" : "var(--text-secondary)",
              cursor: "pointer",
              fontWeight: viewMode === "list" ? "bold" : "normal"
            }}
          >
            List
          </button>
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{
            padding: "6px 10px",
            borderRadius: "6px",
            border: "1px solid var(--card-border)",
            background: "var(--bg-secondary)",
            color: "var(--text-primary)"
          }}
        >
          <option value="modifiedTime">Modified Date</option>
          <option value="name">Name</option>
          <option value="size">Size</option>
        </select>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {error ? (
          <div style={{ padding: "20px", color: "var(--error)", background: "var(--bg-secondary)", borderRadius: "8px" }}>
            {error}
          </div>
        ) : loading ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: viewMode === "grid" ? "repeat(auto-fill, minmax(240px, 1fr))" : "1fr",
              gap: "16px"
            }}
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                style={{
                  background: "var(--card-bg)",
                  border: "1px solid var(--card-border)",
                  borderRadius: "12px",
                  padding: "16px",
                  height: viewMode === "grid" ? "120px" : "60px",
                  animation: "pulse 1.5s infinite"
                }}
              />
            ))}
          </div>
        ) : sortedFiles.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
            No files found.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: viewMode === "grid" ? "repeat(auto-fill, minmax(240px, 1fr))" : "1fr",
              gap: "16px"
            }}
          >
            {sortedFiles.map(file => (
              <a
                key={file.id}
                href={file.webViewLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: viewMode === "grid" ? "flex" : "grid",
                  flexDirection: viewMode === "grid" ? "column" : "row",
                  gridTemplateColumns: viewMode === "list" ? "auto 1fr auto auto" : "none",
                  alignItems: "center",
                  gap: "12px",
                  background: "var(--card-bg)",
                  border: "1px solid var(--card-border)",
                  borderRadius: "12px",
                  padding: "16px",
                  textDecoration: "none",
                  color: "inherit",
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div style={{ fontSize: "32px", textAlign: "center", minWidth: "40px" }}>
                  {getIconForMimeType(file.mimeType)}
                </div>

                <div style={{
                  flex: 1,
                  minWidth: 0,
                  textAlign: viewMode === "grid" ? "center" : "left",
                  width: viewMode === "grid" ? "100%" : "auto"
                }}>
                  <div style={{
                    fontWeight: "500",
                    color: "var(--text-primary)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }} title={file.name}>
                    {truncateName(file.name, viewMode === "grid" ? 25 : 60)}
                  </div>
                  {viewMode === "grid" && (
                    <div style={{
                      fontSize: "0.85rem",
                      color: "var(--text-secondary)",
                      marginTop: "8px",
                      display: "flex",
                      justifyContent: "space-between"
                    }}>
                      <span>{formatRelativeTime(file.modifiedTime)}</span>
                      <span>{formatSize(file.size)}</span>
                    </div>
                  )}
                </div>

                {viewMode === "list" && (
                  <>
                    <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", width: "120px", textAlign: "right" }}>
                      {formatRelativeTime(file.modifiedTime)}
                    </div>
                    <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", width: "80px", textAlign: "right" }}>
                      {formatSize(file.size)}
                    </div>
                  </>
                )}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
