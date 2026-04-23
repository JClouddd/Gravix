"use client";

import React from "react";
import { motion } from "framer-motion";

export default function VisualCommandCenter() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="card-glass bg-gradient-premium module-container"
    >
      <div className="module-header">
        <div className="module-header-left">
          <div className="module-icon text-gradient">
            {/* Simple SVG icon representing a command center or hub */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="9" y1="21" x2="9" y2="9"></line>
            </svg>
          </div>
          <div>
            <h1 className="module-title text-gradient">Visual Command Center</h1>
            <p className="module-subtitle">Antigravity Hub 3.0</p>
          </div>
        </div>
      </div>

      <div className="grid-3">
        <div className="card">
          <h2 className="h4">System Status</h2>
          <p className="body-sm text-secondary mt-2">All systems operational.</p>
        </div>
        <div className="card">
          <h2 className="h4">Active Agents</h2>
          <p className="body-sm text-secondary mt-2">7 agents online.</p>
        </div>
        <div className="card">
          <h2 className="h4">Telemetry</h2>
          <p className="body-sm text-secondary mt-2">Data streams nominal.</p>
        </div>
      </div>
    </motion.div>
  );
}
