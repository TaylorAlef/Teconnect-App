import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const configPath = path.join(root, 'capacitor.config.ts');

const required = [
  '@capacitor/core',
  '@capacitor/android',
  '@capacitor/ios',
];

const missing = required.filter((name) => !packageJson.dependencies?.[name]);
if (!fs.existsSync(configPath)) missing.push('capacitor.config.ts');

if (missing.length) {
  console.error(`Mobile readiness check failed: ${missing.join(', ')}`);
  process.exit(1);
}

if (packageJson.scripts?.['mobile:sync'] !== 'npm run build && npx cap sync') {
  console.error('Mobile readiness check failed: mobile:sync script is not configured as expected.');
  process.exit(1);
}

console.log('Mobile readiness check passed: Capacitor core, Android, iOS and sync workflow are configured.');
