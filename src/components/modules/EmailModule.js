"use client";

/**
 * Email Module — Gmail inbox with AI classification
 * Smart compose, thread summarization, action extraction
 */
export default function EmailModule() {
  return (
    <div>
      <div className="module-header">
        <div className="module-header-left">
          <div className="module-icon" style={{ background: "var(--info-subtle)" }}>✉️</div>
          <div>
            <h1 className="module-title">Email</h1>
            <p className="module-subtitle">Gmail inbox with AI-powered classification</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-primary btn-sm">✏️ Compose</button>
        </div>
      </div>

      <div className="card">
        <div className="empty-state">
          <div className="empty-state-icon">📬</div>
          <p className="empty-state-title">Connect Gmail</p>
          <p className="empty-state-desc">
            Link your Gmail account to enable AI inbox classification, smart compose, and automatic action extraction.
          </p>
          <button className="btn btn-primary" style={{ marginTop: 16 }}>
            Connect Gmail Account
          </button>
        </div>
      </div>
    </div>
  );
}
