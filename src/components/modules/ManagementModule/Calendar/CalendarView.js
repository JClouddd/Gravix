'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = {
  'en-US': enUS,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

export default function CalendarView() {
  const [view, setView] = useState('list');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // New Event Modal State
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ summary: '', description: '', start: '', end: '', source: 'tasks' });
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!newEvent.summary.trim() || !newEvent.start || !newEvent.end) return;
    
    setIsSubmitting(true);
    try {
      const payload = {
        ...newEvent,
        start: new Date(newEvent.start).toISOString(),
        end: new Date(newEvent.end).toISOString()
      };

      const res = await fetch('/api/management/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success && data.event) {
        setEvents([data.event, ...events]);
        setShowNewEventModal(false);
        setNewEvent({ summary: '', description: '', start: '', end: '', source: 'tasks' });
      } else {
        alert("Error: " + (data.error || "Failed to create event"));
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto" style={{ padding: "24px" }}>
      {/* Calendar Header / Controls */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <h2 className="text-2xl font-semibold text-white">Upcoming Events</h2>
          <button 
            onClick={() => setShowNewEventModal(true)}
            className="btn btn-primary btn-sm"
          >
            + New Event
          </button>
        </div>
        <div style={{ display: "flex", gap: "4px", background: "var(--bg-secondary)", padding: "4px", borderRadius: "var(--radius-md)" }}>
            {['list', 'day', 'week', 'month'].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`btn btn-sm ${view === v ? 'btn-primary' : 'btn-ghost'}`}
                style={{ minHeight: "28px", padding: "4px 12px", textTransform: "capitalize" }}
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
      {/* Calendar Grid Display */}
      <div className="flex-1 bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden p-4 min-h-[500px]">
        {loading && <div className="text-gray-400">Loading calendar events...</div>}
        {error && <div className="text-red-400 bg-red-900/20 p-4 rounded-lg">{error}</div>}
        
        {!loading && !error && (
          <Calendar
            localizer={localizer}
            events={events.map(e => ({
              id: e.id,
              title: e.summary,
              start: new Date(e.start),
              end: new Date(e.end || e.start),
              color: e.color || '#4285f4'
            }))}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%', minHeight: 600, color: '#e5e7eb' }}
            views={['month', 'week', 'day', 'agenda']}
            defaultView="week"
            eventPropGetter={(event) => ({
              style: {
                backgroundColor: event.color,
                borderRadius: '6px',
                border: 'none',
                opacity: 0.8,
                color: 'white',
                borderLeft: `4px solid ${event.color === '#4285f4' ? '#2563eb' : 'rgba(255,255,255,0.3)'}`
              }
            })}
            components={{
              toolbar: (toolbarProps) => (
                <div className="flex justify-between items-center mb-4 text-white">
                  <div className="flex space-x-2">
                    <button onClick={() => toolbarProps.onNavigate('PREV')} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded">Prev</button>
                    <button onClick={() => toolbarProps.onNavigate('TODAY')} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded">Today</button>
                    <button onClick={() => toolbarProps.onNavigate('NEXT')} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded">Next</button>
                  </div>
                  <span className="text-xl font-bold">{toolbarProps.label}</span>
                  <div className="flex space-x-2">
                    {toolbarProps.views.map(view => (
                      <button 
                        key={view} 
                        onClick={() => toolbarProps.onView(view)} 
                        className={`px-3 py-1 rounded capitalize ${toolbarProps.view === view ? 'bg-blue-600' : 'bg-white/10 hover:bg-white/20'}`}
                      >
                        {view}
                      </button>
                    ))}
                  </div>
                </div>
              )
            }}
          />
        )}
      </div>

      {/* New Event Modal */}
      {showNewEventModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Create New Event</h3>
            <form onSubmit={handleCreateEvent} className="flex flex-col space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Event Title</label>
                <input 
                  type="text" 
                  value={newEvent.summary} 
                  onChange={e => setNewEvent({...newEvent, summary: e.target.value})}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="e.g. Strategy Meeting"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Calendar Source</label>
                <select 
                  value={newEvent.source} 
                  onChange={e => setNewEvent({...newEvent, source: e.target.value})}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="tasks">Tasks</option>
                  <option value="projects">Projects</option>
                  <option value="habits">Habits</option>
                </select>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-400 mb-1">Start Time</label>
                  <input 
                    type="datetime-local" 
                    value={newEvent.start} 
                    onChange={e => setNewEvent({...newEvent, start: e.target.value})}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-400 mb-1">End Time</label>
                  <input 
                    type="datetime-local" 
                    value={newEvent.end} 
                    onChange={e => setNewEvent({...newEvent, end: e.target.value})}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
                <textarea 
                  value={newEvent.description} 
                  onChange={e => setNewEvent({...newEvent, description: e.target.value})}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 min-h-[80px]"
                  placeholder="Optional details..."
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-white/10">
                <button 
                  type="button" 
                  onClick={() => setShowNewEventModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                >
                  {isSubmitting ? 'Creating...' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
