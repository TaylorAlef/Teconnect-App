# TE-Connect critical E2E

This suite is intentionally **staging-only**. It exercises the highest-risk commercial path:

1. New company signs up and completes the real onboarding.
2. Admin/RH opens the real employee access flow and sends the real invite function.
3. The employee link is confirmed in `employees.user_id`.
4. A server-side `register_time_entry` call is made with coordinates outside the configured geofence and must be rejected.
5. A real Playwright browser is given the outside coordinates and must show the client-side geofence rejection.
6. The browser is moved to the configured work location and the real employee punch is accepted.
7. `recalculate_attendance_day` is executed and the resulting `attendance_days` row is checked.
8. The original admin/RH browser opens Ponto and verifies that the employee is visible in the operational attendance UI.

The test uses a unique tenant per run.

## Required staging environment

Create a **second Supabase project** for E2E/staging. Apply the same migrations used by production before running this suite.

Never point these variables at the production project:

- `SUPABASE_STAGING_URL`
- `SUPABASE_STAGING_SERVICE_ROLE_KEY`
- `SUPABASE_STAGING_PUBLISHABLE_KEY`

The runner has a hard stop for the known production project ref `kegmysndcrytlsuclhsq` and also requires `E2E_ALLOW_STAGING=true`.

The service-role key is used only by the Node test runner for controlled test setup/verification. It is never injected into the browser. Supabase documents admin user operations such as `updateUserById` as server-only operations; the secret key must never be exposed in a browser. citeturn3search0turn3search5

## Local run

Install dependencies and the Chromium browser:

```bash
npm install
npx playwright install chromium
```

Set:

```bash
E2E_ALLOW_STAGING=true
PLAYWRIGHT_TEST_BASE_URL=https://<staging-te-connect-host>
SUPABASE_STAGING_URL=https://<staging-project>.supabase.co
SUPABASE_STAGING_PUBLISHABLE_KEY=...
SUPABASE_STAGING_SERVICE_ROLE_KEY=...
```

Then:

```bash
npm run test:e2e:critical
```

Playwright supports context-level geolocation and permissions, which is what this suite uses to move the browser between the negative and positive GPS positions. citeturn0search0turn0search1

## Invitation email

The UI still calls the production-equivalent `invite-employee` Edge Function. The test does **not** consume a real mailbox. After the invitation is created, the staging-only service-role helper:

- confirms the invited Auth user;
- sets a known test password;
- then the employee logs in through the normal TE-Connect login screen.

This verifies the backend invitation/linking path without making the E2E suite depend on an external email provider. The invitation itself remains the same Auth Admin invitation flow used by the application. citeturn3search1turn3search5

## MFA

The admin E2E also exercises the current mandatory TOTP gate. The test reads the one-time TOTP secret from the enrollment screen and generates the six-digit code locally. It does not disable MFA or inject an AAL claim.

That keeps the commercial E2E representative of the current administrative login flow.

## CI

The GitHub Actions workflow runs this suite only when the staging secrets are available. It installs Chromium and its Linux dependencies, runs with one worker, and uploads the Playwright HTML report and failure traces.

Playwright recommends installing browsers/dependencies in CI and using a single worker when stability and reproducibility are the priority. citeturn1search0turn1search4

## Safety

Do not add production credentials to GitHub Actions.

Recommended repository secrets:

- `E2E_BASE_URL`
- `SUPABASE_STAGING_URL`
- `SUPABASE_STAGING_PUBLISHABLE_KEY`
- `SUPABASE_STAGING_SERVICE_ROLE_KEY`

The suite intentionally fails closed when staging is not explicitly enabled.
