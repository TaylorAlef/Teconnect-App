import fs from 'node:fs';

const file = fs.readFileSync('src/ProductionWorkspace.jsx', 'utf8');
if (!/export default function ProductionWorkspace\s*\(/.test(file)) {
  console.error('ProductionWorkspace must provide a default export named ProductionWorkspace.');
  process.exit(1);
}
console.log('ProductionWorkspace default export: OK');
