#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
const version = pkg.version;
const distDir = resolve('dist');
const outDir = resolve('releases');
const out = `${outDir}/safertranslate-v${version}-chrome.zip`;

if (!existsSync(distDir)) {
  console.error('dist/ not found. Run `npm run build` first.');
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
if (existsSync(out)) rmSync(out);

execFileSync('zip', ['-r', out, '.'], { cwd: distDir, stdio: 'inherit' });
console.log(`\nCreated ${out}`);
