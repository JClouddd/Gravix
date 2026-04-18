const fs = require('fs');
const path = 'src/components/modules/FinanceModule.js';
let content = fs.readFileSync(path, 'utf8');

const regexRenderTabs = /      {activeTab === "Overview" && \(\s*<OverviewTab summary={summary} historyData={historyData} credits={credits} breakdown={breakdown} \/>\s*\)}/g;

const replaceRenderTabs = `      {activeTab === "Overview" && (
        <OverviewTab summary={summary} historyData={historyData} credits={credits} breakdown={breakdown} />
      )}

      {activeTab === "Income Tracker" && (
        <IncomeTrackerTab />
      )}`;

content = content.replace(regexRenderTabs, replaceRenderTabs);

// Fix the original loading back
content = content.replace(
  'const [loading, setLoading] = useState(true); // for IncomeTrackerTab',
  'const [loading, setLoading] = useState(false);'
);

// Actually, in patch_finance_loading3 we replaced:
// const [loading, setLoading] = useState(false);
// const [loading, setLoading] = useState(true);
// Let's just fix the IncomeTracker loading state to false
content = content.replace(
  'function IncomeTrackerTab() {\n  const [entries, setEntries] = useState([]);\n  const [loading, setLoading] = useState(true);',
  'function IncomeTrackerTab() {\n  const [entries, setEntries] = useState([]);\n  const [loading, setLoading] = useState(false);'
);

fs.writeFileSync(path, content);
console.log("Patched missing render block.");
