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
| Engine telemetry, no identifiers | `scan_events` | Measuring the ruleset |
| Detection verdicts | `detection_feedback` | Ground truth for the ruleset |

Tokens are stored as SHA-256 hashes, never in plaintext.

## `scan_events`: one row per scan, PII-free by construction
Written by `netlify/functions/lib/telemetry.js` for **every** scan, anonymous or
signed-in. Before this table existed only signed-in scans persisted anything, so
the engine had no measured record of what it detects or misses.

The row holds the ruleset version, the depth served, per-source success/failure
(`{id, ok}` — the human `detail` string is dropped because it can quote the
fetched URL), the detected signature ids with their strength and confidence,
counts, whether the crawl was blocked and by whom, whether Shopify was
confirmed, the savings-suppression reason, and the crawl duration.

It holds **no** email, IP, account id, scan id, session id, UTM parameter,
referrer, landing page, or submitted spend/goal. It holds no URL of any kind:
`report.crawl.pagesFetched` and `detectedApps[].evidence` both carry storefront
page URLs and neither survives into the row. `lib/telemetry.js`
`SCAN_EVENT_FIELDS` is the whole column set, and `tests/run-tests.js` asserts the
built payload against that literal list, so a field carrying personal data cannot
be added on one side alone.

There is deliberately **no foreign key to `accounts` or `scans`**. Nobody holding
this table can join it back to a customer. The cost of that choice is that
repeat-scan analysis runs on `store_hash` alone and feedback cannot be joined to
the telemetry row it came from; the customer's own full report is already in
`scans` when that detail is needed.

### The storefront hostname
Stored as `store_hash`: HMAC-SHA256 of the normalized hostname (lowercased,
`www.` dropped, port and path discarded), keyed with the `SCAN_TELEMETRY_SALT`
env var. A storefront domain is arguably not personal data, but it names a
customer's business and is their confidential context, and this table is written
for visitors who were never asked for anything. Co-occurrence and repeat-scan
analysis need a stable identifier, not a readable one.

A plain SHA-256 would not do: the set of live domains is small enough to
enumerate, so an unkeyed digest of a hostname is reversible by brute force and
would be pseudonymity in name only. **If `SCAN_TELEMETRY_SALT` is unset,
`store_hash` is `null`** — never a bare digest, because a silent fallback would
store something weaker than `privacy.html` describes. The row is still written;
only repeat-scan analysis is lost, since per-signature frequency and
co-occurrence both read one row at a time.

Set `SCAN_TELEMETRY_SALT` in the Netlify UI to a long random value, and never in
a file. Rotating it makes old and new rows unlinkable — that is a deliberate
side effect, not a bug, and rotation is the fastest way to break the ability to
correlate historic scans.

## `detection_feedback`: identified on purpose
A signed-in customer's verdict on a detection in their own report
(`netlify/functions/detection-feedback.js`). Unlike `scan_events` it carries the
account and scan, because an anonymous verdict is a spam target and a signed-in
customer's judgement is the signal worth having. One row per
`(account_id, scan_id, signature_id)`; re-answering updates the row. It cascades
away with the account on erasure, so it needs no age-based window.

## Automatic cleanup
`cleanup-scheduled.js` runs daily and purges expired magic links, dead sessions,
stale rate-limit rows, and `scan_events` older than
`TELEMETRY_RETENTION_DAYS` (730 days / 24 months, exported from that file). It
does **not** delete scans, accounts, or detection feedback.

24 months is long enough to compare a ruleset against the one before it and to
see a full year of seasonality twice, and it matches the window proposed for
saved scans below, so the two do not contradict each other. The data carries no
identifiers, so the case for keeping it is not a case about a person.

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
usage rows, every saved scan including the full report, and any detection
feedback the customer gave. It deliberately omits hashed auth tokens (the
plaintext does not exist on our side), Stripe's own billing records (card,
charge, invoice, refund), which are held by Stripe, and `scan_events`, which has
no key to match against a person; the file names all three omissions rather than
implying it is everything.

## User-initiated deletion (GDPR/CCPA erasure)
Signed-in users can delete everything from the dashboard "Danger zone", which
calls `account-delete.js` (requires `{confirm:true}`). It first cancels any
still-billing Stripe subscription (`DELETE /v1/subscriptions/{id}`, using
`STRIPE_BILLING_KEY`), then removes detection feedback, scans, sessions, magic
links, usage, subscriptions, then the account row. Foreign keys also cascade.
This is irreversible. It does not touch `scan_events`, which holds nothing that
could be matched to the account being deleted.

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
- `scan_events` is unlinked and identifier-free, so an erasure request cannot
  reach it: there is nothing in the row to match a person against. `privacy.html`
  says exactly that rather than implying deletion covers everything. Confirm the
  reasoning with counsel before launch — under GDPR this is the Art. 11 position,
  and it only holds while the table stays unlinked and `SCAN_TELEMETRY_SALT` is
  a real secret.
- Stripe holds billing records independently per its own retention.
- Set the real retention windows in privacy.html once counsel reviews (the
  `[[placeholders]]` there must be completed first).
