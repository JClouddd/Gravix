'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { Play, Check, X, Clock, Video, Loader2, AlertCircle } from 'lucide-react';

export default function ApprovalQueueView() {
  const [pendingVideos, setPendingVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Listen for videos that have finished the scrape phase and are awaiting approval
    const q = query(
      collection(db, 'pending_ingestions'),
      where('status', '==', 'Awaiting Approval')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const videos = [];
      snapshot.forEach((doc) => {
        videos.push({ id: doc.id, ...doc.data() });
      });
      // Sort by score descending
      videos.sort((a, b) => (b.score || 0) - (a.score || 0));
      setPendingVideos(videos);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching pending ingestions:", err);
      setError("Failed to load approval queue.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleApprove = async (vid) => {
    setProcessingId(vid.id);
    try {
      // Optimistically update status to prevent double-clicks
      await updateDoc(doc(db, 'pending_ingestions', vid.id), {
        status: 'Ingestion Queued'
      });

      const response = await fetch('/api/swarm/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vid_id: vid.vid_id, url: vid.youtube_url }),
      });

      if (!response.ok) {
        throw new Error('Failed to trigger ingestion pipeline');
      }
      
    } catch (err) {
      console.error(err);
      setError(`Failed to approve ${vid.title}`);
      // Revert status
      await updateDoc(doc(db, 'pending_ingestions', vid.id), {
        status: 'Awaiting Approval'
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (vid) => {
    setProcessingId(vid.id);
    try {
      await updateDoc(doc(db, 'pending_ingestions', vid.id), {
        status: 'Rejected (Manual)'
      });
    } catch (err) {
      console.error(err);
      setError(`Failed to reject ${vid.title}`);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-medium tracking-tight text-white mb-1">Swarm Approval Queue</h2>
          <p className="text-sm text-gray-400">Review scraped videos before authorizing deep-dive ingestion ($95/25hr).</p>
        </div>
        <div className="px-3 py-1 rounded-full bg-[var(--surface-light)] border border-[var(--border-light)] text-xs text-[var(--text-secondary)] font-medium flex items-center gap-2">
          <Clock className="w-3 h-3" />
          {pendingVideos.length} Pending
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      <div className="grid gap-4">
        {pendingVideos.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-[var(--border-light)] rounded-2xl bg-[var(--surface-light)]/30 backdrop-blur-md">
            <Video className="w-12 h-12 mx-auto text-gray-500 mb-4 opacity-50" />
            <h3 className="text-gray-300 font-medium mb-1">Queue is Empty</h3>
            <p className="text-sm text-gray-500">No videos are currently awaiting manual approval.</p>
          </div>
        ) : (
          pendingVideos.map((vid) => (
            <div key={vid.id} className="p-5 rounded-2xl bg-[var(--surface-light)]/50 backdrop-blur-xl border border-[var(--border-light)] flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-[var(--accent)]/30">
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0
                  ${vid.score >= 8 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                    vid.score >= 5 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                    'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                  {vid.score}/10
                </div>
                <div className="min-w-0">
                  <h3 className="text-white font-medium truncate mb-1" title={vid.title}>
                    {vid.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <a href={vid.youtube_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-[var(--accent)] transition-colors">
                      <Play className="w-3 h-3" /> Watch Source
                    </a>
                    <span>•</span>
                    <span className="truncate max-w-[300px]">ID: {vid.vid_id}</span>
                  </div>
                  {vid.transcript && (
                    <p className="mt-3 text-xs text-gray-500 line-clamp-2 leading-relaxed">
                      <span className="text-gray-400 font-medium">Snippet:</span> {vid.transcript}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => handleReject(vid)}
                  disabled={processingId === vid.id}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all disabled:opacity-50"
                >
                  <span className="flex items-center gap-2">
                    <X className="w-4 h-4" /> Reject
                  </span>
                </button>
                <button
                  onClick={() => handleApprove(vid)}
                  disabled={processingId === vid.id}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-black bg-[var(--accent)] hover:brightness-110 shadow-[0_0_20px_rgba(var(--accent-rgb),0.3)] transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {processingId === vid.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Approve Ingest
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
