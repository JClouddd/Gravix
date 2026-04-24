'use client';

import React, { useState } from 'react';
import TasksView from './Tasks/TasksView';
import ProjectsView from './Projects/ProjectsView';
import TagsView from './Tags/TagsView';
import CalendarView from './Calendar/CalendarView';

export default function ManagementDashboard() {
  const [activeTab, setActiveTab] = useState('calendar');

  const tabs = [
    { id: 'calendar', label: 'Calendar' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'projects', label: 'Projects' },
    { id: 'tags', label: 'Tags' },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
      {/* Header / Nav */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
        <h1 className="text-xl font-semibold text-white tracking-wide">
          Antigravity Management
        </h1>
        <div className="flex space-x-1 p-1 bg-black/50 rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(37,99,235,0.2)]'
                  : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'calendar' && <CalendarView />}
        {activeTab === 'tasks' && <TasksView />}
        {activeTab === 'projects' && <ProjectsView />}
        {activeTab === 'tags' && <TagsView />}
      </div>
    </div>
  );
}
