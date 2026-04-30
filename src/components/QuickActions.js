"use client";

import { useState } from "react";

export default function QuickActions({ activeModule, setActiveModule }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => setIsExpanded(!isExpanded);

  const actions = [
    { label: "Search Knowledge", icon: "🔍", action: "knowledge" },
    { label: "Ask AI", icon: "✨", action: "agents" },
    { label: "Create Task", icon: "✅", action: "management" },
    { label: "Compose Email", icon: "✉️", action: "email" },
  ];

  const handleAction = (action) => {
    if (setActiveModule) {
      setActiveModule(action);
    }
    setIsExpanded(false);
  };

  return (
    <>
      {/* CSS included for the mobile-only visibility logic */}
      <style>{`
        .quick-actions-container {
          position: fixed;
          bottom: 80px;
          right: 20px;
          z-index: var(--z-modal, 100);
          display: none;
          flex-direction: column;
          align-items: flex-end;
          gap: 12px;
        }

        @media (max-width: 768px) {
          .quick-actions-container {
            display: flex;
          }
        }

        .fab-main {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: var(--accent);
          color: white;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          box-shadow: 0 4px 12px var(--accent-glow, rgba(0, 0, 0, 0.3));
          cursor: pointer;
          transition: transform 0.2s ease;
          z-index: 10;
        }

        .fab-main:active {
          transform: scale(0.95);
        }

        .fab-main.expanded {
          transform: rotate(45deg);
        }

        .quick-action-item {
          display: flex;
          align-items: center;
          gap: 12px;
          opacity: 0;
          transform: translateY(20px);
          pointer-events: none;
          transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .quick-action-item.expanded {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }

        .quick-action-label {
          background: var(--bg-primary);
          color: var(--text-primary);
          padding: 6px 12px;
          border-radius: var(--radius-md);
          font-size: 14px;
          font-weight: 500;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          border: 1px solid var(--card-border);
        }

        .quick-action-btn {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: var(--bg-secondary);
          color: var(--text-primary);
          border: 1px solid var(--card-border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .quick-action-btn:hover {
          background: var(--bg-hover);
        }

        .quick-action-btn:active {
          transform: scale(0.95);
        }
      `}</style>

      <div className="quick-actions-container">
        {actions.map((item, index) => (
          <div
            key={index}
            className={`quick-action-item ${isExpanded ? "expanded" : ""}`}
            style={{ transitionDelay: isExpanded ? `${(actions.length - 1 - index) * 0.05}s` : "0s" }}
          >
            <span className="quick-action-label">{item.label}</span>
            <button
              className="quick-action-btn"
              onClick={() => handleAction(item.action)}
              aria-label={item.label}
            >
              {item.icon}
            </button>
          </div>
        ))}

        <button
          className={`fab-main ${isExpanded ? "expanded" : ""}`}
          onClick={toggleExpand}
          aria-label="Quick actions"
        >
          +
        </button>
      </div>

      {isExpanded && (
        <div
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 90,
            background: "rgba(0,0,0,0.3)"
          }}
          onClick={() => setIsExpanded(false)}
        />
      )}
    </>
  );
}
