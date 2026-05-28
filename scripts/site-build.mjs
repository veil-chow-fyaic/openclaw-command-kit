import { cp, mkdir, readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const siteRoot = path.join(repoRoot, 'site');
const outRoot = path.join(siteRoot, 'dist');
const assetsRoot = path.join(siteRoot, 'assets');
const indexPath = path.join(siteRoot, 'index.html');

async function ensureFile(filePath) {
  const result = await stat(filePath).catch(() => null);
  if (!result?.isFile()) {
    throw new Error(`Missing required site file: ${path.relative(repoRoot, filePath)}`);
  }
}

async function ensureDirectory(dirPath) {
  const result = await stat(dirPath).catch(() => null);
  if (!result?.isDirectory()) {
    throw new Error(`Missing required site directory: ${path.relative(repoRoot, dirPath)}`);
  }
}

function assertContains(source, expected) {
  if (!source.includes(expected)) {
    throw new Error(`Site build validation failed: missing "${expected}"`);
  }
}

function assertNoForbiddenReference(source) {
  const forbidden = [/MakeMePulse/i, /Nomadic Tribe/i, /Moebius/i, /2019\.makemepulse/i];
  const match = forbidden.find((pattern) => pattern.test(source));
  if (match) {
    throw new Error(`Site build validation failed: forbidden reference "${match}"`);
  }
}

await ensureFile(indexPath);
await ensureDirectory(assetsRoot);
await ensureFile(path.join(assetsRoot, 'site.css'));
await ensureFile(path.join(assetsRoot, 'site.js'));

const html = await readFile(indexPath, 'utf8');
const css = await readFile(path.join(assetsRoot, 'site.css'), 'utf8');
const js = await readFile(path.join(assetsRoot, 'site.js'), 'utf8');
const combined = `${html}\n${css}\n${js}`;

[
  'OpenClaw Command Kit',
  '/sessions',
  '/resume N',
  'install from source',
  'No actor, no route, no action.',
  'packages/core',
  'packages/plugin',
  'Read back confirmed',
  'No WeCom Side Panel fallback.',
].forEach((text) => assertContains(combined, text));

assertNoForbiddenReference(combined);

await rm(outRoot, { recursive: true, force: true });
await mkdir(outRoot, { recursive: true });
await cp(indexPath, path.join(outRoot, 'index.html'));
await cp(assetsRoot, path.join(outRoot, 'assets'), { recursive: true });

console.log(`site:build complete -> ${path.relative(repoRoot, outRoot)}`);
