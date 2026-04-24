"use client";

import { useEffect, useState } from "react";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Only show on mobile/tablet user agents approximately
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    // Check if dismissed previously
    const isDismissed = localStorage.getItem("gravix-install-dismissed");

    if (!isMobile || isDismissed) {
      return;
    }

    const handler = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    // We've used the prompt, and can't use it again, discard it
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("gravix-install-dismissed", "true");
  };

  if (!showPrompt) return null;

  return (
    <div
      className="card card-glass"
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        width: "calc(100% - 48px)",
        maxWidth: 400,
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: 16,
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        border: "1px solid var(--card-border)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="h4" style={{ marginBottom: 4 }}>Install Gravix</div>
          <div className="caption">Install Gravix for quick access</div>
        </div>
        <button
          onClick={handleDismiss}
          style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: 16 }}
        >
          ✕
        </button>
      </div>
      <button className="btn btn-primary" onClick={handleInstall} style={{ width: "100%" }}>
        Install
      </button>
    </div>
  );
}