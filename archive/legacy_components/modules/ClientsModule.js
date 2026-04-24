"use client";

import { useState, useEffect } from "react";
import HelpTooltip from "@/components/HelpTooltip";

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
  const [activeTab, setActiveTab] = useState("overview"); // overview, billing, communications, contacts

  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [billingEntries, setBillingEntries] = useState([]);
  const [contractsData, setContractsData] = useState({ contracts: [], totalValue: 0, activeContracts: 0 });
  const [isFetchingContracts, setIsFetchingContracts] = useState(false);
  const [showContractForm, setShowContractForm] = useState(false);
  const [newContract, setNewContract] = useState({ title: "", type: "project", startDate: "", endDate: "", value: "", notes: "", status: "draft" });
  const [communicationsData, setCommunicationsData] = useState({ communications: [], totalEmails: 0, totalMeetings: 0 });
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [isFetchingContacts, setIsFetchingContacts] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [newContact, setNewContact] = useState({ firstName: "", lastName: "", email: "", phone: "", organization: "" });

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

  const fetchContracts = async () => {
    setIsFetchingContracts(true);
    try {
      const res = await fetch(`/api/clients/${selectedClient.id}/contracts`);
      if (res.ok) {
        const data = await res.json();
        setContractsData(data);
      }
    } catch (err) {
      console.error("Failed to fetch contracts", err);
    } finally {
      setIsFetchingContracts(false);
    }
  };


  const fetchContacts = async () => {
    setIsFetchingContacts(true);
    try {
      const res = await fetch("/api/contacts");
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
      }
    } catch (err) {
      console.error("Failed to fetch contacts", err);
    } finally {
      setIsFetchingContacts(false);
    }
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    if (!newContact.firstName && !newContact.lastName) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newContact)
      });
      if (res.ok) {
        setNewContact({ firstName: "", lastName: "", email: "", phone: "", organization: "" });
        setShowContactForm(false);
        fetchContacts();
      }
    } catch (err) {
      console.error("Failed to add contact", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddContract = async (e) => {
    e.preventDefault();
    if (!newContract.title || !newContract.type || !newContract.status) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/clients/${selectedClient.id}/contracts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newContract)
      });
      if (res.ok) {
        setNewContract({ title: "", type: "project", startDate: "", endDate: "", value: "", notes: "", status: "draft" });
        setShowContractForm(false);
        fetchContracts();
      }
    } catch (err) {
      console.error("Failed to add contract", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (selectedClient) {
      if (activeTab === "billing") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchBilling();
      } else if (activeTab === "communications") {
        fetchCommunications();
      } else if (activeTab === "contracts") {
        fetchContracts();
      }
    }

    if (activeTab === "contacts") {
      fetchContacts();
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
          <button
            className={`btn btn-ghost ${activeTab === 'contacts' ? 'active' : ''}`}
            style={{ borderBottom: activeTab === 'contacts' ? '2px solid var(--primary)' : 'none', borderRadius: 0 }}
            onClick={() => setActiveTab('contacts')}
          >
            Contacts
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


          {activeTab === 'contracts' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)', minWidth: '150px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total Value</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold' }}>${contractsData.totalValue.toLocaleString()}</div>
                  </div>
                  <div style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)', minWidth: '150px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Active Contracts</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{contractsData.activeContracts}</div>
                  </div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setShowContractForm(!showContractForm)}>
                  {showContractForm ? 'Cancel' : '+ Add Contract'}
                </button>
              </div>

              {showContractForm && (
                <div style={{ padding: '16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)', marginBottom: '24px' }}>
                  <h4 className="h5" style={{ marginBottom: '12px' }}>New Contract</h4>
                  <form onSubmit={handleAddContract} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <input className="input" placeholder="Contract Title" required value={newContract.title} onChange={e => setNewContract({...newContract, title: e.target.value})} style={{ gridColumn: '1 / -1' }} />
                    <select className="input" value={newContract.type} onChange={e => setNewContract({...newContract, type: e.target.value})} style={{ backgroundColor: 'var(--bg-primary)' }}>
                      <option value="retainer">Retainer</option>
                      <option value="project">Project</option>
                      <option value="hourly">Hourly</option>
                      <option value="subscription">Subscription</option>
                    </select>
                    <select className="input" value={newContract.status} onChange={e => setNewContract({...newContract, status: e.target.value})} style={{ backgroundColor: 'var(--bg-primary)' }}>
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <input className="input" type="date" placeholder="Start Date" value={newContract.startDate} onChange={e => setNewContract({...newContract, startDate: e.target.value})} />
                    <input className="input" type="date" placeholder="End Date" value={newContract.endDate} onChange={e => setNewContract({...newContract, endDate: e.target.value})} />
                    <input className="input" type="number" placeholder="Total Value ($)" value={newContract.value} onChange={e => setNewContract({...newContract, value: e.target.value})} />
                    <input className="input" placeholder="Notes (optional)" value={newContract.notes} onChange={e => setNewContract({...newContract, notes: e.target.value})} />
                    <button type="submit" className="btn btn-primary" style={{ gridColumn: '1 / -1' }} disabled={isSubmitting}>
                      {isSubmitting ? 'Adding...' : 'Save Contract'}
                    </button>
                  </form>
                </div>
              )}

              {isFetchingContracts ? (
                 <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>Loading contracts...</div>
              ) : (
                 <div style={{ overflowX: 'auto', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-md)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--card-border)' }}>
                      <tr>
                        <th style={{ padding: '12px 16px', fontWeight: 500 }}>Title</th>
                        <th style={{ padding: '12px 16px', fontWeight: 500 }}>Type</th>
                        <th style={{ padding: '12px 16px', fontWeight: 500 }}>Dates</th>
                        <th style={{ padding: '12px 16px', fontWeight: 500, textAlign: 'right' }}>Value</th>
                        <th style={{ padding: '12px 16px', fontWeight: 500 }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contractsData.contracts.length > 0 ? contractsData.contracts.map(c => (
                        <tr key={c.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                          <td style={{ padding: '12px 16px' }}>{c.title}</td>
                          <td style={{ padding: '12px 16px', textTransform: 'capitalize' }}>{c.type}</td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                            {c.startDate ? c.startDate : '-'} to {c.endDate ? c.endDate : '-'}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>${c.value ? Number(c.value).toLocaleString() : '0'}</td>
                          <td style={{ padding: '12px 16px' }}>
                             <span className={`badge ${c.status === 'active' ? 'badge-success' : c.status === 'completed' ? 'badge-info' : c.status === 'cancelled' ? 'badge-error' : ''}`}>
                               {c.status}
                             </span>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>No contracts found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}


          {activeTab === 'contacts' && (
            <div className="tab-pane">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <h3>Google Contacts</h3>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button className="btn btn-secondary" onClick={fetchContacts} disabled={isFetchingContacts}>
                    {isFetchingContacts ? 'Syncing...' : 'Sync Contacts'}
                  </button>
                  <button className="btn btn-primary" onClick={() => setShowContactForm(!showContactForm)}>
                    + New Contact
                  </button>
                </div>
              </div>

              {showContactForm && (
                <div className="glass-panel" style={{ marginBottom: "1.5rem", padding: "1.5rem" }}>
                  <h4>Create New Contact</h4>
                  <form onSubmit={handleAddContact} style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
                    <div style={{ display: "flex", gap: "1rem" }}>
                      <div style={{ flex: 1 }}>
                        <label className="form-label">First Name</label>
                        <input
                          type="text"
                          className="form-input"
                          value={newContact.firstName}
                          onChange={(e) => setNewContact({...newContact, firstName: e.target.value})}
                          placeholder="First Name"
                          required
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label className="form-label">Last Name</label>
                        <input
                          type="text"
                          className="form-input"
                          value={newContact.lastName}
                          onChange={(e) => setNewContact({...newContact, lastName: e.target.value})}
                          placeholder="Last Name"
                        />
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "1rem" }}>
                      <div style={{ flex: 1 }}>
                        <label className="form-label">Email</label>
                        <input
                          type="email"
                          className="form-input"
                          value={newContact.email}
                          onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                          placeholder="email@example.com"
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label className="form-label">Phone</label>
                        <input
                          type="tel"
                          className="form-input"
                          value={newContact.phone}
                          onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                          placeholder="+1 555-0123"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="form-label">Organization</label>
                      <input
                        type="text"
                        className="form-input"
                        value={newContact.organization}
                        onChange={(e) => setNewContact({...newContact, organization: e.target.value})}
                        placeholder="Company Name"
                      />
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
                      <button type="button" className="btn btn-ghost" onClick={() => setShowContactForm(false)}>Cancel</button>
                      <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                        {isSubmitting ? 'Creating...' : 'Create Contact'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {isFetchingContacts && contacts.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
                  Loading contacts...
                </div>
              ) : contacts.length > 0 ? (
                <div className="table-container" style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                        <th style={{ padding: "0.75rem", color: "var(--text-secondary)", fontWeight: 500 }}>Name</th>
                        <th style={{ padding: "0.75rem", color: "var(--text-secondary)", fontWeight: 500 }}>Email</th>
                        <th style={{ padding: "0.75rem", color: "var(--text-secondary)", fontWeight: 500 }}>Phone</th>
                        <th style={{ padding: "0.75rem", color: "var(--text-secondary)", fontWeight: 500 }}>Organization</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contacts.map((contact, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid var(--border-color)" }}>
                          <td style={{ padding: "0.75rem", fontWeight: 500 }}>{contact.name}</td>
                          <td style={{ padding: "0.75rem" }}>{contact.email || "-"}</td>
                          <td style={{ padding: "0.75rem" }}>{contact.phone || "-"}</td>
                          <td style={{ padding: "0.75rem" }}>{contact.organization || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "3rem", background: "rgba(0,0,0,0.02)", borderRadius: "8px" }}>
                  <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>No contacts found.</p>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-tertiary)" }}>
                    Click &quot;Sync Contacts&quot; to load from Google People API.
                  </p>
                </div>
              )}
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
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h1 className="module-title">Clients</h1>
              <HelpTooltip module="clients" />
            </div>
            <p className="module-subtitle">Client profiles, projects, and billing management</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <div style={{ position: 'relative' }}>
             <button className="btn btn-secondary btn-sm" onClick={() => setShowExportDropdown(!showExportDropdown)} >Export ▾</button>
             {showExportDropdown && (
               <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-md)', padding: '8px', minWidth: '150px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                 <button className="btn btn-ghost btn-sm" style={{ textAlign: 'left', width: '100%' }} onClick={() => window.open('/api/export?type=clients&format=csv')}>Export as CSV</button>
                 <button className="btn btn-ghost btn-sm" style={{ textAlign: 'left', width: '100%' }} onClick={() => window.open('/api/export?type=clients&format=json')}>Export as JSON</button>
               </div>
             )}
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => { setIsWizardOpen(true); setPlanResult(null); }}>+ New Client</button>
        </div>
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
                <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => { setSelectedClient(client); setActiveTab('billing'); }}>Manage</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
