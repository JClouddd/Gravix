const fs = require('fs');
const file = 'src/lib/agentEngine.js';
let data = fs.readFileSync(file, 'utf8');
data = "import crypto from 'crypto';\n" + data;
fs.writeFileSync(file, data);
