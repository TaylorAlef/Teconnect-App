# Te-connect — Production Launch Gate

## Required before accepting paying companies

### Cloudflare
- [ ] GitHub Actions secret `CLOUDFLARE_API_TOKEN`
- [ ] GitHub Actions secret `CLOUDFLARE_ACCOUNT_ID`
- [ ] Token has the minimum Workers deployment permissions for the Te-connect account
- [ ] `app.te-connect.com` remains the production Custom Domain
- [ ] First production deployment completes through `npx wrangler deploy`
- [ ] Production smoke verifies homepage, manifest and HD hero asset

### Supabase Auth
- [ ] Enable leaked-password protection in Auth settings
- [ ] Confirm email verification policy for production
- [ ] Test password reset end-to-end

### Billing
- [x] Live Stripe account connected to Te-connect
- [x] STARTER live price: EUR 49/month
- [x] BUSINESS live price: EUR 99/month
- [x] ENTERPRISE live price: EUR 249/month
- [ ] Configure/verify `STRIPE_SECRET_KEY` in Edge Function secrets
- [ ] Configure/verify `STRIPE_WEBHOOK_SECRET` in Edge Function secrets
- [ ] Complete one controlled live Checkout -> webhook -> subscription-state test

### SaaS acceptance flow
- [ ] Company signup
- [ ] Email confirmation
- [ ] Company onboarding
- [ ] Company setup
- [ ] Employee invitation
- [ ] Employee activation
- [ ] Work schedule / location configuration
- [ ] Mobile clock-in
- [ ] Attendance calculation
- [ ] Vacation/absence request and approval
- [ ] Audit trail
- [ ] Billing state enforcement

## Deployment rule

A production deployment must not silently skip. The Cloudflare workflow intentionally fails when its required Cloudflare secrets are missing.

## Current verified state

- Supabase production project is ACTIVE_HEALTHY.
- Live Stripe prices exist and are active.
- GitHub CI passed on the current production branch before the final deployment-gate change.
- The Cloudflare deployment workflow exists and targets the production Custom Domain.
