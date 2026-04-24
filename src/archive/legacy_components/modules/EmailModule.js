"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import HelpTooltip from "@/components/HelpTooltip";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";


/**
 * Email Module — Gmail inbox with AI classification
 * Smart compose, thread summarization, action extraction
 * Supports infinite scroll via Gmail pageToken pagination
 */
export default function EmailModule() {
  const [isConnected, setIsConnected] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [labels, setLabels] = useState([]);
  const [selectedLabelId, setSelectedLabelId] = useState("all");
  const [showNewLabelForm, setShowNewLabelForm] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);
  const [error, setError] = useState(null);
  const [inbox, setInbox] = useState([]);
  const [stats, setStats] = useState({ total: 0, unread: 0 });

  // Pagination state
  const [nextPageToken, setNextPageToken] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreRef = useRef(null);

  const [activeTab, setActiveTab] = useState("inbox"); // 'inbox', 'compose', or 'templates'
  const [selectedEmail, setSelectedEmail] = useState(null);

  // Templates CRUD state
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({ name: "", subject: "", body: "", category: "General" });
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // Classification & Summary State
  const [classifications, setClassifications] = useState({});
  const [isClassifying, setIsClassifying] = useState(false);
  const [summaryData, setSummaryData] = useState({});
  const [isSummarizing, setIsSummarizing] = useState(false);

  // Task Creation State
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [isCreatingTask, setIsCreatingTask] = useState(false);

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

  // Templates State
  const [templates, setTemplates] = useState([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

  const fetchTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const res = await fetch("/api/email/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data || []);
      }
    } catch (err) {
      console.error("Failed to fetch templates:", err);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.name || !templateForm.subject || !templateForm.body) return;
    setIsSavingTemplate(true);
    try {
      const method = editingTemplate ? "PUT" : "POST";
      const payload = editingTemplate ? { id: editingTemplate.id, ...templateForm } : templateForm;
      const res = await fetch("/api/email/templates", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setEditingTemplate(null);
        setTemplateForm({ name: "", subject: "", body: "", category: "General" });
        fetchTemplates();
      }
    } catch (err) {
      console.error("Failed to save template:", err);
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (id) => {
    try {
      const res = await fetch(`/api/email/templates?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchTemplates();
      }
    } catch (err) {
      console.error("Failed to delete template:", err);
    }
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      subject: template.subject,
      body: template.body,
      category: template.category || "General",
    });
  };


  const fetchLabels = async () => {
    try {
      const res = await fetch("/api/email/labels");
      if (res.ok) {
        const data = await res.json();
        setLabels(data.labels || []);
      }
    } catch (err) {
      console.error("Failed to fetch labels:", err);
    }
  };

  const handleCreateLabel = async () => {
    if (!newLabelName) return;
    setIsCreatingLabel(true);
    try {
      const res = await fetch("/api/email/labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newLabelName,
          backgroundColor: "#4285f4",
          textColor: "#ffffff"
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.label) {
          setLabels(prev => [...prev, data.label]);
        }
        setShowNewLabelForm(false);
        setNewLabelName("");
      } else {
        alert("Failed to create label");
      }
    } catch (err) {
      console.error("Failed to create label:", err);
    } finally {
      setIsCreatingLabel(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchLabels();
    });
  }, []);

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
        setNextPageToken(data.nextPageToken || null);
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Load more emails for infinite scroll
  const loadMoreEmails = useCallback(async () => {
    if (!nextPageToken || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const res = await fetch(`/api/email/inbox?pageToken=${nextPageToken}`);
      const data = await res.json();
      if (data.connected && data.inbox) {
        setInbox(prev => [...prev, ...data.inbox]);
        setNextPageToken(data.nextPageToken || null);
        // Update total stats
        setStats(prev => ({
          ...prev,
          total: prev.total + (data.stats?.total || 0),
          unread: prev.unread + (data.stats?.unread || 0),
        }));
      }
    } catch (err) {
      console.error("Failed to load more emails:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [nextPageToken, isLoadingMore]);

  const classifyEmails = useCallback(async (emailsToClassify) => {
    if (!emailsToClassify || emailsToClassify.length === 0) return;
    setIsClassifying(true);

    const newClassifications = {};

    // Initialize with default/fallback to prevent infinite loops if fetch fails entirely or omits items
    emailsToClassify.forEach(e => {
      newClassifications[e.id] = {
        emailId: e.id,
        category: "unknown",
        urgency: "low",
        reason: "Failed to classify"
      };
    });

    try {
      const payload = emailsToClassify.map(e => ({
        id: e.id,
        from: e.from,
        subject: e.subject,
        snippet: e.snippet
      }));

      const res = await fetch("/api/email/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: payload })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.classifications) {
          data.classifications.forEach(c => {
            newClassifications[c.emailId] = c;
          });
        }
      }
    } catch (err) {
      console.error("Error classifying emails:", err);
    } finally {
      setClassifications(prev => ({...prev, ...newClassifications}));
      setIsClassifying(false);
    }
  }, []);

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
            setStats(data.stats || { total: 0, unread: 0 });
            setNextPageToken(data.nextPageToken || null);
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



  const isFirstLoad = useRef(true);

  // Reactive Webhook Listener for real-time inbox updates
  useEffect(() => {
    if (!isConnected) return;

    let isInitialWebhook = true;
    let isInitialClientEmail = true;

    // Listen to workspace_webhooks for new emails arriving without polling
    const q = query(collection(db, "workspace_webhooks"), orderBy("timestamp", "desc"), limit(1));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (isInitialWebhook) {
        isInitialWebhook = false;
        return;
      }
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          if (data.type === "email") {
            console.log("New email webhook received, refreshing inbox...");
            fetchInbox();
          }
        }
      });
    }, (err) => {
      console.error("Email Webhook listener error:", err);
    });

    // Also listen to client_emails as another indicator
    const clientEmailQ = query(collection(db, "client_emails"), orderBy("timestamp", "desc"), limit(1));
    const unsubClientEmail = onSnapshot(clientEmailQ, (snapshot) => {
      if (isInitialClientEmail) {
        isInitialClientEmail = false;
        return;
      }
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
           console.log("New client email webhook received, refreshing inbox...");
           fetchInbox();
        }
      });
    });

    return () => {
      unsubscribe();
      unsubClientEmail();
    };
  }, [isConnected]);


  // Infinite scroll observer
  useEffect(() => {
    if (!loadMoreRef.current || !nextPageToken) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextPageToken && !isLoadingMore) {
          loadMoreEmails();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [nextPageToken, isLoadingMore, loadMoreEmails]);

  useEffect(() => {
    let active = true;
    if (inbox.length > 0 && !isClassifying) {
      const unclassified = inbox.filter(e => !classifications[e.id]);
      if (unclassified.length > 0) {
        // Run classification asynchronously to avoid triggering setState
        // synchronously within the effect, which React warns about.
        Promise.resolve().then(() => {
          if (active) {
            classifyEmails(unclassified);
          }
        });
      }
    }
    return () => { active = false; };
  }, [inbox, classifications, isClassifying, classifyEmails]);

  const handleSummarizeThread = async () => {
    if (!selectedEmail) return;
    setIsSummarizing(true);
    try {
      const res = await fetch("/api/email/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Use threadId if available, otherwise fallback to array of emailIds
        body: JSON.stringify({
          threadId: selectedEmail.threadId,
          emailIds: !selectedEmail.threadId ? [selectedEmail.id] : undefined
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSummaryData(prev => ({
          ...prev,
          [selectedEmail.id]: data
        }));
      } else {
         alert("Failed to summarize email.");
      }
    } catch (err) {
      console.error(err);
      alert("Error summarizing email.");
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleCreateTask = async () => {
    if (!selectedEmail || !taskTitle) return;
    setIsCreatingTask(true);
    try {
      const res = await fetch("/api/email/to-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailId: selectedEmail.id,
          taskTitle,
          taskNotes: `Created from Gravix Email Module.\nSummary: ${summaryData[selectedEmail.id]?.summary || "N/A"}\nAction Items: ${summaryData[selectedEmail.id]?.actionItems || "N/A"}`,
          due: taskDueDate
        })
      });

      if (res.ok) {
        alert("Task created successfully!");
        setShowTaskForm(false);
        setTaskTitle("");
        setTaskDueDate("");
      } else {
        alert("Failed to create task.");
      }
    } catch (err) {
      console.error(err);
      alert("Error creating task.");
    } finally {
      setIsCreatingTask(false);
    }
  };

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
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h1 className="module-title">Email</h1>
                <HelpTooltip module="email" />
              </div>
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


  const filteredInbox = selectedLabelId === "all"
    ? inbox
    : inbox.filter(email => email.labelIds && email.labelIds.includes(selectedLabelId));

  return (
    <div>
      <div className="module-header">
        <div className="module-header-left">
          <div className="module-icon" style={{ background: "var(--info-subtle)" }}>✉️</div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h1 className="module-title">Email</h1>
              <HelpTooltip module="email" />
            </div>
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
          <button
            className={`btn ${activeTab === "templates" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => { setActiveTab("templates"); setSelectedEmail(null); }}
          >
            📄 Templates
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

            {/* Label Chips Bar */}
            <div style={{ display: "flex", gap: "8px", overflowX: "auto", padding: "12px 24px", borderBottom: "1px solid var(--card-border)", alignItems: "center" }}>
              <button
                onClick={() => setSelectedLabelId("all")}
                style={{
                  padding: "4px 12px",
                  borderRadius: "16px",
                  fontSize: "12px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  border: "1px solid var(--text-tertiary)",
                  background: selectedLabelId === "all" ? "var(--text-primary)" : "transparent",
                  color: selectedLabelId === "all" ? "var(--bg-primary)" : "var(--text-primary)",
                  transition: "all 0.2s"
                }}
              >
                All
              </button>
              {labels.map(label => (
                <button
                  key={label.id}
                  onClick={() => setSelectedLabelId(label.id)}
                  style={{
                    padding: "4px 12px",
                    borderRadius: "16px",
                    fontSize: "12px",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    border: `1px solid ${label.color?.backgroundColor || "var(--accent)"}`,
                    background: selectedLabelId === label.id ? (label.color?.backgroundColor || "var(--accent)") : "transparent",
                    color: selectedLabelId === label.id ? (label.color?.textColor || "#fff") : (label.color?.backgroundColor || "var(--accent)"),
                    transition: "all 0.2s"
                  }}
                >
                  {label.name.replace("Gravix/", "")}
                </button>
              ))}
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                {!showNewLabelForm ? (
                  <button
                    onClick={() => setShowNewLabelForm(true)}
                    style={{
                      padding: "4px 12px",
                      borderRadius: "16px",
                      fontSize: "12px",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      border: "1px dashed var(--text-tertiary)",
                      background: "transparent",
                      color: "var(--text-secondary)",
                      transition: "all 0.2s"
                    }}
                  >
                    + New Label
                  </button>
                ) : (
                  <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                    <input
                      autoFocus
                      type="text"
                      value={newLabelName}
                      onChange={e => setNewLabelName(e.target.value)}
                      placeholder="Label name"
                      style={{ padding: "2px 8px", fontSize: "12px", borderRadius: "12px", border: "1px solid var(--card-border)", outline: "none", width: "100px" }}
                    />
                    <button onClick={handleCreateLabel} disabled={isCreatingLabel} style={{ background: "var(--success)", color: "#fff", border: "none", borderRadius: "12px", padding: "2px 8px", fontSize: "12px", cursor: "pointer" }}>✓</button>
                    <button onClick={() => setShowNewLabelForm(false)} style={{ background: "var(--error)", color: "#fff", border: "none", borderRadius: "12px", padding: "2px 8px", fontSize: "12px", cursor: "pointer" }}>✕</button>
                  </div>
                )}
              </div>
            </div>


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
              filteredInbox.length === 0 && !error ? (
                <div style={{ padding: "32px 24px", textAlign: "center", color: "var(--text-secondary)" }}>
                  No emails found.
                </div>
              ) : (
                filteredInbox.map((email, idx) => {
                  const isUnread = !email.isRead;
                  const senderName = email.from ? email.from.split("<")[0].trim().replace(/"/g, "") : "Unknown";
                  const avatarLetter = senderName ? senderName.charAt(0).toUpperCase() : "?";

                  const classification = classifications[email.id];
                  let badgeClass = "badge-info";
                  if (classification?.category === "client") badgeClass = "badge-success";
                  if (classification?.category === "spam") badgeClass = "badge-error";
                  if (classification?.category === "notification") badgeClass = "badge-accent";
                  if (classification?.category === "work") badgeClass = "badge-warning";

                  return (
                    <div
                      key={email.id}
                      style={{
                        display: "flex",
                        padding: "16px 24px",
                        borderBottom: idx < filteredInbox.length - 1 ? "1px solid var(--card-border)" : "none",
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
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                             {classification?.urgency === "high" && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--error)" }} title="High Urgency"></div>}
                             {classification?.urgency === "medium" && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--warning)" }} title="Medium Urgency"></div>}
                             <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{email.date}</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontWeight: isUnread ? 600 : 500, color: "var(--text-primary)", fontSize: 14 }}>{email.subject}</span>

                          {classification && (
                             <span className={`badge ${badgeClass}`}>
                                {classification.category}
                             </span>
                          )}
                          {email.labelIds && labels.filter(l => email.labelIds.includes(l.id)).map(label => (
                             <span
                               key={label.id}
                               className="badge"
                               style={{
                                 backgroundColor: label.color?.backgroundColor || "var(--accent)",
                                 color: label.color?.textColor || "#fff",
                                 border: "none"
                               }}
                             >
                               {label.name.replace("Gravix/", "")}
                             </span>
                          ))}

                          {isUnread && (
                            <span className="badge badge-info">
                              Unread
                            </span>
                          )}
                          {!isUnread && !classification && (
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

            {/* Infinite scroll trigger */}
            {nextPageToken && (
              <div
                ref={loadMoreRef}
                style={{
                  padding: "20px 24px",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 8,
                  color: "var(--text-secondary)",
                  fontSize: 13,
                }}
              >
                {isLoadingMore ? (
                  <>
                    <div className="skeleton" style={{ width: 20, height: 20, borderRadius: "50%" }}></div>
                    Loading more emails...
                  </>
                ) : (
                  <button className="btn btn-ghost btn-sm" onClick={loadMoreEmails}>
                    Load more
                  </button>
                )}
              </div>
            )}

            {!nextPageToken && inbox.length > 0 && !isLoading && (
              <div style={{ padding: "16px 24px", textAlign: "center", fontSize: 12, color: "var(--text-tertiary)" }}>
                End of inbox
              </div>
            )}
          </div>
        )}

        {activeTab === "inbox" && selectedEmail && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedEmail(null); setShowTaskForm(false); }}>
                ← Back to Inbox
              </button>
              <div style={{ display: "flex", gap: 8 }}>
                 <button className="btn btn-secondary btn-sm" onClick={handleSummarizeThread} disabled={isSummarizing}>
                    {isSummarizing ? "Summarizing..." : "✨ Summarize Thread"}
                 </button>
                 <button className="btn btn-primary btn-sm" onClick={() => setShowTaskForm(!showTaskForm)}>
                    ✅ Create Task
                 </button>
              </div>
            </div>

            {showTaskForm && (
              <div style={{ marginBottom: 24, padding: 16, background: "var(--bg-tertiary)", borderRadius: "var(--radius-md)", border: "1px solid var(--card-border)" }}>
                 <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Create Task from Email</h3>
                 <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
                    <div style={{ flex: 1 }}>
                       <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>Task Title</label>
                       <input className="input" placeholder="What needs to be done?" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} />
                    </div>
                    <div style={{ width: 150 }}>
                       <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>Due Date</label>
                       <input type="date" className="input" value={taskDueDate} onChange={e => setTaskDueDate(e.target.value)} />
                    </div>
                 </div>
                 <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowTaskForm(false)}>Cancel</button>
                    <button className="btn btn-primary btn-sm" onClick={handleCreateTask} disabled={isCreatingTask || !taskTitle}>
                       {isCreatingTask ? "Creating..." : "Save Task"}
                    </button>
                 </div>
              </div>
            )}

            {summaryData[selectedEmail.id] && (
               <div style={{ marginBottom: 24, padding: 16, background: "var(--accent-subtle)", borderRadius: "var(--radius-md)", border: "1px solid var(--accent)" }}>
                 <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--accent)" }}>✨ AI Summary</h3>
                    {summaryData[selectedEmail.id].urgency && (
                       <span className={`badge ${summaryData[selectedEmail.id].urgency === 'high' ? 'badge-error' : summaryData[selectedEmail.id].urgency === 'medium' ? 'badge-warning' : 'badge-info'}`}>
                          Urgency: {summaryData[selectedEmail.id].urgency}
                       </span>
                    )}
                 </div>
                 <p style={{ fontSize: 14, marginBottom: 12 }}>{summaryData[selectedEmail.id].summary}</p>

                 {summaryData[selectedEmail.id].actionItems && summaryData[selectedEmail.id].actionItems !== "None" && (
                    <div style={{ marginBottom: 8 }}>
                       <strong style={{ fontSize: 13 }}>Action Items:</strong>
                       <div style={{ fontSize: 13, marginTop: 4, whiteSpace: "pre-wrap" }}>{summaryData[selectedEmail.id].actionItems}</div>
                    </div>
                 )}

                 {summaryData[selectedEmail.id].decisions && summaryData[selectedEmail.id].decisions !== "None" && (
                    <div>
                       <strong style={{ fontSize: 13 }}>Key Decisions:</strong>
                       <div style={{ fontSize: 13, marginTop: 4, whiteSpace: "pre-wrap" }}>{summaryData[selectedEmail.id].decisions}</div>
                    </div>
                 )}
               </div>
            )}

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

        {activeTab === "templates" && (
          <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "flex", gap: 24 }}>
              {/* Form Side */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600 }}>{editingTemplate ? "Edit Template" : "Create Template"}</h3>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--text-secondary)" }}>Name</label>
                  <input className="input" placeholder="Template Name" value={templateForm.name} onChange={e => setTemplateForm({ ...templateForm, name: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--text-secondary)" }}>Subject</label>
                  <input className="input" placeholder="Email Subject" value={templateForm.subject} onChange={e => setTemplateForm({ ...templateForm, subject: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--text-secondary)" }}>Category</label>
                  <input className="input" placeholder="Category (e.g., General)" value={templateForm.category} onChange={e => setTemplateForm({ ...templateForm, category: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--text-secondary)" }}>Body</label>
                  <textarea className="input" style={{ minHeight: 150, resize: "vertical" }} placeholder="Email Body" value={templateForm.body} onChange={e => setTemplateForm({ ...templateForm, body: e.target.value })} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-primary" onClick={handleSaveTemplate} disabled={isSavingTemplate || !templateForm.name || !templateForm.subject || !templateForm.body}>
                    {isSavingTemplate ? "Saving..." : "Save Template"}
                  </button>
                  {editingTemplate && (
                    <button className="btn btn-secondary" onClick={() => { setEditingTemplate(null); setTemplateForm({ name: "", subject: "", body: "", category: "General" }); }}>
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              {/* List Side */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600 }}>Existing Templates</h3>
                  <button className="btn btn-sm btn-secondary" onClick={fetchTemplates} disabled={isLoadingTemplates}>
                    {isLoadingTemplates ? "Loading..." : "Refresh"}
                  </button>
                </div>

                {templates.length === 0 && !isLoadingTemplates && (
                  <div style={{ padding: 24, textAlign: "center", color: "var(--text-tertiary)", background: "var(--bg-tertiary)", borderRadius: "var(--radius-md)" }}>
                    No templates found. Create one to get started.
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {templates.map(t => (
                    <div key={t.id} style={{ padding: 16, background: "var(--bg-tertiary)", borderRadius: "var(--radius-md)", border: "1px solid var(--card-border)", display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{t.name}</div>
                          <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{t.subject}</div>
                          <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4 }}>Category: {t.category || "General"}</div>
                        </div>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button className="btn btn-sm btn-secondary" onClick={() => handleEditTemplate(t)}>Edit</button>
                          <button className="btn btn-sm" style={{ color: "var(--error)" }} onClick={() => handleDeleteTemplate(t.id)}>Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "compose" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ display: "flex", gap: 8 }}>
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

              {/* Templates Dropdown Area */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {templates.length === 0 && (
                  <button className="btn btn-sm btn-secondary" onClick={fetchTemplates} disabled={isLoadingTemplates}>
                    {isLoadingTemplates ? "Loading..." : "Load Templates"}
                  </button>
                )}
                {templates.length > 0 && (
                  <select
                    className="input"
                    style={{ padding: "4px 8px", fontSize: 13, height: "auto" }}
                    onChange={(e) => {
                      const t = templates.find(temp => temp.name === e.target.value);
                      if (t) {
                        setComposeSubject(t.subject || "");
                        setComposeBody(t.body || "");
                        setIsAiDraftMode(false); // Switch to manual to show body
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>Select Template</option>
                    {templates.map((t, idx) => (
                      <option key={idx} value={t.name}>{t.name} {t.tags && t.tags.length > 0 ? `(${t.tags.join(', ')})` : ''}</option>
                    ))}
                  </select>
                )}
              </div>
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
