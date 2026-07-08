# Ops runbook — rollback & incidents

## Health check first
`GET /.netlify/functions/health` returns which subsystems are configured
(`database`, `stripe_webhook`, `stripe_prices`, `email`) as booleans and a
`productionReady` flag. Start every incident here.

## Rollback a bad deploy
Netlify keeps every deploy. To revert:
1. Netlify → the site → Deploys → find the last good deploy.
2. "Publish deploy" on it. Instant rollback; no rebuild.
Functions and static assets roll back together.

## Common incidents

**Sign-in links not arriving**
- `health` shows `email:false` → set `RESEND_API_KEY`/`AUTH_EMAIL_FROM`.
- `email:true` but still missing → check Resend dashboard for bounces; verify
  SPF/DKIM (see EMAIL-DNS-SETUP.md). Links also expire in 15 min.

**Purchases not unlocking full reports**
- Check Stripe → Webhooks → the endpoint's recent deliveries for non-2xx.
- `health` shows `stripe_webhook:false` → `STRIPE_WEBHOOK_SECRET` missing.
- Confirm the buyer's email matches their account email (entitlement is keyed on email).
- Look for the `subscriptions` row; status must be `active` or `trialing`.

**Scanner returning no sources / errors on every store**
- Likely outbound egress or a bad deploy. Test `health`, then scan a known
  Shopify store. If all sources fail, check Netlify function logs for fetch errors.

**Scanner being abused as a proxy**
- Rate limit is IP-keyed. If Supabase is configured, `rate_limit_hit` enforces
  across instances. Tighten `RATE_LIMIT_MAX` in `lib/guard.js` if needed and redeploy.

**Suspected secret leak**
- Rotate immediately (Stripe key, Supabase service role). See SECRETS-PURGE.md.
- Rotating the Supabase service role invalidates the app's DB access until the
  new key is set in Netlify env — expect brief downtime; do it deliberately.

## Escalation data to capture
Timestamp, affected function, `health` output, a sample failing request id from
Netlify logs, and whether a deploy or config change preceded it.
