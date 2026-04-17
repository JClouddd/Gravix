import fs from 'fs';
const filepath = 'src/app/api/agents/sentinel/analyze/route.js';
let code = fs.readFileSync(filepath, 'utf8');
code = code.replace('const analysisResult = JSON.parse(geminiResponse.text);', '    let analysisResult;\n    try {\n      const cleanText = geminiResponse.text.replace(/```(json)?/g, \"\").trim();\n      analysisResult = JSON.parse(cleanText);\n    } catch (e) {\n      console.error(\"Failed to parse Gemini response as JSON:\", e);\n      analysisResult = { anomalies: [], proposedRules: [] };\n    }\n');
fs.writeFileSync(filepath, code);
