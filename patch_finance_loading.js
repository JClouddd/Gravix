const fs = require('fs');
const path = 'src/components/modules/FinanceModule.js';
let content = fs.readFileSync(path, 'utf8');

// replace initial state
content = content.replace(
  'const [loading, setLoading] = useState(true);',
  'const [loading, setLoading] = useState(false);'
);

fs.writeFileSync(path, content);
console.log("Patched loading.");
