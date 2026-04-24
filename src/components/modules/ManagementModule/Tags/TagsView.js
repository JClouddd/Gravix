'use client';

import React from 'react';

export default function TagsView() {
  return (
    <div className="w-full h-full p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-semibold text-white">Tags</h2>
        <button className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors">
          + New Tag
        </button>
      </div>

      <div className="flex flex-wrap gap-4">
        {/* Empty State Stub */}
        <div className="w-full py-20 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
          <div className="text-gray-400 mb-2">No tags created</div>
          <div className="text-sm text-gray-500">Create tags to organize your tasks and projects.</div>
        </div>
      </div>
    </div>
  );
}
