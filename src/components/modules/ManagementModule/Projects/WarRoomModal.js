'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export default function WarRoomModal({ plan, onClose }) {
  const [activeTab, setActiveTab] = useState('blueprint');
  const [isIgniting, setIsIgniting] = useState(false);
  const [localStatus, setLocalStatus] = useState(plan.status);
  const [systemStats, setSystemStats] = useState(null);
  
  // Mock Terminal Feed Data
  const [terminalLines, setTerminalLines] = useState([
    '> [SYSTEM] Swarm Initialized.',
    '> [ARCHITECT] Parsing video digest JSON...',
    '> [ARCHITECT] Abstract Syntax Tree mapped successfully.',
  ]);

  // Real-time Firebase Telemetry Listener
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system', 'knowledge_stats'), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setSystemStats(data);
        // Push a live terminal update when data changes
        setTerminalLines(prev => [
          ...prev, 
          `> [TELEMETRY] Omni-Vault Sync: ${data.total_videos_ingested || 0} Videos, ${data.total_chunks || 0} Chunks.`
        ]);
      }
    });
    return () => unsub();
  }, []);

  // Simulate live terminal typing
  useEffect(() => {
    if (activeTab !== 'console') return;
    
    const newLines = [
      '> [ENGINEER] Locking file: /src/components/Navigation.js',
      '> [ENGINEER] Injecting Stitch glassmorphism tokens...',
      '> [AUDITOR] Running npm run lint...',
      '> [AUDITOR] PASS: 0 errors, 0 warnings.',
      '> [SYSTEM] Auto-scheduling ripple effect initiated.'
    ];
    
    let i = 0;
    const interval = setInterval(() => {
      if (i < newLines.length) {
        setTerminalLines(prev => [...prev, newLines[i]]);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 1500);
    
    return () => clearInterval(interval);
  }, [activeTab]);

  const handleAuthorize = async () => {
    setIsIgniting(true);
    try {
      const res = await fetch('/api/management/swarm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id, authKey: 'user-token-placeholder' })
      });
      const data = await res.json();
      if (data.success) {
        setLocalStatus('Swarm Executing');
        setActiveTab('console');
        // Restart terminal feed
        setTerminalLines(['> [SYSTEM] Ignition Authorization Received.']);
      } else {
        alert("Failed to ignite swarm: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Network error.");
    } finally {
      setIsIgniting(false);
    }
  };

  if (!plan) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-[100] p-4 md:p-8 animate-fadeIn">
      <div className="card-glass w-full max-w-6xl h-[90vh] border-blue-500/30 shadow-[0_0_50px_rgba(59,130,246,0.15)] flex flex-col relative overflow-hidden">
        
        {/* Holographic background */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>

        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-white/10 relative z-10 bg-black/40">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/50 flex items-center justify-center text-blue-400">
              👁️
            </div>
            <div>
              <h2 className="h2 text-blue-50">{plan.title || 'Implementation Plan Details'}</h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="badge badge-info">{plan.aiModel || 'Swarm'}</span>
                <span className="caption text-blue-400/70">ID: OMNI-{plan.id || '000'} • {plan.tasks || 0} Sub-Tasks</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {localStatus === 'Awaiting Authorization' && (
              <button 
                onClick={handleAuthorize}
                disabled={isIgniting}
                className="btn btn-primary shadow-[0_0_20px_rgba(59,130,246,0.5)] bg-blue-600 hover:bg-blue-500 text-white border-0"
              >
                {isIgniting ? '[IGNITING...]' : '[AUTHORIZE SWARM]'}
              </button>
            )}
            {localStatus === 'Swarm Executing' && (
              <span className="badge badge-success animate-pulse border border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.3)]">
                [SWARM LIVE]
              </span>
            )}
            <button onClick={onClose} className="btn btn-icon hover:bg-white/10 text-white/50 hover:text-white transition-colors">
              ✕
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5 px-6 relative z-10 bg-black/20">
          {['blueprint', 'sequence', 'console'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-4 font-medium text-sm transition-all border-b-2 ${
                activeTab === tab 
                  ? 'border-blue-400 text-blue-400 bg-blue-400/5' 
                  : 'border-transparent text-white/50 hover:text-white/80 hover:bg-white/5'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative z-10">
          
          {/* 1. Blueprint View */}
          {activeTab === 'blueprint' && (
            <div className="p-8 h-full overflow-y-auto custom-scrollbar">
              <div className="prose prose-invert max-w-4xl">
                <h3 className="text-xl text-white mb-4">Architecture Map</h3>
                <p className="text-gray-400 mb-6">This plan was automatically generated by digesting the Omni-Pipeline video architecture.</p>
                <div className="bg-black/50 p-6 rounded-xl border border-white/5 font-mono text-sm text-emerald-400/80">
                  <pre>
{`{
  "phase": "BigQuery Migration",
  "locks_required": [
    "/src/app/api/knowledge/ingest-video/route.js",
    "/src/lib/bigquery.js"
  ],
  "estimated_tokens": 145000,
  "actionable_steps": [
    "Provision omni_vault table",
    "Implement Tiered Cost Routing",
    "Migrate 50 local JSON files"
  ]
}`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* 2. Build Sequence View */}
          {activeTab === 'sequence' && (
            <div className="p-8 h-full overflow-y-auto custom-scrollbar">
              <div className="max-w-3xl flex flex-col gap-4">
                {[
                  { id: 1, step: 'Inject Context Briefcase (globals.css, map)', status: 'done' },
                  { id: 2, step: 'Architect Agent: Generate pseudo-code', status: 'done' },
                  { id: 3, step: 'Engineer Agent: Write physical React components', status: 'active' },
                  { id: 4, step: 'Auditor Agent: Run syntax verifications', status: 'pending' },
                  { id: 5, step: 'Commit to GitHub & Push PR', status: 'pending' }
                ].map((step, idx) => (
                  <div key={step.id} className="card-glass p-4 flex items-center gap-4 bg-black/40 border-white/5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                      step.status === 'done' ? 'bg-green-500/20 text-green-400 border border-green-500/50' :
                      step.status === 'active' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.3)]' :
                      'bg-white/5 text-white/30 border border-white/10'
                    }`}>
                      {step.status === 'done' ? '✓' : idx + 1}
                    </div>
                    <div className={`text-lg ${step.status === 'active' ? 'text-white' : 'text-gray-400'}`}>
                      {step.step}
                    </div>
                    {step.status === 'active' && <span className="ml-auto text-xs text-blue-400 animate-pulse">Executing...</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Live Console View */}
          {activeTab === 'console' && (
            <div className="p-0 h-full bg-black/90 font-mono text-sm overflow-y-auto custom-scrollbar flex flex-col">
              <div className="sticky top-0 bg-black/80 backdrop-blur-sm border-b border-white/10 p-2 px-4 flex items-center gap-2 text-xs text-gray-500">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <span className="ml-2">swarm-execution-tty1</span>
              </div>
              <div className="p-4 flex flex-col gap-1">
                {terminalLines.map((line, idx) => (
                  <div key={idx} className={`${
                    line.includes('[SYSTEM]') ? 'text-blue-400' :
                    line.includes('[ARCHITECT]') ? 'text-purple-400' :
                    line.includes('[ENGINEER]') ? 'text-emerald-400' :
                    line.includes('[AUDITOR]') ? 'text-amber-400' :
                    'text-gray-300'
                  }`}>
                    {line}
                  </div>
                ))}
                <div className="animate-pulse text-gray-500 mt-2">_</div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
