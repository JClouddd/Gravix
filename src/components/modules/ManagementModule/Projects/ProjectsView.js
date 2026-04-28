'use client';

import React, { useState, useEffect } from 'react';
import WarRoomModal from './WarRoomModal';
import ProjectDetailsModal from './ProjectDetailsModal';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

export default function ProjectsView() {
  const [activeWarRoomPlan, setActiveWarRoomPlan] = useState(null);
  const [activeProject, setActiveProject] = useState(null);

  // State for Real-Time Telemetry
  const [projects, setProjects] = useState([
    { id: 1, title: 'Omni-Hub v2', description: 'Complete the autonomous architecture rewrite', progress: 78, color: 'var(--accent)' },
    { id: 2, title: 'Cinematic Pipeline', description: 'Automate video generation using Stitch UI', progress: 45, color: 'var(--agent-forge)' },
    { id: 3, title: 'Agent Framework', description: 'Implement multi-agent routing capabilities', progress: 92, color: 'var(--agent-scholar)' }
  ]);

  const [pendingPlans, setPendingPlans] = useState([
    { id: 101, title: 'BigQuery Data Lake Migration', aiModel: 'Vertex Swarm', tasks: 12, estDuration: '45m', status: 'Awaiting Authorization', color: 'var(--system-blue)' },
    { id: 102, title: 'Cinematic Pipeline Webhooks', aiModel: 'Jules Action', tasks: 4, estDuration: '12m', status: 'Awaiting Authorization', color: 'var(--system-warning)' }
  ]);

  useEffect(() => {
    // Listen to live 'projects' collection
    const unsubProjects = onSnapshot(collection(db, 'projects'), (snapshot) => {
      if (!snapshot.empty) {
        const liveProjects = [];
        snapshot.forEach(doc => liveProjects.push({ id: doc.id, ...doc.data() }));
        setProjects(liveProjects);
      }
    });

    // Listen to live 'ai_plans' collection
    const unsubPlans = onSnapshot(collection(db, 'ai_plans'), (snapshot) => {
      if (!snapshot.empty) {
        const livePlans = [];
        snapshot.forEach(doc => livePlans.push({ id: doc.id, ...doc.data() }));
        setPendingPlans(livePlans);
      }
    });

    return () => {
      unsubProjects();
      unsubPlans();
    };
  }, []);

  return (
    <div className="w-full h-full flex flex-col gap-lg" style={{ padding: "8px 24px 24px 24px", overflowY: "auto" }}>
      
      {/* Header Controls */}
      <div className="card-glass flex items-center justify-between" style={{ padding: "16px 24px" }}>
        <div className="flex items-center gap-md">
          <div className="module-icon" style={{ background: "var(--accent-glow)", color: "var(--accent)", width: 48, height: 48, fontSize: 24 }}>
            📂
          </div>
          <div>
            <h2 className="h2 text-gradient" style={{ backgroundImage: "linear-gradient(to right, #a855f7, #ec4899)" }}>Project Milestones</h2>
            <p className="caption">High-level containers for your task workflows</p>
          </div>
        </div>

        <button 
          className="btn btn-primary shadow-lg hover:shadow-xl transition-all"
          style={{ borderRadius: "var(--radius-xl)", padding: "0 24px", background: "linear-gradient(135deg, #a855f7, #ec4899)" }}
        >
          + New Project
        </button>
      </div>

      {/* The Approval Matrix (Pending AI Plans) */}
      <div className="flex flex-col gap-md mb-6">
        <h3 className="h3 text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          Approval Matrix <span className="caption text-blue-400">({pendingPlans.length} Pending AI Plans)</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendingPlans.map(plan => (
            <div key={plan.id} className="card-glass border-blue-500/30 flex flex-col gap-3 relative overflow-hidden" style={{ background: 'rgba(10, 20, 40, 0.4)' }}>
              {/* Scanline effect */}
              <div className="absolute inset-0 w-full h-[1px] bg-blue-500/20 shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-scanline"></div>
              
              <div className="flex justify-between items-start z-10">
                <div>
                  <h4 className="h4 text-blue-100">{plan.title}</h4>
                  <p className="caption text-blue-300/70">{plan.tasks} Sub-Tasks • Est: {plan.estDuration}</p>
                </div>
                <span className="badge" style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}>
                  {plan.aiModel}
                </span>
              </div>
              
              <div className="flex items-center justify-between mt-2 z-10 pt-3 border-t border-white/5">
                <span className="text-xs text-amber-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> {plan.status}
                </span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setActiveWarRoomPlan(plan)}
                    className="btn btn-icon w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors" 
                    title="Deep Dive War Room"
                  >
                    👁️
                  </button>
                  <button className="btn text-xs font-bold px-4 py-1.5 rounded-lg text-white shadow-[0_0_15px_rgba(59,130,246,0.4)] hover:shadow-[0_0_25px_rgba(59,130,246,0.6)] transition-all" style={{ background: 'linear-gradient(90deg, #2563eb, #3b82f6)' }}>
                    [Deploy Swarm]
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid-3 pb-10">
        {projects.map(project => (
          <div key={project.id} className="card-glass flex flex-col gap-sm relative overflow-hidden group cursor-pointer hover:-translate-y-1 transition-transform">
            
            {/* Subtle glow effect behind project */}
            <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" style={{ background: project.color }}></div>

            <div className="flex justify-between items-start relative z-10">
              <div>
                <h3 className="h3 text-white">{project.title}</h3>
                <p className="caption text-text-secondary mt-1">{project.description}</p>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setActiveProject(project); }}
                className="btn-icon w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors flex-shrink-0 ml-2" 
                title="View Details"
              >
                👁️
              </button>
            </div>
            
            <div className="mt-auto pt-4 flex flex-col gap-sm relative z-10">
              <div className="flex justify-between items-center text-xs font-medium text-gray-400">
                <span>Progress</span>
                <span>{project.progress}%</span>
              </div>
              <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden border border-white/10">
                <div 
                  className="h-full rounded-full" 
                  style={{ width: `${project.progress}%`, background: `linear-gradient(90deg, ${project.color}, #ffffff)` }}
                ></div>
              </div>
            </div>
          </div>
        ))}
        
        {/* Empty State / Add New Card */}
        <div className="card-glass flex flex-col items-center justify-center min-h-[160px] border-dashed cursor-pointer hover:bg-white/[0.05] transition-colors gap-2">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-xl mb-2 text-text-tertiary">
            +
          </div>
          <h4 className="h4 text-text-secondary">Create Project</h4>
        </div>
      </div>

      {/* Render War Room Modal */}
      {activeWarRoomPlan && (
        <WarRoomModal 
          plan={activeWarRoomPlan} 
          onClose={() => setActiveWarRoomPlan(null)} 
        />
      )}

      {/* Render Project Details Modal */}
      {activeProject && (
        <ProjectDetailsModal
          project={activeProject}
          onClose={() => setActiveProject(null)}
        />
      )}
    </div>
  );
}
