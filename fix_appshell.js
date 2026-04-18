const fs = require('fs');
const path = 'src/components/AppShell.js';
let content = fs.readFileSync(path, 'utf8');

// Just remove all of them and add it once back carefully
content = content.replace(/import NotificationCenter from "@\/components\/NotificationCenter";/g, '');

content = content.replace(
  'import { useState, useCallback, Suspense, lazy, useEffect, useRef } from "react";',
  'import { useState, useCallback, Suspense, lazy, useEffect, useRef } from "react";\nimport NotificationCenter from "@/components/NotificationCenter";'
);

fs.writeFileSync(path, content);
console.log("Fixed AppShell duplicate imports again");
