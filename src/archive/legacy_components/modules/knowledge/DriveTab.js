"use client";

import { useState, useEffect } from "react";

export default function DriveTab() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/drive");
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else if (!data.connected) {
        setError("Google Drive is not connected. Please connect via Settings.");
      } else {
        setFiles(data.files || []);
      }
    } catch (err) {
      setError(err.message || "Failed to load files.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => fetchFiles());
  }, []);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/drive", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        // Refresh file list after upload
        fetchFiles();
      }
    } catch (err) {
      setError(err.message || "Failed to upload file.");
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = "";
    }
  };

  const handleDelete = async (fileId) => {
    if (!confirm("Are you sure you want to move this file to trash?")) return;

    try {
      setError(null);
      const res = await fetch(`/api/drive/${fileId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        // Refresh file list
        fetchFiles();
      }
    } catch (err) {
      setError(err.message || "Failed to delete file.");
    }
  };

  const handleDownload = async (fileId) => {
      try {
          const res = await fetch(`/api/drive/${fileId}`);
          const data = await res.json();
          if (data.error) {
              setError(data.error);
          } else if (data.redirect) {
              window.open(data.redirect, '_blank');
          }
      } catch (err) {
          setError(err.message || "Failed to download file.");
      }
  };

  if (loading) {
    return (
      <div style={{ padding: "20px" }}>
        <p>Loading files...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 600 }}>Google Drive Files</h2>
        <div>
          <label
            htmlFor="drive-upload"
            style={{
              background: "var(--accent)",
              color: "#fff",
              padding: "8px 16px",
              borderRadius: "4px",
              cursor: uploading ? "not-allowed" : "pointer",
              opacity: uploading ? 0.7 : 1,
              display: "inline-block",
              fontSize: "14px"
            }}
          >
            {uploading ? "Uploading..." : "Upload File"}
          </label>
          <input
            id="drive-upload"
            type="file"
            onChange={handleUpload}
            disabled={uploading}
            style={{ display: "none" }}
          />
        </div>
      </div>

      {error && (
        <div style={{ padding: "12px", background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", borderRadius: "4px", marginBottom: "16px" }}>
          {error}
        </div>
      )}

      {files.length === 0 && !error ? (
        <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)", background: "var(--bg-secondary)", borderRadius: "8px" }}>
          No files found in Drive.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {files.map((file) => (
            <div
              key={file.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                background: "var(--bg-secondary)",
                borderRadius: "8px",
                border: "1px solid var(--card-border)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", overflow: "hidden" }}>
                {file.iconLink ? (
                  <img src={file.iconLink} alt="" style={{ width: 16, height: 16 }} />
                ) : (
                  <span style={{ fontSize: "16px" }}>📄</span>
                )}
                <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "400px" }}>
                  {file.name}
                </span>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => handleDownload(file.id)}
                  style={{
                    padding: "6px 12px",
                    background: "transparent",
                    border: "1px solid var(--card-border)",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "12px",
                    color: "var(--text-primary)"
                  }}
                >
                  View
                </button>
                <button
                  onClick={() => handleDelete(file.id)}
                  style={{
                    padding: "6px 12px",
                    background: "transparent",
                    border: "1px solid rgba(239, 68, 68, 0.5)",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "12px",
                    color: "#ef4444"
                  }}
                >
                  Trash
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
