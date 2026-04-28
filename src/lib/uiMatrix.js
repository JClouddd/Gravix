/**
 * Predictive UI/UX Build Matrix
 * Powered by Omni-Vault Intelligence
 * 
 * This system defines the global rules for UI components, animations, and constraints
 * dynamically adjusting based on the state of the system and knowledge tags.
 */

export const UI_MATRIX = {
  // Constraint-Based Scheduling Rules
  scheduling: {
    splittableTasks: true,
    smartColors: {
      urgent: "var(--error)",
      highPriority: "var(--warning)",
      standard: "var(--info)",
      lowPriority: "var(--success-subtle)",
      blocked: "var(--text-tertiary)"
    },
    // AI determines if a task overlaps and splits it into child tasks visually
    autoSplitThresholdHours: 4, 
    snapToGridMinutes: 15
  },

  // Knowledge Matrix - Visual Alignment
  knowledge: {
    tagColors: {
      architecture: "var(--info)",
      pipelines: "var(--warning)",
      uiux: "var(--accent)",
      finance: "var(--success)"
    },
    notebookStyles: {
      borderThickness: "2px",
      activeShadow: "0 8px 30px rgba(var(--accent-rgb), 0.2)",
      defaultShadow: "0 4px 12px rgba(0,0,0,0.1)"
    }
  },

  // Ingestion Pipeline - Visual Alignment
  ingestion: {
    statusColors: {
      queued: "var(--text-tertiary)",
      processing: "var(--warning)",
      vectorizing: "var(--info)",
      completed: "var(--success)",
      failed: "var(--error)"
    },
    progressBars: {
      animated: true,
      pulseOnActive: true,
      thickness: "8px"
    }
  },

  // Global Telemetry & Orchestration Visuals
  telemetry: {
    nodeAnimations: {
      active: "pulse 2s infinite",
      idle: "none",
      error: "shake 0.5s infinite"
    },
    linkStyles: {
      active: "2px solid var(--accent)",
      idle: "1px dashed var(--card-border)"
    }
  }
};

/**
 * Helper to get the semantic color for a given context and key.
 */
export function getMatrixColor(context, key, fallback = "var(--text-primary)") {
  return UI_MATRIX[context]?.[key] || fallback;
}

/**
 * Get dynamic CSS variables string for injection based on Matrix
 */
export function generateMatrixCSS() {
  return `
    :root {
      --matrix-urgent: ${UI_MATRIX.scheduling.smartColors.urgent};
      --matrix-pipeline-active: ${UI_MATRIX.ingestion.statusColors.processing};
      --matrix-node-pulse: ${UI_MATRIX.telemetry.nodeAnimations.active};
    }
  `;
}
