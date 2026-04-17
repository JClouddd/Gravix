"use client";

import { useState } from "react";

const MOCK_CLIENTS = [
  { id: 1, name: "Acme Corp", company: "Acme Inc.", status: "active", retainer: "$5,000", initials: "AC" },
  { id: 2, name: "Globex", company: "Globex Corporation", status: "onboarding", retainer: "$3,500", initials: "GL" },
  { id: 3, name: "Initech", company: "Initech LLC", status: "paused", retainer: "$2,000", initials: "IN" },
];

/**
 * Client Manager Module
 * Profiles, projects, intake wizard, billing
 */
export default function ClientsModule() {
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "", company: "", email: "", phone: "",
    services: [],
    retainer: "", billingCycle: "monthly", startDate: ""
  });

  const handleServiceToggle = (service) => {
    setFormData(prev => {
      const services = prev.services.includes(service)
        ? prev.services.filter(s => s !== service)
        : [...prev.services, service];
      return { ...prev, services };
    });
  };

  const renderWizardStep = () => {
    switch(wizardStep) {
      case 1:
        return (
          <div className="flex-col gap-md" style={{ display: 'flex' }}>
            <h3 className="h4">Basic Info</h3>
            <input className="input" placeholder="Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            <input className="input" placeholder="Company" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} />
            <input className="input" placeholder="Email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            <input className="input" placeholder="Phone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
          </div>
        );
      case 2:
        return (
          <div className="flex-col gap-md" style={{ display: 'flex' }}>
            <h3 className="h4">Service Selection</h3>
            {['Web Dev', 'AI Integration', 'SEO', 'Content', 'Consulting'].map(service => (
              <label key={service} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                <input
                  type="checkbox"
                  checked={formData.services.includes(service)}
                  onChange={() => handleServiceToggle(service)}
                  style={{ accentColor: 'var(--accent)', width: '16px', height: '16px' }}
                />
                {service}
              </label>
            ))}
          </div>
        );
      case 3:
        return (
          <div className="flex-col gap-md" style={{ display: 'flex' }}>
            <h3 className="h4">Billing</h3>
            <input className="input" placeholder="Monthly Retainer Amount ($)" type="number" value={formData.retainer} onChange={e => setFormData({...formData, retainer: e.target.value})} />
            <select className="input" value={formData.billingCycle} onChange={e => setFormData({...formData, billingCycle: e.target.value})} style={{ backgroundColor: 'var(--bg-primary)' }}>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annually">Annually</option>
            </select>
            <input className="input" type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
          </div>
        );
      default:
        return null;
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'active': return 'badge-success';
      case 'onboarding': return 'badge-info';
      case 'paused': return 'badge-warning';
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
        <button className="btn btn-primary btn-sm" onClick={() => { setIsWizardOpen(true); setWizardStep(1); }}>+ Add Client</button>
      </div>

      {/* Stats Bar */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="card" style={{ padding: "16px" }}>
          <div className="caption" style={{ color: "var(--text-secondary)", marginBottom: 4 }}>Total Clients</div>
          <div className="h2" style={{ color: "var(--text-primary)" }}>{MOCK_CLIENTS.length}</div>
        </div>
        <div className="card" style={{ padding: "16px" }}>
          <div className="caption" style={{ color: "var(--text-secondary)", marginBottom: 4 }}>Active</div>
          <div className="h2" style={{ color: "var(--success)" }}>{MOCK_CLIENTS.filter(c => c.status === 'active').length}</div>
        </div>
        <div className="card" style={{ padding: "16px" }}>
          <div className="caption" style={{ color: "var(--text-secondary)", marginBottom: 4 }}>Monthly Revenue</div>
          <div className="h2" style={{ color: "var(--accent)" }}>$10,500</div>
        </div>
        <div className="card" style={{ padding: "16px" }}>
          <div className="caption" style={{ color: "var(--text-secondary)", marginBottom: 4 }}>Avg Retainer</div>
          <div className="h2" style={{ color: "var(--info)" }}>$3,500</div>
        </div>
      </div>

      {isWizardOpen ? (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2 className="h3">Add New Client</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => setIsWizardOpen(false)}>Cancel</button>
          </div>

          {/* Progress Bar */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '14px', color: 'var(--text-secondary)' }}>
              <span>Step {wizardStep} of 3</span>
              <span>{wizardStep === 1 ? 'Basic Info' : wizardStep === 2 ? 'Services' : 'Billing'}</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${(wizardStep / 3) * 100}%`, height: '100%', background: 'var(--accent)', transition: 'width var(--duration-normal) var(--ease-out)' }} />
            </div>
          </div>

          {/* Wizard Content */}
          <div style={{ marginBottom: 32 }}>
            {renderWizardStep()}
          </div>

          {/* Wizard Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setWizardStep(prev => prev - 1)}
              disabled={wizardStep === 1}
              style={{ opacity: wizardStep === 1 ? 0.5 : 1, cursor: wizardStep === 1 ? 'not-allowed' : 'pointer' }}
            >
              Back
            </button>
            {wizardStep < 3 ? (
              <button className="btn btn-primary" onClick={() => setWizardStep(prev => prev + 1)}>
                Next
              </button>
            ) : (
              <button className="btn btn-primary" onClick={() => { setIsWizardOpen(false); setFormData({ name: "", company: "", email: "", phone: "", services: [], retainer: "", billingCycle: "monthly", startDate: "" }); }}>
                Submit
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid-3">
          {MOCK_CLIENTS.map(client => (
            <div key={client.id} className="card-glass" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)', border: '1px solid var(--card-border)' }}>
                    {client.initials}
                  </div>
                  <div>
                    <h3 className="h5" style={{ color: 'var(--text-primary)', margin: 0, fontSize: '16px' }}>{client.name}</h3>
                    <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '13px' }}>{client.company}</p>
                  </div>
                </div>
                <span className={`badge ${getStatusBadgeClass(client.status)}`}>{client.status}</span>
              </div>

              <div style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Monthly Retainer</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{client.retainer}</div>
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
