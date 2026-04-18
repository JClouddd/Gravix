const fs = require('fs');
const path = 'src/components/AppShell.js';
let content = fs.readFileSync(path, 'utf8');

// I accidentally deleted the import entirely for NotificationCenter or duplicated it previously
// Let's ensure it is ONLY there ONCE and in the right spot

content = content.replace('import NotificationCenter from "@/components/NotificationCenter";\n', '');
content = content.replace('import NotificationCenter from "@/components/NotificationCenter";', '');

// Now we know it is NOT there.
// Add it back near the top.
content = content.replace(
  'import { useState, useCallback, Suspense, lazy, useEffect, useRef } from "react";',
  'import { useState, useCallback, Suspense, lazy, useEffect, useRef } from "react";\nimport NotificationCenter from "@/components/NotificationCenter";'
);

fs.writeFileSync(path, content);
