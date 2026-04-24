'use client';

import React, { useState, useEffect } from 'react';

export default function CalendarView() {
  const [view, setView] = useState('list');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/management/calendar')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.connected) {
          setEvents(data.events || []);
        } else if (!data.connected) {
          setError("Google OAuth is not connected. Please connect your account.");
        } else {
          setError(data.error || "Failed to load events");
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="w-full h-full flex flex-col p-6 overflow-y-auto">
      {/* Calendar Header / Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-semibold text-white">Upcoming Events</h2>
          <div className="flex space-x-1 p-1 bg-black/50 rounded-lg">
            {['list', 'day', 'week', 'month'].map((v) => (
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

      {/* Events List Display (Fallback while grid is pending) */}
      <div className="flex flex-col space-y-3">
        {loading && <div className="text-gray-400">Loading calendar events...</div>}
        {error && <div className="text-red-400 bg-red-900/20 p-4 rounded-lg">{error}</div>}
        
        {!loading && !error && events.length === 0 && (
          <div className="w-full py-20 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
            <div className="text-gray-400 mb-2">No upcoming events</div>
            <div className="text-sm text-gray-500">Create an event to get started.</div>
          </div>
        )}

        {!loading && !error && events.map(evt => (
          <div key={evt.id} className="flex flex-col p-4 border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] rounded-xl transition-colors cursor-pointer group">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: evt.color || '#4285f4' }} />
                <span className="font-medium text-gray-200">{evt.summary}</span>
              </div>
              <div className="text-sm text-gray-400">
                {evt.start ? new Date(evt.start).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'No Time'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
