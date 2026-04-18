"use client";

import { useState, useEffect } from "react";
import HelpTooltip from "@/components/HelpTooltip";

/**
 * Planner Module — Calendar + Tasks combined
 * Courier-managed scheduling and task tracking
 */
export default function PlannerModule() {
  const [activeTab, setActiveTab] = useState("calendar");

  // Connection and Loading State
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Events State
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [scheduleEvents, setScheduleEvents] = useState([]);

  // Tasks State
  const [tasks, setTasks] = useState([]);
  const [taskSort, setTaskSort] = useState("date"); // 'date' or 'priority'
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", dueDate: "", priority: "Medium" });

  // Filter State
  const [calendarFilter, setCalendarFilter] = useState("All");
  const [tasksFilter, setTasksFilter] = useState("All");

  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      try {
        const [calRes, tasksRes] = await Promise.all([
          fetch("/api/calendar/events").then(res => res.json()),
          fetch("/api/tasks/list").then(res => res.json())
        ]);

        if (isMounted) {
          const connected = calRes.connected && tasksRes.connected;
          setIsConnected(connected);

          if (connected) {
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
                start: evt.start ? new Date(evt.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : "00:00",
                end: evt.end ? new Date(evt.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : "00:00",
                location: evt.location,
                meetLink: evt.meetLink
              };
            });

            setCalendarEvents(mappedEvents);

            // Map Schedule Events (Events happening today)
            const today = new Date();
            const todayEvents = mappedEvents.filter(e =>
              e.date.getDate() === today.getDate() &&
              e.date.getMonth() === today.getMonth() &&
              e.date.getFullYear() === today.getFullYear()
            );
            setScheduleEvents(todayEvents);

            // Map Tasks
            const mappedTasks = (tasksRes.tasks || []).map(task => {
              return {
                id: task.id,
                title: task.title,
                dueDate: task.due ? task.due.substring(0, 10) : "",
                priority: "Medium", // Google Tasks API doesn't expose priority clearly
                completed: task.status === "completed",
                source: task.source || "manual",
                sourceIcon: task.sourceIcon || "✋"
              };
            });
            setTasks(mappedTasks);
          }
        }
      } catch (err) {
        console.error("Failed to fetch planner data", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Calendar Helpers
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const today = new Date();

    const days = [];
    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Padding for first day
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`pad-${i}`} className="calendar-day empty"></div>);
    }

    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isToday =
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();
      const isSelected =
        date.getDate() === selectedDate.getDate() &&
        date.getMonth() === selectedDate.getMonth() &&
        date.getFullYear() === selectedDate.getFullYear();

      const dayEvents = calendarEvents.filter(
        (e) =>
          e.date.getDate() === day &&
          e.date.getMonth() === month &&
          e.date.getFullYear() === year
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
            gap: "4px"
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
            fontWeight: isToday ? "bold" : "normal"
          }}>
            {day}
          </span>
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "4px" }}>
            {dayEvents.map((evt) => (
              <div
                key={evt.id}
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: evt.color,
                }}
              />
            ))}
          </div>
        </div>
      );
    }

    const filteredCalendarEvents = calendarEvents.filter(e => {
      if (calendarFilter === "All") return true;
      return e.sourceType?.toLowerCase() === calendarFilter.toLowerCase();
    });

    const selectedEvents = filteredCalendarEvents.filter(
      (e) =>
        e.date.getDate() === selectedDate.getDate() &&
        e.date.getMonth() === selectedDate.getMonth() &&
        e.date.getFullYear() === selectedDate.getFullYear()
    );

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
          {["All", "Client", "Agent", "Personal"].map(filter => (
            <button
              key={filter}
              className={`btn btn-sm ${calendarFilter === filter ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setCalendarFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
      <div className="grid-2" style={{ gridTemplateColumns: "3fr 1fr", gap: "24px" }}>
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 className="h4">{currentDate.toLocaleString("default", { month: "long", year: "numeric" })}</h3>
            <div style={{ display: "flex", gap: "8px" }}>
              <button className="btn btn-secondary btn-sm" onClick={handlePrevMonth}>&lt;</button>
              <button className="btn btn-secondary btn-sm" onClick={handleNextMonth}>&gt;</button>
            </div>
          </div>
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
        </div>
        <div className="card">
          <h3 className="h4" style={{ marginBottom: "16px" }}>
            {selectedDate.toLocaleDateString("default", { weekday: "long", month: "short", day: "numeric" })}
          </h3>
          {selectedEvents.length === 0 ? (
            <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>No events for this day.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {selectedEvents.map(evt => (
                <div key={evt.id} style={{ padding: "12px", borderRadius: "var(--radius-md)", background: "var(--bg-tertiary)", borderLeft: `3px solid ${evt.color}` }}>
                  <div style={{ fontWeight: "bold", fontSize: "14px", marginBottom: "4px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", backgroundColor: evt.color }} />
                    {evt.title}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{evt.start} - {evt.end}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
    );
  };

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
        return priorityScore[b.priority] - priorityScore[a.priority];
      }
    });

    const getPriorityBadge = (priority) => {
      let badgeClass = "";
      if (priority === "High") badgeClass = "badge-error";
      else if (priority === "Medium") badgeClass = "badge-warning";
      else if (priority === "Low") badgeClass = "badge-success";

      return <span className={`badge ${badgeClass}`}>{priority}</span>;
    };

    const handleAddTask = (e) => {
      e.preventDefault();
      if (!newTask.title || !newTask.dueDate) return;
      setTasks([...tasks, { ...newTask, id: Date.now(), completed: false }]);
      setNewTask({ title: "", dueDate: "", priority: "Medium" });
      setShowAddTask(false);
    };

    const toggleTask = (id) => {
      setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    };

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
          {["All", "Manual", "Email", "Meeting", "Agent"].map(filter => (
            <button
              key={filter}
              className={`btn btn-sm ${tasksFilter === filter ? 'btn-primary' : 'btn-secondary'}`}
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

        {showAddTask && (
          <form onSubmit={handleAddTask} style={{ background: "var(--bg-tertiary)", padding: "16px", borderRadius: "var(--radius-md)", marginBottom: "20px", display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ flex: "1", minWidth: "200px" }}>
              <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: "var(--text-secondary)" }}>Task Title</label>
              <input type="text" className="input" placeholder="e.g., Update Marketing Deck" value={newTask.title} onChange={(e) => setNewTask({...newTask, title: e.target.value})} required />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: "var(--text-secondary)" }}>Due Date</label>
              <input type="date" className="input" value={newTask.dueDate} onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})} required />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: "var(--text-secondary)" }}>Priority</label>
              <select className="input" value={newTask.priority} onChange={(e) => setNewTask({...newTask, priority: e.target.value})}>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary">Save</button>
          </form>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {sortedTasks.map(task => (
            <div key={task.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "var(--bg-primary)", border: "1px solid var(--card-border)", borderRadius: "var(--radius-md)", opacity: task.completed ? 0.6 : 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => toggleTask(task.id)}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
                <span style={{ fontSize: "16px" }}>{task.sourceIcon}</span>
                <span style={{ fontSize: "14px", textDecoration: task.completed ? "line-through" : "none", color: task.completed ? "var(--text-secondary)" : "var(--text-primary)" }}>
                  {task.title}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{task.dueDate}</span>
                {getPriorityBadge(task.priority)}
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>
    );
  };

  const renderSchedule = () => {
    const hours = Array.from({ length: 11 }, (_, i) => i + 8); // 8am to 6pm

    const getTopPosition = (time) => {
      const [h, m] = time.split(':').map(Number);
      return ((h - 8) * 60 + m) * (60 / 60); // 60px per hour
    };

    const getHeight = (start, end) => {
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      return ((eh - sh) * 60 + (em - sm)) * (60 / 60);
    };

    return (
      <div className="card" style={{ position: "relative", minHeight: "700px", padding: "24px 0" }}>
        <h3 className="h4" style={{ padding: "0 24px", marginBottom: "20px" }}>Today&apos;s Schedule</h3>

        <div style={{ position: "relative", height: `${11 * 60}px`, margin: "0 24px" }}>
          {/* Time lines */}
          {hours.map((hour, idx) => (
            <div key={hour} style={{ position: "absolute", top: `${idx * 60}px`, left: 0, right: 0, height: "60px", borderTop: "1px solid var(--card-border)", display: "flex", zIndex: 1 }}>
              <div style={{ width: "60px", paddingRight: "12px", textAlign: "right", color: "var(--text-secondary)", fontSize: "12px", transform: "translateY(-8px)" }}>
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
              height: `${getHeight(evt.start, evt.end)}px`,
              background: "var(--bg-tertiary)",
              borderLeft: `4px solid ${evt.color}`,
              borderRadius: "4px",
              padding: "8px 12px",
              zIndex: 2,
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              overflow: "hidden"
            }}>
              <div style={{ fontWeight: "bold", fontSize: "14px", color: "var(--text-primary)", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>{evt.title}</div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{evt.start} - {evt.end}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

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
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="btn btn-primary btn-sm">+ New Event</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "24px", borderBottom: "1px solid var(--card-border)", paddingBottom: "12px" }}>
        <button
          className={`btn ${activeTab === 'calendar' ? 'btn-secondary' : 'btn-ghost'} btn-sm`}
          onClick={() => setActiveTab('calendar')}
          style={{ background: activeTab === 'calendar' ? 'var(--bg-hover)' : 'transparent' }}
        >
          Calendar
        </button>
        <button
          className={`btn ${activeTab === 'tasks' ? 'btn-secondary' : 'btn-ghost'} btn-sm`}
          onClick={() => setActiveTab('tasks')}
          style={{ background: activeTab === 'tasks' ? 'var(--bg-hover)' : 'transparent' }}
        >
          Tasks
        </button>
        <button
          className={`btn ${activeTab === 'schedule' ? 'btn-secondary' : 'btn-ghost'} btn-sm`}
          onClick={() => setActiveTab('schedule')}
          style={{ background: activeTab === 'schedule' ? 'var(--bg-hover)' : 'transparent' }}
        >
          Schedule
        </button>
      </div>

      {activeTab === 'calendar' && renderCalendar()}
      {activeTab === 'tasks' && renderTasks()}
      {activeTab === 'schedule' && renderSchedule()}
    </div>
  );
}
