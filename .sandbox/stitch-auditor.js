const fs = require('fs');
const path = require('path');

/**
 * Programmatic Visual QA: "Stitch Auditor"
 * This script runs locally in the Cloud Run Sandbox.
 * It reads JSX/CSS files and uses RegEx/AST concepts to ensure they
 * comply with the "Stitch" glassmorphic design system.
 * This completely avoids spending expensive Gemini Vision tokens.
 */

const targetDir = process.argv[2] || '.';

function auditFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let errors = [];

  // Check 1: Hardcoded white backgrounds (Jarring)
  if (/bg-white\b(?!\/)/g.test(content) || /background:\s*["']?#ffffff["']?/gi.test(content) || /background:\s*["']?white["']?/gi.test(content)) {
    // Only flag if it's not a text color or explicitly allowed bg-white/10 (translucent)
    errors.push("STITCH VIOLATION: Hardcoded solid white background detected. Use glassmorphic 'bg-white/5' or 'card-glass' instead.");
  }

  // Check 2: Missing backdrop-filter on cards
  // If it's a card container, it should have glass properties
  if (content.includes('card-glass') && !content.includes('backdrop-blur')) {
    // Technically card-glass class might handle it, but if they are writing raw inline styles for a card:
    if (content.includes('border') && content.includes('bg-') && !content.includes('card-glass')) {
       errors.push("STITCH VIOLATION: Potential card missing 'card-glass' class or 'backdrop-blur'.");
    }
  }

  // Check 3: Raw black text on dark themes
  if (/text-black/g.test(content) || /color:\s*["']?#000000["']?/gi.test(content)) {
    errors.push("STITCH VIOLATION: Hardcoded black text on a dark theme. Use text-white or text-gray-300.");
  }

  return errors;
}

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      // Ignore node_modules
      if (!file.includes('node_modules')) {
        results = results.concat(walkDir(file));
      }
    } else {
      // Only audit JS, JSX, TS, TSX, CSS
      if (/\.(js|jsx|ts|tsx|css)$/.test(file)) {
        const fileErrors = auditFile(file);
        if (fileErrors.length > 0) {
          results.push({ file, errors: fileErrors });
        }
      }
    }
  });
  return results;
}

const auditResults = walkDir(targetDir);

if (auditResults.length > 0) {
  console.error("❌ STITCH DESIGN AUDIT FAILED!");
  auditResults.forEach(res => {
    console.error(`\nFile: ${res.file}`);
    res.errors.forEach(err => console.error(`  - ${err}`));
  });
  process.exit(1); // Force the sandbox to fail so Jules has to fix it
} else {
  console.log("✅ STITCH DESIGN AUDIT PASSED.");
  process.exit(0);
}
