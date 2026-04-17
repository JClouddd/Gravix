"use client";

import { useState, useEffect } from "react";

/**
 * Email Module — Gmail inbox with AI classification
 * Smart compose, thread summarization, action extraction
 */
export default function EmailModule() {
  const [isConnected, setIsConnected] = useState(true); // Default true until checked
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inbox, setInbox] = useState([]);
  const [stats, setStats] = useState({ total: 0, unread: 0 });

  const [activeTab, setActiveTab] = useState("inbox"); // 'inbox' or 'compose'
  const [selectedEmail, setSelectedEmail] = useState(null);

  // Compose State
  const [isAiDraftMode, setIsAiDraftMode] = useState(true);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState(""); // For manual mode body
  const [composeContext, setComposeContext] = useState(""); // For AI Prompt
  const [composeTone, setComposeTone] = useState("professional");
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [draftText, setDraftText] = useState("");

  const fetchInbox = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/email/inbox");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch inbox");
      }

      setIsConnected(data.connected);
      if (data.connected) {
        setInbox(data.inbox || []);
        setStats(data.stats || { total: 0, unread: 0 });
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const res = await fetch("/api/email/inbox");
        const data = await res.json();
        if (isMounted) {
          setIsConnected(data.connected);
          if (data.connected && data.inbox) {
            setInbox(data.inbox);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, []);

  const handleConnect = () => {
    window.location.href = "/api/auth/connect";
  };

  const handleGenerateDraft = async () => {
    setIsGeneratingDraft(true);
    try {
      const res = await fetch("/api/email/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiDraft: true,
          prompt: `${composeContext} Tone: ${composeTone}`,
        }),
      });
      const data = await res.json();
      if (res.ok && data.draft) {
        setComposeSubject(data.subject || "Draft");
        setDraftText(data.body);
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

  const handleSendEmail = async (bodyContent) => {
    if (!composeTo || !composeSubject || !bodyContent) {
      alert("Please fill in to, subject, and body fields.");
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch("/api/email/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiDraft: false,
          to: composeTo,
          subject: composeSubject,
          body: bodyContent,
        }),
      });
      const data = await res.json();
      if (res.ok && data.sent) {
        alert("Email sent successfully!");
        setComposeTo("");
        setComposeSubject("");
        setComposeBody("");
        setComposeContext("");
        setDraftText("");
        setActiveTab("inbox");
      } else {
        alert(data.error || "Failed to send email");
      }
    } catch (err) {
      console.error(err);
      alert("Error sending email.");
    } finally {
      setIsSending(false);
    }
  };

  if (!isConnected && !isLoading) {
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
            {error && (
              <div style={{ padding: "16px 24px", display: "flex", justifyContent: "center" }}>
                <span className="badge badge-error">Error: {error}</span>
              </div>
            )}
            {!error && (
              <div style={{ padding: "12px 24px", borderBottom: "1px solid var(--card-border)", display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-secondary)" }}>
                <span>Inbox</span>
                <span>Total: {stats.total} | Unread: {stats.unread}</span>
              </div>
            )}

            {isLoading ? (
              Array(5).fill(0).map((_, idx) => (
                <div key={idx} style={{ display: "flex", padding: "16px 24px", borderBottom: "1px solid var(--card-border)" }}>
                  <div className="skeleton" style={{ width: 40, height: 40, borderRadius: "50%", marginRight: 16, flexShrink: 0 }}></div>
                  <div style={{ flex: 1 }}>
                    <div className="skeleton" style={{ width: "30%", height: 16, marginBottom: 8 }}></div>
                    <div className="skeleton" style={{ width: "60%", height: 14, marginBottom: 8 }}></div>
                    <div className="skeleton" style={{ width: "90%", height: 12 }}></div>
                  </div>
                </div>
              ))
            ) : (
              inbox.length === 0 && !error ? (
                <div style={{ padding: "32px 24px", textAlign: "center", color: "var(--text-secondary)" }}>
                  No emails found.
                </div>
              ) : (
                inbox.map((email, idx) => {
                  const isUnread = !email.isRead;
                  const senderName = email.from ? email.from.split("<")[0].trim().replace(/"/g, "") : "Unknown";
                  const avatarLetter = senderName ? senderName.charAt(0).toUpperCase() : "?";

                  return (
                    <div
                      key={email.id}
                      style={{
                        display: "flex",
                        padding: "16px 24px",
                        borderBottom: idx < inbox.length - 1 ? "1px solid var(--card-border)" : "none",
                        cursor: "pointer",
                        background: isUnread ? "var(--bg-hover)" : "transparent",
                        borderLeft: isUnread ? "4px solid var(--accent)" : "4px solid transparent",
                        transition: "background 0.2s"
                      }}
                      onClick={() => setSelectedEmail(email)}
                      onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = isUnread ? "var(--bg-hover)" : "transparent"}
                    >
                      <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--accent-subtle)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", marginRight: 16, flexShrink: 0 }}>
                        {avatarLetter}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <span style={{ fontWeight: isUnread ? 600 : 500, color: "var(--text-primary)" }}>{senderName}</span>
                          <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{email.date}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontWeight: isUnread ? 600 : 500, color: "var(--text-primary)", fontSize: 14 }}>{email.subject}</span>
                          {isUnread && (
                            <span className="badge badge-info">
                              Unread
                            </span>
                          )}
                          {!isUnread && (
                            <span className="badge" style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}>
                              Read
                            </span>
                          )}
                          {email.labels && email.labels.includes("IMPORTANT") && (
                            <span className="badge badge-error">
                              Important
                            </span>
                          )}
                        </div>
                        <div className="truncate" style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                          {email.snippet}
                        </div>
                      </div>
                    </div>
                  );
                })
              )
            )}
          </div>
        )}

        {activeTab === "inbox" && selectedEmail && (
          <div>
            <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={() => setSelectedEmail(null)}>
              ← Back to Inbox
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--accent-subtle)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: 20 }}>
                {selectedEmail.from ? selectedEmail.from.split("<")[0].trim().replace(/"/g, "").charAt(0).toUpperCase() : "?"}
              </div>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>{selectedEmail.subject}</h2>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>{selectedEmail.from}</span>
                  <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>• {selectedEmail.date}</span>
                </div>
              </div>
            </div>
            <div style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {selectedEmail.snippet}
            </div>
          </div>
        )}

        {activeTab === "compose" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <button
                className={`btn btn-sm ${isAiDraftMode ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setIsAiDraftMode(true)}
              >
                ✨ AI Draft
              </button>
              <button
                className={`btn btn-sm ${!isAiDraftMode ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setIsAiDraftMode(false)}
              >
                ✍️ Manual
              </button>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--text-secondary)" }}>To</label>
              <input className="input" placeholder="recipient@example.com" value={composeTo} onChange={e => setComposeTo(e.target.value)} />
            </div>

            {isAiDraftMode ? (
              <>
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
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 600 }}>AI Draft Generated</h3>
                      <div className="badge badge-success">Ready to send</div>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--text-secondary)" }}>Subject</label>
                      <input className="input" style={{ marginBottom: 12 }} value={composeSubject} onChange={e => setComposeSubject(e.target.value)} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--text-secondary)" }}>Body</label>
                      <textarea className="input" style={{ minHeight: 150, marginBottom: 12 }} value={draftText} onChange={e => setDraftText(e.target.value)} />
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn btn-primary" onClick={() => handleSendEmail(draftText)} disabled={isSending}>
                        {isSending ? "Sending..." : "Send Draft"}
                      </button>
                      <button className="btn btn-secondary" onClick={() => setDraftText("")}>Discard</button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--text-secondary)" }}>Subject</label>
                  <input className="input" placeholder="Email subject" value={composeSubject} onChange={e => setComposeSubject(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--text-secondary)" }}>Body</label>
                  <textarea className="input" style={{ minHeight: 200, resize: "vertical" }} placeholder="Write your email here..." value={composeBody} onChange={e => setComposeBody(e.target.value)} />
                </div>
                <div>
                  <button className="btn btn-primary" onClick={() => handleSendEmail(composeBody)} disabled={isSending}>
                    {isSending ? "Sending..." : "Send Email"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
