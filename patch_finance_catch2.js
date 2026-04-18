const fs = require('fs');
const file = 'src/components/modules/FinanceModule.js';
let content = fs.readFileSync(file, 'utf8');

// Also make sure error block isn't returning early if error is true
const errorMatch = /  if \(error\) \{\n    return \([\s\S]*?<\/div>\n    \);\n  \}/;
content = content.replace(errorMatch, '');

fs.writeFileSync(file, content);
