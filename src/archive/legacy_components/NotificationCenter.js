"use client";

import React, { useState, useEffect, useRef } from "react";

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications/history");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNotifications();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAsRead = async (id) => {
    try {
      await fetch("/api/notifications/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setNotifications(notifications.map(n =>
        n.id === id ? { ...n, read: true } : n
      ));
    } catch (err) {
      console.error("Failed to mark as read", err);
    }
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    await Promise.all(unreadIds.map(id => markAsRead(id)));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type) => {
    switch (type) {
      case "critical": return "🚨";
      case "warning": return "⚠️";
      case "info":
      default: return "ℹ️";
    }
  };

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div style={{ position: "relative" }} ref={dropdownRef}>
      <button
        className="btn btn-icon btn-ghost"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        title="Notifications"
        style={{ position: "relative" }}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: "absolute",
            top: "4px",
            right: "4px",
            background: "var(--error)",
            color: "white",
            fontSize: "10px",
            fontWeight: "bold",
            borderRadius: "50%",
            width: "16px",
            height: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid var(--bg-primary)"
          }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: "absolute",
          top: "100%",
          right: "0",
          marginTop: "8px",
          width: "320px",
          maxHeight: "400px",
          background: "var(--bg-secondary)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid var(--card-border)",
          borderRadius: "12px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          display: "flex",
          flexDirection: "column",
          zIndex: 100,
          overflow: "hidden"
        }}>
          <div style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--card-border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "var(--bg-tertiary)"
          }}>
            <h3 style={{ margin: 0, fontSize: "14px", fontWeight: "600" }}>Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--accent)",
                  fontSize: "12px",
                  cursor: "pointer",
                  padding: 0
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          <div style={{
            overflowY: "auto",
            flex: 1,
            maxHeight: "350px"
          }}>
            {loading && notifications.length === 0 ? (
              <div style={{ padding: "20px", textAlign: "center", color: "var(--text-secondary)" }}>
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: "32px 20px", textAlign: "center" }}>
                <div style={{ fontSize: "24px", marginBottom: "8px", opacity: 0.5 }}>📭</div>
                <div style={{ color: "var(--text-secondary)", fontSize: "13px" }}>No notifications yet</div>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.read && markAsRead(n.id)}
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--card-border)",
                    cursor: n.read ? "default" : "pointer",
                    background: n.read ? "transparent" : "rgba(59, 130, 246, 0.05)",
                    opacity: n.read ? 0.7 : 1,
                    display: "flex",
                    gap: "12px",
                    transition: "background 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    if (!n.read) e.currentTarget.style.background = "rgba(59, 130, 246, 0.1)";
                  }}
                  onMouseLeave={(e) => {
                    if (!n.read) e.currentTarget.style.background = "rgba(59, 130, 246, 0.05)";
                  }}
                >
                  <div style={{ fontSize: "16px", marginTop: "2px" }}>
                    {getIcon(n.type)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                      <span style={{ fontSize: "13px", fontWeight: n.read ? "500" : "600", color: "var(--text-primary)" }}>
                        {n.title}
                      </span>
                      <span style={{ fontSize: "11px", color: "var(--text-tertiary)", whiteSpace: "nowrap", marginLeft: "8px" }}>
                        {formatRelativeTime(n.timestamp)}
                      </span>
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                      {n.body}
                    </div>
                  </div>
                  {!n.read && (
                    <div style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "var(--accent)",
                      marginTop: "6px"
                    }} />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
