'use client';

import React, { useState, useEffect } from 'react';

export default function ContactsView() {
  const [contacts, setContacts] = useState([]);
  const [isFetchingContacts, setIsFetchingContacts] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newContact, setNewContact] = useState({ firstName: "", lastName: "", email: "", phone: "", organization: "" });

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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    fetchContacts();
  }, []);

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 className="h3">Google Contacts Sync</h2>
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchContacts} disabled={isFetchingContacts}>
            {isFetchingContacts ? 'Syncing...' : 'Sync Contacts'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowContactForm(!showContactForm)}>
            {showContactForm ? 'Cancel' : '+ New Contact'}
          </button>
        </div>
      </div>

      {showContactForm && (
        <div className="card-glass" style={{ marginBottom: 24, padding: 24 }}>
          <h4 className="h4" style={{ marginBottom: 16 }}>Create New Contact</h4>
          <form onSubmit={handleAddContact} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <label className="caption" style={{ display: 'block', marginBottom: 8 }}>First Name</label>
                <input
                  type="text"
                  className="input"
                  value={newContact.firstName}
                  onChange={(e) => setNewContact({...newContact, firstName: e.target.value})}
                  placeholder="First Name"
                  required
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className="caption" style={{ display: 'block', marginBottom: 8 }}>Last Name</label>
                <input
                  type="text"
                  className="input"
                  value={newContact.lastName}
                  onChange={(e) => setNewContact({...newContact, lastName: e.target.value})}
                  placeholder="Last Name"
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <label className="caption" style={{ display: 'block', marginBottom: 8 }}>Email</label>
                <input
                  type="email"
                  className="input"
                  value={newContact.email}
                  onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                  placeholder="email@example.com"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className="caption" style={{ display: 'block', marginBottom: 8 }}>Phone</label>
                <input
                  type="tel"
                  className="input"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                  placeholder="+1 555-0123"
                />
              </div>
            </div>

            <div>
              <label className="caption" style={{ display: 'block', marginBottom: 8 }}>Organization</label>
              <input
                type="text"
                className="input"
                value={newContact.organization}
                onChange={(e) => setNewContact({...newContact, organization: e.target.value})}
                placeholder="Company Name"
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowContactForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Contact'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isFetchingContacts && contacts.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-secondary)" }}>
          <div className="skeleton skeleton-card" style={{ height: 200 }} />
        </div>
      ) : contacts.length > 0 ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--card-border)' }}>
                <tr>
                  <th style={{ padding: "12px 16px", color: "var(--text-secondary)", fontWeight: 500 }}>Name</th>
                  <th style={{ padding: "12px 16px", color: "var(--text-secondary)", fontWeight: 500 }}>Email</th>
                  <th style={{ padding: "12px 16px", color: "var(--text-secondary)", fontWeight: 500 }}>Phone</th>
                  <th style={{ padding: "12px 16px", color: "var(--text-secondary)", fontWeight: 500 }}>Organization</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact, idx) => (
                  <tr key={idx} style={{ borderBottom: idx === contacts.length - 1 ? 'none' : "1px solid var(--card-border)" }}>
                    <td style={{ padding: "12px 16px", fontWeight: 500 }}>{contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`}</td>
                    <td style={{ padding: "12px 16px" }}>{contact.email || "-"}</td>
                    <td style={{ padding: "12px 16px" }}>{contact.phone || "-"}</td>
                    <td style={{ padding: "12px 16px" }}>{contact.organization || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <p className="empty-state-title">No Contacts Found</p>
            <p className="empty-state-desc">
              Click &quot;Sync Contacts&quot; to load your directory from the Google People API.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
