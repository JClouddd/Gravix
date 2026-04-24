'use client';

import React from 'react';

export default function TasksView() {
  return (
    <div className="w-full h-full p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-semibold text-white">Tasks</h2>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors">
          + New Task
        </button>
      </div>

      {/* Task Filters & Sorting */}
      <div className="flex space-x-4 mb-6">
        <select className="bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500/50">
          <option>Filter by Status</option>
          <option>Todo</option>
          <option>In Progress</option>
          <option>Done</option>
        </select>
        <select className="bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500/50">
          <option>Sort by Due Date</option>
          <option>Priority</option>
        </select>
        <button className="px-4 py-2 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-lg text-sm font-medium hover:bg-yellow-500/20 transition-colors">
          Show Missing Info
        </button>
      </div>

      {/* Empty State Stub */}
      <div className="w-full py-20 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
        <div className="text-gray-400 mb-2">No tasks found</div>
        <div className="text-sm text-gray-500">Create a task to get started.</div>
      </div>
    </div>
  );
}
