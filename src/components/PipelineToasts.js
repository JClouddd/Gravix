"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * PipelineToasts — Global toast notification system for the Pipeline Monitor.
 * Polls /api/jules/review and /api/jules/ci-status every 60s.
 * Shows toast alerts for task completions, failures, and CI regressions.
 */

const POLL_INTERVAL = 60_000; // 60 seconds
const TOAST_DURATION = 8_000; // 8 seconds before auto-dismiss
const MAX_TOASTS = 5;

export default function PipelineToasts() {
  const [toasts, setToasts] = useState([]);
  const prevStateRef = useRef(null);
  const prevCiRef = useRef(null);

  const addToast = useCallback((toast) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newToast = { id, ...toast, createdAt: Date.now() };

    setToasts((prev) => {
      const updated = [newToast, ...prev].slice(0, MAX_TOASTS);
      return updated;
    });

    // Auto-dismiss after TOAST_DURATION
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_DURATION);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Poll for Jules task state changes + CI status
  useEffect(() => {
    async function poll() {
      try {
        // Fetch Jules review data
        const reviewRes = await fetch("/api/jules/review");
        if (reviewRes.ok) {
          const data = await reviewRes.json();
          const current = data.summary || {};
          const prev = prevStateRef.current;

          if (prev) {
            // Detect newly completed tasks
            if (current.completed > prev.completed) {
              const count = current.completed - prev.completed;
              addToast({
                type: "success",
                icon: "✅",
                title: `${count} task${count > 1 ? "s" : ""} completed`,
                message: "Jules finished coding. Check the Task Board.",
              });
            }

            // Detect newly failed tasks
            if (current.failed > prev.failed) {
              const count = current.failed - prev.failed;
              addToast({
                type: "error",
                icon: "❌",
                title: `${count} task${count > 1 ? "s" : ""} failed`,
                message: "A Jules session failed. Review needed.",
              });
            }

            // Detect tasks needing review
            if (current.needsReview > prev.needsReview) {
              addToast({
                type: "warning",
                icon: "🔔",
                title: "Task needs review",
                message: "A Jules PR is waiting for your approval.",
              });
            }
          }

          prevStateRef.current = current;
        }
      } catch {
        // Silently ignore review fetch errors
      }

      try {
        // Fetch CI status
        const ciRes = await fetch("/api/jules/ci-status");
        if (ciRes.ok) {
          const ci = await ciRes.json();
          const prev = prevCiRef.current;

          if (prev && ci.main) {
            // Detect CI regression (was passing, now failing)
            const wasGreen =
              prev.main?.conclusion === "success" || !prev.main;
            const nowRed = ci.main.conclusion === "failure";

            if (wasGreen && nowRed) {
              addToast({
                type: "error",
                icon: "🔴",
                title: "CI failed on main",
                message: `Commit ${ci.main.sha?.slice(0, 7)} broke the build.`,
                action: ci.main.url,
              });
            }

            // Detect CI recovery (was failing, now passing)
            const wasRed = prev.main?.conclusion === "failure";
            const nowGreen = ci.main.conclusion === "success";

            if (wasRed && nowGreen) {
              addToast({
                type: "success",
                icon: "🟢",
                title: "CI is green again",
                message: "Main branch build is passing.",
              });
            }
          }

          // Detect new failing PR runs
          if (ci.failingPrRuns?.length > 0 && prev) {
            const prevShas = new Set(
              (prev.failingPrRuns || []).map((r) => r.sha)
            );
            const newFailures = ci.failingPrRuns.filter(
              (r) => !prevShas.has(r.sha)
            );

            for (const fail of newFailures.slice(0, 2)) {
              addToast({
                type: "warning",
                icon: "⚠️",
                title: `PR CI failed: ${fail.branch}`,
                message: `Commit ${fail.sha?.slice(0, 7)} on branch ${fail.branch}`,
                action: fail.url,
              });
            }
          }

          prevCiRef.current = ci;
        }
      } catch {
        // Silently ignore CI fetch errors
      }
    }

    // Initial poll after 5 seconds (let main render stabilize)
    const initialTimeout = setTimeout(poll, 5000);
    const interval = setInterval(poll, POLL_INTERVAL);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="pipeline-toast-container" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pipeline-toast pipeline-toast--${toast.type}`}
          onClick={() => {
            if (toast.action) {
              window.open(toast.action, "_blank", "noopener");
            }
            dismissToast(toast.id);
          }}
        >
          <span className="pipeline-toast__icon">{toast.icon}</span>
          <div className="pipeline-toast__content">
            <div className="pipeline-toast__title">{toast.title}</div>
            <div className="pipeline-toast__message">{toast.message}</div>
          </div>
          <button
            className="pipeline-toast__close"
            onClick={(e) => {
              e.stopPropagation();
              dismissToast(toast.id);
            }}
            aria-label="Dismiss"
          >
            ×
          </button>
          <div
            className="pipeline-toast__progress"
            style={{ animationDuration: `${TOAST_DURATION}ms` }}
          />
        </div>
      ))}

      <style jsx>{`
        .pipeline-toast-container {
          position: fixed;
          top: 16px;
          right: 16px;
          z-index: 10000;
          display: flex;
          flex-direction: column;
          gap: 8px;
          pointer-events: none;
          max-width: 380px;
        }

        .pipeline-toast {
          pointer-events: all;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 12px;
          background: rgba(30, 30, 40, 0.95);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4),
            0 0 0 1px rgba(255, 255, 255, 0.04);
          cursor: pointer;
          position: relative;
          overflow: hidden;
          animation: toastSlideIn 0.3s cubic-bezier(0.22, 1, 0.36, 1);
          transition: transform 0.2s, opacity 0.2s;
        }

        .pipeline-toast:hover {
          transform: translateX(-4px);
          background: rgba(35, 35, 48, 0.98);
        }

        .pipeline-toast--success {
          border-left: 3px solid #34c759;
        }
        .pipeline-toast--error {
          border-left: 3px solid #ff3b30;
        }
        .pipeline-toast--warning {
          border-left: 3px solid #ff9500;
        }
        .pipeline-toast--info {
          border-left: 3px solid #007aff;
        }

        .pipeline-toast__icon {
          font-size: 18px;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .pipeline-toast__content {
          flex: 1;
          min-width: 0;
        }

        .pipeline-toast__title {
          font-size: 13px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.95);
          margin-bottom: 2px;
        }

        .pipeline-toast__message {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.55);
          line-height: 1.4;
        }

        .pipeline-toast__close {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.35);
          font-size: 18px;
          cursor: pointer;
          padding: 0 2px;
          line-height: 1;
          flex-shrink: 0;
          transition: color 0.15s;
        }
        .pipeline-toast__close:hover {
          color: rgba(255, 255, 255, 0.8);
        }

        .pipeline-toast__progress {
          position: absolute;
          bottom: 0;
          left: 0;
          height: 2px;
          background: currentColor;
          animation: toastProgress linear forwards;
        }

        .pipeline-toast--success .pipeline-toast__progress {
          background: #34c759;
        }
        .pipeline-toast--error .pipeline-toast__progress {
          background: #ff3b30;
        }
        .pipeline-toast--warning .pipeline-toast__progress {
          background: #ff9500;
        }

        @keyframes toastSlideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes toastProgress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}
