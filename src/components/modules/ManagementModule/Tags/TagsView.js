'use client';

import React from 'react';

export default function TagsView() {
  const mockTags = [
    { id: 1, name: 'Urgent', count: 12, type: 'error' },
    { id: 2, name: 'Frontend', count: 45, type: 'info' },
    { id: 3, name: 'Design', count: 8, type: 'accent' },
    { id: 4, name: 'Backend', count: 22, type: 'warning' },
    { id: 5, name: 'Completed', count: 104, type: 'success' },
  ];

  return (
    <div className="w-full h-full flex flex-col gap-lg" style={{ padding: "8px 24px 24px 24px", overflowY: "auto" }}>
      
      {/* Header Controls */}
      <div className="card-glass flex items-center justify-between" style={{ padding: "16px 24px" }}>
        <div className="flex items-center gap-md">
          <div className="module-icon" style={{ background: "var(--info-subtle)", color: "var(--info)", width: 48, height: 48, fontSize: 24 }}>
            🏷️
          </div>
          <div>
            <h2 className="h2 text-gradient" style={{ backgroundImage: "linear-gradient(to right, #38bdf8, #818cf8)" }}>Global Tags</h2>
            <p className="caption">Organize cross-module context and search</p>
          </div>
        </div>

        <button 
          className="btn btn-primary shadow-lg hover:shadow-xl transition-all"
          style={{ borderRadius: "var(--radius-xl)", padding: "0 24px", background: "linear-gradient(135deg, #38bdf8, #818cf8)" }}
        >
          + New Tag
        </button>
      </div>

      <div className="card-glass" style={{ padding: "32px" }}>
        <div className="flex flex-wrap gap-md">
          {mockTags.map(tag => (
            <div key={tag.id} className="flex items-center gap-sm bg-black/40 border border-white/5 rounded-full pl-4 pr-2 py-1.5 cursor-pointer hover:bg-white/10 transition-colors group">
              <span className={`badge badge-${tag.type}`}>{tag.name}</span>
              <span className="text-xs text-text-tertiary bg-white/5 rounded-full px-2 py-0.5 group-hover:text-white transition-colors">{tag.count}</span>
            </div>
          ))}
          
          <div className="flex items-center gap-sm border border-dashed border-white/20 rounded-full px-4 py-1.5 cursor-pointer hover:bg-white/5 transition-colors text-text-secondary">
            <span className="text-xl leading-none -mt-1">+</span>
            <span className="caption font-medium">Add Tag</span>
          </div>
        </div>
      </div>
    </div>
  );
}
