# Teconnect — Next-Gen Production Blueprint

## Target architecture

```text
React/Vite
  ├─ Product shell / Command Palette / Design tokens
  ├─ Supabase Auth session
  ├─ RLS-scoped Data API
  └─ Supabase Realtime (company_id filter)
             │
             ▼
PostgreSQL / Supabase
  ├─ company_id tenant boundary
  ├─ attendance + geofence authority
  ├─ shifts / attendance_days / overtime / payroll
  ├─ HR alerts / tasks / audit
  ├─ subscriptions / feature gates
  └─ integration_jobs → integration_job_attempts
             │
             ▼
Supabase Edge Functions
  └─ integration-worker
       ├─ HMAC signed outbound requests
       ├─ idempotency key
       ├─ retry/backoff
       └─ append-only attempt audit
             │
             ├─ SAP / SuccessFactors adapter endpoint
             ├─ PHC adapter endpoint
             ├─ Primavera adapter endpoint
             └─ Oracle adapter endpoint
```

## Frontend principles

- One tenant context per authenticated profile.
- No client-side mock data in the operational dashboard.
- Database is authoritative for geofence acceptance, subscription limits and tenant isolation.
- Realtime changes trigger a debounced data refresh instead of polling or manual refresh.
- `Ctrl/Cmd + K` opens the universal command palette.
- The command palette is navigation/action oriented; it never pretends to complete an operation that is not implemented.
- Respect `prefers-reduced-motion` and keep the product usable without animation.

## Realtime contract

Critical tables are registered in `supabase_realtime` and the client subscribes with `company_id=eq.<tenant>` filters:

- employees
- time_entries
- attendance_days
- vacation_requests
- overtime_records
- timesheet_adjustments
- hr_alerts
- hr_tasks
- hr_task_audit
- payroll_runs
- payroll_items
- notifications
- integration_jobs
- shift_assignments
- shifts
- picagens

RLS remains the authorization boundary for Postgres Changes. Do not expose unfiltered company data to the browser.

## Geofence contract

`register_time_entry(...)` is the database authority.

1. Resolve the authenticated user's profile and company.
2. Resolve the employee bound to that user.
3. Require latitude, longitude and work location.
4. Require the work location to belong to the same company and be active.
5. Calculate the great-circle distance in PostgreSQL.
6. Reject when `distance >= gps_radius_m`.
7. Insert only a `VALID` entry when the check passes.
8. Recalculate the attendance day immediately.

The frontend should request GPS permission and show the reason for rejection, but it must never be the final security decision.

## Integration worker

Required production secrets:

- `INTEGRATION_WORKER_SECRET` — protects the worker trigger when platform JWT verification is disabled for a service-to-service schedule.
- `SAP_WEBHOOK_URL` / `SAP_WEBHOOK_SECRET`
- `PHC_WEBHOOK_URL` / `PHC_WEBHOOK_SECRET`
- `PRIMAVERA_WEBHOOK_URL` / `PRIMAVERA_WEBHOOK_SECRET`
- `ORACLE_WEBHOOK_URL` / `ORACLE_WEBHOOK_SECRET`
- `DEFAULT_WEBHOOK_URL` / `DEFAULT_WEBHOOK_SECRET`

The worker signs each request with HMAC-SHA-256 and sends `Idempotency-Key`, `X-Teconnect-Job-Id`, `X-Teconnect-Timestamp` and `X-Teconnect-Signature` headers.

The actual SAP/PHC/Primavera/Oracle connector endpoints remain customer-specific. Teconnect provides the queue, security, retry and audit contract; provider-specific credentials and API mappings must be configured per tenant.

## Netlify production

`netlify.toml` contains:

- `npm run build` → `dist`
- SPA rewrite `/* → /index.html` with status 200
- security headers
- `geolocation=(self)` so browser geofencing is not disabled by the hosting layer
- long-lived immutable cache for `/assets/*`
- no-cache/revalidate for `/index.html`

`index.html` uses `robots=index,follow` and contains no `noindex`/`nofollow` directive.

## Commercial model

The existing commercial layer remains the source of truth for plan/tier UI:

- Starter
- Business
- Enterprise

Billing status, limits and feature flags are evaluated server-side. The frontend only renders the corresponding UX state and upgrade path.

Stripe live billing still requires the production price IDs and webhook/secret configuration; this repository does not claim that those live credentials are configured.

## Deployment gate

Before presenting a build as production-ready, verify:

1. `npm run build` passes.
2. Login and company onboarding pass.
3. A second tenant cannot read the first tenant's rows.
4. A valid geofence point is accepted and an outside point is rejected by the database.
5. Realtime shows `SUBSCRIBED` and a change in one session appears in another session.
6. Starter feature locks are enforced by backend feature checks, not only UI hiding.
7. Integration failures move through retry/backoff and are visible in `integration_job_attempts`.
8. Netlify production points at the intended Git commit.
