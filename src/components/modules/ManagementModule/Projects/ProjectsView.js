'use client';

import React from 'react';

export default function ProjectsView() {
  return (
    <div className="w-full h-full p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-semibold text-white">Projects</h2>
        <button className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors">
          + New Project
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Empty State Stub */}
        <div className="col-span-full py-20 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
          <div className="text-gray-400 mb-2">No projects yet</div>
          <div className="text-sm text-gray-500">Group your tasks into manageable projects.</div>
        </div>
      </div>
    </div>
  );
}
