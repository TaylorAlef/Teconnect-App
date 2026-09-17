# Te-connect — Release Runbook

## Scope

This runbook is the release contract for the commercial launch planned for **23 September 2026**.

## 1. Code gate

- `npm run build` must pass.
- `npm run check:branding` must pass.
- `npm run check:globalization` must pass.
- `npm run mobile:check` must pass.
- Native Android and iOS CI generation/build must pass for the release commit.
- No unfinished demo-only path may be the production default.

## 2. Backend/security gate

- Production migration set is current.
- **55/55 public tables currently have RLS enabled.**
- Production diagnostic currently shows **0 public functions executable by `anon`**.
- Review the Supabase security advisor warnings for every SECURITY DEFINER function exposed to `authenticated`.
- Treat provider-level security settings as launch blockers: enable leaked password protection and define/enforce administrator MFA.
- Confirm backups/PITR and retention suitable for paid production.
- Confirm production organization/project is on the required paid plan before accepting customers.

## 3. Globalization gate

- Company settings include country, locale, currency and week-start configuration.
- Localization UI is available to authorized company administrators.
- Dates/times use company timezone at the UI boundary.
- Monetary values use company currency and locale.
- No country-specific employment law is hard-coded into the shared UI core.

## 4. Web production gate

- Verify the Cloudflare production deployment.
- Smoke test `https://app.te-connect.com/` in a clean browser session.
- Test onboarding, employee invitation, clock-in/out, approvals, audit, billing and logout.
- Test a second company to confirm tenant isolation.

## 5. Mobile gate

### Android
- Generate native project in CI — covered.
- Verify native location permissions — covered by CI preparation.
- Configure package/signing.
- Test native GPS on a real Android device.
- Build signed AAB.
- Internal testing in Play Console.

### iOS
- Generate native project in CI — covered.
- Prepare location privacy usage descriptions — covered by CI preparation.
- Configure bundle ID/signing.
- Test native GPS on a real iPhone.
- TestFlight validation.

## 6. Commercial gate

- Live Stripe products/prices confirmed.
- Trial, upgrade, downgrade and cancellation verified.
- Pricing/limits finalized.
- Terms, privacy, retention and support contacts published.

## 7. Launch-day sequence — 23/09/2026

1. Upgrade/verify Supabase Pro and required Auth security settings.
2. Re-run advisors and critical smoke tests.
3. Verify production web deployment.
4. Run real-account Web smoke test.
5. Complete signed Android/iOS verification for the launch scope.
6. Confirm billing path.
7. Freeze and tag the release commit.
8. Publish/announce the release.
9. Keep rollback path and support contact available.
