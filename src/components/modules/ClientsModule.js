"use client";

import { useState, useEffect } from "react";

const MOCK_CLIENTS = [
  { id: 1, name: "Acme Corp", email: "contact@acme.com", projectType: "website", status: "active", initials: "AC" },
  { id: 2, name: "Globex", email: "info@globex.com", projectType: "AI", status: "pending", initials: "GL" },
  { id: 3, name: "Initech", email: "hello@initech.com", projectType: "app", status: "completed", initials: "IN" },
];

export default function ClientsModule() {
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "", email: "", projectType: "website", description: "", budget: "<5k"
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [planResult, setPlanResult] = useState(null);
  const [clients, setClients] = useState(MOCK_CLIENTS);

  const [selectedClient, setSelectedClient] = useState(null);
  const [activeTab, setActiveTab] = useState("overview"); // overview, billing, communications

  const [billingEntries, setBillingEntries] = useState([]);
  const [communicationsData, setCommunicationsData] = useState({ communications: [], totalEmails: 0, totalMeetings: 0 });
  const [isFetchingData, setIsFetchingData] = useState(false);

  const [newBilling, setNewBilling] = useState({ description: "", amount: "", hours: "", date: "", type: "invoice" });

  const fetchBilling = async () => {
    setIsFetchingData(true);
    try {
      const res = await fetch(`/api/clients/${selectedClient.id}/billing`);
      if (res.ok) {
        const data = await res.json();
        setBillingEntries(data.entries || []);
      }
    } catch (err) {
      console.error("Failed to fetch billing", err);
    } finally {
      setIsFetchingData(false);
    }
  };

  const fetchCommunications = async () => {
    setIsFetchingData(true);
    try {
      const res = await fetch(`/api/clients/${selectedClient.id}/communications`);
      if (res.ok) {
        const data = await res.json();
        setCommunicationsData(data);
      }
    } catch (err) {
      console.error("Failed to fetch communications", err);
    } finally {
      setIsFetchingData(false);
    }
  };

  useEffect(() => {
    if (selectedClient) {
      if (activeTab === "billing") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchBilling();
      } else if (activeTab === "communications") {
        fetchCommunications();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClient, activeTab]);

  const handleAddBilling = async (e) => {
    e.preventDefault();
    if (!newBilling.description || !newBilling.amount || !newBilling.date || !newBilling.type) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/clients/${selectedClient.id}/billing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBilling)
      });
      if (res.ok) {
        setNewBilling({ description: "", amount: "", hours: "", date: "", type: "invoice" });
        fetchBilling(); // Refresh list
      }
    } catch (err) {
      console.error("Failed to add billing entry", err);
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const calculateTotalBilling = () => {
    return billingEntries.reduce((total, entry) => {
      // Invoices and payments might add to total, expenses subtract, or just total sum based on logic
      // Assuming simple sum for now
      return total + Number(entry.amount || 0);
    }, 0);
  };

  if (selectedClient) {
    return (
      <div>
        <div className="module-header" style={{ marginBottom: 24 }}>
          <div className="module-header-left">
            <button className="btn btn-ghost btn-sm" onClick={() => setSelectedClient(null)}>← Back to Clients</button>
            <div style={{ marginLeft: 16 }}>
              <h1 className="module-title">{selectedClient.name}</h1>
              <p className="module-subtitle">{selectedClient.email}</p>
            </div>
          </div>
          <span className={`badge ${getStatusBadgeClass(selectedClient.status)}`}>{selectedClient.status}</span>
        </div>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid var(--card-border)' }}>
          <button
            className={`btn btn-ghost ${activeTab === 'overview' ? 'active' : ''}`}
            style={{ borderBottom: activeTab === 'overview' ? '2px solid var(--primary)' : 'none', borderRadius: 0 }}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`btn btn-ghost ${activeTab === 'billing' ? 'active' : ''}`}
            style={{ borderBottom: activeTab === 'billing' ? '2px solid var(--primary)' : 'none', borderRadius: 0 }}
            onClick={() => setActiveTab('billing')}
          >
            Billing
          </button>
          <button
            className={`btn btn-ghost ${activeTab === 'communications' ? 'active' : ''}`}
            style={{ borderBottom: activeTab === 'communications' ? '2px solid var(--primary)' : 'none', borderRadius: 0 }}
            onClick={() => setActiveTab('communications')}
          >
            Communications
          </button>
        </div>

        <div className="card">
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Project Type</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)', textTransform: 'capitalize' }}>{selectedClient.projectType}</div>
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 className="h4">Billing Entries</h3>
                <div style={{ fontWeight: 'bold' }}>Total: ${calculateTotalBilling().toFixed(2)}</div>
              </div>

              {isFetchingData ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>Loading billing data...</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                  {billingEntries.length > 0 ? billingEntries.map(entry => (
                    <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)' }}>
                      <div>
                        <div style={{ fontWeight: 'bold' }}>{entry.description}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{entry.date} • {entry.type}</div>
                      </div>
                      <div style={{ fontWeight: 'bold', color: entry.type === 'expense' ? 'var(--error)' : 'var(--success)' }}>
                        {entry.type === 'expense' ? '-' : '+'}${entry.amount}
                      </div>
                    </div>
                  )) : (
                    <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>No billing entries found.</div>
                  )}
                </div>
              )}

              <h4 className="h5" style={{ marginBottom: '12px' }}>Add Entry</h4>
              <form onSubmit={handleAddBilling} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <input className="input" placeholder="Description" required value={newBilling.description} onChange={e => setNewBilling({...newBilling, description: e.target.value})} style={{ gridColumn: '1 / -1' }} />
                <input className="input" type="number" placeholder="Amount ($)" required value={newBilling.amount} onChange={e => setNewBilling({...newBilling, amount: e.target.value})} />
                <input className="input" type="number" placeholder="Hours (Optional)" value={newBilling.hours} onChange={e => setNewBilling({...newBilling, hours: e.target.value})} />
                <input className="input" type="date" required value={newBilling.date} onChange={e => setNewBilling({...newBilling, date: e.target.value})} />
                <select className="input" value={newBilling.type} onChange={e => setNewBilling({...newBilling, type: e.target.value})} style={{ backgroundColor: 'var(--bg-primary)' }}>
                  <option value="invoice">Invoice</option>
                  <option value="payment">Payment</option>
                  <option value="expense">Expense</option>
                </select>
                <button type="submit" className="btn btn-primary" style={{ gridColumn: '1 / -1' }} disabled={isSubmitting}>
                  {isSubmitting ? 'Adding...' : 'Add Entry'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'communications' && (
            <div>
               <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                 <div style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', flex: 1, border: '1px solid var(--card-border)' }}>
                   <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total Emails</div>
                   <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{communicationsData.totalEmails}</div>
                 </div>
                 <div style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', flex: 1, border: '1px solid var(--card-border)' }}>
                   <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total Meetings</div>
                   <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{communicationsData.totalMeetings}</div>
                 </div>
               </div>

              {isFetchingData ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>Loading communications...</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {communicationsData.communications.length > 0 ? communicationsData.communications.map(item => (
                    <div key={item.id} style={{ display: 'flex', gap: '16px', padding: '16px', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)' }}>
                      <div style={{ fontSize: '24px' }}>
                        {item.type === 'email' ? '📧' : '🎤'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <div style={{ fontWeight: 'bold' }}>{item.title}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{new Date(item.date).toLocaleString()}</div>
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '14px', whiteSpace: 'pre-wrap', maxHeight: '100px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.snippet}
                        </div>
                      </div>
                    </div>
                  )) : (
                     <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>No communications found.</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

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
                <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => setSelectedClient(client)}>View Profile</button>
                <button className="btn btn-secondary btn-sm" style={{ flex: 1 }}>Manage</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
