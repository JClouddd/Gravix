'use client';

import React, { useState } from 'react';
import TasksView from './Tasks/TasksView';
import ProjectsView from './Projects/ProjectsView';
import TagsView from './Tags/TagsView';
import CalendarView from './Calendar/CalendarView';
import ReportsView from './Reports/ReportsView';
import ContactsView from './Contacts/ContactsView';
import MeetingsView from './Meetings/MeetingsView';
import ApprovalQueueView from './Swarm/ApprovalQueueView';
import HelpTooltip from "@/components/HelpTooltip";

export default function ManagementDashboard() {
  const [activeTab, setActiveTab] = useState('calendar');

  const tabs = [
    { id: 'calendar', label: 'Calendar', icon: '📅' },
    { id: 'tasks', label: 'Tasks', icon: '✅' },
    { id: 'projects', label: 'Projects', icon: '📂' },
    { id: 'contacts', label: 'Contacts', icon: '👥' },
    { id: 'meetings', label: 'Meetings', icon: '🎙️' },
    { id: 'reports', label: 'Reports', icon: '📊' },
    { id: 'tags', label: 'Tags', icon: '🏷️' },
    { id: 'swarm', label: 'Swarm Queue', icon: '🐝' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="module-header">
        <div className="module-header-left">
          <div className="module-icon" style={{ background: "var(--accent-subtle)" }}>📋</div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h1 className="module-title">Management</h1>
              <HelpTooltip module="management" />
            </div>
            <p className="module-subtitle">Omni-Hub calendar, tasks, and project management</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`btn ${activeTab === tab.id ? "btn-primary" : "btn-secondary"}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {activeTab === 'calendar' && <CalendarView />}
        {activeTab === 'tasks' && <TasksView />}
        {activeTab === 'projects' && <ProjectsView />}
        { activeTab === 'contacts' && <ContactsView /> }
        { activeTab === 'meetings' && <MeetingsView /> }
        { activeTab === 'reports' && <ReportsView /> }
        { activeTab === 'tags' && <TagsView /> }
        { activeTab === 'swarm' && <div style={{ padding: 20 }}><ApprovalQueueView /></div> }
      </div>
    </div>
  );
}
