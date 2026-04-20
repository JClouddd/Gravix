'use client';

import React, { useState, useEffect } from 'react';

export function GearButton({ onClick, style }) {
  return (
    <button
      onClick={onClick}
      className="button"
      style={{
        background: 'transparent',
        border: '1px solid var(--card-border)',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        fontSize: '18px',
        padding: '6px 10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '4px',
        transition: 'all var(--duration-fast) var(--ease-out)',
        ...style
      }}
      title="Settings"
    >
      ⚙️
    </button>
  );
}

export default function ModuleSettingsPanel({ moduleId, title, settings, isOpen, onClose, onSave, onReset }) {
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

  const panelWrapperStyle = {
    overflow: 'hidden',
    transition: 'max-height 0.3s ease, opacity 0.3s ease, margin 0.3s ease',
    maxHeight: isOpen ? '1000px' : '0',
    opacity: isOpen ? 1 : 0,
    marginTop: isOpen ? '16px' : '0',
    marginBottom: isOpen ? '16px' : '0',
  };

  const panelStyle = {
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    padding: '20px',
    borderRadius: '8px',
    fontFamily: 'sans-serif',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    border: '1px solid var(--card-border)',
    position: 'relative'
  };

  const titleStyle = {
    margin: '0 0 10px 0',
    color: 'var(--text-primary)',
    borderBottom: '1px solid var(--card-border)',
    paddingBottom: '10px',
    fontSize: '16px',
    fontWeight: '600'
  };

  const closeButtonStyle = {
    position: 'absolute',
    top: '16px',
    right: '16px',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px'
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
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--card-border)',
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
    borderTop: '1px solid var(--card-border)'
  };

  const saveButtonStyle = {
    backgroundColor: 'var(--accent)',
    color: '#fff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '600'
  };

  const resetButtonStyle = {
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--card-border)',
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
              style={{ accentColor: 'var(--accent)', width: '18px', height: '18px' }}
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
    <div style={panelWrapperStyle}>
      <div style={panelStyle} id={`settings-panel-${moduleId || 'default'}`}>
        {onClose && (
          <button style={closeButtonStyle} onClick={onClose} aria-label="Close settings">
            ✕
          </button>
        )}

        {title && <h3 style={titleStyle}>{title}</h3>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {settings && Array.isArray(settings) && settings.length > 0 ? (
            settings.map(renderField)
          ) : (
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No settings available for this module.</p>
          )}
        </div>

        <div style={buttonContainerStyle}>
          <button type="button" onClick={handleReset} style={resetButtonStyle}>Reset to Defaults</button>
          <button type="button" onClick={handleSave} style={saveButtonStyle}>Save</button>
        </div>
      </div>
    </div>
  );
}
