"use client";

import { useState, useCallback, Suspense, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

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
  { id: "home", path: "/", label: "Home", icon: "🏠", color: "var(--accent)" },
  { id: "youtube", path: "/youtube", label: "YouTube", icon: "▶️", color: "#ef4444" },
  { id: "agents", path: "/agents", label: "Agents", icon: "🤖", color: "#a855f7" },
  { id: "knowledge", path: "/knowledge", label: "Vault", icon: "🧠", color: "#10b981" },
  { id: "management", path: "/management", label: "Management", icon: "📋", color: "var(--accent)" },
  { id: "finance", path: "/finance", label: "Finance", icon: "💰", color: "var(--agent-finance)" },
  { id: "architecture", path: "/architecture", label: "Ecosystem", icon: "🪐", color: "#00d4ff" },
  { id: "settings", path: "/settings", label: "Settings",  icon: "⚙️",  color: "var(--text-secondary)" },
];


/* ── AppShell Component ──────────────────────────────────────── */
export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  const getActiveModule = () => {
    if (pathname === "/") return "home";
    const mod = pathname.split("/")[1];
    return mod || "home";
  };

  const activeModule = getActiveModule();
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
    const targetModule = MODULES.find((m) => m.id === id);
    if (targetModule) {
      router.push(targetModule.path);
    }
  }, [router]);

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

  const activeConfig = MODULES.find((m) => m.id === activeModule);

  return (
    <div className="app-shell flex flex-col h-screen bg-gradient-premium overflow-hidden">
      {dynamicCSS && <style dangerouslySetInnerHTML={{ __html: dynamicCSS }} />}
      <PipelineToasts />
      <CommandPalette />

      {/* ── Global Top Navigation Bar ──────────────────────── */}
      <header className="card-glass" style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 20px",
        borderRadius: 0,
        borderTop: 'none',
        borderLeft: 'none',
        borderRight: 'none',
        zIndex: 'var(--z-header)'
      }}>
        <div className="flex items-center gap-3">
          <div className="sidebar-logo text-gradient" style={{ background: 'linear-gradient(to right, #00d4ff, var(--accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}>G</div>
          {!isMobile && <span className="sidebar-title text-gradient" style={{ fontWeight: 800, fontSize: '1.2rem' }}>Gravix</span>}
        </div>
        
        <div className="flex items-center gap-4">
          <NotificationCenter />
          <button
            className="btn btn-icon btn-ghost"
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>
      </header>

      {/* ── Main Workspace Area ────────────────────────────── */}
      <div className="flex-1 flex flex-row overflow-hidden relative">
        {/* ── Sidebar ──────────────────────────────────────── */}
        <aside className={`sidebar card-glass ${collapsed ? "collapsed" : ""}`} style={{ borderRadius: 0, borderTop: 'none', borderBottom: 'none', borderLeft: 'none' }}>

        <nav className="sidebar-nav" role="navigation" aria-label="Main navigation">
          {MODULES.map((mod) => {
            const isActive = activeModule === mod.id;
            return (
              <Link
                key={mod.id}
                href={mod.path}
                id={`nav-${mod.id}`}
                className={`nav-item ${isActive ? "active" : ""}`}
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
              </Link>
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
          className={`app-main ${collapsed ? "collapsed" : ""} flex-1 flex flex-col relative`}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEndHandler}
        >
          <InstallPrompt />
          <QuickActions activeModule={activeModule} />

        <div className="module-container">
          <ErrorBoundary name={activeConfig?.label} key={activeModule}>
            <Suspense fallback={<LoadingSkeleton rows={4} cards={3} />}>
              {children}
            </Suspense>
          </ErrorBoundary>
        </div>
        </main>
        
        {/* Render Copilot Widget as a sibling side-column */}
        <GravixCopilotWidget isOpen={copilotOpen} setIsOpen={setCopilotOpen} />
      </div>

      {/* Floating Copilot Toggle Button */}
      {!copilotOpen && (
        <button
          onClick={() => setCopilotOpen(true)}
          className="fixed bottom-6 right-6 p-4 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all duration-300 z-50 transform hover:scale-110 flex items-center justify-center"
          aria-label="Open Copilot"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
          </svg>
        </button>
      )}
    </div>
  );
}
