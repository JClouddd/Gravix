"use client";

import { useState } from "react";

const MOCK_EMAILS = [
  {
    id: 1,
    sender: "Sarah Jenkins",
    avatar: "S",
    subject: "Urgent: Q3 Report Approval Needed",
    preview: "Hi team, please review and approve the Q3 report by EOD. Attached is the...",
    body: "Hi team,\n\nPlease review and approve the Q3 report by EOD. Attached is the latest draft incorporating the finance team's feedback.\n\nThanks,\nSarah",
    timestamp: "10:30 AM",
    unread: true,
    badge: { label: "Action Required", class: "badge-error" },
  },
  {
    id: 2,
    sender: "Acme Corp (Client)",
    avatar: "A",
    subject: "Project Kickoff Discussion",
    preview: "Great meeting everyone yesterday. I wanted to follow up on the timeline...",
    body: "Great meeting everyone yesterday. I wanted to follow up on the timeline we discussed. Are we still on track for next Monday?\n\nBest,\nAcme Team",
    timestamp: "9:15 AM",
    unread: true,
    badge: { label: "Client", class: "badge-info" },
  },
  {
    id: 3,
    sender: "Billing Dept",
    avatar: "B",
    subject: "Invoice #49201 Paid",
    preview: "Your recent invoice #49201 has been successfully processed and paid...",
    body: "Hello,\n\nYour recent invoice #49201 has been successfully processed and paid. The funds should appear in your account within 2-3 business days.\n\nRegards,\nBilling Dept",
    timestamp: "Yesterday",
    unread: false,
    badge: { label: "Invoice", class: "badge-success" },
  },
  {
    id: 4,
    sender: "Tech Weekly",
    avatar: "T",
    subject: "Top 10 AI Tools This Week",
    preview: "Discover the latest trends in artificial intelligence and how they can...",
    body: "Welcome to this week's Tech Weekly!\n\nDiscover the latest trends in artificial intelligence and how they can boost your productivity. In this issue, we cover 10 tools that are changing the game.\n\nRead more inside...",
    timestamp: "Yesterday",
    unread: false,
    badge: { label: "Newsletter", class: "badge" },
  },
  {
    id: 5,
    sender: "Mike Ross",
    avatar: "M",
    subject: "Quick question about the presentation",
    preview: "Do you have a minute to look over slide 12? I feel like the chart is a bit...",
    body: "Hey,\n\nDo you have a minute to look over slide 12? I feel like the chart is a bit confusing and could use some tweaking before the big meeting.\n\nLet me know,\nMike",
    timestamp: "Oct 12",
    unread: false,
    badge: null,
  },
];

/**
 * Email Module — Gmail inbox with AI classification
 * Smart compose, thread summarization, action extraction
 */
export default function EmailModule() {
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState("inbox"); // 'inbox' or 'compose'
  const [selectedEmail, setSelectedEmail] = useState(null);

  // Compose State
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeContext, setComposeContext] = useState("");
  const [composeTone, setComposeTone] = useState("professional");
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [draftText, setDraftText] = useState("");

  const handleConnect = () => {
    setIsConnected(true);
  };

  const handleGenerateDraft = async () => {
    setIsGeneratingDraft(true);
    try {
      const res = await fetch("/api/email/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: composeTo,
          subject: composeSubject,
          context: composeContext,
          tone: composeTone,
        }),
      });
      const data = await res.json();
      if (res.ok && data.draft) {
        setDraftText(data.draft.body);
      } else {
        alert(data.error || "Failed to generate draft");
      }
    } catch (err) {
      console.error(err);
      alert("Error generating draft.");
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  if (!isConnected) {
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
        </div>

        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📬</div>
            <p className="empty-state-title">Connect Gmail</p>
            <p className="empty-state-desc">
              Link your Gmail account to enable AI inbox classification, smart compose, and automatic action extraction.
            </p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={handleConnect}>
              <span style={{ marginRight: 8, background: "white", borderRadius: "50%", padding: 2, display: "inline-flex" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              </span>
              Connect Gmail Account
            </button>
          </div>
        </div>
      </div>
    );
  }

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
          <button
            className={`btn ${activeTab === "compose" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => { setActiveTab("compose"); setSelectedEmail(null); }}
          >
            ✏️ Compose
          </button>
          <button
            className={`btn ${activeTab === "inbox" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => { setActiveTab("inbox"); setSelectedEmail(null); }}
          >
            📥 Inbox
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: selectedEmail || activeTab === "compose" ? "24px" : "0" }}>
        {activeTab === "inbox" && !selectedEmail && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {MOCK_EMAILS.map((email, idx) => (
              <div
                key={email.id}
                style={{
                  display: "flex",
                  padding: "16px 24px",
                  borderBottom: idx < MOCK_EMAILS.length - 1 ? "1px solid var(--card-border)" : "none",
                  cursor: "pointer",
                  background: email.unread ? "var(--bg-hover)" : "transparent",
                  transition: "background 0.2s"
                }}
                onClick={() => setSelectedEmail(email)}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"}
                onMouseLeave={(e) => e.currentTarget.style.background = email.unread ? "var(--bg-hover)" : "transparent"}
              >
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--accent-subtle)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", marginRight: 16, flexShrink: 0 }}>
                  {email.avatar}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontWeight: email.unread ? 600 : 500, color: "var(--text-primary)" }}>{email.sender}</span>
                    <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{email.timestamp}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: email.unread ? 600 : 500, color: "var(--text-primary)", fontSize: 14 }}>{email.subject}</span>
                    {email.badge && (
                      <span className={`badge ${email.badge.class}`} style={email.badge.class === "badge" ? { background: "var(--bg-tertiary)", color: "var(--text-secondary)" } : {}}>
                        {email.badge.label}
                      </span>
                    )}
                  </div>
                  <div className="truncate" style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                    {email.preview}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "inbox" && selectedEmail && (
          <div>
            <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={() => setSelectedEmail(null)}>
              ← Back to Inbox
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--accent-subtle)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: 20 }}>
                {selectedEmail.avatar}
              </div>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>{selectedEmail.subject}</h2>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>{selectedEmail.sender}</span>
                  <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>• {selectedEmail.timestamp}</span>
                </div>
              </div>
            </div>
            <div style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {selectedEmail.body}
            </div>
          </div>
        )}

        {activeTab === "compose" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--text-secondary)" }}>To</label>
              <input className="input" placeholder="recipient@example.com" value={composeTo} onChange={e => setComposeTo(e.target.value)} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--text-secondary)" }}>Subject</label>
              <input className="input" placeholder="Email subject" value={composeSubject} onChange={e => setComposeSubject(e.target.value)} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--text-secondary)" }}>Context (What should this email say?)</label>
              <textarea className="input" style={{ minHeight: 100, resize: "vertical" }} placeholder="Describe the email you want to send..." value={composeContext} onChange={e => setComposeContext(e.target.value)} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--text-secondary)" }}>Tone</label>
              <select className="input" value={composeTone} onChange={e => setComposeTone(e.target.value)}>
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
                <option value="formal">Formal</option>
                <option value="friendly">Friendly</option>
              </select>
            </div>
            <div>
              <button className="btn btn-primary" onClick={handleGenerateDraft} disabled={isGeneratingDraft || !composeContext.trim()}>
                {isGeneratingDraft ? "✨ Generating..." : "✨ Generate Draft"}
              </button>
            </div>
            {draftText && (
              <div style={{ marginTop: 24, padding: 16, background: "var(--bg-tertiary)", borderRadius: "var(--radius-md)", border: "1px solid var(--card-border)" }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>AI Draft Generated</h3>
                <textarea className="input" style={{ minHeight: 150, marginBottom: 12 }} value={draftText} onChange={e => setDraftText(e.target.value)} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-primary" onClick={() => alert("Email Sent! (Mock)")}>Send</button>
                  <button className="btn btn-secondary" onClick={() => setDraftText("")}>Discard</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
