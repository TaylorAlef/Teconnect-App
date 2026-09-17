# Te-connect — Pre-Sale Gate

## Technical gate status — 2026-09-17

### Passed
- Production frontend CI: `npm install`, production build and branding guard pass on `main`.
- Public schema tables: 55/55 have Row Level Security enabled.
- Public RLS policies: 0 remain.
- Anonymous executable public functions: 0 remain.
- Privileged HR operational tables use authenticated-only SELECT policies.
- HR task and payroll UPDATE policies require the same tenant + HR/admin boundary in both `USING` and `WITH CHECK`.
- Residual anonymous grants on legacy application RPCs were removed.
- Trigger-only functions are no longer callable as RPC endpoints.
- Unauthenticated direct-call sanity checks reject protected operations before any business action.

### Role test — blocked until real auth users exist
Current production data does not contain a complete role matrix. The current profile inventory contains only `COMPANY_ADMIN` users; the employee table currently contains two active employees with no linked auth users.

Required runtime matrix:
- EMPLOYEE
- GESTOR
- SUPERVISOR
- RH
- COMPANY_ADMIN
- SUPER_ADMIN

Do not create detached `profiles` rows as a substitute for real Auth users. The runtime matrix must use actual `auth.users` identities linked to the corresponding profiles and employees.

### Remaining manual launch gates
- Enable Supabase leaked password protection.
- Decide and document MFA enforcement policy for customer administrators.
- Upgrade Supabase to Pro before onboarding paying customers.
- Verify production Cloudflare deployment and run browser smoke tests against the public domain.
- Finalize pricing/limits, terms, privacy, retention and support documentation.

## Security note
Supabase may still report generic `SECURITY DEFINER` warnings for intentionally exposed authenticated RPCs. These should be reviewed function-by-function; the presence of the warning alone is not treated as evidence of a tenant-isolation failure.
