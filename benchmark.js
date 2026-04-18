import fs from 'fs';
import path from 'path';

// Load the file content
const routeJsPath = path.join(process.cwd(), 'src/app/api/automation/meeting-pipeline/route.js');
const routeJsContent = fs.readFileSync(routeJsPath, 'utf8');

console.log("Analyzing current route.js...");
console.log(routeJsContent.includes('await googleApiRequest') ? 'Has googleApiRequest' : 'No googleApiRequest');
