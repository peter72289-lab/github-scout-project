# Data retention & deletion

## What's stored
| Data | Table | Purpose |
|---|---|---|
| Email | `accounts` | Login identity, billing |
| Sign-in tokens (hashed) | `magic_links` | Passwordless auth |
| Session tokens (hashed) | `sessions` | Keeping you signed in |
| Subscription status | `subscriptions` | Entitlement |
| Saved scan reports | `scans` | Dashboard history |
| Monthly counters | `usage` | Quota enforcement |
| Stripe event ids | `stripe_events` | Webhook idempotency |

Tokens are stored as SHA-256 hashes, never in plaintext.

## Automatic cleanup
`cleanup-scheduled.js` runs daily and purges expired magic links, dead sessions,
and stale rate-limit rows. It does **not** delete scans or accounts.

## Data that leaves our stores: the lead webhook
`operator-url-scan.js:25` (`sendWebhook`) POSTs the submitted enquiry — email,
storefront URL, spend ranges, stated goal, UTMs, landing page, referrer, and the
scan summary — to `GHL_WEBHOOK_URL` or `LEAD_WEBHOOK_URL`. Neither is recorded as
set on the live sites (`../../docs/ARCHITECTURE.md`, env table); with neither set
the function returns `not_configured` and forwards nothing. Confirm in the
Netlify UI before answering a data-subject request either way.
Setting one makes the receiving CRM a subprocessor, so it is disclosed
on `subprocessors.html` with that "only when configured" qualifier.

Consequence for erasure: `account-delete.js` clears our Supabase rows, it cannot
recall a copy already delivered to a CRM. If the webhook is ever switched on,
an erasure request has to be carried out in that CRM too, by hand, as part of
the same request. Do not turn it on without adding that step to the SOP.

## User-initiated export (GDPR/CCPA access)
Signed-in users can download their own data from the dashboard "Billing and your
data" panel, which calls `account-export.js` (GET, session cookie, JSON
attachment). It returns the account row, subscription plan/status/dates, monthly
usage rows, and every saved scan including the full report. It deliberately
omits hashed auth tokens (the plaintext does not exist on our side) and Stripe's
own billing records (card, charge, invoice, refund), which are held by Stripe;
the file names both omissions rather than implying it is everything.

## User-initiated deletion (GDPR/CCPA erasure)
Signed-in users can delete everything from the dashboard "Danger zone", which
calls `account-delete.js` (requires `{confirm:true}`). It first cancels any
still-billing Stripe subscription (`DELETE /v1/subscriptions/{id}`, using
`STRIPE_BILLING_KEY`), then removes scans, sessions, magic links, usage,
subscriptions, then the account row. Foreign keys also cascade. This is
irreversible.

Deletion is refused, with nothing removed, when the subscription is still
billing and either `STRIPE_BILLING_KEY` is unset or the cancel call fails.
Deleting the `subscriptions` row while Stripe keeps charging would strand the
subscription: `stripe-webhook.js` drops lifecycle events it cannot match to a
row, so nothing could ever reconcile it. The customer cancels in the Customer
Portal first, then deletes.

For requests by email instead of self-service, verify identity (they must
control the account email — e.g. complete a sign-in) before deleting.

## Retention defaults to review with counsel
- Scans persist until the user deletes them. Consider a max age (e.g. 24 months)
  for inactive accounts.
- Stripe holds billing records independently per its own retention.
- Set the real retention windows in privacy.html once counsel reviews (the
  `[[placeholders]]` there must be completed first).
