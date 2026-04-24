import { useState, useCallback } from "react";

export default function ScholarChatTab({ stagedEntries }) {
  const [scholarMessage, setScholarMessage] = useState("");
  const [scholarHistory, setScholarHistory] = useState([]);
  const [scholarLoading, setScholarLoading] = useState(false);

  // Handle Scholar chat
  const handleScholarChat = useCallback(async () => {
    if (!scholarMessage.trim()) return;
    setScholarLoading(true);
    const userMsg = scholarMessage;
    setScholarMessage("");
    setScholarHistory((prev) => [...prev, { role: "user", content: userMsg }]);

    try {
      const res = await fetch("/api/knowledge/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          stagingEntry: stagedEntries[0] || { title: "General", content: "", classification: {} },
          history: scholarHistory,
        }),
      });
      const data = await res.json();
      setScholarHistory((prev) => [...prev, { role: "model", content: data.response }]);
    } catch (error) {
      setScholarHistory((prev) => [...prev, { role: "model", content: "Error: " + error.message }]);
    }
    setScholarLoading(false);
  }, [scholarMessage, scholarHistory, stagedEntries]);

  return (
    <div className="card" style={{ minHeight: 500, display: "flex", flexDirection: "column" }}>
      <h3 className="h4" style={{ marginBottom: 16 }}>Chat with Scholar</h3>

      {/* Chat History */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        marginBottom: 16,
        padding: "0 4px",
      }}>
        {scholarHistory.length === 0 ? (
          <div className="empty-state" style={{ flex: 1 }}>
            <div className="empty-state-icon">💬</div>
            <p className="empty-state-title">Ask Scholar anything</p>
            <p className="empty-state-desc">
              Scholar answers grounded in your ingested documentation. Ask about patterns, APIs, or review staged content.
            </p>
          </div>
        ) : (
          scholarHistory.map((msg, i) => (
            <div
              key={i}
              style={{
                padding: "12px 16px",
                borderRadius: "var(--radius-md)",
                background: msg.role === "user" ? "var(--accent-subtle)" : "var(--bg-tertiary)",
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "80%",
              }}
            >
              <div className="caption" style={{ marginBottom: 4, fontWeight: 600 }}>
                {msg.role === "user" ? "You" : "📚 Scholar"}
              </div>
              <div className="body-sm" style={{ whiteSpace: "pre-wrap" }}>
                {msg.content}
              </div>
            </div>
          ))
        )}
        {scholarLoading && (
          <div style={{ alignSelf: "flex-start", padding: "12px 16px" }}>
            <span className="caption">Scholar is thinking...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          className="input"
          placeholder="Ask Scholar a question..."
          value={scholarMessage}
          onChange={(e) => setScholarMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleScholarChat()}
        />
        <button
          className="btn btn-primary"
          onClick={handleScholarChat}
          disabled={scholarLoading || !scholarMessage.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}
