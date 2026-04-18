import fs from 'fs';

let content = fs.readFileSync('src/components/modules/FinanceModule.js', 'utf8');

const updatedOverviewTab = `
function OverviewTab({ summary, credits, historyData, breakdown }) {
  const [stockTicker, setStockTicker] = useState("");
  const [stockRunning, setStockRunning] = useState(false);
  const [stockResult, setStockResult] = useState(null);

  const handleRunStockAnalysis = async (e) => {
    e.preventDefault();
    if (!stockTicker) return;
    setStockRunning(true);
    setStockResult(null);
    try {
      const response = await fetch("/api/colab/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notebookId: "stock_analysis",
          parameters: { ticker: stockTicker, period: "1y" }
        })
      });
      const data = await response.json();
      setStockResult(data);
    } catch (err) {
      setStockResult({ error: err.message });
    } finally {
      setStockRunning(false);
    }
  };

  const totalSpend = summary?.totalSpend || 0;

  // Calculate projected cost dynamically
  const now = new Date();
  const currentDay = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projectedCost = currentDay > 0 ? (totalSpend / currentDay) * daysInMonth : 0;

  const cloudCredit = credits?.cloudCredit || { total: 100, used: 0, remaining: 100 };
  const genaiCredit = credits?.genaiCredit || { total: 1000, used: 0, remaining: 1000 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 className="h4">Quick Actions</h3>
        </div>
        <form onSubmit={handleRunStockAnalysis} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <input
            type="text"
            className="input"
            placeholder="Ticker (e.g. AAPL)"
            value={stockTicker}
            onChange={e => setStockTicker(e.target.value)}
            style={{ maxWidth: 200 }}
            required
          />
          <button type="submit" className="btn btn-primary" disabled={stockRunning}>
            {stockRunning ? "Running..." : "Run Stock Analysis"}
          </button>
        </form>
        {stockResult && (
          <div style={{ marginTop: 16, padding: 16, background: "var(--bg-secondary)", borderRadius: "var(--radius-md)", border: "1px solid var(--card-border)" }}>
            {stockResult.error ? (
              <div className="badge badge-error">Error: {stockResult.error}</div>
            ) : (
              <div>
                <p className="body-sm" style={{ fontWeight: 600, marginBottom: 8 }}>Analysis for {stockTicker.toUpperCase()}:</p>
                {stockResult.executionTime && <p className="body-sm" style={{ color: "var(--text-tertiary)", marginBottom: 8 }}>Time: {(stockResult.executionTime / 1000).toFixed(2)}s</p>}
                <div style={{ overflowX: "auto" }}>
                  <pre className="body-sm" style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                    {typeof stockResult.results === 'object' ? JSON.stringify(stockResult.results, null, 2) : stockResult.results}
                  </pre>
                </div>
                {stockResult.chartUrls && stockResult.chartUrls.length > 0 && (
                  <div style={{ marginTop: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {stockResult.chartUrls.map((url, i) => (
                      <img key={i} src={url} alt={\`Chart \${i+1}\`} style={{ maxWidth: '100%', borderRadius: "var(--radius-md)" }} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid-3">
`;

content = content.replace(/function OverviewTab\(\{ summary, credits, historyData, breakdown \}\) \{\s*const totalSpend = summary\?\.totalSpend \|\| 0;\s*\/\/ Calculate projected cost dynamically\s*const now = new Date\(\);\s*const currentDay = now\.getDate\(\);\s*const daysInMonth = new Date\(now\.getFullYear\(\), now\.getMonth\(\) \+ 1, 0\)\.getDate\(\);\s*const projectedCost = currentDay > 0 \? \(totalSpend \/ currentDay\) \* daysInMonth : 0;\s*const cloudCredit = credits\?\.cloudCredit \|\| \{ total: 100, used: 0, remaining: 100 \};\s*const genaiCredit = credits\?\.genaiCredit \|\| \{ total: 1000, used: 0, remaining: 1000 \};\s*return \(\s*<div style=\{\{ display: "flex", flexDirection: "column", gap: 24 \}\}>\s*<div className="grid-3">/m, updatedOverviewTab.trim());

fs.writeFileSync('src/components/modules/FinanceModule.js', content);
console.log('patched OverviewTab');
