"use client";

import { useState } from "react";

/**
 * Planner Module — Calendar + Tasks combined
 * Courier-managed scheduling and task tracking
 */
export default function PlannerModule() {
  const [activeTab, setActiveTab] = useState("calendar");

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Mock Events
  const mockEvents = [
    { id: 1, title: "Product Launch Strategy", date: new Date(new Date().getFullYear(), new Date().getMonth(), 15), type: "work", color: "var(--accent)", start: "09:00", end: "10:30" },
    { id: 2, title: "Client Review: Alpha", date: new Date(new Date().getFullYear(), new Date().getMonth(), 18), type: "meeting", color: "var(--success)", start: "13:00", end: "14:00" },
    { id: 3, title: "Team Weekly Sync", date: new Date(new Date().getFullYear(), new Date().getMonth(), 22), type: "internal", color: "var(--warning)", start: "15:00", end: "16:00" },
  ];

  // Tasks State
  const [tasks, setTasks] = useState([
    { id: 1, title: "Draft Q3 Marketing Copy", dueDate: "2024-10-15", priority: "High", completed: false },
    { id: 2, title: "Review UI Mockups", dueDate: "2024-10-18", priority: "Medium", completed: true },
    { id: 3, title: "Send Weekly Update to Stakeholders", dueDate: "2024-10-20", priority: "High", completed: false },
    { id: 4, title: "Renew Domain Registration", dueDate: "2024-11-01", priority: "Low", completed: false },
    { id: 5, title: "Update Dependencies", dueDate: "2024-10-25", priority: "Medium", completed: false },
  ]);
  const [taskSort, setTaskSort] = useState("date"); // 'date' or 'priority'
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", dueDate: "", priority: "Medium" });

  // Schedule mock events for today
  const scheduleEvents = [
    { id: 101, title: "Daily Standup", start: "09:30", end: "10:00", color: "var(--accent)" },
    { id: 102, title: "Design Review", start: "11:00", end: "12:30", color: "var(--warning)" },
    { id: 103, title: "Client Workshop", start: "14:00", end: "16:00", color: "var(--success)" },
  ];

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

      const dayEvents = mockEvents.filter(
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

    const selectedEvents = mockEvents.filter(
      (e) =>
        e.date.getDate() === selectedDate.getDate() &&
        e.date.getMonth() === selectedDate.getMonth() &&
        e.date.getFullYear() === selectedDate.getFullYear()
    );

    return (
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
                  <div style={{ fontWeight: "bold", fontSize: "14px", marginBottom: "4px" }}>{evt.title}</div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{evt.start} - {evt.end}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTasks = () => {
    const sortedTasks = [...tasks].sort((a, b) => {
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

  return (
    <div>
      <div className="module-header">
        <div className="module-header-left">
          <div className="module-icon" style={{ background: "var(--info-subtle)" }}>📅</div>
          <div>
            <h1 className="module-title">Planner</h1>
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
