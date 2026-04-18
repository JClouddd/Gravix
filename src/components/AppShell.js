"use client";

import { useState, useCallback, Suspense, lazy, useEffect, useRef } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import CommandPalette from "@/components/CommandPalette";
import InstallPrompt from "@/components/InstallPrompt";

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

  const [theme, setTheme] = useState("dark");
  const [isMobile, setIsMobile] = useState(false);
  const touchStartRef = useRef(null);
  const touchEndRef = useRef(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);

    const savedTheme = localStorage.getItem("gravix-theme");
    if (savedTheme) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    }

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("gravix-theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  }, [theme]);

  // Swipe gesture handlers
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    touchEndRef.current = null;
    touchStartRef.current = e.targetTouches[0].clientX;
  };

  const onTouchMove = (e) => {
    touchEndRef.current = e.targetTouches[0].clientX;
  };

  const onTouchEndHandler = () => {
    if (!touchStartRef.current || !touchEndRef.current) return;
    const distance = touchStartRef.current - touchEndRef.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe || isRightSwipe) {
      const currentIndex = MODULES.findIndex((m) => m.id === activeModule);
      if (isLeftSwipe && currentIndex < MODULES.length - 1) {
        handleModuleChange(MODULES[currentIndex + 1].id);
      }
      if (isRightSwipe && currentIndex > 0) {
        handleModuleChange(MODULES[currentIndex - 1].id);
      }
    }
  };


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
        {!isMobile && (
          <div className="sidebar-header">
            <div className="sidebar-logo">G</div>
            <span className="sidebar-title">Gravix</span>
          </div>
        )}

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
              {!isMobile && <span className="nav-label">{mod.label}</span>}
            </button>
          ))}
        </nav>

        {!isMobile && (
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
        )}
      </aside>

      {/* ── Main Content ─────────────────────────────────── */}
      <main
        className={`app-main ${collapsed ? "collapsed" : ""}`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEndHandler}
      >
        <InstallPrompt />

        {/* ── Top Bar (Mobile / Theme Toggle) ──────────────── */}
        <header style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: "12px",
          padding: "12px 20px",
          borderBottom: "1px solid var(--card-border)",
          background: "var(--bg-primary)"
        }}>
          <NotificationCenter />
          <button
            className="btn btn-icon btn-ghost"
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </header>

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
