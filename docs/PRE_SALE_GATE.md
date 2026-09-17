# Te-connect — Pre-sale Gate

The product is being prepared for a 23 September 2026 launch. This document tracks the gates that must be closed before accepting paying customers.

## Passed / prepared

- Multi-tenant RLS/security hardening completed and negative authorization tests exist.
- P0 onboarding and attendance loop implemented.
- Employee access, self-service, approvals, audit, payroll preparation and enterprise API/webhook foundations implemented.
- Capacitor Android/iOS foundations and native GPS adapter merged.
- Global Foundation V1 merged; production localization schema added with safe Portugal defaults.
- Global V2 localization UI is under CI review.

## Must be closed before paid launch

1. Real authenticated E2E users in the isolated test environment and browser login matrix for Company Admin, RH, Gestor, Supervisor, Employee and a second company.
2. Enable Supabase leaked password protection.
3. Decide and enforce administrator MFA.
4. Upgrade production Supabase to Pro.
5. Re-run security/performance advisors after the upgrade and review every externally executable SECURITY DEFINER function intentionality.
6. Verify the production edge deployment and browser smoke test on `https://app.te-connect.com/`.
7. Finalize pricing, limits, terms, privacy, retention and support policies.
8. Complete at least one signed mobile runtime path (Android or iOS) with real GPS attendance testing before declaring mobile launch complete.

## Launch principle

Do not use production data as an E2E fixture. Use the isolated test project for synthetic security and role tests, and use production only for final smoke tests with real authorized accounts.
