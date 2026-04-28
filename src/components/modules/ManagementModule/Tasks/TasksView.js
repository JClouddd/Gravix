'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

export default function TasksView() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // New Task Modal State
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', notes: '', due: '', tags: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-Schedule Selection State
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [isAutoScheduling, setIsAutoScheduling] = useState(false);

  // Initial Fetch & Real-time Telemetry
  useEffect(() => {
    // 1. Initial Fetch
    fetch('/api/management/tasks')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.connected && data.tasks && data.tasks.length > 0) {
          setTasks(data.tasks);
        } else {
          // Fallback to Omni-Pipeline Mock Data
          setTasks([
            { id: 'ai-1', title: 'Compile OpenClaw Core', notes: 'Jules Swarm executing React context build', status: 'pending', ai_status: 'Swarm Executing', anticipated_time: '15m', actual_time: '20m', time_shift: '+5m', due: new Date().toISOString() },
            { id: 'ai-2', title: 'Verify BigQuery Schema', notes: 'Auditor agent running lint checks', status: 'pending', ai_status: 'Auditing', anticipated_time: '5m', actual_time: '12m', time_shift: '+7m', due: new Date().toISOString() },
            { id: 'ai-3', title: 'Deploy Cinematic Pipeline', notes: 'Firebase App Hosting crash detected', status: 'pending', ai_status: 'Fatal Error', anticipated_time: '10m', actual_time: '45m', time_shift: '+35m', due: new Date().toISOString() }
          ]);
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });

    // 2. Real-time Telemetry (SSE via Firestore WebSocket)
    const unsub = onSnapshot(collection(db, 'management_tasks'), (snapshot) => {
      // When a backend agent updates a task, instantly merge it into the state
      const liveUpdates = {};
      snapshot.forEach(doc => { liveUpdates[doc.id] = doc.data(); });
      
      setTasks(currentTasks => currentTasks.map(task => {
        if (liveUpdates[task.id]) {
          return { ...task, antigravity_metadata: liveUpdates[task.id] };
        }
        return task;
      }));
    });

    return () => unsub();
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

  const toggleScheduleSelection = (taskId) => {
    const newSet = new Set(selectedTasks);
    if (newSet.has(taskId)) newSet.delete(taskId);
    else newSet.add(taskId);
    setSelectedTasks(newSet);
  };

  const handleToggleComplete = async (taskId, currentStatus) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    try {
      await fetch('/api/management/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, updates: { status: newStatus } })
      });
    } catch (err) {
      console.error("Failed to update task status");
    }
  };
  
  const [showCompleted, setShowCompleted] = useState(false);
  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  const handleAutoSchedule = async () => {
    if (selectedTasks.size === 0) return;
    setIsAutoScheduling(true);
    try {
      const res = await fetch('/api/management/auto-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds: Array.from(selectedTasks) })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Successfully auto-scheduled ${data.scheduledCount || selectedTasks.size} tasks into your calendar!`);
        setSelectedTasks(new Set());
      } else {
        alert("Auto-Schedule failed: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsAutoScheduling(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col gap-lg" style={{ padding: "8px 24px 24px 24px", overflowY: "auto" }}>
      
      {/* Header Controls */}
      <div className="card-glass flex items-center justify-between" style={{ padding: "16px 24px" }}>
        <div className="flex items-center gap-md">
          <div className="module-icon" style={{ background: "var(--success-subtle)", color: "var(--success)", width: 48, height: 48, fontSize: 24 }}>
            ✅
          </div>
          <div>
            <h2 className="h2 text-gradient" style={{ backgroundImage: "linear-gradient(to right, #4ade80, #3b82f6)" }}>Action Items</h2>
            <p className="caption">Prioritize and execute your task queues</p>
          </div>
        </div>

        <div className="flex items-center gap-md">
          {selectedTasks.size > 0 && (
            <button 
              onClick={handleAutoSchedule}
              disabled={isAutoScheduling}
              className="btn btn-primary"
              style={{ background: "var(--agent-courier)", color: "white", borderRadius: "var(--radius-xl)" }}
            >
              <span className="mr-2">✨</span> Auto-Schedule ({selectedTasks.size})
            </button>
          )}
          <button 
            onClick={() => setShowNewTaskModal(true)}
            className="btn btn-primary shadow-lg hover:shadow-xl transition-all"
            style={{ borderRadius: "var(--radius-xl)", padding: "0 24px", background: "linear-gradient(135deg, var(--accent), var(--agent-analyst))" }}
          >
            + New Task
          </button>
        </div>
      </div>

      {/* Task Filters & Sorting */}
      <div className="flex gap-sm">
        <select className="input max-w-[200px] cursor-pointer" style={{ background: "var(--card-bg)" }}>
          <option>Filter by Status</option>
          <option>Todo</option>
          <option>In Progress</option>
          <option>Done</option>
        </select>
        <select className="input max-w-[200px] cursor-pointer" style={{ background: "var(--card-bg)" }}>
          <option>Sort by Due Date</option>
          <option>Priority</option>
        </select>
        <button className="btn btn-secondary border-warning-subtle text-warning hover:bg-warning-subtle/20">
          Show Missing Info
        </button>
      </div>

      {/* Task List */}
      <div className="flex flex-col gap-sm pb-10">
        {loading && (
          <div className="flex flex-col items-center justify-center p-10 gap-sm card-glass">
            <div className="status-dot pulse" style={{ background: "var(--success)", width: 16, height: 16 }}></div>
            <div className="text-secondary font-medium mt-4">Syncing tasks...</div>
          </div>
        )}
        
        {error && (
          <div className="card border-error-subtle bg-error-subtle/10 text-center p-8">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="h3 text-white mb-2">Sync Error</h3>
            <p className="caption">{error}</p>
          </div>
        )}
        
        {!loading && !error && tasks.length === 0 && (
          <div className="empty-state card-glass border-dashed">
            <div className="empty-state-icon">✅</div>
            <div className="empty-state-title">Inbox Zero</div>
            <div className="empty-state-desc">You have no tasks currently queued. Create one to get started.</div>
          </div>
        )}

        {/* Active Tasks */}
        {!loading && !error && pendingTasks.map(task => (
          <div 
            key={task.id} 
            className="card-glass flex items-center justify-between transition-all group hover:scale-[1.01]"
            style={{ 
              padding: "16px 20px",
              borderColor: selectedTasks.has(task.id) ? "var(--accent)" : "var(--glass-border)",
              boxShadow: selectedTasks.has(task.id) ? "0 0 0 1px var(--accent)" : "var(--card-shadow)"
            }}
          >
            <div className="flex items-center gap-md w-full max-w-[70%]">
              <input 
                type="checkbox" 
                checked={task.status === 'completed'} 
                onChange={() => handleToggleComplete(task.id, task.status)} 
                className="w-5 h-5 rounded border-white/20 bg-black/50 accent-green-500 focus:ring-0 cursor-pointer flex-shrink-0" 
              />
              <div className="flex flex-col">
                <div className={`h4 text-text-primary`}>
                  {task.title}
                </div>
                {task.notes && <div className="caption mt-1 line-clamp-1 opacity-80">{task.notes}</div>}
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2 mt-2 md:mt-0">
              <div className="flex items-center gap-sm">
                
                {/* Advanced Swarm Statuses */}
                {task.ai_status && (
                  <span className="badge" style={{ 
                    background: task.ai_status === 'Fatal Error' ? 'rgba(239,68,68,0.1)' : task.ai_status === 'Auditing' ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.1)',
                    color: task.ai_status === 'Fatal Error' ? '#ef4444' : task.ai_status === 'Auditing' ? '#f59e0b' : '#3b82f6',
                    border: `1px solid ${task.ai_status === 'Fatal Error' ? 'rgba(239,68,68,0.3)' : task.ai_status === 'Auditing' ? 'rgba(245,158,11,0.3)' : 'rgba(59,130,246,0.3)'}`
                  }}>
                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${task.ai_status === 'Fatal Error' ? 'bg-red-500 animate-pulse' : task.ai_status === 'Auditing' ? 'bg-amber-500 animate-pulse' : 'bg-blue-500 animate-pulse'}`}></span>
                    {task.ai_status}
                  </span>
                )}

                {task.antigravity_metadata?.tags?.map(tag => (
                  <span key={tag} className="badge badge-info">
                    {tag}
                  </span>
                ))}
                {task.due && (
                  <span className={`badge ${new Date(task.due) < new Date() ? 'badge-error' : 'badge-success'}`}>
                    <div className={`status-dot ${new Date(task.due) < new Date() ? 'error' : 'online'}`} style={{ width: 6, height: 6 }}></div>
                    {new Date(task.due).toLocaleDateString()}
                  </span>
                )}
                
                {/* Auto-Schedule Icon */}
                <button 
                  onClick={() => toggleScheduleSelection(task.id)}
                  className={`btn-icon w-8 h-8 rounded-lg ml-2 transition-all ${selectedTasks.has(task.id) ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10'}`}
                  title="Select for Auto-Scheduling"
                >
                  📅
                </button>
              </div>

              {/* Temporal Time-Delta Tracking UI */}
              {task.time_shift && (
                <div className="flex items-center gap-3 text-xs font-mono bg-black/40 rounded-md px-2 py-1 border border-white/5">
                  <span className="text-gray-400" title="Anticipated Duration">SCH: {task.anticipated_time}</span>
                  <span className="text-gray-300" title="Actual Duration">ACT: {task.actual_time}</span>
                  <span className={`font-bold ${task.time_shift.includes('+') ? 'text-rose-400 drop-shadow-[0_0_5px_rgba(251,113,133,0.8)]' : 'text-emerald-400'}`} title="Timeline Shift">
                    Δ {task.time_shift}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Completed Tasks Accordion */}
        {completedTasks.length > 0 && (
          <div className="mt-8">
            <button 
              onClick={() => setShowCompleted(!showCompleted)} 
              className="flex items-center gap-2 text-text-secondary hover:text-white transition-colors text-sm font-medium mb-4"
            >
              <span className={`transition-transform ${showCompleted ? 'rotate-90' : ''}`}>▶</span>
              Completed Tasks ({completedTasks.length})
            </button>
            
            {showCompleted && (
              <div className="flex flex-col gap-sm">
                {completedTasks.map(task => (
                  <div 
                    key={task.id} 
                    className="card-glass flex items-center justify-between transition-all opacity-60 hover:opacity-100"
                    style={{ padding: "12px 20px" }}
                  >
                    <div className="flex items-center gap-md w-full max-w-[70%]">
                      <input 
                        type="checkbox" 
                        checked={task.status === 'completed'} 
                        onChange={() => handleToggleComplete(task.id, task.status)} 
                        className="w-5 h-5 rounded border-white/20 bg-black/50 accent-green-500 focus:ring-0 cursor-pointer flex-shrink-0" 
                      />
                      <div className="flex flex-col">
                        <div className="h4 text-text-tertiary line-through">
                          {task.title}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Task Modal */}
      {showNewTaskModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-modal p-4 transition-all">
          <div className="card-glass w-full max-w-md border-white/20 shadow-2xl relative overflow-hidden" style={{ animation: "scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}>
            
            {/* Decorative background glow */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-green-500/20 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex justify-between items-center mb-6 relative z-10">
              <h3 className="h2 text-white">New Task</h3>
              <button onClick={() => setShowNewTaskModal(false)} className="btn-icon hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="flex flex-col gap-md relative z-10">
              <div>
                <label className="block caption font-medium mb-2 uppercase tracking-wider text-gray-400">Task Title</label>
                <input 
                  type="text" 
                  value={newTask.title} 
                  onChange={e => setNewTask({...newTask, title: e.target.value})}
                  className="input text-lg font-medium"
                  placeholder="e.g. Complete quarterly report"
                  required
                />
              </div>
              
              <div>
                <label className="block caption font-medium mb-2 uppercase tracking-wider text-gray-400">Notes / Description</label>
                <textarea 
                  value={newTask.notes} 
                  onChange={e => setNewTask({...newTask, notes: e.target.value})}
                  className="input min-h-[100px] resize-none"
                  placeholder="Optional details..."
                />
              </div>

              <div className="flex gap-md">
                <div className="flex-1">
                  <label className="block caption font-medium mb-2 uppercase tracking-wider text-gray-400">Due Date</label>
                  <input 
                    type="date" 
                    value={newTask.due} 
                    onChange={e => setNewTask({...newTask, due: e.target.value})}
                    className="input"
                  />
                </div>
                <div className="flex-1">
                  <label className="block caption font-medium mb-2 uppercase tracking-wider text-gray-400">Tags</label>
                  <input 
                    type="text" 
                    value={newTask.tags} 
                    onChange={e => setNewTask({...newTask, tags: e.target.value})}
                    className="input"
                    placeholder="urgent, work"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-sm mt-6 pt-6 border-t border-white/10">
                <button 
                  type="button" 
                  onClick={() => setShowNewTaskModal(false)}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="btn btn-primary"
                  style={{ minWidth: 120, background: "var(--success)" }}
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
