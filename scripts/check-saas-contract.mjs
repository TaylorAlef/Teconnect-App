import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'src/main.jsx',
  'src/ProductionWorkspace.jsx',
  'src/teconnect-suite.css',
  'src/employee/EmployeeMobileWorkspace.jsx',
  'src/employee/employee.css',
  'src/commercial/OnboardingPage.jsx',
  'src/commercial/SetupWizard.jsx',
  'src/commercial/EmployeeAccessManager.jsx',
  'src/commercial/ApprovalsCenter.jsx',
  'src/commercial/BillingPage.jsx',
  'src/payroll/PayrollControlCenter.jsx',
  'src/analytics/PeopleAnalyticsCenter.jsx',
  'src/security/SecurityCenter.jsx',
  'src/security/PrivacyCenter.jsx',
  'src/integrations/IntegrationsCenter.jsx',
  'src/people/Employee360Panel.jsx',
  'src/people/PerformanceCenter.jsx',
  'src/people/LifecycleCenter.jsx',
  'src/people/SelfServicePanel.jsx',
  'src/people/EmployeeRequestCenter.jsx',
  'src/ops/ExceptionCenter.jsx',
  'public/teconnect-logo.svg',
  'public/manifest.webmanifest',
  'public/_headers',
  'public/sw.js',
  'wrangler.jsonc',
  'capacitor.config.ts',
  'supabase/functions/billing-checkout/index.ts',
  'supabase/functions/billing-change-plan/index.ts',
  'supabase/functions/invite-employee/index.ts',
  'supabase/functions/stripe-webhook/index.ts',
  'supabase/functions/teconnect-api/index.ts',
  'supabase/functions/integration-worker/index.ts',
  'supabase/functions/teconnect-webhook-deliver/index.ts',
  'supabase/functions/teconnect-webhook-test/index.ts',
];

const missing = required.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length) {
  console.error('SaaS contract check failed. Missing: ' + missing.join(', '));
  process.exit(1);
}

const migrationDir = path.join(root, 'supabase', 'migrations');
const migrationFiles = fs.existsSync(migrationDir)
  ? fs.readdirSync(migrationDir).filter((file) => /\\.sql$/i.test(file))
  : [];

if (!migrationFiles.length) {
  console.warn('SaaS contract check warning: SQL migration files are not mirrored in this repository. Production migration state is managed in Supabase.');
}

const clientFiles = required.filter((file) => /^(src\/|public\/)/.test(file) && /\.(jsx?|tsx|mjs|html)$/.test(file));
const source = clientFiles.map((file) => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
const forbidden = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'service_role',
  'sk_live_',
  'sk_test_',
];
const leaks = forbidden.filter((token) => source.includes(token));
if (leaks.length) {
  console.error('SaaS contract check failed. Secret-like token present in client/source bundle: ' + leaks.join(', '));
  process.exit(1);
}

const mobile = fs.readFileSync(path.join(root, 'src/employee/EmployeeMobileWorkspace.jsx'), 'utf8');
for (const token of ["'CLOCK_IN'", "'BREAK_START'", "'BREAK_END'", "'CLOCK_OUT'", "'register_time_entry'", "'get_my_clock_state'"]) {
  if (!mobile.includes(token)) {
    console.error('SaaS contract check failed. Mobile clock contract missing: ' + token);
    process.exit(1);
  }
}

const main = fs.readFileSync(path.join(root, 'src/main.jsx'), 'utf8');
for (const token of ["signUp(", "signInWithPassword(", "resetPasswordForEmail(", "PASSWORD_RECOVERY", "get_my_profile", "OnboardingPage"]) {
  if (!main.includes(token)) {
    console.error('SaaS contract check failed. Auth/onboarding contract missing: ' + token);
    process.exit(1);
  }
}

console.log('SaaS contract check passed: RH desktop, employee mobile, auth, billing, edge functions, security migrations and production assets are present.');
