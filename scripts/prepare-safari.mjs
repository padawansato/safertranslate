/**
 * Post-build script for Safari extension.
 * Copies manifest and icons, and fixes popup HTML path.
 */

import { copyFileSync, mkdirSync, renameSync, rmSync } from 'fs';
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

console.log('[prepare-safari] Done: manifest, icons, popup path fixed in dist-safari/');
