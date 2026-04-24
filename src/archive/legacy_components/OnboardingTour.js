"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const STEPS = [
  { target: 'body', title: 'Welcome', description: 'Welcome to Gravix - your AI operating system. Let me show you around.', position: 'center' },
  { target: '.sidebar-nav', title: 'Sidebar', description: 'Navigate between modules using the sidebar. Each module handles a different part of your workflow.', position: 'right' },
  { target: 'body', title: 'Gemini Widget', description: 'Chat with your AI assistant here. It routes your requests to the right agent automatically.', position: 'center' },
  { target: '#nav-agents', title: 'Agents', description: 'Your 7 AI agents work together. Conductor routes, Scholar researches, Courier handles comms.', position: 'right' },
  { target: '#nav-email', title: 'Email', description: 'Connected to Gmail. AI classifies, summarizes, and creates tasks from your inbox.', position: 'right' },
  { target: '#nav-knowledge', title: 'Knowledge', description: 'Your brain vault. Ingest docs, URLs, and files. Scholar searches everything.', position: 'right' },
  { target: 'body', title: 'Command Palette', description: 'Press Cmd+K anytime to quickly navigate or trigger actions.', position: 'center' },
  { target: 'body', title: 'Done', description: 'You are all set. Explore and let the agents work for you.', position: 'center' }
];

export default function OnboardingTour() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const resizeObserver = useRef(null);

  useEffect(() => {
    const isComplete = localStorage.getItem("gravix-onboarding-complete");
    if (isComplete !== "true") {
      setTimeout(() => setIsVisible(true), 0);
    }
  }, []);

  const updatePosition = useCallback(() => {
    if (!isVisible) return;
    const step = STEPS[currentStep];
    const el = document.querySelector(step.target);
    if (el && step.target !== 'body') {
      const rect = el.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    } else {
      setTargetRect(null);
    }
  }, [currentStep, isVisible]);

  useEffect(() => {
    if (isVisible) {
      // Small timeout to allow DOM to render
      const timer = setTimeout(() => {
        updatePosition();
      }, 100);

      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);

      const step = STEPS[currentStep];
      const el = document.querySelector(step.target);
      if (el && step.target !== 'body') {
        resizeObserver.current = new ResizeObserver(() => updatePosition());
        resizeObserver.current.observe(el);
      }

      return () => {
        clearTimeout(timer);
        window.removeEventListener("resize", updatePosition);
        window.removeEventListener("scroll", updatePosition, true);
        if (resizeObserver.current) {
          resizeObserver.current.disconnect();
        }
      };
    }
  }, [currentStep, isVisible, updatePosition]);

  const handleComplete = () => {
    localStorage.setItem("gravix-onboarding-complete", "true");
    setIsVisible(false);
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isVisible) return null;

  const step = STEPS[currentStep];
  const isCenter = !targetRect || step.position === 'center';

  return (
    <div
      className="onboarding-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          boxShadow: isCenter ? 'inset 0 0 0 9999px rgba(0,0,0,0.7)' : 'none',
          transition: 'all 0.3s ease-out',
          pointerEvents: 'auto',
        }}
      >
        {!isCenter && targetRect && (
          <div
            style={{
              position: 'absolute',
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
              borderRadius: 8,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.7)',
              transition: 'all 0.3s ease-out',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>

      <div
        className="card card-glass"
        style={{
          position: 'absolute',
          ...(isCenter ? {
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          } : {
            ...(step.position === 'right' ? {
              top: Math.max(16, Math.min(window.innerHeight - 200, targetRect.top + targetRect.height / 2 - 100)),
              left: targetRect.left + targetRect.width + 24,
            } : step.position === 'bottom' ? {
              top: targetRect.top + targetRect.height + 24,
              left: targetRect.left + targetRect.width / 2,
              transform: 'translateX(-50%)',
            } : step.position === 'left' ? {
              top: targetRect.top + targetRect.height / 2,
              left: targetRect.left - 24,
              transform: 'translate(-100%, -50%)',
            } : {
              top: targetRect.top - 24,
              left: targetRect.left + targetRect.width / 2,
              transform: 'translate(-50%, -100%)',
            })
          }),
          width: 320,
          pointerEvents: 'auto',
          zIndex: 10000,
          transition: 'all 0.3s ease-out',
        }}
      >
        <h3 className="h4" style={{ marginBottom: 8 }}>{step.title}</h3>
        <p className="body" style={{ color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.5 }}>
          {step.description}
        </p>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {STEPS.map((_, idx) => (
              <div
                key={idx}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: idx === currentStep ? 'var(--accent)' : 'var(--bg-hover)',
                  transition: 'background 0.3s'
                }}
              />
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={handleComplete}>
              Skip
            </button>
            <button className="btn btn-secondary btn-sm" onClick={prevStep} disabled={currentStep === 0}>
              Back
            </button>
            <button className="btn btn-primary btn-sm" onClick={nextStep}>
              {currentStep === STEPS.length - 1 ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
