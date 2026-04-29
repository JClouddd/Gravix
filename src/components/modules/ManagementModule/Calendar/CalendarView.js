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
  const [view, setView] = useState('week');
  const [events, setEvents] = useState([]);
  const [calendars, setCalendars] = useState([]);
  const [visibleCalendars, setVisibleCalendars] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // New Event Modal State
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ 
    summary: '', 
    description: '', 
    start: '', 
    end: '', 
    source: 'tasks',
    guests: '',
    generateMeetLink: false 
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/management/calendar')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.connected) {
          setEvents(data.events || []);
          const cals = data.calendars || [];
          setCalendars(cals);
          setVisibleCalendars(new Set(cals.map(c => c.id)));
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
        end: new Date(newEvent.end).toISOString(),
        guests: newEvent.guests.split(',').map(g => g.trim()).filter(Boolean)
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
        setNewEvent({ summary: '', description: '', start: '', end: '', source: 'tasks', guests: '', generateMeetLink: false });
      } else {
        alert("Error: " + (data.error || "Failed to create event"));
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectSlot = ({ start, end }) => {
    // Format dates to YYYY-MM-DDThh:mm for datetime-local input
    const formatDate = (date) => {
      const d = new Date(date);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      return d.toISOString().slice(0, 16);
    };
    
    setNewEvent(prev => ({
      ...prev,
      start: formatDate(start),
      end: formatDate(end)
    }));
    setShowNewEventModal(true);
  };

  const toggleCalendar = (calId) => {
    const newSet = new Set(visibleCalendars);
    if (newSet.has(calId)) newSet.delete(calId);
    else newSet.add(calId);
    setVisibleCalendars(newSet);
  };

  const filteredEvents = events.filter(e => visibleCalendars.has(e.calendarId));

  return (
    <div className="w-full h-full flex flex-col gap-lg" style={{ padding: "8px 24px 24px 24px", overflowY: "auto" }}>
      
      {/* Calendar Header / Controls */}
      <div className="card-glass flex items-center justify-between" style={{ padding: "16px 24px" }}>
        <div className="flex items-center gap-md">
          <div className="module-icon" style={{ background: "var(--accent-glow)", color: "var(--accent-hover)", width: 48, height: 48, fontSize: 24 }}>
            📅
          </div>
          <div>
            <h2 className="h2 text-gradient">Upcoming Events</h2>
            <p className="caption">Manage your schedule, tasks, and habits</p>
          </div>
        </div>

        <div className="flex items-center gap-md">
          <button 
            onClick={() => setShowNewEventModal(true)}
            className="btn btn-primary shadow-lg hover:shadow-xl transition-all"
            style={{ borderRadius: "var(--radius-xl)", padding: "0 24px" }}
          >
            + New Event
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-md min-h-[600px] overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 flex flex-col gap-sm overflow-y-auto pr-2 custom-scrollbar hidden md:flex">
          <div className="card-glass p-4">
            <h3 className="h4 text-white mb-4">My Calendars</h3>
            {calendars.length === 0 && !loading && (
              <div className="caption text-gray-500">No calendars found.</div>
            )}
            <div className="flex flex-col gap-3">
              {calendars.map(cal => (
                <label key={cal.id} className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center transition-all ${visibleCalendars.has(cal.id) ? '' : 'bg-transparent border border-gray-600'}`} style={{ backgroundColor: visibleCalendars.has(cal.id) ? cal.backgroundColor : 'transparent' }}>
                    {visibleCalendars.has(cal.id) && <span className="text-white text-[10px] font-bold">✓</span>}
                  </div>
                  <span className="caption font-medium group-hover:text-white transition-colors truncate" title={cal.summary}>
                    {cal.summary}
                  </span>
                </label>
              ))}
            </div>
            
            <button className="btn btn-secondary w-full mt-6 flex justify-center text-xs opacity-70 hover:opacity-100">
              + Add Google Calendar
            </button>
          </div>
        </div>

        {/* Calendar Grid Display */}
        <div className="card-glass flex-1 flex flex-col overflow-hidden" style={{ padding: "24px" }}>
          {loading && (
            <div className="flex-1 flex items-center justify-center flex-col gap-sm">
              <div className="status-dot pulse" style={{ background: "var(--accent)", width: 16, height: 16 }}></div>
              <div className="text-secondary font-medium mt-4">Loading your schedule...</div>
            </div>
          )}
          
          {error && (
            <div className="flex-1 flex items-center justify-center">
              <div className="card border-error-subtle bg-error-subtle/10 text-center max-w-md">
                <div className="text-4xl mb-4">⚠️</div>
                <h3 className="h3 text-white mb-2">Connection Error</h3>
                <p className="caption">{error}</p>
              </div>
            </div>
          )}
          
          {!loading && !error && (
            <div className="flex-1 w-full h-full custom-calendar-wrapper">
              <Calendar
                localizer={localizer}
                events={filteredEvents.map(e => ({
                  id: e.id,
                  title: e.isTask ? `✔️ ${e.summary.replace('[Task] ', '')}` : e.summary,
                  start: new Date(e.start),
                  end: new Date(e.end || e.start),
                  color: e.color || '#4285f4',
                  isTask: e.isTask || false
                }))}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%', width: '100%' }}
                selectable={true}
                onSelectSlot={handleSelectSlot}
                views={['month', 'week', 'day', 'agenda']}
                defaultView="week"
                eventPropGetter={(event) => ({
                  style: {
                    backgroundColor: event.color,
                    borderRadius: '6px',
                    border: event.isTask ? '1px dashed rgba(255,255,255,0.8)' : 'none',
                    opacity: 0.9,
                    color: event.isTask ? '#000' : 'white',
                    fontWeight: event.isTask ? 600 : 500,
                    fontSize: '12px',
                    padding: '2px 6px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    borderLeft: `4px solid ${event.isTask ? '#fff' : (event.color === '#4285f4' ? '#2563eb' : 'rgba(255,255,255,0.4)')}`
                  }
                })}
              />
            </div>
          )}
        </div>
      </div>

      {/* New Event Modal */}
      {showNewEventModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-modal p-4 transition-all">
          <div className="card-glass w-full max-w-md border-white/20 shadow-2xl relative overflow-hidden" style={{ animation: "scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}>
            
            {/* Decorative background glow */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex justify-between items-center mb-6">
              <h3 className="h2 text-white">Create Event</h3>
              <button onClick={() => setShowNewEventModal(false)} className="btn-icon hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="flex flex-col gap-lg relative z-10">
              
              <div>
                <label className="block caption font-medium mb-2 uppercase tracking-wider text-gray-400">Event Title</label>
                <input 
                  type="text" 
                  value={newEvent.summary} 
                  onChange={e => setNewEvent({...newEvent, summary: e.target.value})}
                  className="input text-lg font-medium"
                  placeholder="e.g. Strategy Review"
                  required
                />
              </div>

              <div>
                <label className="block caption font-medium mb-2 uppercase tracking-wider text-gray-400">Calendar Layer</label>
                <select 
                  value={newEvent.source} 
                  onChange={e => setNewEvent({...newEvent, source: e.target.value})}
                  className="input cursor-pointer"
                >
                  <option value="tasks">📋 Tasks Engine</option>
                  <option value="projects">📂 Project Milestones</option>
                  <option value="habits">✅ Daily Habits</option>
                </select>
              </div>

              <div className="flex gap-md">
                <div className="flex-1">
                  <label className="block caption font-medium mb-2 uppercase tracking-wider text-gray-400">Start Time</label>
                  <input 
                    type="datetime-local" 
                    value={newEvent.start} 
                    onChange={e => setNewEvent({...newEvent, start: e.target.value})}
                    className="input"
                    required
                  />
                </div>
                <div className="flex-1">
                  <label className="block caption font-medium mb-2 uppercase tracking-wider text-gray-400">End Time</label>
                  <input 
                    type="datetime-local" 
                    value={newEvent.end} 
                    onChange={e => setNewEvent({...newEvent, end: e.target.value})}
                    className="input"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block caption font-medium mb-2 uppercase tracking-wider text-gray-400">Description</label>
                <textarea 
                  value={newEvent.description} 
                  onChange={e => setNewEvent({...newEvent, description: e.target.value})}
                  className="input min-h-[80px] resize-none"
                  placeholder="Add notes, links, or agenda..."
                />
              </div>

              <div>
                <label className="block caption font-medium mb-2 uppercase tracking-wider text-gray-400">Guests</label>
                <input 
                  type="text" 
                  value={newEvent.guests} 
                  onChange={e => setNewEvent({...newEvent, guests: e.target.value})}
                  className="input"
                  placeholder="Comma separated emails (e.g. client@domain.com, team@gravix.io)"
                />
              </div>

              <div className="flex items-center gap-3 mt-2">
                <input 
                  type="checkbox" 
                  id="meetLink"
                  checked={newEvent.generateMeetLink}
                  onChange={e => setNewEvent({...newEvent, generateMeetLink: e.target.checked})}
                  className="w-5 h-5 accent-blue-500 bg-white/10 border-white/20 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                />
                <label htmlFor="meetLink" className="caption text-white cursor-pointer select-none">
                  Add Google Meet video conferencing
                </label>
              </div>

              <div className="flex justify-end gap-sm mt-4 pt-6 border-t border-white/10">
                <button 
                  type="button" 
                  onClick={() => setShowNewEventModal(false)}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="btn btn-primary"
                  style={{ minWidth: 120 }}
                >
                  {isSubmitting ? 'Creating...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
