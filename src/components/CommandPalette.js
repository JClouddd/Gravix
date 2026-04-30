"use client";

import { useState, useEffect, useRef } from "react";
import { SHORTCUTS } from "@/lib/keyboardShortcuts";

const getShortcutLabel = (actionType, actionName) => {
  const entry = Object.entries(SHORTCUTS).find(
    ([_, val]) => val.type === actionType && val.action === actionName
  );
  return entry ? entry[1].label : null;
};

const COMMANDS = [
  { id: "nav-home", type: "Navigation", label: "Go to Home", icon: "🏠", action: "home", shortcut: getShortcutLabel("nav", "home") },
  { id: "nav-management", type: "Navigation", label: "Go to Management", icon: "📋", action: "management", shortcut: getShortcutLabel("nav", "management") },
  { id: "nav-finance", type: "Navigation", label: "Go to Finance", icon: "💰", action: "finance", shortcut: getShortcutLabel("nav", "finance") },
  { id: "nav-architecture", type: "Navigation", label: "Go to Ecosystem", icon: "🪐", action: "architecture", shortcut: getShortcutLabel("nav", "architecture") },
  { id: "nav-settings", type: "Navigation", label: "Go to Settings", icon: "⚙️", action: "settings", shortcut: getShortcutLabel("nav", "settings") },

  // Actions
  { id: "act-email", type: "Action", label: "Compose Email", icon: "✏️", desc: "Draft a new email" },
  { id: "act-task", type: "Action", label: "Create Task", icon: "✅", desc: "Add a new task to Management" },
  { id: "act-client", type: "Action", label: "Create Client", icon: "➕", desc: "Add a new client profile" },
  { id: "act-notebook", type: "Action", label: "Run Notebook", icon: "▶️", desc: "Execute a data notebook" },
  { id: "act-search", type: "Action", label: "Search Knowledge", icon: "🔍", desc: "Search through ingested docs" },
  { id: "act-health", type: "Action", label: "Check Health", icon: "🩺", desc: "Run system diagnostics" },
  { id: "act-shortcuts", type: "Action", label: "Keyboard Shortcuts", icon: "⌨️", desc: "View all shortcuts" },

  // Agents
  { id: "agt-conductor", type: "Agent", label: "Ask Conductor", icon: "⚡", desc: "Route a complex request" },
  { id: "agt-scholar", type: "Agent", label: "Ask Scholar", icon: "🦉", desc: "Research or query docs" },
  { id: "agt-courier", type: "Agent", label: "Ask Courier", icon: "🕊️", desc: "Draft comms or summarize emails" },
  { id: "agt-sentinel", type: "Agent", label: "Ask Sentinel", icon: "🛡️", desc: "Check alerts and system security" },
];

export default function CommandPalette({ setActiveModule }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        setQuery("");
        setSelectedIndex(0);
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredCommands = COMMANDS.filter(cmd =>
    cmd.label.toLowerCase().includes(query.toLowerCase()) ||
    (cmd.desc && cmd.desc.toLowerCase().includes(query.toLowerCase())) ||
    cmd.type.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredCommands.length > 0) {
        executeCommand(filteredCommands[selectedIndex]);
      }
    }
  };

  const executeCommand = (cmd) => {
    if (cmd.type === "Navigation" && setActiveModule) {
      setActiveModule(cmd.action);
    } else if (cmd.id === "act-shortcuts") {
      alert(
        "Keyboard Shortcuts:\n" +
        Object.values(SHORTCUTS)
          .map(s => `${s.label}: ${s.desc}`)
          .join("\n")
      );
    } else if (cmd.type === "Action" && setActiveModule) {
      // Map actions to their target modules
      const actionModuleMap = {
        "act-health": "home",
        "act-notebook": "knowledge",
        "act-search": "knowledge",
      };
      const targetModule = actionModuleMap[cmd.id];
      if (targetModule) setActiveModule(targetModule);
    } else if (cmd.type === "Agent" && setActiveModule) {
      setActiveModule("agents");
    }
    setIsOpen(false);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        zIndex: "var(--z-modal, 200)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "12vh",
        backdropFilter: "blur(4px)",
      }}
      onClick={() => setIsOpen(false)}
    >
      <div
        className="card-glass"
        style={{
          width: "100%",
          maxWidth: 600,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "16px", borderBottom: "1px solid var(--glass-border)" }}>
          <input
            ref={inputRef}
            className="input"
            style={{
              fontSize: "18px",
              padding: "12px",
              border: "none",
              backgroundColor: "transparent",
              outline: "none",
              boxShadow: "none",
            }}
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div style={{ maxHeight: "360px", overflowY: "auto", padding: "8px 0" }}>
          {filteredCommands.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center", color: "var(--text-secondary)" }}>
              No commands found.
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={() => executeCommand(cmd)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    padding: "12px 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    cursor: "pointer",
                    backgroundColor: isSelected ? "var(--bg-hover)" : "transparent",
                    transition: "background-color 0.1s ease",
                  }}
                >
                  <span style={{ fontSize: "20px" }}>{cmd.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div className="body" style={{ fontWeight: 500 }}>{cmd.label}</div>
                    {cmd.desc && (
                      <div className="caption" style={{ marginTop: "2px" }}>{cmd.desc}</div>
                    )}
                  </div>
                  {cmd.shortcut && (
                    <span style={{
                      fontSize: "12px",
                      marginRight: "8px",
                      color: "var(--text-tertiary)",
                      backgroundColor: "var(--bg-tertiary)",
                      padding: "2px 6px",
                      borderRadius: "4px"
                    }}>
                      {cmd.shortcut}
                    </span>
                  )}
                  <span className="badge badge-info" style={{ fontSize: "11px", opacity: 0.8 }}>
                    {cmd.type}
                  </span>
                </div>
              );
            })
          )}
        </div>

        <div style={{ padding: "8px 16px", borderTop: "1px solid var(--glass-border)", display: "flex", justifyContent: "flex-end", gap: "16px", color: "var(--text-tertiary)" }} className="caption">
          <span><kbd style={{ fontFamily: "inherit", background: "var(--bg-tertiary)", padding: "2px 6px", borderRadius: "4px" }}>↑↓</kbd> to navigate</span>
          <span><kbd style={{ fontFamily: "inherit", background: "var(--bg-tertiary)", padding: "2px 6px", borderRadius: "4px" }}>↵</kbd> to select</span>
          <span><kbd style={{ fontFamily: "inherit", background: "var(--bg-tertiary)", padding: "2px 6px", borderRadius: "4px" }}>esc</kbd> to close</span>
        </div>
      </div>
    </div>
  );
}
