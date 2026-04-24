'use client';

import React, { useState } from 'react';

export default function CalendarView() {
  const [view, setView] = useState('month');

  return (
    <div className="w-full h-full flex flex-col p-6">
      {/* Calendar Header / Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-semibold text-white">April 2026</h2>
          <div className="flex space-x-1 p-1 bg-black/50 rounded-lg">
            {['day', 'week', 'month'].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1 rounded text-xs font-medium uppercase tracking-wider transition-colors ${
                  view === v
                    ? 'bg-white/20 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Visibility Toggles */}
        <div className="flex items-center space-x-3 text-sm">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input type="checkbox" defaultChecked className="form-checkbox text-blue-500 rounded bg-black/50 border-white/20 focus:ring-0" />
            <span className="text-gray-300">Tasks</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input type="checkbox" defaultChecked className="form-checkbox text-purple-500 rounded bg-black/50 border-white/20 focus:ring-0" />
            <span className="text-gray-300">Projects</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input type="checkbox" defaultChecked className="form-checkbox text-green-500 rounded bg-black/50 border-white/20 focus:ring-0" />
            <span className="text-gray-300">Habits</span>
          </label>
        </div>
      </div>

      {/* Calendar Grid Stub */}
      <div className="flex-1 border border-white/10 rounded-xl bg-white/[0.01] flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 mb-2 font-medium">Calendar Implementation Pending</div>
          <div className="text-sm text-gray-500 max-w-md mx-auto">
            This area will be powered by react-big-calendar or FullCalendar, natively syncing events, tasks, and habits via the Google Calendar API.
          </div>
        </div>
      </div>
    </div>
  );
}
