import fs from 'fs';
const filepath = 'src/app/api/automation/sentinel-check/route.js';
let code = fs.readFileSync(filepath, 'utf8');

const replaceImport = `import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
// Import health checks logic
import { GET as getHealth } from "@/app/api/health/route";
// Import analyze logic
import { POST as runAnalyze } from "@/app/api/agents/sentinel/analyze/route";
`;

code = code.replace(/import \{ NextResponse \} from "next\/server";\nimport \{ db \} from "@\/lib\/firebase";\nimport \{ collection, query, where, getDocs, addDoc \} from "firebase\/firestore";/, replaceImport);


const replaceHealth = `// 1. Run main health checks
    let healthData = {};
    try {
      // Mock request object for the health endpoint
      const mockReq = { url: request.url };
      const healthRes = await getHealth(mockReq);
      healthData = await healthRes.json();
    } catch (error) {`;
code = code.replace(/\/\/ 1\. Run main health checks[\s\S]*?\} catch \(error\) \{/, replaceHealth);

const replaceAnalyze = `// 4. Call analyze endpoint
    let analyzeResult = {};
    try {
      const mockReq = { json: async () => ({}) };
      const analyzeRes = await runAnalyze(mockReq);
      analyzeResult = await analyzeRes.json();
    } catch (error) {`;
code = code.replace(/\/\/ 4\. Call analyze endpoint[\s\S]*?\} catch \(error\) \{/, replaceAnalyze);

fs.writeFileSync(filepath, code);
