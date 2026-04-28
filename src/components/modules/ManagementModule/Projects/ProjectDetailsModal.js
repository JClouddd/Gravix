'use client';

import React from 'react';

export default function ProjectDetailsModal({ project, onClose }) {
  if (!project) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[250] p-4 transition-all">
      <div 
        className="card-glass w-full max-w-2xl border-white/20 shadow-2xl relative overflow-hidden flex flex-col"
        style={{ animation: "scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)", maxHeight: '90vh' }}
      >
        {/* Decorative background glow */}
        <div 
          className="absolute -top-32 -left-32 w-64 h-64 rounded-full blur-[80px] pointer-events-none opacity-20" 
          style={{ background: project.color || 'var(--accent)' }}
        ></div>

        <div className="flex justify-between items-center mb-6 relative z-10 border-b border-white/10 pb-4">
          <div>
            <h2 className="h2 text-white">{project.title}</h2>
            <p className="caption text-gray-400 mt-1">{project.description}</p>
          </div>
          <button 
            onClick={onClose} 
            className="btn-icon w-10 h-10 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 flex flex-col gap-6 pr-2">
          
          {/* Progress Section */}
          <div className="flex flex-col gap-sm p-4 bg-black/40 rounded-xl border border-white/5">
            <div className="flex justify-between items-center text-sm font-medium text-gray-300">
              <span>Overall Progress</span>
              <span style={{ color: project.color || 'var(--accent)' }}>{project.progress}%</span>
            </div>
            <div className="w-full h-3 bg-black/60 rounded-full overflow-hidden border border-white/10">
              <div 
                className="h-full rounded-full transition-all duration-1000 ease-out" 
                style={{ width: `${project.progress}%`, background: `linear-gradient(90deg, ${project.color || 'var(--accent)'}, #ffffff)` }}
              ></div>
            </div>
          </div>

          {/* Details / Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card-glass p-4 border-white/5 flex flex-col gap-1 items-center justify-center">
              <div className="text-2xl mb-1">📋</div>
              <div className="text-xl font-bold text-white">12</div>
              <div className="caption text-gray-500 uppercase tracking-wider text-[10px]">Total Tasks</div>
            </div>
            <div className="card-glass p-4 border-white/5 flex flex-col gap-1 items-center justify-center">
              <div className="text-2xl mb-1">✅</div>
              <div className="text-xl font-bold text-green-400">8</div>
              <div className="caption text-gray-500 uppercase tracking-wider text-[10px]">Completed</div>
            </div>
            <div className="card-glass p-4 border-white/5 flex flex-col gap-1 items-center justify-center">
              <div className="text-2xl mb-1">⏳</div>
              <div className="text-xl font-bold text-amber-400">4</div>
              <div className="caption text-gray-500 uppercase tracking-wider text-[10px]">Pending</div>
            </div>
            <div className="card-glass p-4 border-white/5 flex flex-col gap-1 items-center justify-center">
              <div className="text-2xl mb-1">🤖</div>
              <div className="text-xl font-bold text-blue-400">2</div>
              <div className="caption text-gray-500 uppercase tracking-wider text-[10px]">AI Driven</div>
            </div>
          </div>

          {/* Sub-Tasks Preview */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-white/5 pb-2">Active Sub-Tasks</h4>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between p-3 bg-black/30 rounded-lg border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-sm text-gray-300">Initial Setup & Architecture</span>
                </div>
                <span className="text-xs text-gray-500">Done</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                  <span className="text-sm text-white">Integrate API Endpoints</span>
                </div>
                <span className="text-xs font-bold text-blue-400">In Progress</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-black/30 rounded-lg border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-gray-600"></div>
                  <span className="text-sm text-gray-500">Final Documentation</span>
                </div>
                <span className="text-xs text-gray-600">Pending</span>
              </div>
            </div>
          </div>

        </div>

        <div className="mt-6 pt-4 border-t border-white/10 flex justify-end gap-3 relative z-10">
          <button onClick={onClose} className="btn btn-ghost text-sm">
            Close
          </button>
          <button className="btn btn-primary text-sm shadow-lg shadow-blue-500/20" style={{ background: project.color || "var(--accent)" }}>
            Go to Project Space
          </button>
        </div>
      </div>
    </div>
  );
}
