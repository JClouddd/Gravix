"use client";

import { useState } from "react";

const MOCK_CLIENTS = [
  { id: 1, name: "Acme Corp", email: "contact@acme.com", projectType: "website", status: "active", initials: "AC" },
  { id: 2, name: "Globex", email: "info@globex.com", projectType: "AI", status: "pending", initials: "GL" },
  { id: 3, name: "Initech", email: "hello@initech.com", projectType: "app", status: "completed", initials: "IN" },
];

/**
 * Client Manager Module
 * Profiles, projects, intake wizard, billing
 */
export default function ClientsModule() {
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "", email: "", projectType: "website", description: "", budget: "<5k"
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [planResult, setPlanResult] = useState(null);
  const [clients, setClients] = useState(MOCK_CLIENTS);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    setPlanResult(null);

    const message = `New client intake: ${formData.name}, needs ${formData.projectType}. Description: ${formData.description}. Budget: ${formData.budget}`;

    try {
      const res = await fetch('/api/agents/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, execute: true })
      });

      if (!res.ok) {
        throw new Error('Failed to generate plan');
      }

      const data = await res.json();
      setPlanResult(data.response || data.message || "Plan generated successfully.");

      // Optionally add to clients list
      setClients(prev => [...prev, {
        id: Date.now(),
        name: formData.name,
        email: formData.email,
        projectType: formData.projectType,
        status: "pending",
        initials: formData.name.substring(0, 2).toUpperCase()
      }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'active': return 'badge-success';
      case 'completed': return 'badge-info';
      case 'pending': return 'badge-warning';
      default: return 'badge-accent';
    }
  };

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
        <button className="btn btn-primary btn-sm" onClick={() => { setIsWizardOpen(true); setPlanResult(null); }}>+ New Client</button>
      </div>

      {isWizardOpen ? (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2 className="h3">Add New Client</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => setIsWizardOpen(false)}>Cancel</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: 32 }}>
            <input className="input" placeholder="Client name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            <input className="input" placeholder="Contact email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />

            <select className="input" value={formData.projectType} onChange={e => setFormData({...formData, projectType: e.target.value})} style={{ backgroundColor: 'var(--bg-primary)' }}>
              <option value="website">Website</option>
              <option value="app">App</option>
              <option value="dashboard">Dashboard</option>
              <option value="AI">AI</option>
              <option value="data">Data</option>
              <option value="automation">Automation</option>
            </select>

            <textarea className="input" placeholder="Description" rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={{ resize: 'vertical' }} />

            <select className="input" value={formData.budget} onChange={e => setFormData({...formData, budget: e.target.value})} style={{ backgroundColor: 'var(--bg-primary)' }}>
              <option value="<5k">&lt;5k</option>
              <option value="5-15k">5-15k</option>
              <option value="15-50k">15-50k</option>
              <option value="50k+">50k+</option>
            </select>
          </div>

          {error && <div style={{ color: 'var(--error)', marginBottom: '16px' }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Generating Plan...' : 'Submit'}
            </button>
          </div>

          {planResult && (
             <div style={{ marginTop: '24px', padding: '16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
               <h3 className="h5" style={{ marginBottom: '12px' }}>Generated Project Plan</h3>
               <div style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{planResult}</div>
             </div>
          )}
        </div>
      ) : (
        <div className="grid-3">
          {clients.map(client => (
            <div key={client.id} className="card-glass" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)', border: '1px solid var(--card-border)' }}>
                    {client.initials}
                  </div>
                  <div>
                    <h3 className="h5" style={{ color: 'var(--text-primary)', margin: 0, fontSize: '16px' }}>{client.name}</h3>
                    <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '13px' }}>{client.email}</p>
                  </div>
                </div>
                <span className={`badge ${getStatusBadgeClass(client.status)}`}>{client.status}</span>
              </div>

              <div style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Project Type</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)', textTransform: 'capitalize' }}>{client.projectType}</div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                <button className="btn btn-secondary btn-sm" style={{ flex: 1 }}>View Profile</button>
                <button className="btn btn-secondary btn-sm" style={{ flex: 1 }}>Manage</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
