# Scout — Setup & Deploy (build v2)

This build turns the static V10 site into a working product: real multi-source
scanning, accounts, entitlements, quotas, saved scans, and a dashboard.

## What changed vs V10 (summary)

- **Integrity**: savings computed only from detected apps (never the ad-spend
  dropdown); spend-tier `includes()` bug fixed in server AND client; PayPal's
  invented $80/mo cost removed; "all 15 sources" replaced everywhere with the
  honest "9 live / 15 planned" and a public methodology page.
- **Security**: DNS-rebinding closed via connect-time lookup guard; redirects
  re-validated per hop; rate limit keyed on IP only, with optional shared
  store; non-http(s) schemes rejected; magic-link tokens stored hashed.
- **Product**: Stripe webhook → account + subscription + emailed sign-in link;
  monthly quotas enforced server-side (operator 10 / command 30 / director 100);
  free anonymous scans return TEASER depth, paid returns FULL depth with
  evidence trails; scans persist to a dashboard with before/after compare and
  print-to-PDF.

## Environment variables (Netlify → Site settings → Environment)

| Variable | Required for | Notes |
|---|---|---|
| `SUPABASE_URL` | accounts/quotas/persistence | e.g. `https://xyz.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | same | Service role (server-only; never expose client-side) |
| `STRIPE_WEBHOOK_SECRET` | payments → entitlements | From the Stripe webhook endpoint config |
| `STRIPE_PRICE_OPERATOR` / `STRIPE_PRICE_COMMAND` / `STRIPE_PRICE_DIRECTOR` | plan mapping | Stripe price IDs |
| `RESEND_API_KEY` | sign-in + fulfillment emails | Without it, links are logged to function logs only |
| `AUTH_EMAIL_FROM` | email sender | e.g. `Scout <login@yourdomain>` (domain must be verified in Resend) |
| `GHL_WEBHOOK_URL` | lead forwarding (optional) | unchanged from V10 |

The site degrades gracefully: with no env vars set, free teaser scans still
work; accounts/persistence simply stay off.

## Deploy steps

1. **Supabase**: create a project → SQL editor → run `supabase/schema.sql`.
2. **Stripe**: Dashboard → Webhooks → add endpoint
   `https://<your-site>/.netlify/functions/stripe-webhook` with events
   `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `invoice.payment_failed`, `invoice.paid`.
   Copy the signing secret to `STRIPE_WEBHOOK_SECRET`. Set the three price-ID
   vars. (Duplicate deliveries are de-duped by event id; failed payments move
   the subscription to `past_due`, which suspends access until `invoice.paid`.)
3. **Resend** (or swap the small `sendMagicEmail` function for your ESP):
   verify your sending domain, set `RESEND_API_KEY` + `AUTH_EMAIL_FROM`.
4. **Netlify**: set env vars, deploy this directory.
5. **Verify live** (cannot be tested from the build sandbox — its egress is
   proxied, which the SSRF-guarded direct fetch correctly refuses):
   - `node tests/run-tests.js` (40 tests, no network needed)
   - `netlify dev` → POST a scan for a real Shopify store → expect
     `sources.succeeded ≥ 7`, detections with evidence, teaser depth.
   - Stripe test-mode checkout → webhook fires → row in `subscriptions` →
     sign-in email arrives → dashboard scan returns `depth: full` and
     decrements quota.

## Manual account actions still on you (unchanged, still blocking)

1. Rotate/revoke the previously committed live Stripe key; make the repo private.
2. Verify `support@githubscout.ai` actually receives mail.
3. Legal entity + jurisdiction in terms/privacy; counsel review before paid ads.
4. The "GitHub Scout" name remains a trademark risk — rename before scaling spend.

## Architecture

```
Browser ──► operator-url-analysis.html / dashboard.html
                │ (form POST / fetch)
                ▼
 operator-url-scan.js ──► lib/guard.js      (SSRF-pinned fetch, rate limit)
                │        lib/adapters.js    (9 live sources)
                │        lib/aggregate.js   (detect → corroborate → report)
                │        lib/rules.js       (versioned signatures + cited benchmarks)
                ▼
           Supabase (accounts, sessions, subscriptions, scans, usage, rate_limits)
                ▲
 stripe-webhook.js ◄── Stripe (checkout + subscription lifecycle)
 auth-*.js        ◄── magic-link sign-in (tokens stored hashed)
 dashboard-data.js ──► saved scans, detail, compare
```
