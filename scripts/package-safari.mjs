#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { homedir } from 'node:os';

const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
const version = pkg.version;
const outDir = resolve('releases');
const out = `${outDir}/safertranslate-v${version}-safari.zip`;

const dd = `${homedir()}/Library/Developer/Xcode/DerivedData`;
const appPath = execFileSync(
  'find',
  [dd, '-maxdepth', '5', '-name', 'SaferTranslate.app', '-path', '*/Build/Products/Debug/*', '-print', '-quit'],
  { encoding: 'utf-8' },
).trim();

if (!appPath || !existsSync(appPath)) {
  console.error('SaferTranslate.app not found in DerivedData.');
  console.error('Run `npm run safari:convert && npm run safari:build` first.');
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
if (existsSync(out)) rmSync(out);

execFileSync('ditto', ['-c', '-k', '--keepParent', appPath, out], { stdio: 'inherit' });
console.log(`Created ${out}`);
console.log(`Source: ${appPath}`);
