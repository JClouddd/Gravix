'use client';

import React, { useState, useEffect } from 'react';

export default function ReportsView() {
  const [loading, setLoading] = useState(true);

  // Mocking analytics data load
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full h-full flex flex-col gap-lg" style={{ padding: "8px 24px 24px 24px", overflowY: "auto" }}>
      {/* Header */}
      <div className="card-glass flex items-center justify-between" style={{ padding: "16px 24px" }}>
        <div className="flex items-center gap-md">
          <div className="module-icon" style={{ background: "var(--agent-courier)", color: "white", width: 48, height: 48, fontSize: 24 }}>
            📊
          </div>
          <div>
            <h2 className="h2 text-gradient" style={{ backgroundImage: "linear-gradient(to right, #3b82f6, #06b6d4)" }}>Analytics & Reporting</h2>
            <p className="caption">Track workflow velocity and system health</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button className="btn btn-secondary border-white/10 hover:bg-white/5">Export CSV</button>
          <button className="btn btn-primary bg-blue-500 hover:bg-blue-600 border-transparent shadow-[0_0_15px_rgba(59,130,246,0.4)]">
            Generate Report
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-10 gap-sm card-glass">
          <div className="status-dot pulse" style={{ background: "var(--agent-courier)", width: 16, height: 16 }}></div>
          <div className="text-secondary font-medium mt-4">Compiling analytics...</div>
        </div>
      ) : (
        <div className="flex flex-col gap-lg pb-10">
          
          {/* Key Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card-glass p-6 flex flex-col gap-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl"></div>
              <span className="caption text-gray-400 uppercase tracking-widest font-bold">Tasks Completed</span>
              <div className="h1 text-white flex items-end gap-2">
                142 <span className="text-sm text-green-400 font-bold mb-2">↑ 12%</span>
              </div>
              <p className="text-xs text-gray-500">Last 30 days</p>
            </div>
            
            <div className="card-glass p-6 flex flex-col gap-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl"></div>
              <span className="caption text-gray-400 uppercase tracking-widest font-bold">Velocity (Pts/Wk)</span>
              <div className="h1 text-white flex items-end gap-2">
                48 <span className="text-sm text-green-400 font-bold mb-2">↑ 5%</span>
              </div>
              <p className="text-xs text-gray-500">Agile completion rate</p>
            </div>
            
            <div className="card-glass p-6 flex flex-col gap-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl"></div>
              <span className="caption text-gray-400 uppercase tracking-widest font-bold">Overdue Items</span>
              <div className="h1 text-white flex items-end gap-2">
                3 <span className="text-sm text-rose-400 font-bold mb-2">↓ 2</span>
              </div>
              <p className="text-xs text-gray-500">Requires attention</p>
            </div>
            
            <div className="card-glass p-6 flex flex-col gap-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl"></div>
              <span className="caption text-gray-400 uppercase tracking-widest font-bold">AI Autonomy Rate</span>
              <div className="h1 text-white flex items-end gap-2">
                87% <span className="text-sm text-amber-400 font-bold mb-2">+ 4%</span>
              </div>
              <p className="text-xs text-gray-500">Tasks handled by Jules/Agents</p>
            </div>
          </div>

          {/* Charts Row (Mock Visuals for now) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[300px]">
            <div className="card-glass p-6 flex flex-col h-full relative">
              <h3 className="h4 text-white mb-6">Velocity Trend</h3>
              <div className="flex-1 flex items-end gap-2 border-b border-l border-white/10 p-4 pt-0">
                {/* Mock Bar Chart */}
                {[40, 60, 45, 80, 55, 90, 70].map((val, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div 
                      className="w-full rounded-t-sm transition-all duration-1000"
                      style={{ height: `${val}%`, background: `linear-gradient(0deg, rgba(59,130,246,0.2) 0%, rgba(59,130,246,0.8) 100%)` }}
                    ></div>
                    <span className="text-[10px] text-gray-500">W{i+1}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-glass p-6 flex flex-col h-full">
              <h3 className="h4 text-white mb-6">Task Distribution</h3>
              <div className="flex-1 flex items-center justify-center relative">
                {/* Mock Donut Chart using CSS conic-gradient */}
                <div className="w-40 h-40 rounded-full relative" style={{ background: 'conic-gradient(var(--accent) 0% 45%, var(--agent-forge) 45% 75%, var(--agent-scholar) 75% 100%)' }}>
                  <div className="absolute inset-4 bg-[var(--card-bg)] rounded-full flex flex-col items-center justify-center">
                    <span className="h3 text-white">324</span>
                    <span className="text-[10px] text-gray-500 uppercase">Total</span>
                  </div>
                </div>
                
                {/* Legend */}
                <div className="ml-8 flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded bg-[var(--accent)]"></div> <span className="text-gray-300">Development (45%)</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded bg-[var(--agent-forge)]"></div> <span className="text-gray-300">Design (30%)</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded bg-[var(--agent-scholar)]"></div> <span className="text-gray-300">Research (25%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      )}
    </div>
  );
}
