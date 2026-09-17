import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const roots = ['src', 'public', 'docs', 'supabase/functions', 'README.md', 'index.html', '.env.example'];
const legacy = /mmconnect/i;
const ignoredDirs = new Set(['node_modules', 'dist', '.git', '.wrangler', 'supabase/migrations']);
const hits = [];

async function walk(target) {
  let info;
  try { info = await stat(target); } catch { return; }
  if (info.isDirectory()) {
    if (ignoredDirs.has(target.replaceAll('\\', '/'))) return;
    for (const entry of await readdir(target)) await walk(join(target, entry));
    return;
  }
  const text = await readFile(target, 'utf8');
  if (legacy.test(text)) hits.push(relative(process.cwd(), target));
}

for (const root of roots) await walk(root);

if (hits.length) {
  console.error('Legacy branding found in runtime/documentation files:');
  for (const hit of hits) console.error(`- ${hit}`);
  process.exit(1);
}

console.log('Branding check passed: no MMConnect references found outside historical migrations.');
