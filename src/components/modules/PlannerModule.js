"use client";

/**
 * Planner Module — Calendar + Tasks combined
 * Courier-managed scheduling and task tracking
 */
export default function PlannerModule() {
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
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary btn-sm">Tasks</button>
          <button className="btn btn-primary btn-sm">+ New Event</button>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 className="h4" style={{ marginBottom: 16 }}>Upcoming</h3>
          <div className="empty-state" style={{ padding: 32 }}>
            <div className="empty-state-icon">📆</div>
            <p className="empty-state-title">No events scheduled</p>
            <p className="empty-state-desc">
              Connect Google Calendar to see your schedule. Courier will auto-tag client meetings and deadlines.
            </p>
          </div>
        </div>

        <div className="card">
          <h3 className="h4" style={{ marginBottom: 16 }}>Tasks</h3>
          <div className="empty-state" style={{ padding: 32 }}>
            <div className="empty-state-icon">✅</div>
            <p className="empty-state-title">No tasks yet</p>
            <p className="empty-state-desc">
              Tasks will appear here from meetings, emails, and agent operations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
