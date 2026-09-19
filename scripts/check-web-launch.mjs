import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const requiredFiles = [
  'index.html',
  'public/robots.txt',
  'public/sitemap.xml',
  'public/og-image.svg',
  'public/privacy.html',
  'public/terms.html',
  'public/404.html',
  'public/manifest.webmanifest',
  'public/teconnect-logo.svg',
  'public/_headers',
];

const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length) {
  console.error('Web launch checklist failed: ' + missing.join(', '));
  process.exit(1);
}

const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const requiredTokens = [
  '<!doctype html>',
  'lang="pt-PT"',
  'name="viewport"',
  'name="description"',
  'property="og:title"',
  'property="og:description"',
  'property="og:image"',
  'name="twitter:image"',
  'rel="manifest"',
  'rel="icon"',
  '<title>Te-connect — People OS para empresas</title>',
];

const tokenMissing = requiredTokens.filter((token) => !index.includes(token));
if (tokenMissing.length) {
  console.error('Web launch checklist failed: missing index metadata: ' + tokenMissing.join(', '));
  process.exit(1);
}

const robots = fs.readFileSync(path.join(root, 'public/robots.txt'), 'utf8');
if (!robots.includes('Disallow: /')) {
  console.error('Web launch checklist failed: private app robots policy is missing.');
  process.exit(1);
}

const headers = fs.readFileSync(path.join(root, 'public/_headers'), 'utf8');
for (const token of ['X-Content-Type-Options: nosniff', 'Content-Security-Policy:', 'Strict-Transport-Security:']) {
  if (!headers.includes(token)) {
    console.error('Web launch checklist failed: security header missing: ' + token);
    process.exit(1);
  }
}

console.log('Web launch checklist passed.');
