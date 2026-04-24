'use client';

import React, { useState, useEffect } from 'react';

export default function TasksView() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/management/tasks')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.connected) {
          setTasks(data.tasks || []);
        } else if (!data.connected) {
          setError("Google OAuth is not connected. Please connect your account.");
        } else {
          setError(data.error || "Failed to load tasks");
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

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

      {/* Task List */}
      <div className="flex flex-col space-y-3">
        {loading && <div className="text-gray-400">Loading tasks...</div>}
        {error && <div className="text-red-400 bg-red-900/20 p-4 rounded-lg">{error}</div>}
        
        {!loading && !error && tasks.length === 0 && (
          <div className="w-full py-20 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
            <div className="text-gray-400 mb-2">No tasks found</div>
            <div className="text-sm text-gray-500">Create a task to get started.</div>
          </div>
        )}

        {!loading && !error && tasks.map(task => (
          <div key={task.id} className="flex items-center justify-between p-4 border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] rounded-xl transition-colors cursor-pointer group">
            <div className="flex items-center space-x-4">
              <input type="checkbox" checked={task.status === 'completed'} readOnly className="w-5 h-5 rounded border-white/20 bg-black/50 text-blue-500 focus:ring-0" />
              <div>
                <div className={`font-medium ${task.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                  {task.title}
                </div>
                {task.notes && <div className="text-xs text-gray-500 mt-1 line-clamp-1">{task.notes}</div>}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {task.antigravity_metadata?.tags?.map(tag => (
                <span key={tag} className="px-2 py-1 text-xs bg-white/10 text-gray-300 rounded-md">
                  {tag}
                </span>
              ))}
              {task.due && (
                <span className={`text-xs px-2 py-1 rounded-md ${new Date(task.due) < new Date() ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                  {new Date(task.due).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
