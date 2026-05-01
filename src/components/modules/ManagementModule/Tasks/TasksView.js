'use client';

import React, { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

export default function TasksView() {
  const [taskLists, setTaskLists] = useState([]);
  const [activeListId, setActiveListId] = useState("@default");
  
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI States
  const [inlineTaskTitle, setInlineTaskTitle] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-Schedule Selection State
  const [selectedForSchedule, setSelectedForSchedule] = useState(new Set());
  const [isAutoScheduling, setIsAutoScheduling] = useState(false);

  // Fetch tasks when activeListId changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch(`/api/management/tasks?taskListId=${activeListId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.connected) {
          setTasks(data.tasks || []);
          setTaskLists(data.taskLists || []);
          // Only set activeListId if it was the default initialization
          if (activeListId === "@default" && data.taskListId) {
            setActiveListId(data.taskListId);
          }
        } else if (!data.connected) {
          setError("Google OAuth is not connected. Please connect your account in Settings.");
        } else {
          setError(data.error || "Failed to load tasks");
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [activeListId]);

  // Real-time Telemetry for AI metadata
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'management_tasks'), (snapshot) => {
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

  // --- Actions ---

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!inlineTaskTitle.trim()) return;
    
    setIsSubmitting(true);
    try {
      const payload = {
        title: inlineTaskTitle,
        taskListId: activeListId,
      };

      const res = await fetch('/api/management/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success && data.task) {
        setTasks([data.task, ...tasks]);
        setInlineTaskTitle('');
      } else {
        alert("Error: " + (data.error || "Failed to create task"));
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTask = async (taskId, updates) => {
    // Optimistic UI Update
    setTasks(tasks.map(t => t.id === taskId ? { ...t, ...updates } : t));
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask({ ...selectedTask, ...updates });
    }

    try {
      await fetch('/api/management/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, taskListId: activeListId, updates })
      });
    } catch (err) {
      console.error("Failed to update task");
    }
  };

  const handleToggleComplete = (taskId, currentStatus) => {
    const newStatus = currentStatus === 'completed' ? 'needsAction' : 'completed';
    handleUpdateTask(taskId, { status: newStatus });
  };

  // Drag and Drop ordering
  const dragItem = useRef();
  const dragOverItem = useRef();

  const handleDragStart = (e, index) => {
    dragItem.current = index;
    e.dataTransfer.effectAllowed = 'move';
    e.target.style.opacity = '0.5';
  };

  const handleDragEnter = (e, index) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = async (e) => {
    e.target.style.opacity = '1';
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      const newTasks = [...pendingTasks];
      const draggedTask = newTasks[dragItem.current];
      
      // Remove and insert
      newTasks.splice(dragItem.current, 1);
      newTasks.splice(dragOverItem.current, 0, draggedTask);
      
      // Update local state immediately for pending tasks
      setTasks([...newTasks, ...completedTasks]);

      // Call API
      const previousId = dragOverItem.current > 0 ? newTasks[dragOverItem.current - 1].id : null;
      try {
        await fetch('/api/management/tasks', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: draggedTask.id, taskListId: activeListId, action: 'move', previousId })
        });
      } catch (err) {
        console.error("Drag order update failed");
      }
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleAutoSchedule = async () => {
    if (selectedForSchedule.size === 0) return;
    setIsAutoScheduling(true);
    try {
      const res = await fetch('/api/management/auto-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds: Array.from(selectedForSchedule) })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Successfully auto-scheduled ${data.scheduledCount || selectedForSchedule.size} tasks!`);
        setSelectedForSchedule(new Set());
      } else {
        alert("Auto-Schedule failed: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsAutoScheduling(false);
    }
  };

  const toggleScheduleSelection = (e, taskId) => {
    e.stopPropagation();
    const newSet = new Set(selectedForSchedule);
    if (newSet.has(taskId)) newSet.delete(taskId);
    else newSet.add(taskId);
    setSelectedForSchedule(newSet);
  };

  // Split tasks
  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <div className="w-full h-full flex flex-col gap-lg" style={{ padding: "8px 24px 24px 24px" }}>
      
      {/* Header Controls */}
      <div className="card-glass flex items-center justify-between" style={{ padding: "16px 24px", flexShrink: 0 }}>
        <div className="flex items-center gap-md">
          <div className="module-icon" style={{ background: "var(--success-subtle)", color: "var(--success)", width: 48, height: 48, fontSize: 24 }}>
            ✅
          </div>
          <div>
            <h2 className="h2 text-gradient" style={{ backgroundImage: "linear-gradient(to right, #4ade80, #3b82f6)" }}>Tasks Replica</h2>
            <p className="caption">Dual-Engine Google Tasks UI</p>
          </div>
        </div>

        <div className="flex items-center gap-md">
          {selectedForSchedule.size > 0 && (
            <button 
              onClick={handleAutoSchedule}
              disabled={isAutoScheduling}
              className="btn btn-primary"
              style={{ background: "var(--agent-courier)", color: "white", borderRadius: "var(--radius-xl)" }}
            >
              <span className="mr-2">✨</span> Auto-Schedule ({selectedForSchedule.size})
            </button>
          )}
        </div>
      </div>

      {/* 3-Column Layout */}
      <div className="flex flex-1 gap-md overflow-hidden min-h-0">
        
        {/* LEFT COLUMN: Task Lists */}
        <div className="w-64 card-glass overflow-y-auto hidden md:flex flex-col gap-1 p-2">
          <h4 className="caption text-gray-400 uppercase tracking-wider px-4 py-2 mb-2">My Lists</h4>
          {taskLists.map(list => (
            <button
              key={list.id}
              onClick={() => setActiveListId(list.id)}
              className={`text-left px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${activeListId === list.id ? 'bg-blue-500/20 text-blue-400 font-medium' : 'hover:bg-white/5 text-gray-300'}`}
            >
              <span className="text-lg opacity-70">📋</span>
              <span className="truncate">{list.title}</span>
            </button>
          ))}
        </div>

        {/* MIDDLE COLUMN: Tasks List */}
        <div className="flex-1 card-glass flex flex-col overflow-hidden relative">
          
          {loading && (
            <div className="absolute inset-0 bg-black/50 z-10 flex items-center justify-center backdrop-blur-sm">
              <div className="status-dot pulse" style={{ background: "var(--success)", width: 16, height: 16 }}></div>
            </div>
          )}

          {error && (
            <div className="p-8 text-center text-red-400">
              <p>⚠️ {error}</p>
            </div>
          )}

          {/* Inline Create Task */}
          <div className="p-4 border-b border-white/10 shrink-0">
            <form onSubmit={handleCreateTask} className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">＋</span>
              <input 
                type="text" 
                value={inlineTaskTitle}
                onChange={e => setInlineTaskTitle(e.target.value)}
                placeholder="Add a task"
                className="w-full bg-transparent border-none text-white focus:outline-none focus:ring-0 text-lg py-2 pl-12 pr-4 rounded-lg hover:bg-white/5 transition-colors"
                disabled={isSubmitting}
              />
            </form>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {/* Active Tasks */}
            <div className="flex flex-col gap-1">
              {pendingTasks.map((task, index) => (
                <div 
                  key={task.id} 
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnter={(e) => handleDragEnter(e, index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => setSelectedTask(task)}
                  className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors group ${selectedTask?.id === task.id ? 'bg-blue-500/10' : 'hover:bg-white/5'}`}
                >
                  <div className="flex items-center gap-2 mt-1">
                    <span className="cursor-grab text-gray-500 opacity-0 group-hover:opacity-100 hover:text-white transition-opacity">⋮⋮</span>
                    <input 
                      type="checkbox" 
                      checked={false} 
                      onChange={(e) => { e.stopPropagation(); handleToggleComplete(task.id, task.status); }} 
                      className="w-5 h-5 rounded-full border-2 border-gray-400 bg-transparent accent-blue-500 cursor-pointer appearance-none checked:bg-blue-500 checked:border-blue-500 transition-colors"
                      style={{ backgroundImage: task.status === 'completed' ? 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 16 16\' fill=\'white\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z\'/%3E%3C/svg%3E")' : 'none', backgroundSize: '100% 100%' }}
                    />
                  </div>
                  
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="text-white text-base font-medium truncate">{task.title}</div>
                    {task.notes && <div className="text-sm text-gray-400 truncate mt-1">{task.notes}</div>}
                    
                    <div className="flex flex-wrap gap-2 mt-2">
                      {task.due && (
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${new Date(task.due) < new Date() ? 'border-red-500/30 text-red-400 bg-red-500/10' : 'border-gray-500/30 text-gray-400'}`}>
                          {new Date(task.due).toLocaleDateString()}
                        </span>
                      )}
                      {task.antigravity_metadata?.ai_status && (
                        <span className="text-xs px-2 py-0.5 rounded-full border border-blue-500/30 text-blue-400 bg-blue-500/10 flex items-center gap-1">
                          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
                          {task.antigravity_metadata.ai_status}
                        </span>
                      )}
                      {task.antigravity_metadata?.tags?.map(tag => (
                        <span key={tag} className="text-xs px-2 py-0.5 rounded-full border border-white/10 text-gray-300">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={(e) => toggleScheduleSelection(e, task.id)}
                    className={`btn-icon w-8 h-8 rounded-full ml-2 opacity-0 group-hover:opacity-100 transition-all ${selectedForSchedule.has(task.id) ? 'opacity-100 bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                    title="Select for Auto-Scheduling"
                  >
                    📅
                  </button>
                </div>
              ))}
            </div>

            {/* Completed Accordion */}
            {completedTasks.length > 0 && (
              <div className="mt-6 border-t border-white/10 pt-4">
                <button 
                  onClick={() => setShowCompleted(!showCompleted)} 
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-medium px-3 py-1 rounded hover:bg-white/5"
                >
                  <span className={`transition-transform duration-200 ${showCompleted ? 'rotate-90' : ''}`}>▶</span>
                  Completed ({completedTasks.length})
                </button>
                
                {showCompleted && (
                  <div className="flex flex-col gap-1 mt-2">
                    {completedTasks.map(task => (
                      <div 
                        key={task.id} 
                        onClick={() => setSelectedTask(task)}
                        className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors group ${selectedTask?.id === task.id ? 'bg-blue-500/10' : 'hover:bg-white/5'}`}
                      >
                        <div className="mt-1">
                          <input 
                            type="checkbox" 
                            checked={true} 
                            onChange={(e) => { e.stopPropagation(); handleToggleComplete(task.id, task.status); }} 
                            className="w-5 h-5 rounded border-none bg-blue-500 cursor-pointer flex-shrink-0 flex items-center justify-center appearance-none"
                            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 16 16\' fill=\'white\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z\'/%3E%3C/svg%3E")', backgroundSize: '100% 100%' }}
                          />
                        </div>
                        <div className="text-gray-500 text-base line-through truncate flex-1">{task.title}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Details Drawer */}
        {selectedTask && (
          <div className="w-80 card-glass flex flex-col border-l border-white/10 animate-fade-in slide-in-from-right relative">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
              <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">Details</span>
              <button onClick={() => setSelectedTask(null)} className="text-gray-400 hover:text-white w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors">
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              
              <div className="flex items-start gap-3">
                 <input 
                    type="checkbox" 
                    checked={selectedTask.status === 'completed'} 
                    onChange={() => handleToggleComplete(selectedTask.id, selectedTask.status)} 
                    className="w-6 h-6 mt-1 rounded-full border-2 border-gray-400 bg-transparent accent-blue-500 cursor-pointer appearance-none checked:bg-blue-500 checked:border-blue-500 transition-colors"
                    style={{ backgroundImage: selectedTask.status === 'completed' ? 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 16 16\' fill=\'white\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z\'/%3E%3C/svg%3E")' : 'none', backgroundSize: '100% 100%' }}
                  />
                <textarea 
                  className="w-full bg-transparent border-none text-white text-xl font-medium focus:outline-none focus:ring-0 resize-none h-24"
                  value={selectedTask.title}
                  onChange={(e) => handleUpdateTask(selectedTask.id, { title: e.target.value })}
                  placeholder="Task title"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 uppercase font-medium mb-2 block">Notes</label>
                <textarea 
                  className="w-full bg-black/20 border border-white/10 text-gray-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg p-3 resize-none h-32"
                  value={selectedTask.notes || ''}
                  onChange={(e) => handleUpdateTask(selectedTask.id, { notes: e.target.value })}
                  placeholder="Add details..."
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 uppercase font-medium mb-2 block">Due Date</label>
                <input 
                  type="date"
                  className="w-full bg-black/20 border border-white/10 text-gray-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg p-2 px-3"
                  value={selectedTask.due ? selectedTask.due.split('T')[0] : ''}
                  onChange={(e) => handleUpdateTask(selectedTask.id, { due: e.target.value ? new Date(e.target.value).toISOString() : null })}
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 uppercase font-medium mb-2 block flex justify-between">
                  <span>AI Priorities (Tags)</span>
                </label>
                <input 
                  type="text"
                  className="w-full bg-black/20 border border-white/10 text-gray-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg p-2 px-3"
                  value={selectedTask.antigravity_metadata?.tags?.join(', ') || ''}
                  onChange={(e) => handleUpdateTask(selectedTask.id, { tags: e.target.value.split(',').map(t=>t.trim()).filter(Boolean) })}
                  placeholder="High Priority, Client A..."
                />
              </div>

              {selectedTask.antigravity_metadata?.ai_status && (
                <div className="mt-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-center gap-2 text-blue-400 font-medium mb-1">
                    <span className="animate-spin text-lg">⚙️</span>
                    Agent Telemetry
                  </div>
                  <div className="text-sm text-blue-300 opacity-80">
                    Status: {selectedTask.antigravity_metadata.ai_status}
                  </div>
                  {selectedTask.antigravity_metadata.time_shift && (
                    <div className="text-xs font-mono mt-2 bg-black/40 p-2 rounded">
                      Δ {selectedTask.antigravity_metadata.time_shift} 
                      (Expected: {selectedTask.antigravity_metadata.anticipated_time})
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
