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
if (!packageJson.devDependencies?.typescript) missing.push('typescript');
if (!fs.existsSync(configPath)) missing.push('capacitor.config.ts');

if (missing.length) {
  console.error(`Mobile readiness check failed: ${missing.join(', ')}`);
  process.exit(1);
}

const mobileSync = packageJson.scripts?.['mobile:sync'] || '';
if (!mobileSync.includes('npm run build') || !mobileSync.includes('npx cap sync')) {
  console.error('Mobile readiness check failed: mobile:sync must run the production build and Capacitor sync.');
  process.exit(1);
}

console.log('Mobile readiness check passed: Capacitor core, Android, iOS, TypeScript and sync workflow are configured.');
