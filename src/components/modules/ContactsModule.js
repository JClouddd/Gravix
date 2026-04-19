"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function ContactsModule() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    givenName: "",
    familyName: "",
    email: "",
    phone: "",
    organization: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const searchTimeout = useRef(null);

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/contacts");
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to fetch contacts");

      if (data.connected === false) {
        setError("Not connected to Google. Please connect your account in Settings.");
        setContacts([]);
      } else {
        setContacts(data.contacts || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchContacts();
    });
  }, [fetchContacts]);

  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (!searchQuery.trim()) {
      Promise.resolve().then(() => {
        setSearchResults(null);
        setIsSearching(false);
      });
      return;
    }

    Promise.resolve().then(() => {
      setIsSearching(true);
    });
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/contacts/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Search failed");

        setSearchResults(data.results || []);
      } catch (err) {
        console.error("Search error:", err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchQuery]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setSubmitError(null);

      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create contact");
      }

      setIsModalOpen(false);
      setFormData({ givenName: "", familyName: "", email: "", phone: "", organization: "" });
      setToastMessage("Contact created successfully!");
      setTimeout(() => setToastMessage(null), 3000);

      fetchContacts();
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.split(" ");
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const extractContactData = (contact) => {
    // Determine if it's a direct contact object or wrapped in a search result
    const person = contact.person || contact;

    const nameStr = person.names?.[0]?.displayName ||
                    `${person.names?.[0]?.givenName || ''} ${person.names?.[0]?.familyName || ''}`.trim() ||
                    "Unknown Name";

    const emailStr = person.emailAddresses?.[0]?.value || "";
    const phoneStr = person.phoneNumbers?.[0]?.value || "";
    const orgStr = person.organizations?.[0]?.name || "";
    const photoUrl = person.photos?.[0]?.url;

    return { nameStr, emailStr, phoneStr, orgStr, photoUrl, resourceName: person.resourceName };
  };

  const renderContactCard = (contact, index) => {
    const { nameStr, emailStr, phoneStr, orgStr, photoUrl, resourceName } = extractContactData(contact);

    return (
      <div
        key={resourceName || index}
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--card-border)",
          borderRadius: "12px",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "none";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            background: photoUrl && !photoUrl.includes("default-user") ? `url(${photoUrl}) center/cover` : "linear-gradient(135deg, #a855f7, #3b82f6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontWeight: "bold",
            fontSize: "18px",
            flexShrink: 0
          }}>
            {(!photoUrl || photoUrl.includes("default-user")) && getInitials(nameStr)}
          </div>
          <div style={{ overflow: "hidden" }}>
            <h3 style={{ margin: 0, fontSize: "16px", color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {nameStr}
            </h3>
            {orgStr && (
              <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {orgStr}
              </p>
            )}
          </div>
        </div>

        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", color: "var(--text-secondary)" }}>
          {emailStr && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              <span>✉️</span> <span style={{ overflow: "hidden", textOverflow: "ellipsis" }} title={emailStr}>{emailStr}</span>
            </div>
          )}
          {phoneStr && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              <span>📞</span> <span style={{ overflow: "hidden", textOverflow: "ellipsis" }} title={phoneStr}>{phoneStr}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const displayList = searchResults !== null ? searchResults : contacts;

  return (
    <ErrorBoundary name="Contacts">
      <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px", height: "100%" }}>

        {/* Header Section */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <h1 style={{ margin: 0, color: "var(--text-primary)" }}>Contacts</h1>
          <button
            onClick={() => setIsModalOpen(true)}
            style={{
              background: "var(--accent)",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <span>+</span> Add Contact
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1, maxWidth: "480px" }}>
            <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }}>
              🔍
            </span>
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 10px 10px 36px",
                borderRadius: "8px",
                border: "1px solid var(--card-border)",
                background: "var(--bg-secondary)",
                color: "var(--text-primary)",
                boxSizing: "border-box"
              }}
            />
          </div>
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(""); setSearchResults(null); }}
              style={{ background: "transparent", border: "1px solid var(--card-border)", color: "var(--text-secondary)", padding: "8px 12px", borderRadius: "8px", cursor: "pointer" }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Main Content Area */}
        <div style={{ flex: 1, overflowY: "auto", minHeight: "200px" }}>
          {loading ? (
            <LoadingSkeleton cards={6} />
          ) : error ? (
            <div style={{ padding: "24px", textAlign: "center", color: "var(--error-text)", background: "var(--error-bg)", borderRadius: "8px" }}>
              {error}
            </div>
          ) : isSearching ? (
             <div style={{ padding: "24px", textAlign: "center", color: "var(--text-secondary)" }}>
               Searching...
             </div>
          ) : displayList.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-secondary)", background: "var(--card-bg)", borderRadius: "12px", border: "1px dashed var(--card-border)" }}>
              {searchResults !== null ? "No contacts found matching your search." : "No contacts found. Add your first contact!"}
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "16px"
            }}>
              {displayList.map((contact, index) => renderContactCard(contact, index))}
            </div>
          )}
        </div>

        {/* Add Contact Modal */}
        {isModalOpen && (
          <div style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px"
          }}>
            <div style={{
              background: "var(--bg-primary)",
              border: "1px solid var(--card-border)",
              borderRadius: "12px",
              padding: "24px",
              width: "100%",
              maxWidth: "480px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)"
            }}>
              <h2 style={{ margin: "0 0 20px 0", color: "var(--text-primary)" }}>Add New Contact</h2>

              {submitError && (
                <div style={{ padding: "12px", margin: "0 0 16px 0", color: "var(--error-text)", background: "var(--error-bg)", borderRadius: "6px", fontSize: "14px" }}>
                  {submitError}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", gap: "12px" }}>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>First Name</label>
                    <input
                      name="givenName" value={formData.givenName} onChange={handleInputChange}
                      style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--card-border)", background: "var(--bg-secondary)", color: "var(--text-primary)" }}
                    />
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Last Name</label>
                    <input
                      name="familyName" value={formData.familyName} onChange={handleInputChange}
                      style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--card-border)", background: "var(--bg-secondary)", color: "var(--text-primary)" }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Email</label>
                  <input
                    name="email" type="email" value={formData.email} onChange={handleInputChange} required
                    style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--card-border)", background: "var(--bg-secondary)", color: "var(--text-primary)" }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Phone</label>
                  <input
                    name="phone" type="tel" value={formData.phone} onChange={handleInputChange}
                    style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--card-border)", background: "var(--bg-secondary)", color: "var(--text-primary)" }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Organization</label>
                  <input
                    name="organization" value={formData.organization} onChange={handleInputChange}
                    style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--card-border)", background: "var(--bg-secondary)", color: "var(--text-primary)" }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid var(--card-border)", background: "transparent", color: "var(--text-primary)", cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{ padding: "8px 16px", borderRadius: "6px", border: "none", background: "var(--accent)", color: "white", cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1 }}
                  >
                    {submitting ? "Saving..." : "Save Contact"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Success Toast */}
        {toastMessage && (
          <div style={{
            position: "fixed", bottom: "20px", right: "20px",
            background: "var(--success, #22c55e)", color: "white",
            padding: "12px 24px", borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 2000,
            animation: "fadeIn 0.3s ease-out"
          }}>
            {toastMessage}
          </div>
        )}

      </div>
    </ErrorBoundary>
  );
}
