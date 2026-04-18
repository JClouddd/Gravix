const fs = require('fs');
const path = 'src/components/modules/FinanceModule.js';
let content = fs.readFileSync(path, 'utf8');

const regexTabRender = /{activeTab === "Income Tracker" && \(\s*<IncomeTrackerTab \/>\s*\)}/g;

console.log(content.match(regexTabRender));
