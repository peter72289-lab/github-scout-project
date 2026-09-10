# GitHub Scout repository assessment — 2026-09-09

## Scope and evidence

This started as a read-only assessment of the local checkout at commit
`6232a6ee551c52a127afe66736ac6339a9bfb83a` (`main`, dated 2026-07-03).
Freshness verification then found remote `main` at
[`d159bcd`](https://github.com/peter72289-lab/github-scout-project/tree/d159bcd28c7971d214989978b275a9dd2ee6ec8f),
dated 2026-08-21. The local checkout is therefore a legacy snapshot. This
report distinguishes **current remote v2 code** from the **legacy code that is
actually deployed**. Existing audit reports were not used as evidence. No
hosted scan, Stripe checkout, form, webhook, or external API was exercised.

`scout-avatar-pages/` is an outer-repository untracked directory with its own
Git repository at `0b6d887` (2026-09-09). It is assessed separately below; it
does not establish a capability of the tracked Netlify product.

## Decision

The current remote repository contains a materially stronger **v2 Shopify
app-stack scanner**: multi-source public-storefront evidence, magic-link
accounts, Stripe-webhook entitlements, atomic quotas, saved scans, privacy
controls and tests. It still does **not** implement BigCommerce, WooCommerce,
or a public-GitHub opportunity-recommendation product. More importantly, v2
has never been deployed: live Netlify sites continue to serve the legacy
funnel. The remote project's own status ledger states this explicitly
([STATUS.md](https://github.com/peter72289-lab/github-scout-project/blob/d159bcd28c7971d214989978b275a9dd2ee6ec8f/STATUS.md)).

Accordingly, do not sell, test checkout, or represent v2 capabilities as live
until the owner blocks are cleared and a staging purchase has been verified.
The legacy deployed product remains unsuitable for paid acquisition because it
has the false 15-source query and no entitlement system.

## Current remote v2: implementation delta

| Capability | Current remote v2 code | Evidence |
|---|---|---|
| Product scope | Shopify public-storefront app-stack audit, not public GitHub opportunity discovery | The canonical README defines ten keyless storefront sources and 65 app signatures; it also describes GitHub Scout as a leftover name. [README](https://github.com/peter72289-lab/github-scout-project/blob/d159bcd28c7971d214989978b275a9dd2ee6ec8f/README.md) |
| Source evidence | Implemented: 10 live storefront-derived sources, 5 planned | Adapter catalog is the single count authority; `runAdapters` fetches home, products JSON, robots, DNS, cart, discovered product, script-hosts, structured data, headers and checkout fingerprint. [adapters.js](https://github.com/peter72289-lab/github-scout-project/blob/d159bcd28c7971d214989978b275a9dd2ee6ec8f/netlify-v10-githubscout-ecommerce/netlify/functions/lib/adapters.js#L151-L327) |
| Detection / savings honesty | Implemented, bounded | Dollar output requires a confirmed Shopify store, at least one fetched page, and detected paid app signals. Published benchmark costs use a 15–40% consolidation/downgrade band; they are not invoices. [aggregate.js](https://github.com/peter72289-lab/github-scout-project/blob/d159bcd28c7971d214989978b275a9dd2ee6ec8f/netlify-v10-githubscout-ecommerce/netlify/functions/lib/aggregate.js#L136-L185) |
| Accounts and entitlement | Implemented, needs services/deploy | Handler distinguishes anonymous teaser from signed-in full report, atomically reserves a 10/30 plan credit, releases it for blocked/no-evidence scans, and persists signed-in scans. [operator-url-scan.js](https://github.com/peter72289-lab/github-scout-project/blob/d159bcd28c7971d214989978b275a9dd2ee6ec8f/netlify-v10-githubscout-ecommerce/netlify/functions/operator-url-scan.js#L38-L205) |
| Stripe lifecycle | Implemented, needs Stripe/Supabase/Resend configuration | The webhook verifies a timestamped HMAC, records event IDs for idempotency, resolves the plan rather than defaulting, writes subscription state, and handles cancellation/payment failures. [stripe-webhook.js](https://github.com/peter72289-lab/github-scout-project/blob/d159bcd28c7971d214989978b275a9dd2ee6ec8f/netlify-v10-githubscout-ecommerce/netlify/functions/stripe-webhook.js#L70-L201) |
| Authentication | Implemented, needs database/email configuration | Magic links are random, stored hashed, expire in 15 minutes; sessions are `HttpOnly`, `Secure`, `SameSite=Lax` cookies. [auth.js](https://github.com/peter72289-lab/github-scout-project/blob/d159bcd28c7971d214989978b275a9dd2ee6ec8f/netlify-v10-githubscout-ecommerce/netlify/functions/lib/auth.js#L1-L99) |
| SSRF / rate controls | Materially improved in code | Custom DNS lookup validates the exact address the Node HTTP(S) socket dials, and every redirect is re-guarded; shared Supabase rate limit is used when configured. [guard.js](https://github.com/peter72289-lab/github-scout-project/blob/d159bcd28c7971d214989978b275a9dd2ee6ec8f/netlify-v10-githubscout-ecommerce/netlify/functions/lib/guard.js#L1-L135) |
| Database design | Implemented migration, not applied | Schema includes accounts, subscriptions, scans, telemetry, Stripe idempotency and atomic usage RPCs, with RLS enabled. [schema.sql](https://github.com/peter72289-lab/github-scout-project/blob/d159bcd28c7971d214989978b275a9dd2ee6ec8f/netlify-v10-githubscout-ecommerce/supabase/schema.sql#L1-L190) |
| Test coverage | Present in remote; not rerun here | The single no-network test runner covers source count, SSRF, Stripe signature, plan mapping, quota reservation/release, claim safety and PII-free telemetry. [run-tests.js](https://github.com/peter72289-lab/github-scout-project/blob/d159bcd28c7971d214989978b275a9dd2ee6ec8f/netlify-v10-githubscout-ecommerce/tests/run-tests.js) Remote status records 143 passing tests; no local remote snapshot was created, so that count was not independently rerun. |

The current remote status has critical operational blockers: no deployed v2;
no Supabase/Stripe/Resend configuration; unresolved legal placeholders; unknown
Stripe-key rotation/account ownership; and no demonstrated real-store scans or
beta fulfilment. Checkout is intentionally disabled by `fulfillmentReady:
false`. These are release blockers, not missing product-code features.

## Legacy deployed checkout: capability matrix

## Capability matrix

| Capability | Status | Evidence and practical limit |
|---|---|---|
| V9 marketing, legal pages, forms and Stripe-link handoff | Working static funnel | Pages contain Payment Link configuration and forms; V9 checkout derives Stripe links from `assets/launch-config.js:1-6` and `checkout-operator.html:95-105`. This proves redirection, not a subscription service. |
| Public homepage HTML fetch and recognizable vendor signatures | Working, narrow | Netlify scanner normalizes URLs, resolves DNS, follows up to three validated redirects, caps response size/time, then matches fixed substrings in its signature list (`netlify-v9-githubscout-ecommerce/netlify/functions/operator-url-scan.js:29-94`, `145-255`, `258-271`). It cannot see authenticated, consent-gated, client-rendered, checkout, app-admin, server-side, or non-home-page integrations. |
| Basic crawl safety controls | Partial | Blocks common private IPv4/IPv6, validates each redirect, limits HTML and timeout (`operator-url-scan.js:104-154`, `189-251`). The implementation is stronger than an unrestricted proxy but is not a complete SSRF control plane; see risks. |
| Vendor detection and app-stack bloat review | Heuristic/manual | Detection is `String(html).toLowerCase().includes(pattern)` (`operator-url-scan.js:258-271`). It does not validate installation, activity, use, overlap, performance, ownership, invoices, or product impact. |
| Savings, urgency and score | Demo-like heuristic | Spend bands are fixed by self-selected ad-spend labels (`operator-url-scan.js:97-101`); fixed benchmark prices feed savings ranges (`292-297`, `300-379`). Even an invalid/unavailable crawl returns a 200 analysis with these recommendations (`391-429`, `532-539`). The results page also constructs a local fallback before any request (`operator-url-analysis.html:208-224`, `483-498`). These are not measured savings or a financial analysis. |
| Shopify support | Partial public-signal scan only | The funnel and recommendation taxonomy are Shopify-specific (`operator-shopify-savings.html:93-121`, `operator-url-scan.js:12-26`). There is no Shopify OAuth, Admin API, theme/app-embed inventory, billing read, checkout analysis, or platform confirmation. |
| BigCommerce support | Missing runtime implementation | Seed JSON describes Shopify/BigCommerce ideas (`data/ecommerce_opportunities.json:6`, `17-33`), but no BigCommerce connector, signature taxonomy, OAuth/API client, or UI flow exists in tracked application code. |
| WooCommerce support | Missing | No WooCommerce implementation was found in V9/V10 functions, server, assets, or seed data. |
| GitHub opportunity discovery/recommendation | Missing in live product | V9 claims a real 15-source live engine (`index.html:886-888`, `1038-1039`) but uses local `demoResults` (`1687-1708`) and only chooses one of four keyword buckets (`1710-1718`). V10 likewise rotates two static `resultSets` on click (`netlify-v10-githubscout-ecommerce/index.html:542-566`). Neither sends a network request. |
| Existing GitHub recommendation data | Static, stale, unreachable by V9/V10 home | `data/opportunities.json` is dated 2026-05-21, labels itself `live-github-api`, and includes saved curl errors; it is loaded only by unused dashboard assets (`assets/app.js:494-516`, `assets/dossiers.js:340-363`), which are not referenced by V9/V10 pages. It contains 11 general AI/dev-tool opportunities, not a storefront recommendation engine. |
| Ecommerce opportunity catalog | Static seed only | Ten local seed records are explicitly labelled `GitHub Scout Ecommerce Edition local seed data` and dated 2026-05-21 (`data/ecommerce_opportunities.json:2-6`); no ingestion or refresh process is present. |
| Payment, customer identity and subscription verification | Missing | Payment Links are hard-coded client-side (`assets/launch-config.js:1-4`). There is no Stripe webhook handler, customer/account datastore, session/authentication, plan lookup, cancellation state, or usage counter. Success pages assert activation based on query navigation, not verified events. |
| 10/30 storefront monthly entitlement | Missing; manual only | The plans promise 10 and 30 analyses (`terms.html:20-22`, `customer-onboarding.html:40-44`) but scanner requests are unauthenticated and no quota persistence exists. The onboarding form is merely a Netlify Form (`customer-onboarding.html:47-67`). |
| Lead handoff | Partial and configuration-dependent | The scanner logs submissions and optionally POSTs them to `GHL_WEBHOOK_URL` or `LEAD_WEBHOOK_URL` (`operator-url-scan.js:453-480`, `521-539`). No delivery retry, durable queue, consent record, or verification is implemented. |
| Automated tests for tracked V9/V10 runtime | Missing | No tracked package manifest/test runner covers the Netlify Function, static claims, Stripe entitlement, forms, or recommendation pipeline. `scripts/verify-githubscout-launch.js:1-51` is a hosted smoke script and would submit to the endpoint. |

## Priority risks in the legacy deployed code

1. **P0 — public claims conflict with implementation.** V9 says the free
   query is a “real engine” with “live cross-source intelligence,” then renders
   local records after a timer. The test query `Shopify product reviews
   replacement` consequently returns the same default CRM/email/form products
   unless it contains one of four unrelated keyword groups. V10 calls its
   rotating fixture a non-toy proof of the engine. Continuing paid acquisition
   with those claims creates customer, refund, payment-dispute, and platform
   trust risk.

2. **P0 — paid service is not enforceable or fulfilable as software.** The
   only backend function accepts public anonymous POSTs; neither customer
   payment nor plan is checked. The advertised capacity cannot be counted,
   gated, scheduled, or delivered. If service is manual, the public offer must
   say that and define turnaround, scope, exceptions and support ownership.

3. **P1 — quantitative outputs look individualized but are predetermined.**
   The score is substantially determined by a selected ad-spend band, and cost
   / savings figures derive from a maintained-in-source vendor-price table.
   An invalid private URL yields HTTP 200 and a conservative-looking report
   instead of an explicit failed scan. This can lead a customer to treat
   generic estimates as actual financial recommendations.

4. **P1 — abuse and data handling need a production boundary.** The rate
   limiter is a per-instance `Map` with no pruning (`operator-url-scan.js:6-9`,
   `173-187`), keyed by a client IP that can fall back to forwarded headers
   (`166-170`) and by caller-controlled `intent` (`503-507`). It is not a
   durable distributed limit. The function also logs email, URL, notes and
   attribution fields verbatim (`432-450`, `521`) and can forward them to an
   arbitrary configured webhook. Add input sizes/schema, retention controls,
   redaction, a durable edge limit, abuse monitoring, and a vetted outbound
   egress policy before broad public use.

5. **P1 — SSRF protections are useful but incomplete.** The function checks
   resolved addresses before calling generic `fetch`; it cannot prove the
   connection uses the checked answer if a domain rebinds between resolution
   and connection. Its private-range helpers omit several reserved/non-public
   ranges that a security policy normally rejects. The newer prototype has a
   broader deny-list and DNS-over-HTTPS checks, but it has the same fundamental
   resolve-then-fetch design. This assessment did not exploit either service.

6. **P2 — platform claims exceed implementation.** BigCommerce appears only
   in static catalogue content; WooCommerce is absent. Shopify itself is an
   unauthenticated external signature check, not app/spend analysis. A
   multi-store agency cannot obtain consolidated access, client separation,
   portfolio reporting, permissions, or consistent reruns.

7. **P2 — stale and disconnected opportunity evidence.** Static data is more
   than three months old as of this review, reports failed GitHub refreshes,
   and has no traceable source retrieval, license policy enforcement, or
   reproducible score. V9/V10 do not serve the dashboard scripts that would
   display it.

## Current v2 launch readiness and remaining scope gaps

The remote v2 resolves the legacy code-side gaps above, but it remains
**pre-production**. Its own status records that deployment, service
configuration, key-rotation confirmation, legal identity/jurisdiction/support
address, staging validation and real-store proof are outstanding. The most
important current risks are operational:

1. **P0 — nothing is live.** The deployed sites are confirmed to serve the
   old handler and lack v2 login, dashboard and webhook routes. The difference
   between merged code and a tested production service must remain explicit.
2. **P0 — credentials and legal launch gates remain incomplete.** The remote
   preflight deliberately fails while legal placeholders remain. Without
   Supabase, Stripe webhook and Resend settings, paid depth/account delivery
   is disabled; without controlled test-mode purchase validation, it is unsafe
   to enable fulfilment.
3. **P1 — v2 only supports Shopify public signals.** `/products.json`, Shopify
   headers and robots are used to confirm the platform; there are no
   BigCommerce/WooCommerce adapters, customer-approved admin/billing data, or
   actual performance/invoice measurements. Savings therefore remain a
   benchmarked decision aid, not a financial audit.
4. **P1 — the user concept's GitHub-opportunity offering is out of scope for
   v2.** The remote v2 purposefully becomes a Shopify scanner. A separate
   evidence ingestion, licensing, freshness, ranking and novice-safe
   recommendation system is still required for that product line.
5. **P2 — production observability needs proof.** The repository has PII-free
   scan telemetry and an accuracy script, but the status says Supabase has not
   been stood up. There is no corpus of real scans or merchant feedback yet to
   establish detection precision, app-price validity or report usefulness.

## Legacy remediation and future architecture sequence

1. **Retire or correct the old sites.** Remove or relabel the free-query and V10 result
   fixtures as examples; disclose that the current output is public-homepage
   signal triage, not bill/performance measurement. Ship a manual report
   workflow only with an explicit turnaround and a one-store pilot price that
   covers review work.

2. **Deploy v2 only through its release gate.** Apply its signed Stripe webhook, account and
   organization model, plan/subscription state, store ownership, usage ledger,
   idempotency, and a customer portal. Scan authorization and monthly limits
   must be server-side.

3. **Build one platform adapter at a time beyond Shopify.** Use documented
   permissions and clearly scoped data: store metadata, installed app/embed
   inventory, approved billing export, theme performance evidence, and
   customer-authorized analytics. Add BigCommerce and WooCommerce only after
   their adapter contracts, data availability, consent, and evaluation suites
   are complete.

4. **Keep v2's evidence separation and extend it.** Persist every observation with
   source, observed time, method, confidence and limitation; distinguish
   detected public HTML, merchant-provided facts, official platform data, and
   inference. Show actual price source/effective date and never compute
   savings without bill evidence.

5. **Create the separate GitHub opportunity pipeline.** Define its sources, terms
   and rate budgets; use adapters and scheduled ingestion; normalize projects,
   license, maintenance, security and commerce relevance; retain cited source
   snapshots and score explanations. Provide an actual query endpoint and
   evaluation corpus before selling ranked recommendations to novices.

6. **Validate scanning in production.** Keep crawling isolated with network egress allow/
   deny policy, connection-time validation, distributed limits, task queue,
   observability, cancellation and per-tenant budgets. Treat public URL
   scanning as an attack surface, not as an inline request handler.

## Manual fulfilment economics

The legacy funnel's stated subscription prices do not support substantive
manual analysis. This calculation does not apply to a successfully deployed
v2 automated teaser/full-report flow, but it remains decisive if legacy sales
are being fulfilled by people:

| Plan | Price / stores | Gross per scan | Gross per claimed 15-source scan | If each scan takes 5 min | If each scan takes 15 min |
|---|---:|---:|---:|---:|---:|
| Operator | $17 / 10 | $1.70 | $0.113 | $20.40/hour | $6.80/hour |
| Director | $37 / 30 | $1.23 | $0.082 | $14.80/hour | $4.93/hour |

These are gross figures before Stripe fees, acquisition cost, support, refunds,
taxes, rework and report delivery. A manual review across 15 sources is likely
far longer than five minutes. The plans can work only if (a) analysis is
genuinely automated and inexpensive, or (b) the offer moves to a higher-priced
concierge/productized-service model with a smaller committed scope.

## Separate local prototype: `scout-avatar-pages/`

This untracked nested project is materially newer than the Netlify code and
should be considered a candidate foundation, not deployed evidence. Its
README accurately describes an HTTPS public-homepage-only analyser and says it
does not return HTML, invent savings, collect contacts, or store history
(`scout-avatar-pages/README.md:11-15`). The Worker validates format and public
DNS each redirect (`server/analyzer.mjs:11-72`, `135-169`), detects only tags/
scripts rather than arbitrary prose (`107-132`), has same-origin/JSON-only
handling and a per-isolate limiter (`server/app.mjs:3-64`), and its calculator
models setup and Director capacity rather than calling detected apps bills
(`assets/calculator.mjs:1-30`).

`npm test` passed all 13 tests, including URL/DNS controls, redirect paths,
limits, error handling, API validation, calculator boundaries and direct
checkout routing. This is good bounded-engineering evidence. It still lacks
Shopify/BigCommerce/WooCommerce account integrations, GitHub/source ingestion,
entitlement, persistence, distributed limits, and integration into the tracked
V9/V10 deployments. It should not be represented as current GitHub Scout
production functionality until it is reviewed, integrated and deployed.

## Validation and limitations

* Passed: `npm test` in `scout-avatar-pages/` (13/13).
* Passed: JavaScript syntax checks for V10 scanner/dashboard scripts; all four
  V9/V10 JSON data files parsed with `jq`; Python scanner syntax compiled in
  memory.
* Passed a no-network function micro-check: a private URL was rejected by the
  crawl guard but still produced the expected fallback HTTP 200 response,
  confirming the report-risk behavior above.
* Not performed: hosted deployment verification, real storefront scans, Stripe
  checkout, Netlify Forms, lead webhooks, and GitHub/source requests. Those
  actions could create external effects or involve customer data.
