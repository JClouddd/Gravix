"use client";

import { useState, useCallback, Suspense, lazy } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import CommandPalette from "@/components/CommandPalette";

/* ── Module Registry ─────────────────────────────────────────── */
const MODULES = [
  { id: "home",      label: "Home",      icon: "🏠", color: "var(--accent)" },
  { id: "planner",   label: "Planner",   icon: "📅", color: "var(--agent-courier)" },
  { id: "email",     label: "Email",     icon: "✉️",  color: "var(--agent-courier)" },
  { id: "agents",    label: "Agents",    icon: "🤖", color: "var(--agent-conductor)" },
  { id: "knowledge", label: "Knowledge", icon: "🧠", color: "var(--agent-scholar)" },
  { id: "clients",   label: "Clients",   icon: "👥", color: "var(--agent-builder)" },
  { id: "finance",   label: "Finance",   icon: "💰", color: "var(--success)" },
  { id: "colab",     label: "Colab",     icon: "📊", color: "var(--agent-analyst)" },
  { id: "settings",  label: "Settings",  icon: "⚙️",  color: "var(--text-secondary)" },
];

/* ── Lazy Module Loading ─────────────────────────────────────── */
const moduleComponents = {
  home:      lazy(() => import("@/components/modules/HomeModule")),
  planner:   lazy(() => import("@/components/modules/PlannerModule")),
  email:     lazy(() => import("@/components/modules/EmailModule")),
  agents:    lazy(() => import("@/components/modules/AgentsModule")),
  knowledge: lazy(() => import("@/components/modules/KnowledgeModule")),
  clients:   lazy(() => import("@/components/modules/ClientsModule")),
  finance:   lazy(() => import("@/components/modules/FinanceModule")),
  colab:     lazy(() => import("@/components/modules/ColabModule")),
  settings:  lazy(() => import("@/components/modules/SettingsModule")),
};

/* ── AppShell Component ──────────────────────────────────────── */
export default function AppShell() {
  const [activeModule, setActiveModule] = useState("home");
  const [collapsed, setCollapsed] = useState(false);

  const handleModuleChange = useCallback((id) => {
    setActiveModule(id);
  }, []);

  const ActiveComponent = moduleComponents[activeModule];
  const activeConfig = MODULES.find((m) => m.id === activeModule);

  return (
    <div className="app-shell">
      <CommandPalette setActiveModule={handleModuleChange} />

      {/* ── Sidebar ──────────────────────────────────────── */}
      <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">G</div>
          <span className="sidebar-title">Gravix</span>
        </div>

        <nav className="sidebar-nav" role="navigation" aria-label="Main navigation">
          {MODULES.map((mod) => (
            <button
              key={mod.id}
              id={`nav-${mod.id}`}
              className={`nav-item ${activeModule === mod.id ? "active" : ""}`}
              onClick={() => handleModuleChange(mod.id)}
              title={mod.label}
              aria-current={activeModule === mod.id ? "page" : undefined}
            >
              <span className="nav-icon">{mod.icon}</span>
              <span className="nav-label">{mod.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button
            className="sidebar-toggle"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? "→" : "←"}
          </button>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────── */}
      <main className={`app-main ${collapsed ? "collapsed" : ""}`}>
        <div className="module-container">
          <ErrorBoundary name={activeConfig?.label} key={activeModule}>
            <Suspense fallback={<LoadingSkeleton rows={4} cards={3} />}>
              <ActiveComponent />
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
