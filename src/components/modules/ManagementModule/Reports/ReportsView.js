'use client';

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ReportsView() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('context'); // context, plan, video
  const [ledgerData, setLedgerData] = useState({
    plan_status: { content: "" },
    video_status: { content: "" },
    daily_context: { entries: [] }
  });

  useEffect(() => {
    async function fetchLedger() {
      try {
        const res = await fetch('/api/omni-ledger');
        if (res.ok) {
          const data = await res.json();
          setLedgerData(data);
        }
      } catch (err) {
        console.error("Failed to fetch omni-ledger", err);
      } finally {
        setLoading(false);
      }
    }
    fetchLedger();
  }, []);

  return (
    <div className="w-full h-full flex flex-col gap-lg" style={{ padding: "8px 24px 24px 24px", overflowY: "auto" }}>
      {/* Header */}
      <div className="card-glass flex items-center justify-between" style={{ padding: "16px 24px" }}>
        <div className="flex items-center gap-md">
          <div className="module-icon" style={{ background: "var(--agent-courier)", color: "white", width: 48, height: 48, fontSize: 24 }}>
            📖
          </div>
          <div>
            <h2 className="h2 text-gradient" style={{ backgroundImage: "linear-gradient(to right, #3b82f6, #06b6d4)" }}>Omni-Ledger</h2>
            <p className="caption">Persistent Architectural Context & System Status</p>
          </div>
        </div>

        <div className="flex gap-2 bg-black/20 p-1 rounded-lg border border-white/5">
          <button 
            onClick={() => setActiveTab('context')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'context' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
          >
            Daily Context
          </button>
          <button 
            onClick={() => setActiveTab('plan')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'plan' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
          >
            Integration Plan
          </button>
          <button 
            onClick={() => setActiveTab('video')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'video' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
          >
            Video Swarm
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-10 gap-sm card-glass">
          <div className="status-dot pulse" style={{ background: "var(--agent-courier)", width: 16, height: 16 }}></div>
          <div className="text-secondary font-medium mt-4">Syncing Omni-Ledger...</div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-lg pb-10">
          
          <div className="card-glass p-8 flex-1 overflow-y-auto markdown-body">
            {activeTab === 'context' && (
              <div className="flex flex-col gap-8">
                <h3 className="h3 text-white border-b border-white/10 pb-4 mb-4">Append-Only Context Ledger</h3>
                {ledgerData.daily_context?.entries?.length === 0 ? (
                  <p className="text-gray-500 italic">No context entries logged yet.</p>
                ) : (
                  [...(ledgerData.daily_context?.entries || [])].reverse().map((entry, idx) => (
                    <div key={idx} className="bg-black/20 border border-white/5 rounded-lg p-6 relative">
                      <div className="absolute -left-3 -top-3 bg-blue-500/20 border border-blue-500/50 text-blue-300 text-xs px-3 py-1 rounded-full backdrop-blur-md">
                        {new Date(entry.timestamp).toLocaleString()}
                      </div>
                      <div className="mt-2 text-gray-300">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{entry.content}</ReactMarkdown>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'plan' && (
              <div className="text-gray-300">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {ledgerData.plan_status?.content || "_No plan status available._"}
                </ReactMarkdown>
              </div>
            )}

            {activeTab === 'video' && (
              <div className="text-gray-300">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {ledgerData.video_status?.content || "_No video swarm status available._"}
                </ReactMarkdown>
              </div>
            )}
          </div>
          
        </div>
      )}
    </div>
  );
}
