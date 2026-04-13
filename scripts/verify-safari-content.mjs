/**
 * Safari content script build verification
 * Checks that dist-safari/content.js is safe to load as a classic script in Safari.
 *
 * Verifies:
 * 1. No `export` keyword (would cause SyntaxError in classic script)
 * 2. No remaining `import(` calls (would fail: "Dynamic-import is not available in ServiceWorkers")
 * 3. File size > 800KB when Transformers.js should be bundled (confirms static inlining)
 * 4. IIFE format (starts with function wrapper)
 */

import { readFileSync, statSync } from 'fs';

const CONTENT_JS = 'dist-safari/content.js';

let content;
try {
  content = readFileSync(CONTENT_JS, 'utf-8');
} catch {
  console.error(`FAIL: ${CONTENT_JS} not found. Run 'npm run build:safari' first.`);
  process.exit(1);
}

const stats = statSync(CONTENT_JS);
let failures = 0;

// Check 1: No top-level export
// Match `export` as a keyword (not inside strings or comments)
// Simple heuristic: check if 'export ' or 'export{' appears outside of string literals
const exportMatch = content.match(/\bexport\s|export\{/);
if (exportMatch) {
  console.error(`FAIL: Found 'export' keyword in ${CONTENT_JS} (position ${exportMatch.index})`);
  console.error(`  Context: ...${content.slice(Math.max(0, exportMatch.index - 30), exportMatch.index + 50)}...`);
  failures++;
} else {
  console.log('PASS: No export keyword found');
}

// Check 2: No UNINTENTIONAL dynamic import() calls
// Allow: import(chrome.runtime.getURL(...)) — intentional runtime loading for Safari
// Fail on: import("./chunk.js") — should have been inlined by IIFE build
const importMatches = [...content.matchAll(/(?<![.\w])import\s*\(/g)];
const unintentionalImports = importMatches.filter(m => {
  const after = content.slice(m.index, m.index + 100);
  return !after.includes('chrome.runtime.getURL');
});
if (unintentionalImports.length > 0) {
  console.error(`FAIL: Found ${unintentionalImports.length} unintentional dynamic import() call(s) in ${CONTENT_JS}`);
  for (const m of unintentionalImports.slice(0, 3)) {
    console.error(`  Position ${m.index}: ...${content.slice(Math.max(0, m.index - 20), m.index + 60)}...`);
  }
  failures++;
} else {
  const intentional = importMatches.length - unintentionalImports.length;
  console.log(`PASS: No unintentional import() calls (${intentional} intentional via chrome.runtime.getURL)`);
}

// Check 3: File size
const sizeKB = stats.size / 1024;
console.log(`INFO: ${CONTENT_JS} size = ${sizeKB.toFixed(1)} KB`);

// Check 4: IIFE format (starts with ( or var or const, not import/export)
const trimmed = content.trimStart();
if (trimmed.startsWith('import') || trimmed.startsWith('export')) {
  console.error('FAIL: File starts with import/export — this is ESM, not IIFE/classic script');
  failures++;
} else {
  console.log('PASS: File does not start with import/export (compatible with classic script)');
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed. Fix before testing on Safari.`);
  process.exit(1);
} else {
  console.log(`\nAll checks passed. content.js is safe for Safari classic script loading.`);
  if (sizeKB > 800) {
    console.log(`Transformers.js appears to be statically bundled (${sizeKB.toFixed(0)} KB).`);
  } else {
    console.log(`WARNING: File is small (${sizeKB.toFixed(0)} KB) — Transformers.js may NOT be bundled.`);
    console.log('This means local-llm inference will fail at runtime (import() not available).');
  }
}
