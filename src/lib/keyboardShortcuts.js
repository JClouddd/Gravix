export const SHORTCUTS = {
  "1": { action: "home", type: "nav", label: "Cmd+1", desc: "Go to Home" },
  "2": { action: "finance", type: "nav", label: "Cmd+2", desc: "Go to Finance" },
  "3": { action: "email", type: "nav", label: "Cmd+3", desc: "Go to Email" },
  "4": { action: "management", type: "nav", label: "Cmd+4", desc: "Go to Management" },
  "5": { action: "agents", type: "nav", label: "Cmd+5", desc: "Go to Agents" },
  "6": { action: "knowledge", type: "nav", label: "Cmd+6", desc: "Go to Knowledge" },
  "7": { action: "clients", type: "nav", label: "Cmd+7", desc: "Go to Clients" },
  "8": { action: "knowledge", type: "nav", label: "Cmd+8", desc: "Go to Notebooks" },
  "9": { action: "settings", type: "nav", label: "Cmd+9", desc: "Go to Settings" },
  "n": { action: "new", type: "action", label: "Cmd+N", desc: "New Action" },
  "/": { action: "help", type: "action", label: "Cmd+/", desc: "Toggle Help" },
  ".": { action: "gemini", type: "action", label: "Cmd+.", desc: "Toggle Gemini Widget" }
};

export function registerShortcuts(onNavigate, onAction) {
  const handleKeyDown = (e) => {
    // We only care about Cmd or Ctrl modified events, but not if the user is typing in an input/textarea
    if (!(e.metaKey || e.ctrlKey)) return;

    // Ignore if target is an input, textarea or contenteditable
    const activeEl = document.activeElement;
    if (
      activeEl &&
      (activeEl.tagName === "INPUT" ||
       activeEl.tagName === "TEXTAREA" ||
       activeEl.isContentEditable)
    ) {
      return;
    }

    const key = e.key.toLowerCase();
    const shortcut = SHORTCUTS[key];

    if (shortcut) {
      e.preventDefault();
      if (shortcut.type === "nav" && onNavigate) {
        onNavigate(shortcut.action);
      } else if (shortcut.type === "action" && onAction) {
        onAction(shortcut.action);
      }
    }
  };

  window.addEventListener("keydown", handleKeyDown);

  return () => {
    window.removeEventListener("keydown", handleKeyDown);
  };
}
