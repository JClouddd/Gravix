const fs = require('fs');

const path = 'src/components/modules/FinanceModule.js';
let content = fs.readFileSync(path, 'utf8');

// Replace standard render with full Income tracker render logic from earlier

// Search for Overview tab content
const regexOverview = /{activeTab === "Overview" && \(\s*<OverviewTab summary={summary} breakdown={breakdown} historyData={historyData} credits={credits} \/>\s*\)}/g;
const newTabsContent = `{activeTab === "Overview" && (
        <OverviewTab summary={summary} breakdown={breakdown} historyData={historyData} credits={credits} />
      )}

      {activeTab === "Income Tracker" && (
        <IncomeTrackerTab />
      )}`;

content = content.replace(regexOverview, newTabsContent);


const newImports = `import { useState, useEffect } from "react";
import HelpTooltip from "@/components/HelpTooltip";

function IncomeTrackerTab() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalIncome, setTotalIncome] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [form, setForm] = useState({ source: "", amount: "", date: new Date().toISOString().split('T')[0], category: "client-payment" });

  useEffect(() => {
    fetch("/api/finance/income")
      .then(res => res.json())
      .then(data => {
        setEntries(data.entries || []);
        setTotalIncome(data.totalIncome || 0);
        setMonthlyIncome(data.monthlyIncome || 0);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load income", err);
        setLoading(false);
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch("/api/finance/income", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    if (res.ok) {
      const data = await res.json();
      setEntries(data.entries || []);
      setTotalIncome(data.totalIncome || 0);
      setMonthlyIncome(data.monthlyIncome || 0);
      setForm({ ...form, source: "", amount: "" });
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="grid-2">
        <div className="card" style={{ padding: 20 }}>
          <div className="caption" style={{ marginBottom: 6 }}>Total Income</div>
          <div className="h2" style={{ color: "var(--success)" }}>\${totalIncome.toFixed(2)}</div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div className="caption" style={{ marginBottom: 6 }}>Monthly Income</div>
          <div className="h2" style={{ color: "var(--success)" }}>\${monthlyIncome.toFixed(2)}</div>
        </div>
      </div>

      <div className="card">
        <div className="h3" style={{ marginBottom: 16 }}>Add Income</div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="text" className="input" placeholder="Source" value={form.source} onChange={e => setForm({...form, source: e.target.value})} required />
          <input type="number" className="input" placeholder="Amount" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} step="0.01" required />
          <input type="date" className="input" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
          <select className="input" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
            <option value="client-payment">Client Payment</option>
            <option value="freelance">Freelance</option>
            <option value="subscription">Subscription</option>
            <option value="other">Other</option>
          </select>
          <button type="submit" className="btn btn-primary">Add Income</button>
        </form>
      </div>

      <div className="card">
        <div className="h3" style={{ marginBottom: 16 }}>Income History</div>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--card-border)", color: "var(--text-secondary)" }}>
              <th style={{ padding: "12px 8px" }}>Date</th>
              <th style={{ padding: "12px 8px" }}>Source</th>
              <th style={{ padding: "12px 8px" }}>Category</th>
              <th style={{ padding: "12px 8px", textAlign: "right" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--card-border)" }}>
                <td style={{ padding: "12px 8px" }}>{entry.date}</td>
                <td style={{ padding: "12px 8px" }}>{entry.source}</td>
                <td style={{ padding: "12px 8px" }}>{entry.category}</td>
                <td style={{ padding: "12px 8px", textAlign: "right", color: "var(--success)" }}>\${entry.amount.toFixed(2)}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr><td colSpan="4" style={{ padding: "12px 8px", textAlign: "center" }}>No entries yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

`;

content = content.replace(`import { useState, useEffect } from "react";\nimport HelpTooltip from "@/components/HelpTooltip";`, newImports);

// Add Profit/Loss
const regexSummary = /<AnimatedCounter value={totalSpend} \/>\n          <\/div>\n          <div className="caption" style={{ marginTop: 4 }}>\n            Projected: \${projectedCost\.toFixed\(2\)}\n          <\/div>\n        <\/div>/;
const newSummary = `<AnimatedCounter value={totalSpend} />
          </div>
          <div className="caption" style={{ marginTop: 4 }}>
            Projected: \${projectedCost.toFixed(2)}
          </div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div className="caption" style={{ marginBottom: 6 }}>Net Profit/Loss</div>
          <div className="h2" style={{ color: (summary?.totalIncome || 0) - totalSpend >= 0 ? "var(--success)" : "var(--error)" }}>
            \${((summary?.totalIncome || 0) - totalSpend).toFixed(2)}
          </div>
          <div className="caption" style={{ marginTop: 4 }}>
            Revenue - Costs
          </div>
        </div>`;
content = content.replace(regexSummary, newSummary);


fs.writeFileSync(path, content);
console.log("Patched component logic.");
