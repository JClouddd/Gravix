'use client';

import React, { useState, useEffect, useRef } from 'react';

export default function MeetingsView() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [meetingAnalyses, setMeetingAnalyses] = useState({});
  const [analyzingMeeting, setAnalyzingMeeting] = useState(null);
  const [creatingTasks, setCreatingTasks] = useState(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/meet/transcripts');
      const data = await res.json();
      if (data.success && data.meetings) {
        setMeetings(data.meetings);
      }
    } catch (err) {
      console.error("Failed to fetch meetings", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAudioUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAudio(true);
    try {
      const formData = new FormData();
      formData.append("audioFile", file);
      const res = await fetch("/api/meet/transcripts", {
        method: "POST",
        body: formData
      });
      const data = await res.json();

      if (data.summary) {
        alert("Audio processed successfully! Summary: " + data.summary);
        fetchData(); // Refresh list
      } else {
        alert("Audio processed, but no summary returned.");
      }
    } catch (err) {
      console.error("Audio upload failed", err);
      alert("Audio upload failed.");
    } finally {
      setUploadingAudio(false);
      if (e.target) e.target.value = null;
    }
  };

  const analyzeMeeting = async (meeting) => {
    if (meetingAnalyses[meeting.id] || analyzingMeeting === meeting.id) return;

    setAnalyzingMeeting(meeting.id);
    try {
      const res = await fetch("/api/meet/transcripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcriptText: meeting.transcriptText })
      });
      const data = await res.json();
      setMeetingAnalyses(prev => ({ ...prev, [meeting.id]: data }));
    } catch (err) {
      console.error("Failed to analyze meeting", err);
    } finally {
      setAnalyzingMeeting(null);
    }
  };

  const handleCreateMeetingTasks = async (meetingId) => {
    const analysis = meetingAnalyses[meetingId];
    if (!analysis || !analysis.actionItems || analysis.actionItems.length === 0) return;

    setCreatingTasks(meetingId);
    try {
      const res = await fetch("/api/meet/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actions: analysis.actionItems })
      });
      const data = await res.json();
      if (data.created) {
         setMeetingAnalyses(prev => {
             const newAnalyses = {...prev};
             newAnalyses[meetingId] = {...newAnalyses[meetingId], tasksCreated: true};
             return newAnalyses;
         });
      }
    } catch (err) {
      console.error("Failed to create meeting tasks", err);
    } finally {
      setCreatingTasks(null);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-sm">
        <div className="status-dot pulse" style={{ background: "var(--accent)", width: 16, height: 16 }}></div>
        <div className="text-secondary">Loading your meetings...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col gap-lg" style={{ padding: "8px 24px 24px 24px", overflowY: "auto" }}>
      <div className="card-glass flex items-center justify-between" style={{ padding: "16px 24px" }}>
        <div className="flex items-center gap-md">
          <div className="module-icon" style={{ background: "var(--accent-glow)", color: "var(--accent-hover)", width: 48, height: 48, fontSize: 24 }}>
            🎙️
          </div>
          <div>
            <h2 className="h2 text-gradient">Meeting Transcripts</h2>
            <p className="caption">Analyze audio transcripts and extract action items directly into your tasks.</p>
          </div>
        </div>

        <div className="flex items-center gap-md">
          <input
            type="file"
            accept="audio/*"
            style={{ display: "none" }}
            ref={fileInputRef}
            onChange={handleAudioUpload}
          />
          <button
            className="btn btn-primary shadow-lg hover:shadow-xl transition-all"
            style={{ borderRadius: "var(--radius-xl)", padding: "0 24px" }}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAudio}
          >
            {uploadingAudio ? "Uploading..." : "+ Upload Audio"}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {meetings.length === 0 ? (
          <div className="card card-glass p-8 text-center flex flex-col items-center justify-center">
             <div className="text-4xl mb-4 opacity-50">🎙️</div>
             <h3 className="h3 mb-2">No Transcripts Found</h3>
             <p className="caption text-gray-400">Upload meeting audio to generate action items and summaries.</p>
          </div>
        ) : (
          meetings.map(meeting => {
            const analysis = meetingAnalyses[meeting.id];
            const isAnalyzing = analyzingMeeting === meeting.id;
            const startDate = new Date(meeting.startTime);
            const endDate = meeting.endTime ? new Date(meeting.endTime) : startDate;
            const durationMins = Math.max(1, Math.round((endDate - startDate) / 60000));

            return (
              <div key={meeting.id} className="card card-glass" style={{ padding: "16px 24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", cursor: "pointer" }} onClick={() => analyzeMeeting(meeting)}>
                    <div>
                        <div style={{ fontWeight: "bold", fontSize: "16px", marginBottom: "4px" }}>{meeting.space ? `Meeting in ${meeting.space}` : meeting.title || "Meeting Transcript"}</div>
                        <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                            {startDate.toLocaleString()} • {durationMins} mins • {meeting.participantCount || 1} participant{(meeting.participantCount || 1) !== 1 ? 's' : ''}
                        </div>
                    </div>
                    <div>
                        {!analysis && !isAnalyzing && <span className="badge" style={{ background: "var(--warning-subtle)", color: "var(--warning)" }}>Expand to Analyze</span>}
                        {isAnalyzing && <span className="badge" style={{ background: "var(--info-subtle)", color: "var(--info)" }}>Analyzing...</span>}
                        {analysis && <span className="badge" style={{ background: "var(--success-subtle)", color: "var(--success)" }}>Analyzed</span>}
                    </div>
                </div>

                {analysis && (
                    <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--card-border)", display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div>
                            <strong style={{ fontSize: "13px", display: "block", marginBottom: "4px" }}>Summary</strong>
                            <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0 }}>{analysis.summary}</p>
                        </div>

                        {analysis.actionItems && analysis.actionItems.length > 0 && (
                            <div>
                                <strong style={{ fontSize: "13px", display: "block", marginBottom: "4px" }}>Action Items</strong>
                                <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "13px", color: "var(--text-secondary)" }}>
                                    {analysis.actionItems.map((item, idx) => (
                                        <li key={idx} style={{ marginBottom: "4px" }}>
                                            <span style={{ color: "var(--text-primary)" }}>{item.task}</span> <br/>
                                            <span style={{ fontSize: "11px" }}>Assignee: {item.assignee} | Due: {item.deadline}</span>
                                        </li>
                                    ))}
                                </ul>
                                {!analysis.tasksCreated ? (
                                   <button
                                      className="btn btn-primary btn-sm"
                                      style={{ marginTop: "12px" }}
                                      onClick={(e) => { e.stopPropagation(); handleCreateMeetingTasks(meeting.id); }}
                                      disabled={creatingTasks === meeting.id}
                                   >
                                      {creatingTasks === meeting.id ? "Creating..." : "Create Tasks"}
                                   </button>
                                ) : (
                                    <div style={{ fontSize: "12px", color: "var(--success)", display: "inline-flex", alignItems: "center", gap: "4px", marginTop: "12px" }}>
                                      <span>✅</span> Tasks pushed to task manager
                                    </div>
                                )}
                            </div>
                        )}

                        {analysis.decisions && analysis.decisions.length > 0 && (
                            <div>
                                <strong style={{ fontSize: "13px", display: "block", marginBottom: "4px" }}>Decisions</strong>
                                <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "13px", color: "var(--text-secondary)" }}>
                                    {analysis.decisions.map((dec, idx) => <li key={idx}>{dec}</li>)}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
