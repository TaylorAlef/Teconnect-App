import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const configPath = path.join(root, 'capacitor.config.ts');
const mainPath = path.join(root, 'src', 'main.jsx');
const employeePath = path.join(root, 'src', 'employee', 'EmployeeMobileWorkspace.jsx');
const manifestPath = path.join(root, 'public', 'manifest.webmanifest');

const required = [
  '@capacitor/core',
  '@capacitor/android',
  '@capacitor/ios',
  '@capacitor/geolocation',
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

const main = fs.readFileSync(mainPath, 'utf8');
const employee = fs.readFileSync(employeePath, 'utf8');
const manifest = fs.readFileSync(manifestPath, 'utf8');

const routeChecks = [
  [main.includes("from './employee/EmployeeMobileWorkspace.jsx';"), 'EmployeeMobileWorkspace import'],
  [main.includes("if (profile.role === 'EMPLOYEE')"), 'explicit EMPLOYEE route guard'],
  [main.includes('return <EmployeeMobileWorkspace profile={profile} />;'), 'employee workspace route'],
  [employee.includes("supabase.rpc('register_time_entry'"), 'server-side attendance RPC'],
  [employee.includes('getNativeCurrentPosition'), 'native GPS integration'],
  [manifest.includes('"display": "standalone"'), 'standalone mobile web manifest'],
];

const routeFailures = routeChecks.filter(([, label]) => !label || !routeChecks.find(([ok, currentLabel]) => currentLabel === label)?.[0]).map(([, label]) => label);
if (routeFailures.length) {
  console.error(`Mobile readiness check failed: ${routeFailures.join(', ')}`);
  process.exit(1);
}

console.log('Mobile readiness check passed: Capacitor, GPS, collaborator routing, attendance RPC and standalone mobile app contract are present.');
