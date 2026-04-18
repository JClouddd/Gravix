const fs = require('fs');
const path = 'src/components/AppShell.js';
let content = fs.readFileSync(path, 'utf8');

const regex = /import NotificationCenter from "@\/components\/NotificationCenter";/g;

// Since there is a duplicate declaration error, let's see how many times it is imported
const matches = content.match(regex);
console.log(`Found ${matches ? matches.length : 0} imports for NotificationCenter.`);

if (matches && matches.length > 1) {
    // Replace the first occurrence
    content = content.replace(regex, '');
    // And put it back once at the top
    content = 'import NotificationCenter from "@/components/NotificationCenter";\n' + content;
}

fs.writeFileSync(path, content);
console.log("Fixed AppShell duplicate imports");
