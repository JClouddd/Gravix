const fs = require('fs');

const path = 'src/components/modules/FinanceModule.js';
let content = fs.readFileSync(path, 'utf8');

const regexTabs = /const TABS = \["Overview", "By Model", "By Agent"\];/g;
const newTabs = `const TABS = ["Overview", "Income Tracker", "By Model", "By Agent"];`;

content = content.replace(regexTabs, newTabs);

fs.writeFileSync(path, content);
console.log("Patched tabs.");
