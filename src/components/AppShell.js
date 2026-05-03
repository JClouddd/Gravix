"use client";

import { useState, useCallback, Suspense, lazy, useEffect, useRef } from "react";

import ErrorBoundary from "@/components/ErrorBoundary";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import CommandPalette from "@/components/CommandPalette";
import InstallPrompt from "@/components/InstallPrompt";
import NotificationCenter from "@/components/NotificationCenter";
import { registerShortcuts } from "@/lib/keyboardShortcuts";
import QuickActions from "@/components/QuickActions";
import PipelineToasts from "@/components/PipelineToasts";
import GravixCopilotWidget from "@/components/ui/GravixCopilotWidget";

/* ── Module Registry ─────────────────────────────────────────── */
const MODULES = [
  { id: "home", label: "Home", icon: "🏠", color: "var(--accent)" },
  { id: "youtube", label: "YouTube", icon: "▶️", color: "#ef4444" },
  { id: "agents", label: "Agents", icon: "🤖", color: "#a855f7" },
  { id: "knowledge", label: "Vault", icon: "🧠", color: "#10b981" },
  { id: "management", label: "Management", icon: "📋", color: "var(--accent)" },
  { id: "finance", label: "Finance", icon: "💰", color: "var(--agent-finance)" },
  { id: "architecture", label: "Ecosystem", icon: "🪐", color: "#00d4ff" },
  { id: "settings",  label: "Settings",  icon: "⚙️",  color: "var(--text-secondary)" },
];

/* ── Lazy Module Loading ─────────────────────────────────────── */
const moduleComponents = {
  home: lazy(() => import("@/components/modules/HomeModule")),
  youtube: lazy(() => import("@/components/modules/YouTubeModule")),
  agents: lazy(() => import("@/components/modules/AgentsModule")),
  knowledge: lazy(() => import("@/components/modules/KnowledgeModule")),
  management: lazy(() => import("@/components/modules/ManagementModule/ManagementDashboard")),
  finance: lazy(() => import("@/components/modules/FinanceModule")),
  architecture: lazy(() => import("@/components/modules/ArchitectureModule")),
  settings:  lazy(() => import("@/components/modules/SettingsModule")),
};

/* ── AppShell Component ──────────────────────────────────────── */
export default function AppShell() {
  const [activeModule, setActiveModule] = useState("home");
  const [collapsed, setCollapsed] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);

  const [theme, setTheme] = useState("dark");
  const [isMobile, setIsMobile] = useState(false);
  const [dynamicCSS, setDynamicCSS] = useState("");
  const touchStartRef = useRef(null);
  const touchEndRef = useRef(null);

  useEffect(() => {
    // Load dynamic UI matrix CSS from DESIGN.md
    fetch('/api/design/sync')
      .then(res => res.json())
      .then(data => {
        if (data.css) setDynamicCSS(data.css);
      })
      .catch(err => console.error("Failed to load design css:", err));
  }, []);

  const handleModuleChange = useCallback((id) => {
    setActiveModule(id);
  }, []);

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

  useEffect(() => {
    const handleAction = (action) => {
      console.log("Keyboard action triggered:", action);
      if (action === "new") {
        console.log("Trigger context sensitive new action for module:", activeModule);
      } else if (action === "help") {
        console.log("Toggle help triggered");
      } else if (action === "gemini") {
        console.log("Toggle Gemini widget triggered");
      }
    };

    const cleanupShortcuts = registerShortcuts(handleModuleChange, handleAction);
    return cleanupShortcuts;
  }, [activeModule, handleModuleChange]);

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

  const ActiveComponent = moduleComponents[activeModule];
  const activeConfig = MODULES.find((m) => m.id === activeModule);

  return (
    <div className="app-shell bg-gradient-premium">
      {dynamicCSS && <style dangerouslySetInnerHTML={{ __html: dynamicCSS }} />}
      <PipelineToasts />
      <CommandPalette setActiveModule={handleModuleChange} />

      {/* ── Sidebar ──────────────────────────────────────── */}
      <aside className={`sidebar card-glass ${collapsed ? "collapsed" : ""}`} style={{ borderRadius: 0, borderTop: 'none', borderBottom: 'none', borderLeft: 'none' }}>
        {!isMobile && (
          <div className="sidebar-header">
            <div className="sidebar-logo text-gradient" style={{ background: 'linear-gradient(to right, #00d4ff, var(--accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>G</div>
            <span className="sidebar-title text-gradient" style={{ fontWeight: 800 }}>Gravix</span>
          </div>
        )}

        <nav className="sidebar-nav" role="navigation" aria-label="Main navigation">
          {MODULES.map((mod) => {
            const isActive = activeModule === mod.id;
            return (
              <button
                key={mod.id}
                id={`nav-${mod.id}`}
                className={`nav-item ${isActive ? "active" : ""}`}
                onClick={() => handleModuleChange(mod.id)}
                title={mod.label}
                aria-current={isActive ? "page" : undefined}
                style={isActive ? {
                  background: `color-mix(in srgb, ${mod.color} 15%, transparent)`,
                  color: mod.color,
                  boxShadow: `inset 3px 0 0 ${mod.color}`
                } : {}}
              >
                <span className="nav-icon" style={isActive ? { textShadow: `0 0 10px ${mod.color}` } : {}}>{mod.icon}</span>
                {!isMobile && <span className="nav-label" style={isActive ? { fontWeight: 600 } : {}}>{mod.label}</span>}
              </button>
            );
          })}
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
        <QuickActions activeModule={activeModule} setActiveModule={handleModuleChange} />

        {/* ── Top Bar (Mobile / Theme Toggle) ──────────────── */}
        <header className="card-glass" style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: "12px",
          padding: "12px 20px",
          borderRadius: 0,
          borderTop: 'none',
          borderLeft: 'none',
          borderRight: 'none',
          position: 'sticky',
          top: 0,
          zIndex: 'var(--z-header)'
        }}>
          {/* Ask Gemini / Copilot Toggle Button */}
          <button
            onClick={() => setCopilotOpen(!copilotOpen)}
            className={`btn btn-icon btn-ghost ${copilotOpen ? 'text-indigo-400 bg-white/5' : 'text-gray-400 hover:text-white'}`}
            title="Ask Gemini"
            aria-label="Toggle Copilot"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
          </button>
          
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
              <ActiveComponent setActiveModule={handleModuleChange} />
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>
      
      {/* Render Copilot Widget as a sibling side-column */}
      <GravixCopilotWidget isOpen={copilotOpen} setIsOpen={setCopilotOpen} />
    </div>
  );
}
