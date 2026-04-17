const fs = require('fs');
const files = [
  'src/lib/geminiClient.js',
  'src/lib/googleAuth.js',
  'src/lib/julesClient.js',
  'src/lib/knowledgeEngine.js'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/export default \{\n/g, 'const exportedObject = {\n');
  content = content.replace(/export default \{/g, 'const exportedObject = {');
  content += '\nexport default exportedObject;\n';
  fs.writeFileSync(file, content);
}
