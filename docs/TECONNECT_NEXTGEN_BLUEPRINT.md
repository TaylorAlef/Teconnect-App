# Te-connect — Next Generation Blueprint

## Product direction

Te-connect is being built as a global People OS rather than a Portugal-only HR application.

## Core platform

- Multi-tenant company isolation
- Role-based access and audited workflows
- Attendance and geofence validation
- Employee self-service
- People 360 and performance
- Payroll preparation
- Enterprise API and webhooks
- Billing and subscription controls
- Global localization layer

## Global architecture

The global layer separates:

- country;
- language/locale;
- currency;
- timezone;
- week start;
- country-specific HR policy modules.

Dates, times, numbers and currency must be formatted at the application boundary. Formatted strings must never be persisted as canonical values.

## Rollout sequence

### Phase 1 — 23 September 2026 launch gate

Release the production web product after the external Supabase, Auth, billing and runtime checks pass.

### Phase 2 — international activation

Activate localized UI and company settings market-by-market, beginning with Portuguese, English, Spanish, French and German.

### Phase 3 — regional scale

Introduce additional country-specific legal/policy modules only after they are separately verified. Do not encode a country’s employment-law assumptions into shared core workflows.

## Scale path

The core is designed so regional data residency, additional database regions, SSO/SAML, event-driven webhooks and deeper observability can be added without rebuilding the product model.
