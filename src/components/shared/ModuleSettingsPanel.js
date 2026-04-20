'use client';

import React, { useState, useEffect } from 'react';

export default function ModuleSettingsPanel({ moduleId, title, settings, onSave, onReset }) {
  const [localSettings, setLocalSettings] = useState({});

  useEffect(() => {
    const initialSettings = {};
    if (settings && Array.isArray(settings)) {
      settings.forEach(s => {
        initialSettings[s.key] = s.value;
      });
    }
    Promise.resolve().then(() => {
      setLocalSettings(initialSettings);
    });
  }, [settings]);

  const handleChange = (key, value) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (onSave) {
      onSave(localSettings);
    }
  };

  const handleReset = () => {
    if (onReset) {
      onReset();
    } else {
      // Default reset behavior if onReset is not provided
      const initialSettings = {};
      if (settings && Array.isArray(settings)) {
        settings.forEach(s => {
          initialSettings[s.key] = s.value;
        });
      }
      setLocalSettings(initialSettings);
    }
  };

  const panelStyle = {
    backgroundColor: '#1a1a2e',
    color: '#e0e0e0',
    padding: '20px',
    borderRadius: '8px',
    fontFamily: 'sans-serif',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    border: '1px solid #333'
  };

  const titleStyle = {
    margin: '0 0 10px 0',
    color: '#00d4ff',
    borderBottom: '1px solid #333',
    paddingBottom: '10px'
  };

  const fieldStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  };

  const labelStyle = {
    fontWeight: 'bold',
    fontSize: '14px'
  };

  const inputStyle = {
    backgroundColor: '#0f0f1a',
    color: '#e0e0e0',
    border: '1px solid #333',
    padding: '8px',
    borderRadius: '4px',
    outline: 'none'
  };

  const buttonContainerStyle = {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '10px',
    paddingTop: '15px',
    borderTop: '1px solid #333'
  };

  const saveButtonStyle = {
    backgroundColor: '#00d4ff',
    color: '#1a1a2e',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold'
  };

  const resetButtonStyle = {
    backgroundColor: '#333',
    color: '#e0e0e0',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer'
  };

  const renderField = (setting) => {
    const { key, label, type, options } = setting;
    const currentValue = localSettings[key] !== undefined ? localSettings[key] : '';

    switch (type) {
      case 'toggle':
        return (
          <div key={key} style={{ ...fieldStyle, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={labelStyle}>{label}</label>
            <input
              type="checkbox"
              checked={!!currentValue}
              onChange={(e) => handleChange(key, e.target.checked)}
              style={{ accentColor: '#00d4ff', width: '18px', height: '18px' }}
            />
          </div>
        );
      case 'select':
        return (
          <div key={key} style={fieldStyle}>
            <label style={labelStyle}>{label}</label>
            <select
              value={currentValue}
              onChange={(e) => handleChange(key, e.target.value)}
              style={inputStyle}
            >
              {options && options.map((opt, i) => (
                <option key={i} value={opt.value || opt}>{opt.label || opt}</option>
              ))}
            </select>
          </div>
        );
      case 'text':
      case 'number':
        return (
          <div key={key} style={fieldStyle}>
            <label style={labelStyle}>{label}</label>
            <input
              type={type}
              value={currentValue}
              onChange={(e) => handleChange(key, type === 'number' ? Number(e.target.value) : e.target.value)}
              style={inputStyle}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div style={panelStyle} id={`settings-panel-${moduleId || 'default'}`}>
      {title && <h3 style={titleStyle}>{title}</h3>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {settings && Array.isArray(settings) ? (
          settings.map(renderField)
        ) : (
          <p>No settings available.</p>
        )}
      </div>

      <div style={buttonContainerStyle}>
        <button type="button" onClick={handleReset} style={resetButtonStyle}>Reset to Defaults</button>
        <button type="button" onClick={handleSave} style={saveButtonStyle}>Save</button>
      </div>
    </div>
  );
}
