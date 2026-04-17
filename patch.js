import fs from 'fs';
const filepath = 'src/app/api/agents/sentinel/analyze/route.js';
let code = fs.readFileSync(filepath, 'utf8');
code = code.replace('import { structuredGenerate } from "@/lib/geminiClient";', 'import { generate } from "@/lib/geminiClient";');
code = code.replace(/const geminiResponse = await structuredGenerate\(\{[\s\S]*?\}\);/, `const geminiResponse = await generate({
      prompt
    });`);
// remove the schema definition
code = code.replace(/\/\/ Define JSON schema for Gemini response[\s\S]*?\]\n    \};\n/, '');
fs.writeFileSync(filepath, code);
