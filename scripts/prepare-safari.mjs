/**
 * Post-build script for Safari extension.
 * Copies manifest and icons, and fixes popup HTML path.
 */

import { copyFileSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const dist = resolve(root, 'dist-safari');

// Copy Safari manifest
copyFileSync(
  resolve(root, 'src/manifest.safari.json'),
  resolve(dist, 'manifest.json'),
);

// Copy icons
const iconsDir = resolve(dist, 'icons');
mkdirSync(iconsDir, { recursive: true });

for (const icon of ['icon16.png', 'icon48.png', 'icon128.png']) {
  copyFileSync(
    resolve(root, 'src/icons', icon),
    resolve(iconsDir, icon),
  );
}

// Move popup HTML: dist-safari/src/popup/index.html → dist-safari/popup/index.html
const popupDir = resolve(dist, 'popup');
mkdirSync(popupDir, { recursive: true });
renameSync(
  resolve(dist, 'src/popup/index.html'),
  resolve(popupDir, 'index.html'),
);
rmSync(resolve(dist, 'src'), { recursive: true });

// Copy WASM files for local LLM inference engine
const wasmDir = resolve(dist, 'wasm');
mkdirSync(wasmDir, { recursive: true });
const onnxDir = resolve(root, 'node_modules/onnxruntime-web/dist');
const wasmFiles = readdirSync(onnxDir).filter(f => f.endsWith('.wasm') || f.endsWith('.mjs'));
for (const file of wasmFiles) {
  copyFileSync(resolve(onnxDir, file), resolve(wasmDir, file));
}

// Patch inference-engine.js to remove background.js dependency.
// Vite wraps dynamic imports with __vitePreload imported from background.js.
// Replace that import with an inline no-op passthrough so the file is
// standalone and can be dynamically imported from the content script.
const enginePath = resolve(dist, 'inference-engine.js');
let engineCode = readFileSync(enginePath, 'utf-8');
const bgImportMatch = engineCode.match(/import\{(\w+) as (\w+)\}from"\.\/background\.js";/);
if (bgImportMatch) {
  const alias = bgImportMatch[2];
  engineCode = engineCode.replace(
    bgImportMatch[0],
    `const ${alias}=async(f)=>f();`,
  );
  writeFileSync(enginePath, engineCode);
  console.log(`[prepare-safari] Patched inference-engine.js: removed background.js dependency (alias: ${alias})`);
}

console.log('[prepare-safari] Done: manifest, icons, popup path, WASM files fixed in dist-safari/');
