'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';

export default function HomeInbox() {
  const [isConnected, setIsConnected] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Data States
  const [labels, setLabels] = useState([]);
  const [selectedLabelId, setSelectedLabelId] = useState("all");
  const [inbox, setInbox] = useState([]);
  const [stats, setStats] = useState({ total: 0, unread: 0 });
  const [classifications, setClassifications] = useState({});
  const [summaryData, setSummaryData] = useState({});
  
  // UI States
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [isClassifying, setIsClassifying] = useState(false);
  
  // Compose / Action States
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");

  // Pagination
  const [nextPageToken, setNextPageToken] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreRef = useRef(null);

  // 1. Initial Fetches
  useEffect(() => {
    let isMounted = true;
    
    // Fetch Labels
    fetch("/api/email/labels")
      .then(res => res.ok ? res.json() : { labels: [] })
      .then(data => { if (isMounted) setLabels(data.labels || []); })
      .catch(err => console.error("Labels error:", err));

    // Fetch Inbox
    const fetchInbox = async () => {
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
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchInbox();

    return () => { isMounted = false; };
  }, []);

  // 2. Real-time Webhook listener (Workspace webhooks)
  useEffect(() => {
    if (!isConnected) return;
    let isInitial = true;
    const q = query(collection(db, "workspace_webhooks"), orderBy("timestamp", "desc"), limit(1));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (isInitial) { isInitial = false; return; }
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added" && change.doc.data().type === "email") {
          // Refresh inbox silently
          fetch("/api/email/inbox").then(res => res.json()).then(data => {
            if (data.inbox) {
              setInbox(data.inbox);
              setStats(data.stats || { total: 0, unread: 0 });
            }
          });
        }
      });
    });
    return () => unsubscribe();
  }, [isConnected]);

  // 3. Infinite Scroll Load More
  const loadMoreEmails = useCallback(async () => {
    if (!nextPageToken || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const res = await fetch(`/api/email/inbox?pageToken=${nextPageToken}`);
      const data = await res.json();
      if (data.connected && data.inbox) {
        setInbox(prev => [...prev, ...data.inbox]);
        setNextPageToken(data.nextPageToken || null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [nextPageToken, isLoadingMore]);

  useEffect(() => {
    if (!loadMoreRef.current || !nextPageToken) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMoreEmails();
    }, { threshold: 0.5 });
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [nextPageToken, loadMoreEmails]);

  // 4. Background Classification
  const classifyEmails = useCallback(async (emailsToClassify) => {
    if (!emailsToClassify || emailsToClassify.length === 0) return;
    setIsClassifying(true);
    const newClasss = {};
    emailsToClassify.forEach(e => { newClasss[e.id] = { emailId: e.id, category: "unknown", urgency: "low" }; });

    try {
      const payload = emailsToClassify.map(e => ({ id: e.id, from: e.from, subject: e.subject, snippet: e.snippet }));
      const res = await fetch("/api/email/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: payload })
      });
      if (res.ok) {
        const data = await res.json();
        data.classifications?.forEach(c => { newClasss[c.emailId] = c; });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setClassifications(prev => ({ ...prev, ...newClasss }));
      setIsClassifying(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    if (inbox.length > 0 && !isClassifying) {
      const unclassified = inbox.filter(e => !classifications[e.id]);
      if (unclassified.length > 0) {
        Promise.resolve().then(() => { if (active) classifyEmails(unclassified); });
      }
    }
    return () => { active = false; };
  }, [inbox, classifications, isClassifying, classifyEmails]);

  // Actions
  const handleSummarizeThread = async () => {
    if (!selectedEmail) return;
    window.dispatchEvent(new CustomEvent("add-toast", { detail: { type: "info", icon: "⏳", title: "Summarizing..." } }));
    try {
      const res = await fetch("/api/email/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: selectedEmail.threadId, emailIds: !selectedEmail.threadId ? [selectedEmail.id] : undefined })
      });
      if (res.ok) {
        const data = await res.json();
        setSummaryData(prev => ({ ...prev, [selectedEmail.id]: data }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTask = async () => {
    if (!selectedEmail || !taskTitle) return;
    try {
      const res = await fetch("/api/email/to-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailId: selectedEmail.id,
          taskTitle,
          taskNotes: `Created from Gravix Email Module.\nSummary: ${summaryData[selectedEmail.id]?.summary || "N/A"}`,
        })
      });
      if (res.ok) {
        alert("Task created!");
        setShowTaskForm(false);
        setTaskTitle("");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateDraft = async () => {
    window.dispatchEvent(new CustomEvent("add-toast", { detail: { type: "info", icon: "⏳", title: "Generating Draft..." } }));
    try {
      const res = await fetch("/api/email/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiDraft: true, prompt: "Reply to this email professionally." }),
      });
      const data = await res.json();
      if (res.ok && data.draft) {
        setComposeSubject(data.subject || `Re: ${selectedEmail?.subject}`);
        setComposeBody(data.body);
        setComposeTo(selectedEmail?.from || "");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendEmail = async () => {
    if (!composeTo || !composeSubject || !composeBody) return alert("Fill in all fields");
    setIsSending(true);
    try {
      const res = await fetch("/api/email/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiDraft: false, to: composeTo, subject: composeSubject, body: composeBody }),
      });
      if (res.ok) {
        alert("Email sent!");
        setComposeTo(""); setComposeSubject(""); setComposeBody("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const filteredInbox = selectedLabelId === "all" ? inbox : inbox.filter(e => e.labelIds?.includes(selectedLabelId));

  if (!isConnected && !isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center card-glass p-8 text-center min-h-0">
        <div className="text-4xl mb-4">📬</div>
        <h3 className="h3 text-white mb-2">Connect Gmail</h3>
        <p className="caption text-gray-400 mb-6 max-w-md">Link your Google Workspace to enable AI inbox classification, thread summarization, and smart composing directly in Gravix.</p>
        <button className="btn btn-primary" onClick={() => window.location.href = "/api/auth/connect"}>
          Connect Google Account
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 gap-md overflow-hidden min-h-0 relative">
      
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 z-20 flex items-center justify-center backdrop-blur-sm">
          <div className="status-dot pulse" style={{ background: "var(--accent)", width: 16, height: 16 }}></div>
        </div>
      )}

      {/* LEFT COLUMN: Labels Sidebar */}
      <div className="w-64 card-glass overflow-y-auto hidden md:flex flex-col p-2 shrink-0">
        <button className="btn btn-primary mb-4 m-2" onClick={() => { setSelectedEmail('compose'); setComposeTo(''); setComposeSubject(''); setComposeBody(''); }}>
          ✏️ Compose
        </button>
        <h4 className="caption text-gray-400 uppercase tracking-wider px-4 py-2 mb-1">Inbox</h4>
        <button
          onClick={() => setSelectedLabelId("all")}
          className={`text-left px-4 py-2 rounded-lg transition-colors flex items-center gap-3 ${selectedLabelId === "all" ? 'bg-blue-500/20 text-blue-400 font-medium' : 'hover:bg-white/5 text-gray-300'}`}
        >
          <span>📥</span> All Mail
        </button>
        
        <h4 className="caption text-gray-400 uppercase tracking-wider px-4 py-2 mt-4 mb-1">Labels</h4>
        {labels.map(label => (
          <button
            key={label.id}
            onClick={() => setSelectedLabelId(label.id)}
            className={`text-left px-4 py-2 rounded-lg transition-colors flex items-center gap-3 ${selectedLabelId === label.id ? 'bg-white/10 text-white font-medium' : 'hover:bg-white/5 text-gray-400'}`}
          >
            <span style={{ color: label.color?.backgroundColor || 'var(--accent)' }}>🏷️</span>
            <span className="truncate">{label.name.replace("Gravix/", "")}</span>
          </button>
        ))}
      </div>

      {/* MIDDLE COLUMN: Email List */}
      <div className="flex-1 card-glass flex flex-col overflow-hidden min-w-[300px]">
        <div className="p-3 border-b border-white/10 flex justify-between items-center bg-white/5 shrink-0">
          <span className="text-sm font-medium text-gray-400">Total: {stats.total} | Unread: {stats.unread}</span>
          <button className="text-gray-400 hover:text-white" onClick={() => fetch("/api/email/inbox")}>↻ Refresh</button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {filteredInbox.length === 0 && !isLoading && (
            <div className="p-8 text-center text-gray-500">No emails found.</div>
          )}
          
          {filteredInbox.map(email => {
            const isUnread = !email.isRead;
            const senderName = email.from ? email.from.split("<")[0].trim().replace(/"/g, "") : "Unknown";
            const cls = classifications[email.id];
            
            return (
              <div
                key={email.id}
                onClick={() => setSelectedEmail(email)}
                className={`flex flex-col p-4 border-b border-white/5 cursor-pointer transition-colors hover:bg-white/5 ${selectedEmail?.id === email.id ? 'bg-blue-500/10' : ''} ${isUnread ? 'bg-white/5 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'}`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-base truncate ${isUnread ? 'font-bold text-white' : 'font-medium text-gray-300'}`}>{senderName}</span>
                  <span className="text-xs text-gray-500 whitespace-nowrap ml-2">{email.date}</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-sm truncate ${isUnread ? 'font-bold text-gray-200' : 'text-gray-400'}`}>{email.subject}</span>
                </div>
                <div className="text-xs text-gray-500 truncate mb-2">{email.snippet}</div>
                
                {/* AI Tags */}
                {cls && (
                  <div className="flex gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide border ${cls.category === 'client' ? 'border-green-500/30 text-green-400 bg-green-500/10' : cls.category === 'spam' ? 'border-red-500/30 text-red-400 bg-red-500/10' : cls.category === 'work' ? 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10' : 'border-blue-500/30 text-blue-400 bg-blue-500/10'}`}>
                      {cls.category}
                    </span>
                    {cls.urgency === 'high' && <span className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide border border-red-500/50 text-red-400 bg-red-500/20">High Urgency</span>}
                  </div>
                )}
              </div>
            )
          })}
          
          {nextPageToken && (
            <div ref={loadMoreRef} className="p-4 text-center text-gray-500 text-sm">
              {isLoadingMore ? "Loading more..." : "Scroll for more"}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Reading Pane & Compose */}
      {selectedEmail && (
        <div className="w-96 lg:w-[500px] card-glass flex flex-col overflow-hidden animate-fade-in slide-in-from-right shrink-0">
          <div className="p-3 border-b border-white/10 flex justify-between items-center bg-white/5 shrink-0">
            <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">
              {selectedEmail === 'compose' ? 'New Message' : 'Reading Pane'}
            </span>
            <button onClick={() => setSelectedEmail(null)} className="text-gray-400 hover:text-white w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors">
              ✕
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
            
            {selectedEmail === 'compose' ? (
              // COMPOSE VIEW
              <div className="flex flex-col gap-4 h-full">
                <input type="text" placeholder="To" value={composeTo} onChange={e => setComposeTo(e.target.value)} className="w-full bg-transparent border-b border-white/10 text-white p-2 focus:outline-none focus:border-blue-500" />
                <input type="text" placeholder="Subject" value={composeSubject} onChange={e => setComposeSubject(e.target.value)} className="w-full bg-transparent border-b border-white/10 text-white p-2 focus:outline-none focus:border-blue-500" />
                <textarea placeholder="Write your message..." value={composeBody} onChange={e => setComposeBody(e.target.value)} className="w-full flex-1 bg-transparent border border-white/10 rounded-lg text-white p-3 focus:outline-none focus:border-blue-500 resize-none min-h-[300px]" />
                <div className="flex justify-between mt-auto">
                  <button onClick={handleGenerateDraft} className="btn btn-secondary border-blue-500/30 text-blue-400 hover:bg-blue-500/10">✨ AI Write</button>
                  <button onClick={handleSendEmail} disabled={isSending} className="btn btn-primary bg-blue-600 hover:bg-blue-500 text-white">{isSending ? 'Sending...' : 'Send Email'}</button>
                </div>
              </div>
            ) : (
              // READ VIEW
              <div className="flex flex-col gap-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">{selectedEmail.subject}</h2>
                  <div className="flex justify-between items-center text-sm text-gray-400">
                    <span>{selectedEmail.from}</span>
                    <span>{selectedEmail.date}</span>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="flex gap-2 flex-wrap">
                  <button onClick={handleSummarizeThread} className="btn btn-secondary btn-sm border-blue-500/30 text-blue-400 hover:bg-blue-500/10">✨ Summarize</button>
                  <button onClick={handleGenerateDraft} className="btn btn-secondary btn-sm border-green-500/30 text-green-400 hover:bg-green-500/10">✨ Smart Reply</button>
                  <button onClick={() => setShowTaskForm(!showTaskForm)} className="btn btn-secondary btn-sm border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10">📝 Extract to Task</button>
                </div>

                {/* Task Form Dropdown */}
                {showTaskForm && (
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex flex-col gap-3">
                    <input type="text" placeholder="Task Title" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} className="input text-sm" />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setShowTaskForm(false)} className="btn btn-ghost btn-sm">Cancel</button>
                      <button onClick={handleCreateTask} className="btn btn-primary btn-sm bg-yellow-500 text-black hover:bg-yellow-400 border-none">Create</button>
                    </div>
                  </div>
                )}

                {/* AI Summary Card */}
                {summaryData[selectedEmail.id] && (
                  <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <h4 className="text-sm font-bold text-blue-400 mb-2 flex items-center gap-2"><span>✨</span> Thread Summary</h4>
                    <p className="text-sm text-gray-300 mb-3">{summaryData[selectedEmail.id].summary}</p>
                    {summaryData[selectedEmail.id].actionItems && (
                      <>
                        <h5 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">Action Items</h5>
                        <ul className="list-disc list-inside text-sm text-gray-300">
                          {summaryData[selectedEmail.id].actionItems.map((item, i) => <li key={i}>{item}</li>)}
                        </ul>
                      </>
                    )}
                  </div>
                )}

                {/* Reply Draft Card */}
                {composeBody && (
                  <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex flex-col gap-3">
                    <h4 className="text-sm font-bold text-green-400 flex items-center gap-2"><span>✨</span> AI Draft Generated</h4>
                    <textarea value={composeBody} onChange={e => setComposeBody(e.target.value)} className="w-full min-h-[150px] bg-black/40 text-gray-300 border border-white/10 rounded p-3 text-sm focus:outline-none focus:border-green-500" />
                    <div className="flex justify-end">
                      <button onClick={handleSendEmail} disabled={isSending} className="btn btn-primary btn-sm bg-green-600 hover:bg-green-500 border-none">{isSending ? 'Sending...' : 'Send Reply'}</button>
                    </div>
                  </div>
                )}

                <div className="w-full h-px bg-white/10 my-2"></div>

                {/* Body Content */}
                <div 
                  className="email-body-content text-gray-300 text-sm overflow-x-auto leading-relaxed" 
                  dangerouslySetInnerHTML={{ __html: selectedEmail.body || selectedEmail.snippet }}
                />
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
