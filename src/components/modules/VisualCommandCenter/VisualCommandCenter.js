'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function VisualCommandCenter() {
  const [activeOverlay, setActiveOverlay] = useState(null);
  const [systemStatus, setSystemStatus] = useState('Online');
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    // Simulated SSE connection for Live Overlays
    const interval = setInterval(() => {
      if (Math.random() > 0.8) {
        setAlerts(prev => [...prev, { id: Date.now(), msg: 'New Agent Activity Detected', time: new Date().toLocaleTimeString() }].slice(-5));
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-full flex flex-col gap-lg" style={{ padding: "8px 24px 24px 24px", overflowY: "auto" }}>
      <div className="card-glass flex items-center justify-between" style={{ padding: "16px 24px" }}>
        <div className="flex items-center gap-md">
          <div className="module-icon" style={{ background: "var(--accent-glow)", color: "var(--accent)", width: 48, height: 48, fontSize: 24 }}>
            🎛️
          </div>
          <div>
            <h2 className="h2 text-gradient" style={{ backgroundImage: "linear-gradient(to right, #00d4ff, #a855f7)" }}>Visual Command Center</h2>
            <p className="caption">Live SSE Overlays & Node Flows</p>
          </div>
        </div>
        <div className="flex gap-4 items-center">
            <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-sm text-green-400">{systemStatus}</span>
            </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Kanban Integration Panel */}
        <motion.div
            whileHover={{ y: -5 }}
            className="card-glass relative overflow-hidden group cursor-pointer"
            onClick={() => setActiveOverlay('kanban')}
        >
             <h3 className="h3 text-white relative z-10 mb-2">Interactive Kanban</h3>
             <p className="caption text-text-secondary relative z-10">Manage flow states and task lifecycles</p>
             <div className="mt-4 flex gap-2" style={{ display: 'flex', gap: '8px' }}>
                 <div className="flex-1 h-20 bg-white/5 rounded-md border border-white/10 flex items-center justify-center text-xs text-white/40" style={{ flex: 1, height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>To Do</div>
                 <div className="flex-1 h-20 bg-white/5 rounded-md border border-white/10 flex items-center justify-center text-xs text-white/40" style={{ flex: 1, height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>In Progress</div>
                 <div className="flex-1 h-20 bg-white/5 rounded-md border border-white/10 flex items-center justify-center text-xs text-white/40" style={{ flex: 1, height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>Done</div>
             </div>
                 <div className="flex-1 h-20 bg-white/5 rounded-md border border-white/10 flex items-center justify-center text-xs text-white/40">In Progress</div>
                 <div className="flex-1 h-20 bg-white/5 rounded-md border border-white/10 flex items-center justify-center text-xs text-white/40">Done</div>
             </div>
        </motion.div>

        {/* Node Flows Panel */}
        <motion.div
             whileHover={{ y: -5 }}
             className="card-glass relative overflow-hidden group cursor-pointer"
             onClick={() => setActiveOverlay('nodes')}
        >
             <h3 className="h3 text-white relative z-10 mb-2">Node Flows</h3>
             <p className="caption text-text-secondary relative z-10">Visual routing and agent connections</p>
             <div className="mt-4 h-20 flex items-center justify-center relative" style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500 flex items-center justify-center text-xs z-10" style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(59,130,246,0.2)', border: '1px solid #3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>A</div>
                 <div className="w-16 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 mx-2" style={{ width: '64px', height: '2px', background: 'linear-gradient(to right, #3b82f6, #a855f7)', margin: '0 8px' }}></div>
                 <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500 flex items-center justify-center text-xs z-10" style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(168,85,247,0.2)', border: '1px solid #a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>B</div>
             </div>
                 <div className="w-16 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 mx-2"></div>
                 <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500 flex items-center justify-center text-xs z-10">B</div>
             </div>
        </motion.div>

        {/* Live Alerts Panel */}
        <motion.div
             className="card-glass relative overflow-hidden"
        >
             <h3 className="h3 text-white relative z-10 mb-2">Live Telemetry</h3>
             <div className="flex flex-col gap-2 mt-4 max-h-32 overflow-y-auto">
                 <AnimatePresence>
                    {alerts.length === 0 ? (
                        <div className="text-xs text-white/30 text-center py-4">Waiting for signals...</div>
                    ) : (
                        alerts.map(alert => (
                            <motion.div
                                key={alert.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0 }}
                                className="text-xs bg-white/5 p-2 rounded border border-white/10 flex justify-between"
                            >
                                <span className="text-blue-300">{alert.msg}</span>
                                <span className="text-white/40">{alert.time}</span>
                            </motion.div>
                        ))
                    )}
                 </AnimatePresence>
             </div>
        </motion.div>
      </div>

      {/* Expanded Overlay Area */}
      <AnimatePresence>
        {activeOverlay && (
            <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 card-glass border-accent/30 relative overflow-hidden min-h-[400px] flex flex-col"
            >
                <div className="flex justify-between items-center p-4 border-b border-white/10">
                    <h3 className="h3 text-white">
                        {activeOverlay === 'kanban' ? 'Interactive Kanban View' : 'Agent Node Flow Configuration'}
                    </h3>
                    <button
                        onClick={() => setActiveOverlay(null)}
                        className="btn-icon w-8 h-8 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center"
                    >
                        ✕
                    </button>
                </div>
                <div className="flex-1 p-6 flex items-center justify-center">
                    {activeOverlay === 'kanban' ? (
                        <div className="text-center text-white/50">
                            <div className="text-4xl mb-4">📋</div>
                            <p>Kanban Board initialized via Stitch UI Framework.</p>
                            <p className="text-xs mt-2 text-white/30">(Drag and drop features available in full release)</p>
                        </div>
                    ) : (
                        <div className="text-center text-white/50">
                            <div className="text-4xl mb-4">🔗</div>
                            <p>Node Connection canvas active.</p>
                            <p className="text-xs mt-2 text-white/30">(Visual graph routing system running)</p>
                        </div>
                    )}
                </div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
