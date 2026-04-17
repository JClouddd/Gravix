"use client";

/**
 * Client Manager Module
 * Profiles, projects, intake wizard, billing
 */
export default function ClientsModule() {
  return (
    <div>
      <div className="module-header">
        <div className="module-header-left">
          <div className="module-icon" style={{ background: "hsla(45, 90%, 52%, 0.12)" }}>👥</div>
          <div>
            <h1 className="module-title">Clients</h1>
            <p className="module-subtitle">Client profiles, projects, and billing management</p>
          </div>
        </div>
        <button className="btn btn-primary btn-sm">+ New Client</button>
      </div>

      <div className="card">
        <div className="empty-state">
          <div className="empty-state-icon">🤝</div>
          <p className="empty-state-title">No clients yet</p>
          <p className="empty-state-desc">
            Add your first client to launch the intake wizard. Conductor will generate a project plan with tasks, schedule a kickoff, and assign agents.
          </p>
          <button className="btn btn-primary" style={{ marginTop: 16 }}>
            Start Intake Wizard
          </button>
        </div>
      </div>
    </div>
  );
}
