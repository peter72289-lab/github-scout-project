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

## Refunds and cancellations (SOP)

`refunds.html` promises a 14-day first-month refund and that cancellation stops
future renewals. This is how that promise is kept. Budget 10 minutes.

**0. The clock you published**

`support.html` promises a first reply within one business day, Monday to Friday,
and says a refund decision comes in that first reply. That is the commitment;
this SOP has to fit inside it. If the queue ever cannot, change the page first
rather than quietly missing it.

**1. Check, before touching Stripe**

- Stripe → Customers → search the email they paid with. Note the subscription
  id, the plan, the first charge date, and whether it has already renewed.
- Is the request inside 14 days of the **first** charge? Later renewals are not
  covered by the launch guarantee — cancel, and refund only if you choose to or
  the law requires it.
- Supabase → `subscriptions` for that `account_id`: `status` and `plan` must
  match what Stripe says. A mismatch means a webhook was missed; fix the row.

**2. Cancel**

- Preferred: the customer cancels themselves in the Stripe Customer Portal
  (`stripeCustomerPortalUrl` in `assets/launch-config.js`; the dashboard and
  `refunds.html` link to it). Self-serve cancellation is what California's ARL
  requires, so keep that link working.
- If you cancel for them: Stripe → the subscription → Cancel subscription →
  immediately (not at period end) when a refund is being issued. The
  `customer.subscription.deleted` webhook moves the row to `canceled`; confirm
  it did. If it did not, set `status = 'canceled'` on the row by hand.

**3. Refund**

- Stripe → Payments → the charge → Refund → full amount for a guarantee
  request. Reason: "requested by customer". Partial refunds only for a
  pro-rated case you have already agreed in writing.
- Refunds land in 5-10 business days. Say that, do not say "immediately".

**4. Quota**

- Leave `usage` alone. The scans they ran were delivered, the counter is a
  record of that, and it resets next period anyway. Deleting rows to "give the
  quota back" makes the usage history lie for no benefit.
- Access follows the subscription: once the row is `canceled`,
  `lib/auth.js:currentAccount` stops returning it and scans drop to free depth.
  Their saved scans stay readable in the dashboard.

**5. Reply**

Plain, no upsell:

> Your Scout subscription is cancelled — no further charges. I've refunded
> $17.00 to the card you paid with; Stripe usually shows it in 5-10 business
> days. Your saved scans stay in your dashboard, and you can export or delete
> everything from there any time. If something specific missed the mark, I'd
> like to hear it.

**6. Record**

- Stripe → the customer → add a note: date, reason in the customer's words,
  refund amount, who approved it.
- If the reason was a product failure (bad detections, a blocked crawl they were
  still charged for), open an issue — a refund reason is the cheapest bug report
  you will get.

**Deletion during an active subscription.** `account-delete.js` cancels with
Stripe before it removes any row, and aborts the deletion if that cancel fails,
so a deleted account can never strand a live subscription. If a customer reports
a failed deletion: check `STRIPE_BILLING_KEY` is set and in the same mode
(test/live) as the subscription, cancel the subscription by hand, then have them
retry from the dashboard.

## Escalation data to capture
Timestamp, affected function, `health` output, a sample failing request id from
Netlify logs, and whether a deploy or config change preceded it.
