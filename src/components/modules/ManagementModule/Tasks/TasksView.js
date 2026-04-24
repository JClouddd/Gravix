'use client';

import React, { useState, useEffect } from 'react';

export default function TasksView() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // New Task Modal State
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', notes: '', due: '', tags: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;
    
    setIsSubmitting(true);
    try {
      const payload = {
        ...newTask,
        tags: newTask.tags.split(',').map(t => t.trim()).filter(Boolean)
      };
      // For tasks, Google expects RFC 3339 timestamp with Z
      if (payload.due) {
        payload.due = new Date(payload.due).toISOString();
      }

      const res = await fetch('/api/management/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success && data.task) {
        setTasks([data.task, ...tasks]);
        setShowNewTaskModal(false);
        setNewTask({ title: '', notes: '', due: '', tags: '' });
      } else {
        alert("Error: " + (data.error || "Failed to create task"));
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full h-full p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-semibold text-white">Tasks</h2>
        <button 
          onClick={() => setShowNewTaskModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
        >
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

      {/* New Task Modal */}
      {showNewTaskModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Create New Task</h3>
            <form onSubmit={handleCreateTask} className="flex flex-col space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Task Title</label>
                <input 
                  type="text" 
                  value={newTask.title} 
                  onChange={e => setNewTask({...newTask, title: e.target.value})}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="e.g. Complete quarterly report"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Notes / Description</label>
                <textarea 
                  value={newTask.notes} 
                  onChange={e => setNewTask({...newTask, notes: e.target.value})}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 min-h-[80px]"
                  placeholder="Optional details..."
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-400 mb-1">Due Date</label>
                  <input 
                    type="date" 
                    value={newTask.due} 
                    onChange={e => setNewTask({...newTask, due: e.target.value})}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-400 mb-1">Tags (comma separated)</label>
                  <input 
                    type="text" 
                    value={newTask.tags} 
                    onChange={e => setNewTask({...newTask, tags: e.target.value})}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    placeholder="urgent, work"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-white/10">
                <button 
                  type="button" 
                  onClick={() => setShowNewTaskModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                >
                  {isSubmitting ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
