# GitHub Scout: Architecture

Technical map of the canonical build, `netlify-v10-githubscout-ecommerce/` (`v10/` below). All paths, line numbers, and env var names were verified by reading or grepping the code on 2026-08-20. Product context is in `docs/PRODUCT-OVERVIEW.md`; the ranked gap list is in `docs/GAP-TO-MARKET.md`.

## System diagram

```
Browser (static HTML on Netlify CDN; netlify.toml publish = ".")
 |
 |-- operator-shopify-savings.html --POST intent=lead----> operator-url-scan ----> GHL_WEBHOOK_URL (optional)
 |     \--redirect--> operator-url-analysis.html --POST intent=analyze--> operator-url-scan
 |-- login.html --POST--> auth-request-link --(email via Resend)--> auth-verify --302--> dashboard.html
 |-- dashboard.html --fetch--> auth-me, dashboard-data, operator-url-scan (intent=scan), account-delete, auth-logout
 |-- checkout-operator.html / checkout-director.html --> buy.stripe.com Payment Links (assets/launch-config.js); no server
 |-- agency-pricing.html, customer-onboarding.html, checkout backup intake --> Netlify Forms (no consumer in repo)
 |
Netlify Functions (v10/netlify/functions/*.js, CommonJS, zero npm dependencies)
 |-- operator-url-scan --> lib/guard (SSRF-pinned fetch, IP rate limit)
 |                     --> lib/adapters (10 live sources) --> lib/aggregate (detect, score, savings) <-- lib/rules (65 signatures)
 |                     --> lib/auth.currentAccount (session cookie) --> lib/supabase (REST, service role)
 |-- stripe-webhook <-- Stripe events (manual HMAC verify) --> accounts / subscriptions / stripe_events --> lib/auth.sendMagicEmail
 |-- auth-request-link, auth-verify, auth-me, auth-logout, dashboard-data, account-delete, cleanup-scheduled (@daily), health
 |
Supabase Postgres (v10/supabase/schema.sql)
   accounts, magic_links, sessions, subscriptions, scans, usage, rate_limits, stripe_events
   RPCs: usage_increment, rate_limit_hit. RLS enabled on every table, no policies (service role bypasses).
```

Every piece of the Supabase, Stripe-webhook, and Resend path is coded but has never been deployed; production still serves the pre-v2 build (see `docs/GAP-TO-MARKET.md` B1).

## Netlify functions (`v10/netlify/functions/`)

| Function               | Method                             | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `operator-url-scan.js` | POST (form-encoded)                | Rate limits by IP (`checkRateLimitShared`). `intent=lead` forwards the submission to the lead webhook and returns. Otherwise resolves the session; if an active subscription exists, calls `usage_increment` (`:41`, before the crawl) and sets `depth='full'`, else `teaser`. Runs `runAdapters` (`:87`), `buildReport`, persists to `scans` for signed-in users, forwards a summary to the lead webhook, returns `{analysis, scanId, usage, authenticated, entitled}`. `PLAN_QUOTAS = {operator:10, command:30, director:100}` at `:13`. |
| `stripe-webhook.js`    | POST                               | Verifies `Stripe-Signature` with HMAC-SHA256, 300s tolerance, `timingSafeEqual` (`:22-33`). Idempotency via insert into `stripe_events` (`:58-69`). `checkout.session.completed`: get-or-create account, resolve plan from `session.metadata.price_id` then `session.metadata.plan`, default `operator` (`:80-81`), upsert subscription with `session.subscription                                                                                                                                                                         |     | session.id` (`:84`), email a welcome magic link. `customer.subscription.updated/deleted`update status.`invoice.payment_failed`sets`past_due`, `invoice.paid`sets`active`. |
| `auth-request-link.js` | POST `{email}`                     | In-memory rate limit (`checkRateLimit`, not the shared one), creates a hashed magic link, sends it. Always returns the same success message (no enumeration). Base URL falls back to `http://localhost:8888` (`:21`).                                                                                                                                                                                                                                                                                                                      |
| `auth-verify.js`       | GET `?token=`                      | Consumes the link, inserts a session, sets `gs_session` cookie, 302 to `/dashboard.html`; on error 302 to `/login.html?error=`.                                                                                                                                                                                                                                                                                                                                                                                                            |
| `auth-me.js`           | GET                                | `{authenticated, email, plan, subscriptionStatus, usageThisMonth}`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `auth-logout.js`       | any                                | Deletes the session row, clears the cookie, 302 to `/login.html`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `dashboard-data.js`    | GET                                | Lists the last 50 scans for the account, or `?id=` for one report, or `?compare=a,b` for two. All scoped by `account_id`.                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `account-delete.js`    | POST `{"confirm":true}`            | Deletes scans, sessions, magic_links, usage, subscriptions, account. Does not call Stripe; the subscription keeps billing.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `cleanup-scheduled.js` | cron `@daily` (`netlify.toml:8-9`) | Deletes magic links expired more than 24h, expired sessions, rate-limit rows older than 1h. No scan or account max-age.                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `health.js`            | GET                                | Booleans for database, stripe_webhook, stripe_prices, email, lead_webhook; `productionReady` = database and stripe_webhook and email. Never echoes values.                                                                                                                                                                                                                                                                                                                                                                                 |

## Library modules (`v10/netlify/functions/lib/`)

- `guard.js`: `normalizeUrl` (http/https only, length cap), `assertPublicHostname`, `guardedLookup` (custom DNS `lookup` that rejects private v4/v6, CGNAT, link-local, `.internal`, `.local`), `fetchPublic` (up to 3 redirects, each hop re-validated, 6.5s timeout, 900 KB content-length cap, 180k char body cap), `clientIp`, `checkRateLimit` (in-memory `Map`, 12/min, per warm lambda), `checkRateLimitShared` (Supabase `rate_limit_hit` RPC, falls back to in-memory). User-Agent embeds `process.env.URL` or `https://githubscout.example` (`:141`).
- `adapters.js`: `SOURCE_CATALOG` (10 live, 6 planned, `:10-27`), `CHECKOUT_PROVIDERS` (7, informational only), `parseHtmlEvidence` (regex over script/link/img/iframe hosts, meta generator, JSON-LD types), `adapterProductsJson`, `adapterRobots`, `adapterDns` (TXT + MX on the apex, 3.5s each), `headerEvidence`, `runAdapters`.
- `rules.js`: `RULES_VERSION = '2.0.0'`, `categoryRules` (15 categories with `threshold`, `native`, `cheaper`), `appSignatures` (65 entries: `patterns`, optional `hosts`, optional `dns`, benchmark `cost`, optional `pricingUrl`; 24 `pricingUrl` occurrences including one comment).
- `aggregate.js`: `spendContext` (ad-spend band to urgency text only), `detectFromEvidence` (confidence `min(95, 50 + 12*distinctSources + 10 if host match)`, `:61`), `savingsFromDetected` (15-40% of summed benchmark cost, null when nothing paid detected), `findOverlaps`, `evidenceScore`, `buildRecommendations` (templated strings, "Stack is quiet" fallback), `buildActionPlan` (four fixed lines), `buildReport` (full vs teaser).
- `supabase.js`: dependency-free PostgREST client using the service role key; `enabled` is false without env, and every call throws when disabled. `select/insert/update/del/rpc`.
- `auth.js`: magic links (32-byte token, sha256-hashed, 15-minute TTL, 5 per hour per email), sessions (30 days, `gs_session` HttpOnly Secure SameSite=Lax), `currentAccount` (returns `{account, subscription}` where subscription is the latest `active` or `trialing` row), `sendMagicEmail` via Resend HTTP API; when `RESEND_API_KEY` is unset the link is only `console.log`ged (`:134`). Default From is `Scout <login@transactional.githubscout.ai>` (`:131`).

## Supabase tables (`v10/supabase/schema.sql`)

| Table           | Key columns                                                                                                                                                           | Notes                                                             |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `accounts`      | `id uuid`, `email unique`                                                                                                                                             |                                                                   |
| `magic_links`   | `account_id`, `token_hash`, `expires_at`, `used_at`                                                                                                                   | index on `token_hash`                                             |
| `sessions`      | `account_id`, `token_hash`, `expires_at`                                                                                                                              | index on `token_hash`                                             |
| `subscriptions` | `account_id`, `stripe_customer_id`, `stripe_subscription_id unique`, `plan` (operator/director/unresolved), `status` (active/trialing/past_due/canceled/needs_review) |                                                                   |
| `scans`         | `account_id`, `store_url`, `depth`, `report jsonb`, `detected_count`, `evidence_score`                                                                                | index `(account_id, created_at desc)`                             |
| `usage`         | PK `(account_id, period 'YYYY-MM')`, `used`                                                                                                                           | incremented by `usage_increment(p_account_id, p_period, p_max)`   |
| `rate_limits`   | PK `key`, `count`, `window_start`                                                                                                                                     | fixed window via `rate_limit_hit(p_key, p_window_seconds, p_max)` |
| `stripe_events` | PK `id` (evt_...), `type`, `processed_at`                                                                                                                             | webhook idempotency                                               |

| `scan_events` | PII-free, no FK to any account: `store_hash` (HMAC of hostname), `rules_version`, per-source results, detections with strength/confidence, crawl/block state | index `(occurred_at desc)`, `(store_hash, occurred_at desc)`; aged out at 24 months |
| `detection_feedback` | `account_id`, `scan_id`, `signature_id`, `verdict` | unique `(account_id, scan_id, signature_id)` |

All FKs are `on delete cascade`. RLS is enabled on all ten tables with no policies. `scan_events` is deliberately unlinked to any account, which is what keeps it out of an erasure request — see `docs/DATA-RETENTION.md`.

## Environment variables

Verified with `grep -rhno "process\.env\.[A-Z_]*" netlify/functions` on 2026-08-21. If you add one, add it here in the same commit.

| Variable                    | Read by                                                               | Effect when unset                                                                                                                           |
| --------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `SUPABASE_URL`              | `lib/supabase.js:6`                                                   | `db.enabled=false`; auth and webhook return 503, scans still work anonymously                                                               |
| `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabase.js:7`                                                   | same                                                                                                                                        |
| `STRIPE_WEBHOOK_SECRET`     | `stripe-webhook.js:46`                                                | webhook returns 503                                                                                                                         |
| `STRIPE_PRICE_OPERATOR`     | `stripe-webhook.js:16`                                                | plan map entry missing (map is only consulted via `session.metadata.price_id`, which Payment Links do not set)                              |
| `STRIPE_PRICE_COMMAND`      | `stripe-webhook.js:17`                                                | same, for the retired tier                                                                                                                  |
| `STRIPE_PRICE_DIRECTOR`     | `stripe-webhook.js:18`                                                | same                                                                                                                                        |
| `RESEND_API_KEY`            | `lib/auth.js:130`                                                     | magic links are logged, not sent; user still sees "on its way"                                                                              |
| `AUTH_EMAIL_FROM`           | `lib/auth.js:131`                                                     | defaults to `login@transactional.githubscout.ai` (non-resolving domain)                                                                     |
| `GHL_WEBHOOK_URL`           | `operator-url-scan.js:27`                                             | lead forwarding disabled (`{sent:false, reason:'not_configured'}`)                                                                          |
| `LEAD_WEBHOOK_URL`          | `operator-url-scan.js:27`                                             | fallback name for the same                                                                                                                  |
| `STRIPE_SECRET_KEY`         | `stripe-webhook.js`                                                   | restricted READ-ONLY key; without it plan resolution falls back to session metadata, and a purchase with neither resolves to `needs_review` |
| `STRIPE_BILLING_KEY`        | `account-delete.js`                                                   | restricted key with Subscriptions:write; without it an account with a live subscription cannot self-delete (409)                            |
| `SCAN_CONTACT_EMAIL`        | `lib/guard.js`                                                        | no `From` header on outbound crawls; we do not invent an address                                                                            |
| `SCAN_TELEMETRY_SALT`       | `lib/telemetry.js`                                                    | `store_hash` is written as null rather than an unkeyed digest; repeat-scan analysis is lost, nothing else                                   |
| `URL` (Netlify-provided)    | `auth-request-link.js:21`, `stripe-webhook.js:90`, `lib/guard.js:141` | magic-link base falls back to `localhost:8888` or empty string; UA falls back to `githubscout.example`                                      |

`health.js` checks presence of all of the above except `AUTH_EMAIL_FROM`, `URL`, and `STRIPE_PRICE_COMMAND`; its `stripe_prices` flag is `STRIPE_PRICE_OPERATOR` OR `STRIPE_PRICE_DIRECTOR`. No `.env` file exists anywhere in the repo; none of these are set on the live Netlify sites.

## Scan pipeline, step by step

1. Client POSTs form fields (`store_url`, `email`, `monthly_ad_spend`, `primary_goal`, UTMs, `intent`) to `/.netlify/functions/operator-url-scan`.
2. `clientIp` + `checkRateLimitShared` (12 per minute per IP; Supabase-backed only when configured).
3. `intent=lead`: forward to `GHL_WEBHOOK_URL` and return; no crawl.
4. `auth.currentAccount` reads `gs_session`; if an active subscription exists, `usage_increment` debits the monthly quota (402 when exhausted) and depth becomes `full`.
5. `runAdapters(store_url)` (`lib/adapters.js:149-200`):
   - `normalizeUrl`, then fetch the homepage (`home-html`); record `http-headers` from that response.
   - In parallel: `/products.json?limit=5` (`products-json`, sets `shopifyConfirmed` and picks a product handle), `/robots.txt` (`robots-sitemap`), DNS TXT+MX (`dns-records`), `/cart` (`cart-html`).
   - Fetch the first product page (`product-html`) if one was discovered.
   - Derive `script-hosts`, `structured-data`, and `checkout-fingerprint` from the fetched pages. `structured-data` is reported but feeds no signature.
   - Every fetch goes through `fetchPublic`, which resolves DNS with `guardedLookup` and re-checks each redirect hop.
6. `buildReport(scan, submission, depth)` (`lib/aggregate.js:168-219`): `detectFromEvidence` matches each signature's patterns against lowercased page HTML, hosts against the script-host set, dns fragments against TXT/MX, and patterns against robots.txt; confidence from distinct source count; savings = 15-40% of summed benchmark cost of detected paid apps; overlaps; evidence score; templated recommendations; fixed action plan. Teaser depth trims to 3 apps and 2 recommendations and drops evidence trails.
7. Signed-in scans are inserted into `scans`; a summary is forwarded to the lead webhook; JSON is returned.

Measured locally: allbirds.com returned 10/10 sources in about 1.25s. Savings are not gated on `shopifyConfirmed` or on any page having been fetched, so a DNS-only match on a non-Shopify domain still produces a dollar band.

## Data files and provenance

- `v10/data/*.json`, `v10/assets/{app,ecommerce,dossiers}.js`, `dossiers.css`, `ecommerce.css`, `scout-demo-video.html`, `servers/commerce_scan_api.py`, the root v11-v14 launchpad mockups and their verification PNGs, and the stale `deploy-*.zip`: **all deleted.** They were v8-dashboard-era seed data and code that no v10 page loaded, plus a prototype scan server reachable only from the mockups. Nothing in the tree referenced them.
- `fixtures/storefront-signature-test.html` (repo root): offline fixture that detects klaviyo, gorgias, rebuy; not loaded by any test.
- The product stores no data of its own. Each report is computed live from the target store plus `rules.js`.

## Test, preflight, deploy

```
cd netlify-v10-githubscout-ecommerce
bun tests/run-tests.js      # 49 pass (package.json "test" runs the same file under node)
bun scripts/preflight.js    # currently exits 1: legal placeholders
bunx netlify dev            # local site + functions on :8888
bunx netlify deploy --prod  # user-only release event; agents never run this (CLAUDE.md)
```

Tests cover pure functions only: spend-tier regex, savings integrity, detection and overlap, teaser gating, in-memory rate limit, SSRF hostname rejection, host extraction, source catalog count, checkout fingerprint, sha256/isEmail, and a local copy of the Stripe signature algorithm. No test touches a handler, Supabase, auth, or the webhook. Staging instructions are in `v10/DEPLOY-STAGING.md`; required env and Stripe events are in `v10/SETUP.md` and `v10/LAUNCH-READINESS.md`.

## Known fake, stub, and TODO items

| Location                                                                                                                                         | Issue                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `v10/operator-url-analysis.html:108`                                                                                                             | `$120-$420` painted in the savings metric before any response                                                                        |
| `v10/operator-url-analysis.html:393`                                                                                                             | `item.monthly \|\| '$120-$420/mo'` paints dollars on the null-savings "Stack is quiet" card                                          |
| `v10/operator-url-analysis.html:219`, `:489`                                                                                                     | `fallbackAnalysis` shows canned "12-18% waste risk" recommendations while the crawl runs or fails                                    |
| `v10/operator-url-analysis.html:468`                                                                                                             | `app.confidence \|\| 72` and `app.matched` (server sends `evidence`, never `matched`)                                                |
| `v10/operator-url-analysis.html:143` vs `:168`                                                                                                   | "5 more" vs "6 more" sources on the roadmap                                                                                          |
| `v10/index.html:272`, `operator-shopify-savings.html:106`, `checkout-operator.html:46`, `agency-pricing.html:158`, `customer-onboarding.html:44` | present-tense "15" sources; `adapters.js` has 10 live                                                                                |
| `v10/scripts/preflight.js:52`                                                                                                                    | greps three exact phrases only, misses all of the above                                                                              |
| `v10/netlify/functions/stripe-webhook.js:80-81`                                                                                                  | plan resolved from `metadata.price_id` / `metadata.plan`; Payment Links set `github_scout_plan`, so every buyer becomes `operator`   |
| `v10/netlify/functions/stripe-webhook.js:84`                                                                                                     | one-time sessions store `session.id` as the subscription id                                                                          |
| `v10/netlify/functions/operator-url-scan.js:13`                                                                                                  | `director: 100` and retired `command: 30`; Terms say Director = 30                                                                   |
| `v10/netlify/functions/operator-url-scan.js:41` before `:87`                                                                                     | quota debited before the crawl; failed crawls burn a scan                                                                            |
| `v10/netlify/functions/operator-url-scan.js:89`                                                                                                  | error fallback hardcodes `sourcesLive: 9`                                                                                            |
| `v10/netlify/functions/lib/adapters.js:26`                                                                                                       | `checkout-fingerprint-plan` duplicates a live source in the planned list; `methodology.html` lists it twice                          |
| `v10/netlify/functions/lib/aggregate.js:61`, `:80-86`                                                                                            | confidence formula and savings are not gated on `shopifyConfirmed` or fetched pages                                                  |
| `v10/netlify/functions/lib/rules.js`                                                                                                             | 42 of 65 signatures have no `pricingUrl`; 35 of those carry a paid cost benchmark (7 are cost 0)                                     |
| `v10/netlify/functions/lib/auth.js:131`, `:134`                                                                                                  | default From on a non-resolving domain; unset Resend only logs the link while the UI says it was sent                                |
| `v10/netlify/functions/lib/guard.js:141`                                                                                                         | UA URL `https://githubscout.example`                                                                                                 |
| `v10/netlify/functions/account-delete.js`                                                                                                        | never cancels the Stripe subscription; no data export endpoint despite `privacy.html`                                                |
| `v10/terms.html:33-36`, `privacy.html:37-38`                                                                                                     | `[[LEGAL ENTITY NAME]]`, `[[STATE/COUNTRY]]`, `[[BUSINESS ADDRESS]]`, `[[SUPPORT EMAIL]]`, `[[GOVERNING JURISDICTION]]`, `[[VENUE]]` |
| `v10/index.html:450-454`                                                                                                                         | commented-out testimonial slots awaiting real quotes                                                                                 |
| `v10/assets/launch-config.js:8-9`, `:18`                                                                                                         | empty annual links; empty `metaPixelId` (pixel code in `launch-analytics.js:21-32` is inert)                                         |
| `v10/operator-thank-you.html:26`                                                                                                                 | promises an emailed sign-in link that cannot be sent on the deployed build                                                           |
| `v10/tests/run-tests.js:116-117`                                                                                                                 | async `guardedLookup` assertion runs after the sync wrapper returns; cannot fail the suite                                           |
| `v10/tests/run-tests.js:148`                                                                                                                     | Stripe verifier is re-implemented in the test rather than imported from the handler                                                  |
| `v10/netlify.toml:2`                                                                                                                             | `publish = "."` keeps the folder root as the document root; internal paths are denied by forced 404 redirects, enforced by preflight |
| `v10/netlify.toml:57`                                                                                                                            | CSP keeps `'unsafe-inline'` for scripts                                                                                              |
| `v10/.gitignore:5`                                                                                                                               | ignores `assets/launch-config.js`, but the file is tracked                                                                           |
