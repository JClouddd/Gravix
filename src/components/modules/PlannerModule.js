"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import HelpTooltip from "@/components/HelpTooltip";

/**
 * Planner Module — Calendar + Tasks combined
 * Full multi-calendar support, event creation, and task editing
 */
export default function PlannerModule() {
  const [activeTab, setActiveTab] = useState("calendar");

  // Connection and Loading State
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("month"); // 'month' | 'week'

  // Multi-Calendar State
  const [calendars, setCalendars] = useState([]);
  const [enabledCalendars, setEnabledCalendars] = useState(new Set());

  // Events State
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [scheduleEvents, setScheduleEvents] = useState([]);

  // Tasks State
  const [tasks, setTasks] = useState([]);
  const [taskSort, setTaskSort] = useState("date");
  const [editingTask, setEditingTask] = useState(null);

  // Meetings State
  const [meetings, setMeetings] = useState([]);
  const [analyzingMeeting, setAnalyzingMeeting] = useState(null);
  const [meetingAnalyses, setMeetingAnalyses] = useState({});
  const [creatingTasks, setCreatingTasks] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const fileInputRef = useRef(null);

  // Creation Modals
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: "", start: "", end: "", calendarId: "primary", description: "", location: "" });
  const [newTask, setNewTask] = useState({ title: "", dueDate: "", priority: "Medium" });

  // Filter State
  const [calendarFilter, setCalendarFilter] = useState("All");
  const [tasksFilter, setTasksFilter] = useState("All");

  const fetchData = useCallback(async () => {
    try {
      const [calRes, meetRes, tasksRes] = await Promise.all([
        fetch("/api/calendar/events").then(res => res.json()),
        fetch("/api/meet/transcripts").then(res => res.json()),
        fetch("/api/tasks/list").then(res => res.json())
      ]);

      const connected = calRes.connected && tasksRes.connected && (meetRes.connected !== false);
      setIsConnected(connected);

      if (connected) {
        // Set up calendars
        const cals = calRes.calendars || [];
        setCalendars(cals);
        setEnabledCalendars(new Set(cals.filter(c => c.selected).map(c => c.id)));

        // Map Calendar Events
        const mappedEvents = (calRes.events || []).map(evt => {
          const dateObj = evt.start ? new Date(evt.start) : new Date();
          return {
            id: evt.id,
            title: evt.summary || evt.title,
            date: dateObj,
            type: "event",
            color: evt.color || "var(--accent)",
            sourceType: evt.sourceType || "personal",
            calendarId: evt.calendarId || "primary",
            calendarName: evt.calendarName || "Primary",
            start: evt.start ? new Date(evt.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }) : "00:00",
            end: evt.end ? new Date(evt.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }) : "00:00",
            location: evt.location,
            meetLink: evt.meetLink
          };
        });
        setCalendarEvents(mappedEvents);

        // Today's events
        const today = new Date();
        const todayEvents = mappedEvents.filter(e =>
          e.date.getDate() === today.getDate() &&
          e.date.getMonth() === today.getMonth() &&
          e.date.getFullYear() === today.getFullYear()
        );
        setScheduleEvents(todayEvents);

        // Map Tasks
        const mappedTasks = (tasksRes.tasks || []).map(task => ({
          id: task.id,
          title: task.title,
          dueDate: task.due ? task.due.substring(0, 10) : "",
          priority: "Medium",
          completed: task.status === "completed",
          source: task.source || "manual",
          sourceIcon: task.sourceIcon || "✋",
          notes: task.notes || "",
        }));
        setTasks(mappedTasks);

        // Map Meetings
        if (meetRes.meetings) {
            setMeetings(meetRes.meetings);
        }
      }
    } catch (err) {
      console.error("Failed to fetch planner data", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(); // eslint-disable-line react-hooks/set-state-in-effect -- fetch-on-mount pattern
  }, [fetchData]);

  // Calendar Helpers
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const toggleCalendar = (calId) => {
    setEnabledCalendars(prev => {
      const next = new Set(prev);
      if (next.has(calId)) next.delete(calId);
      else next.add(calId);
      return next;
    });
  };

  // Event Creation
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.start || !newEvent.end) return;

    try {
      const res = await fetch("/api/calendar/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEvent),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddEvent(false);
        setNewEvent({ title: "", start: "", end: "", calendarId: "primary", description: "", location: "" });
        fetchData(); // Refresh
      }
    } catch (err) {
      console.error("Failed to create event", err);
    }
  };

  // Task Creation
  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTask.title || !newTask.dueDate) return;
    setTasks([...tasks, { ...newTask, id: Date.now(), completed: false, source: "manual", sourceIcon: "✋" }]);
    setNewTask({ title: "", dueDate: "", priority: "Medium" });
    setShowAddTask(false);
  };

  // Task Toggle
  const toggleTask = (id) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  // Task Edit
  const handleSaveTaskEdit = (id, updates) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, ...updates } : t));
    setEditingTask(null);
  };

  // Filter events by enabled calendars
  const getVisibleEvents = () => {
    let filtered = calendarEvents.filter(e => enabledCalendars.has(e.calendarId));
    if (calendarFilter !== "All") {
      filtered = filtered.filter(e => e.sourceType?.toLowerCase() === calendarFilter.toLowerCase());
    }
    return filtered;
  };

  // ─── Calendar Sidebar ─────────────────────────────────
  const renderCalendarSidebar = () => (
    <div style={{
      minWidth: "200px",
      padding: "16px",
      background: "var(--card-bg)",
      border: "1px solid var(--card-border)",
      borderRadius: "var(--radius-md)",
      display: "flex",
      flexDirection: "column",
      gap: "12px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h4 style={{ fontSize: "14px", fontWeight: "bold", margin: 0 }}>My Calendars</h4>
      </div>
      {calendars.length === 0 ? (
        <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>No calendars found</p>
      ) : (
        calendars.map(cal => (
          <label key={cal.id} style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
            fontSize: "13px",
            padding: "4px 0",
          }}>
            <input
              type="checkbox"
              checked={enabledCalendars.has(cal.id)}
              onChange={() => toggleCalendar(cal.id)}
              style={{ accentColor: cal.backgroundColor }}
            />
            <span style={{
              display: "inline-block",
              width: "10px",
              height: "10px",
              borderRadius: "3px",
              backgroundColor: cal.backgroundColor,
              flexShrink: 0,
            }} />
            <span style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              color: enabledCalendars.has(cal.id) ? "var(--text-primary)" : "var(--text-secondary)",
            }}>
              {cal.summary}{cal.primary ? " ★" : ""}
            </span>
          </label>
        ))
      )}
    </div>
  );

  // ─── Event Creation Modal ─────────────────────────────
  const renderEventModal = () => {
    if (!showAddEvent) return null;
    return (
      <div style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }} onClick={() => setShowAddEvent(false)}>
        <form
          onClick={e => e.stopPropagation()}
          onSubmit={handleCreateEvent}
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--card-border)",
            borderRadius: "var(--radius-lg)",
            padding: "24px",
            width: "480px",
            maxWidth: "90vw",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "18px" }}>New Event</h3>

          <div>
            <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: "var(--text-secondary)" }}>Title *</label>
            <input type="text" className="input" placeholder="Meeting with client..." value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} required />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: "var(--text-secondary)" }}>Start *</label>
              <input type="datetime-local" className="input" value={newEvent.start} onChange={e => setNewEvent({ ...newEvent, start: e.target.value })} required />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: "var(--text-secondary)" }}>End *</label>
              <input type="datetime-local" className="input" value={newEvent.end} onChange={e => setNewEvent({ ...newEvent, end: e.target.value })} required />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: "var(--text-secondary)" }}>Calendar</label>
            <select className="input" value={newEvent.calendarId} onChange={e => setNewEvent({ ...newEvent, calendarId: e.target.value })}>
              {calendars.map(cal => (
                <option key={cal.id} value={cal.id}>{cal.summary}</option>
              ))}
              {calendars.length === 0 && <option value="primary">Primary</option>}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: "var(--text-secondary)" }}>Location</label>
            <input type="text" className="input" placeholder="Office, Zoom link..." value={newEvent.location} onChange={e => setNewEvent({ ...newEvent, location: e.target.value })} />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: "var(--text-secondary)" }}>Description</label>
            <textarea className="input" rows={3} placeholder="Notes..." value={newEvent.description} onChange={e => setNewEvent({ ...newEvent, description: e.target.value })} style={{ resize: "vertical" }} />
          </div>

          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddEvent(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm">Create Event</button>
          </div>
        </form>
      </div>
    );
  };

  // ─── Month View ────────────────────────────────────────
  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const today = new Date();
    const visibleEvents = getVisibleEvents();

    const days = [];
    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`pad-${i}`} className="calendar-day empty"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
      const isSelected = date.getDate() === selectedDate.getDate() && date.getMonth() === selectedDate.getMonth() && date.getFullYear() === selectedDate.getFullYear();

      const dayEvents = visibleEvents.filter(
        e => e.date.getDate() === day && e.date.getMonth() === month && e.date.getFullYear() === year
      );

      days.push(
        <div
          key={day}
          className={`calendar-day ${isToday ? "today" : ""} ${isSelected ? "selected" : ""}`}
          onClick={() => setSelectedDate(date)}
          style={{
            padding: "8px",
            minHeight: "80px",
            border: "1px solid var(--card-border)",
            cursor: "pointer",
            background: isSelected ? "var(--bg-hover)" : "transparent",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            transition: "background 0.15s",
          }}
        >
          <span style={{
            display: "inline-flex",
            justifyContent: "center",
            alignItems: "center",
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            background: isToday ? "var(--accent)" : "transparent",
            color: isToday ? "white" : "inherit",
            fontWeight: isToday ? "bold" : "normal",
            fontSize: "13px",
          }}>
            {day}
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "2px" }}>
            {dayEvents.slice(0, 3).map((evt) => (
              <div key={evt.id} style={{
                fontSize: "10px",
                padding: "1px 4px",
                borderRadius: "3px",
                background: evt.color + "22",
                color: evt.color,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                borderLeft: `2px solid ${evt.color}`,
              }}>
                {evt.title}
              </div>
            ))}
            {dayEvents.length > 3 && (
              <div style={{ fontSize: "10px", color: "var(--text-secondary)" }}>+{dayEvents.length - 3} more</div>
            )}
          </div>
        </div>
      );
    }

    return (
      <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "1px", background: "var(--card-border)", border: "1px solid var(--card-border)" }}>
          {weekDays.map(wd => (
            <div key={wd} style={{ padding: "8px", textAlign: "center", background: "var(--card-bg)", fontWeight: "bold", fontSize: "12px", color: "var(--text-secondary)" }}>
              {wd}
            </div>
          ))}
          {days.map((day, idx) => (
            <div key={idx} style={{ background: "var(--card-bg)" }}>{day}</div>
          ))}
        </div>
      </>
    );
  };

  // ─── Week View ──────────────────────────────────────────
  const renderWeekView = () => {
    const today = new Date();
    const currentDay = currentDate.getDay();
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - currentDay);

    const visibleEvents = getVisibleEvents();
    const weekDays = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      weekDays.push(d);
    }

    const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7am - 8pm

    return (
      <div style={{
        display: "grid",
        gridTemplateColumns: "60px repeat(7, 1fr)",
        border: "1px solid var(--card-border)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ borderBottom: "1px solid var(--card-border)", padding: "8px", background: "var(--card-bg)" }} />
        {weekDays.map((d, i) => {
          const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
          return (
            <div key={i} style={{
              padding: "8px",
              textAlign: "center",
              borderBottom: "1px solid var(--card-border)",
              background: isToday ? "var(--accent-subtle)" : "var(--card-bg)",
              fontWeight: isToday ? "bold" : "normal",
              fontSize: "12px",
            }}>
              <div>{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()]}</div>
              <div style={{ fontSize: "18px", color: isToday ? "var(--accent)" : "var(--text-primary)" }}>{d.getDate()}</div>
            </div>
          );
        })}

        {/* Time rows */}
        {hours.map(hour => (
          <>
            <div key={`h-${hour}`} style={{
              padding: "4px 8px",
              fontSize: "11px",
              color: "var(--text-secondary)",
              textAlign: "right",
              borderRight: "1px solid var(--card-border)",
              height: "48px",
              background: "var(--card-bg)",
            }}>
              {hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
            </div>
            {weekDays.map((d, di) => {
              const cellEvents = visibleEvents.filter(e =>
                e.date.getDate() === d.getDate() &&
                e.date.getMonth() === d.getMonth() &&
                e.date.getFullYear() === d.getFullYear() &&
                parseInt(e.start.split(":")[0]) === hour
              );
              return (
                <div key={`${hour}-${di}`} style={{
                  borderLeft: "1px solid var(--card-border)",
                  borderBottom: "1px solid var(--card-border)",
                  height: "48px",
                  position: "relative",
                  background: "var(--bg-primary)",
                  padding: "2px",
                }}>
                  {cellEvents.map(evt => (
                    <div key={evt.id} style={{
                      fontSize: "10px",
                      padding: "2px 4px",
                      borderRadius: "3px",
                      background: evt.color + "33",
                      borderLeft: `2px solid ${evt.color}`,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}>
                      {evt.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </>
        ))}
      </div>
    );
  };

  // ─── Calendar Tab ──────────────────────────────────────
  const renderCalendar = () => {
    const visibleEvents = getVisibleEvents();

    const selectedEvents = visibleEvents.filter(
      e =>
        e.date.getDate() === selectedDate.getDate() &&
        e.date.getMonth() === selectedDate.getMonth() &&
        e.date.getFullYear() === selectedDate.getFullYear()
    );

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Source filter */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
          {["All", "Client", "Agent", "Personal"].map(filter => (
            <button
              key={filter}
              className={`btn btn-sm ${calendarFilter === filter ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setCalendarFilter(filter)}
            >
              {filter}
            </button>
          ))}

          <div style={{ marginLeft: "auto", display: "flex", gap: "4px" }}>
            <button
              className={`btn btn-sm ${viewMode === "month" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setViewMode("month")}
            >
              Month
            </button>
            <button
              className={`btn btn-sm ${viewMode === "week" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setViewMode("week")}
            >
              Week
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: "16px" }}>
          {/* Main Calendar */}
          <div className="card" style={{ padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 className="h4">{currentDate.toLocaleString("default", { month: "long", year: "numeric" })}</h3>
              <div style={{ display: "flex", gap: "8px" }}>
                <button className="btn btn-secondary btn-sm" onClick={handlePrevMonth}>&lt;</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setCurrentDate(new Date())}>Today</button>
                <button className="btn btn-secondary btn-sm" onClick={handleNextMonth}>&gt;</button>
              </div>
            </div>

            {viewMode === "month" ? renderMonthView() : renderWeekView()}
          </div>

          {/* Right Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Selected day events */}
            <div className="card" style={{ padding: "16px" }}>
              <h4 style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "12px" }}>
                {selectedDate.toLocaleDateString("default", { weekday: "long", month: "short", day: "numeric" })}
              </h4>
              {selectedEvents.length === 0 ? (
                <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>No events this day</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {selectedEvents.map(evt => (
                    <div key={evt.id} style={{
                      padding: "10px",
                      borderRadius: "var(--radius-md)",
                      background: "var(--bg-tertiary)",
                      borderLeft: `3px solid ${evt.color}`,
                    }}>
                      <div style={{ fontWeight: "600", fontSize: "13px", marginBottom: "4px" }}>{evt.title}</div>
                      <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                        {evt.start} – {evt.end}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
                        {evt.calendarName}
                      </div>
                      {evt.location && (
                        <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>📍 {evt.location}</div>
                      )}
                      {evt.meetLink && (
                        <a href={evt.meetLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: "11px", color: "var(--accent)", marginTop: "4px", display: "inline-block" }}>
                          🔗 Join Meeting
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Calendar list */}
            {renderCalendarSidebar()}
          </div>
        </div>
      </div>
    );
  };

  // ─── Tasks Tab ─────────────────────────────────────────
  const renderTasks = () => {
    const filteredTasks = tasks.filter(task => {
      if (tasksFilter === "All") return true;
      return task.source?.toLowerCase() === tasksFilter.toLowerCase();
    });

    const sortedTasks = [...filteredTasks].sort((a, b) => {
      if (taskSort === "date") {
        return new Date(a.dueDate) - new Date(b.dueDate);
      } else {
        const priorityScore = { High: 3, Medium: 2, Low: 1 };
        return (priorityScore[b.priority] || 0) - (priorityScore[a.priority] || 0);
      }
    });

    const getPriorityBadge = (priority) => {
      let badgeClass = "";
      if (priority === "High") badgeClass = "badge-error";
      else if (priority === "Medium") badgeClass = "badge-warning";
      else if (priority === "Low") badgeClass = "badge-success";
      return <span className={`badge ${badgeClass}`}>{priority}</span>;
    };

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Filters */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
          {["All", "Manual", "Email", "Meeting", "Agent"].map(filter => (
            <button
              key={filter}
              className={`btn btn-sm ${tasksFilter === filter ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setTasksFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h3 className="h4">Task List</h3>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <select
                className="input"
                style={{ padding: "6px 10px", width: "auto" }}
                value={taskSort}
                onChange={(e) => setTaskSort(e.target.value)}
              >
                <option value="date">Sort by Date</option>
                <option value="priority">Sort by Priority</option>
              </select>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddTask(!showAddTask)}>
                {showAddTask ? "Cancel" : "Add Task"}
              </button>
            </div>
          </div>

          {/* Add Task Form */}
          {showAddTask && (
            <form onSubmit={handleAddTask} style={{
              background: "var(--bg-tertiary)",
              padding: "16px",
              borderRadius: "var(--radius-md)",
              marginBottom: "20px",
              display: "flex",
              gap: "12px",
              alignItems: "flex-end",
              flexWrap: "wrap",
            }}>
              <div style={{ flex: "1", minWidth: "200px" }}>
                <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: "var(--text-secondary)" }}>Task Title</label>
                <input type="text" className="input" placeholder="e.g., Update Marketing Deck" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} required />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: "var(--text-secondary)" }}>Due Date</label>
                <input type="date" className="input" value={newTask.dueDate} onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })} required />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: "var(--text-secondary)" }}>Priority</label>
                <select className="input" value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary">Save</button>
            </form>
          )}

          {/* Task List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {sortedTasks.map(task => (
              <div key={task.id} style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                background: "var(--bg-primary)",
                border: "1px solid var(--card-border)",
                borderRadius: "var(--radius-md)",
                opacity: task.completed ? 0.6 : 1,
                transition: "opacity 0.2s, background 0.15s",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => toggleTask(task.id)}
                    style={{ width: "16px", height: "16px", cursor: "pointer" }}
                  />
                  <span style={{ fontSize: "16px" }}>{task.sourceIcon}</span>

                  {editingTask === task.id ? (
                    <input
                      type="text"
                      className="input"
                      defaultValue={task.title}
                      autoFocus
                      onBlur={e => handleSaveTaskEdit(task.id, { title: e.target.value })}
                      onKeyDown={e => {
                        if (e.key === "Enter") handleSaveTaskEdit(task.id, { title: e.target.value });
                        if (e.key === "Escape") setEditingTask(null);
                      }}
                      style={{ flex: 1, padding: "4px 8px" }}
                    />
                  ) : (
                    <span
                      onDoubleClick={() => setEditingTask(task.id)}
                      style={{
                        fontSize: "14px",
                        textDecoration: task.completed ? "line-through" : "none",
                        color: task.completed ? "var(--text-secondary)" : "var(--text-primary)",
                        cursor: "text",
                        flex: 1,
                      }}
                      title="Double-click to edit"
                    >
                      {task.title}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{task.dueDate}</span>
                  {getPriorityBadge(task.priority)}
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setEditingTask(editingTask === task.id ? null : task.id)}
                    style={{ padding: "4px 8px", fontSize: "12px" }}
                  >
                    ✏️
                  </button>
                </div>
              </div>
            ))}
            {sortedTasks.length === 0 && (
              <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: "24px" }}>
                No tasks yet. Click &ldquo;Add Task&rdquo; to get started.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };


  // ─── Meetings Tab ──────────────────────────────────────
  const handleAudioUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAudio(true);
    try {
      const formData = new FormData();
      formData.append("audioFile", file);
      const res = await fetch("/api/meet/transcripts", {
        method: "POST",
        body: formData
      });
      const data = await res.json();

      if (data.summary) {
        alert("Audio processed successfully! Summary: " + data.summary);
      } else {
        alert("Audio processed, but no summary returned.");
      }
    } catch (err) {
      console.error("Audio upload failed", err);
      alert("Audio upload failed.");
    } finally {
      setUploadingAudio(false);
      if (e.target) e.target.value = null;
    }
  };

  const analyzeMeeting = async (meeting) => {
    if (meetingAnalyses[meeting.id] || analyzingMeeting === meeting.id) return;

    setAnalyzingMeeting(meeting.id);
    try {
      const res = await fetch("/api/meet/transcripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcriptText: meeting.transcriptText })
      });
      const data = await res.json();
      setMeetingAnalyses(prev => ({ ...prev, [meeting.id]: data }));
    } catch (err) {
      console.error("Failed to analyze meeting", err);
    } finally {
      setAnalyzingMeeting(null);
    }
  };

  const handleCreateMeetingTasks = async (meetingId) => {
    const analysis = meetingAnalyses[meetingId];
    if (!analysis || !analysis.actionItems || analysis.actionItems.length === 0) return;

    setCreatingTasks(meetingId);
    try {
      const res = await fetch("/api/meet/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actions: analysis.actionItems })
      });
      const data = await res.json();
      if (data.created) {
         fetchData(); // Refresh tasks
         // Optimistically hide the create button
         setMeetingAnalyses(prev => {
             const newAnalyses = {...prev};
             newAnalyses[meetingId] = {...newAnalyses[meetingId], tasksCreated: true};
             return newAnalyses;
         });
      }
    } catch (err) {
      console.error("Failed to create meeting tasks", err);
    } finally {
      setCreatingTasks(null);
    }
  };

  const renderMeetings = () => {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <h3 className="h4" style={{ marginBottom: "8px" }}>Recent Meetings</h3>

        <div style={{ marginBottom: "16px" }}>
          <input
            type="file"
            accept="audio/*"
            style={{ display: "none" }}
            ref={fileInputRef}
            onChange={handleAudioUpload}
          />
          <button
            className="btn btn-primary btn-sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAudio}
          >
            {uploadingAudio ? "Uploading & Analyzing..." : "Upload Meeting Audio"}
          </button>
        </div>

        {meetings.length === 0 ? (
           <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "24px" }}>No recent meetings with transcripts found.</p>
        ) : (
          meetings.map(meeting => {
            const analysis = meetingAnalyses[meeting.id];
            const isAnalyzing = analyzingMeeting === meeting.id;
            const startDate = new Date(meeting.startTime);
            const endDate = new Date(meeting.endTime);
            const durationMins = Math.round((endDate - startDate) / 60000);

            return (
              <div key={meeting.id} className="card" style={{ padding: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", cursor: "pointer" }} onClick={() => analyzeMeeting(meeting)}>
                    <div>
                        <div style={{ fontWeight: "bold", fontSize: "16px", marginBottom: "4px" }}>Meeting in {meeting.space}</div>
                        <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                            {startDate.toLocaleString()} • {durationMins} mins • {meeting.participantCount} participant{meeting.participantCount !== 1 ? 's' : ''}
                        </div>
                    </div>
                    <div>
                        {!analysis && !isAnalyzing && <span className="badge badge-warning">Expand to Analyze</span>}
                        {isAnalyzing && <span className="badge badge-info">Analyzing...</span>}
                        {analysis && <span className="badge badge-success">Analyzed</span>}
                    </div>
                </div>

                {analysis && (
                    <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--card-border)", display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div>
                            <strong style={{ fontSize: "13px", display: "block", marginBottom: "4px" }}>Summary</strong>
                            <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0 }}>{analysis.summary}</p>
                        </div>

                        {analysis.actionItems && analysis.actionItems.length > 0 && (
                            <div>
                                <strong style={{ fontSize: "13px", display: "block", marginBottom: "4px" }}>Action Items</strong>
                                <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "13px", color: "var(--text-secondary)" }}>
                                    {analysis.actionItems.map((item, idx) => (
                                        <li key={idx}>
                                            <strong>{item.task}</strong> (Assignee: {item.assignee}, Due: {item.deadline})
                                        </li>
                                    ))}
                                </ul>
                                {!analysis.tasksCreated && (
                                   <button
                                      className="btn btn-primary btn-sm"
                                      style={{ marginTop: "8px" }}
                                      onClick={() => handleCreateMeetingTasks(meeting.id)}
                                      disabled={creatingTasks === meeting.id}
                                   >
                                      {creatingTasks === meeting.id ? "Creating..." : "Create Tasks"}
                                   </button>
                                )}
                                {analysis.tasksCreated && (
                                    <span style={{ fontSize: "12px", color: "var(--success)", display: "inline-block", marginTop: "8px" }}>Tasks created ✓</span>
                                )}
                            </div>
                        )}

                        {analysis.decisions && analysis.decisions.length > 0 && (
                            <div>
                                <strong style={{ fontSize: "13px", display: "block", marginBottom: "4px" }}>Decisions</strong>
                                <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "13px", color: "var(--text-secondary)" }}>
                                    {analysis.decisions.map((dec, idx) => <li key={idx}>{dec}</li>)}
                                </ul>
                            </div>
                        )}

                        {analysis.followUps && analysis.followUps.length > 0 && (
                            <div>
                                <strong style={{ fontSize: "13px", display: "block", marginBottom: "4px" }}>Follow-ups</strong>
                                <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "13px", color: "var(--text-secondary)" }}>
                                    {analysis.followUps.map((fu, idx) => <li key={idx}>{fu.item} ({fu.owner})</li>)}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
              </div>
            );
          })
        )}
      </div>
    );
  };

  // ─── Schedule Tab ──────────────────────────────────────
  const renderSchedule = () => {
    const hours = Array.from({ length: 11 }, (_, i) => i + 8); // 8am to 6pm

    const getTopPosition = (time) => {
      const [h, m] = time.split(":").map(Number);
      return ((h - 8) * 60 + m) * (60 / 60);
    };

    const getHeight = (start, end) => {
      const [sh, sm] = start.split(":").map(Number);
      const [eh, em] = end.split(":").map(Number);
      return ((eh - sh) * 60 + (em - sm)) * (60 / 60);
    };

    return (
      <div className="card" style={{ position: "relative", minHeight: "700px", padding: "24px 0" }}>
        <h3 className="h4" style={{ padding: "0 24px", marginBottom: "20px" }}>Today&apos;s Schedule</h3>

        <div style={{ position: "relative", height: `${11 * 60}px`, margin: "0 24px" }}>
          {/* Time lines */}
          {hours.map((hour, idx) => (
            <div key={hour} style={{
              position: "absolute",
              top: `${idx * 60}px`,
              left: 0,
              right: 0,
              height: "60px",
              borderTop: "1px solid var(--card-border)",
              display: "flex",
              zIndex: 1,
            }}>
              <div style={{
                width: "60px",
                paddingRight: "12px",
                textAlign: "right",
                color: "var(--text-secondary)",
                fontSize: "12px",
                transform: "translateY(-8px)",
              }}>
                {hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
              </div>
              <div style={{ flex: 1 }} />
            </div>
          ))}

          {/* Events */}
          {scheduleEvents.map(evt => (
            <div key={evt.id} style={{
              position: "absolute",
              top: `${getTopPosition(evt.start)}px`,
              left: "72px",
              right: "12px",
              height: `${Math.max(getHeight(evt.start, evt.end), 30)}px`,
              background: evt.color + "22",
              borderLeft: `4px solid ${evt.color}`,
              borderRadius: "4px",
              padding: "8px 12px",
              zIndex: 2,
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              overflow: "hidden",
            }}>
              <div style={{ fontWeight: "bold", fontSize: "14px", color: "var(--text-primary)", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>{evt.title}</div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{evt.start} – {evt.end}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ─── Not Connected State ───────────────────────────────
  if (!isLoading && !isConnected) {
    return (
      <div>
        <div className="module-header">
          <div className="module-header-left">
            <div className="module-icon" style={{ background: "var(--info-subtle)" }}>📅</div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h1 className="module-title">Planner</h1>
                <HelpTooltip module="planner" />
              </div>
              <p className="module-subtitle">Calendar, tasks, and deadlines — managed by Courier</p>
            </div>
          </div>
        </div>

        <div className="card card-glass" style={{ textAlign: "center", padding: "48px 24px", marginTop: "24px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔌</div>
          <h2 className="h3" style={{ marginBottom: "12px" }}>Connect Google Workspace</h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "24px", maxWidth: "400px", margin: "0 auto 24px" }}>
            To view your calendar events and manage your tasks, please connect your Google Workspace account.
          </p>
          <a href="/api/auth/connect" className="btn btn-primary">
            Connect Google Workspace
          </a>
        </div>
      </div>
    );
  }

  // ─── Main Render ───────────────────────────────────────
  return (
    <div>
      {renderEventModal()}

      <div className="module-header">
        <div className="module-header-left">
          <div className="module-icon" style={{ background: "var(--info-subtle)" }}>📅</div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h1 className="module-title">Planner</h1>
              <HelpTooltip module="planner" />
            </div>
            <p className="module-subtitle">Calendar, tasks, and deadlines — managed by Courier</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddEvent(true)}>+ New Event</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "24px", borderBottom: "1px solid var(--card-border)", paddingBottom: "12px" }}>
        <button
          className={`btn ${activeTab === "calendar" ? "btn-secondary" : "btn-ghost"} btn-sm`}
          onClick={() => setActiveTab("calendar")}
          style={{ background: activeTab === "calendar" ? "var(--bg-hover)" : "transparent" }}
        >
          Calendar
        </button>
        <button
          className={`btn ${activeTab === "tasks" ? "btn-secondary" : "btn-ghost"} btn-sm`}
          onClick={() => setActiveTab("tasks")}
          style={{ background: activeTab === "tasks" ? "var(--bg-hover)" : "transparent" }}
        >
          Tasks
        </button>
        <button
          className={`btn ${activeTab === "schedule" ? "btn-secondary" : "btn-ghost"} btn-sm`}
          onClick={() => setActiveTab("schedule")}
          style={{ background: activeTab === "schedule" ? "var(--bg-hover)" : "transparent" }}
        >
          Schedule
        </button>
        <button
          className={`btn ${activeTab === "meetings" ? "btn-secondary" : "btn-ghost"} btn-sm`}
          onClick={() => setActiveTab("meetings")}
          style={{ background: activeTab === "meetings" ? "var(--bg-hover)" : "transparent" }}
        >
          Meetings
        </button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "48px", color: "var(--text-secondary)" }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>⏳</div>
          Loading planner data...
        </div>
      ) : (
        <>
          {activeTab === "calendar" && renderCalendar()}
          {activeTab === "tasks" && renderTasks()}
          {activeTab === "schedule" && renderSchedule()}
          {activeTab === "meetings" && renderMeetings()}
        </>
      )}
    </div>
  );
}
