# Scout — Setup & Deploy (build v2)

This build turns the static V10 site into a working product: real multi-source
scanning, accounts, entitlements, quotas, saved scans, and a dashboard.

## What changed vs V10 (summary)

- **Integrity**: savings computed only from detected apps (never the ad-spend
  dropdown); spend-tier `includes()` bug fixed in server AND client; PayPal's
  invented $80/mo cost removed; "all 15 sources" replaced everywhere with the
  honest "10 live / 15 planned" and a public methodology page.
- **Security**: DNS-rebinding closed via connect-time lookup guard; redirects
  re-validated per hop; rate limit keyed on IP only, with optional shared
  store; non-http(s) schemes rejected; magic-link tokens stored hashed.
- **Product**: Stripe webhook → account + subscription + emailed sign-in link;
  monthly quotas enforced server-side (operator 10 / director 30, from
  `netlify/functions/lib/plans.js`; `command` is a retired tier);
  free anonymous scans return TEASER depth, paid returns FULL depth with
  evidence trails; scans persist to a dashboard with before/after compare and
  print-to-PDF.

## Environment variables (Netlify → Site settings → Environment)

| Variable | Required for | Notes |
|---|---|---|
| `SUPABASE_URL` | accounts/quotas/persistence | e.g. `https://xyz.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | same | Service role (server-only; never expose client-side) |
| `STRIPE_WEBHOOK_SECRET` | payments → entitlements | From the Stripe webhook endpoint config |
| `STRIPE_PRICE_OPERATOR` / `STRIPE_PRICE_DIRECTOR` | plan mapping | Stripe price IDs for the two live plans |
| `STRIPE_PRICE_COMMAND` | nothing — **retired** | The `command` tier was withdrawn (`/checkout-command*` 301s in `netlify.toml`). No code reads this var; delete it if it is set |
| `STRIPE_SECRET_KEY` | automatic plan resolution (optional) | **Restricted, read-only key** with `checkout_sessions:read` + `prices:read` only. Lets the webhook ask Stripe which price the buyer actually paid, so Director purchases resolve to `director` with no metadata wiring. Never use a full secret key here |
| `STRIPE_BILLING_KEY` | cancelling billing on account deletion (optional) | **Restricted key, separate from `STRIPE_SECRET_KEY`**, with exactly one permission: **Subscriptions → write** (Stripe grants read alongside write; grant nothing else). Used only by `account-delete.js` to `DELETE /v1/subscriptions/{id}` before erasing rows. Kept apart from the webhook's read-only key on purpose: the webhook is a public, unauthenticated endpoint and must never hold write access to billing. Without this var, an account with a live subscription cannot self-delete — it is refused with a pointer to the Customer Portal (see below) |
| `RESEND_API_KEY` | sign-in + fulfillment emails | Without it, links are logged to function logs only |
| `AUTH_EMAIL_FROM` | email sender | e.g. `Scout <login@yourdomain>` (domain must be verified in Resend) |
| `GHL_WEBHOOK_URL` | lead forwarding (optional) | unchanged from V10 |
| `SCAN_TELEMETRY_SALT` | linking a store's scans in `scan_events` (optional) | Long random secret, HMAC key for the storefront hostname digest in `lib/telemetry.js`. **Unset means `store_hash` is stored as null**, never a bare SHA-256 — an unkeyed hostname digest is brute-forceable from a domain list, and `privacy.html` promises better than that. Telemetry is still written without it; only repeat-scan analysis is lost. Rotating it makes old and new rows unlinkable, on purpose. See `docs/DATA-RETENTION.md` |

The site degrades gracefully: with no env vars set, free teaser scans still
work; accounts/persistence simply stay off.

## Deploy steps

1. **Supabase**: create a project → SQL editor → run `supabase/schema.sql`.
2. **Stripe**: Dashboard → Webhooks → add endpoint
   `https://<your-site>/.netlify/functions/stripe-webhook` with events
   `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `invoice.payment_failed`, `invoice.paid`.
   Copy the signing secret to `STRIPE_WEBHOOK_SECRET`. Set the two price-ID
   vars. (Duplicate deliveries are de-duped by event id; failed payments move
   the subscription to `past_due`, which suspends access until `invoice.paid`.)

   **Plan resolution is mandatory to get right — it decides what the buyer is
   entitled to.** The webhook resolves the plan in this order: `metadata[plan]`,
   `metadata[github_scout_plan]`, `metadata[price_id]`, then the Stripe API.
   It never falls back to a default tier; an unresolved purchase is written with
   `plan: unresolved` / `status: needs_review`, the buyer still gets their
   sign-in email, and scans return 403 until a human fixes the row.
   - **With `STRIPE_SECRET_KEY` set** (restricted, read-only — see the table
     above), resolution is automatic: the webhook reads the session's line items
     and maps the price back to a plan. Nothing else is needed.
   - **Without it**, every Payment Link **must** carry
     `metadata[plan]=operator` or `metadata[plan]=director`. Stripe does not
     copy Payment Link metadata onto the checkout session unless the link is
     configured to, so verify on a real test-mode purchase that the resulting
     `subscriptions` row shows the plan you sold.
2b. **Stripe Customer Portal** (owner action, Dashboard only): Settings →
   Billing → Customer portal → enable cancellation and payment-method updates →
   create a login link. Paste it into `stripeCustomerPortalUrl` in
   `assets/launch-config.js`. Until it is filled in, the "Manage billing or
   cancel" controls on `dashboard.html` and `refunds.html` are removed from the
   page (never rendered as dead links) and a support fallback is shown instead.
   Selling a subscription online without a working online cancel path is not
   allowed under California's Automatic Renewal Law, so treat this as required
   before the first live sale, not optional polish. Set `STRIPE_BILLING_KEY`
   (table above) at the same time so account deletion can cancel billing itself.
3. **Resend** (or swap the small `sendMagicEmail` function for your ESP):
   verify your sending domain, set `RESEND_API_KEY` + `AUTH_EMAIL_FROM`.
4. **Netlify**: set env vars, deploy this directory.
5. **Verify live** (cannot be tested from the build sandbox — its egress is
   proxied, which the SSRF-guarded direct fetch correctly refuses):
   - `bun tests/run-tests.js` (68 tests, no network needed)
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
                │        lib/adapters.js    (10 live sources)
                │        lib/aggregate.js   (detect → corroborate → report)
                │        lib/rules.js       (versioned signatures + cited benchmarks)
                ▼
           Supabase (accounts, sessions, subscriptions, scans, usage, rate_limits)
                ▲
 stripe-webhook.js ◄── Stripe (checkout + subscription lifecycle)
 auth-*.js        ◄── magic-link sign-in (tokens stored hashed)
 dashboard-data.js ──► saved scans, detail, compare
```
