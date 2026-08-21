# GitHub Scout: Product Overview

Orientation for a new engineer or agent. Paths are relative to `/Users/mbergvinson/cursor-projects/githubscout/`; `v10/` means `netlify-v10-githubscout-ecommerce/`. Every file reference below was checked to exist on 2026-08-20. For the ranked gap list see `docs/GAP-TO-MARKET.md`; for the code map see `docs/ARCHITECTURE.md`.

## What it is

A paid Shopify app-stack audit. A merchant pastes a public storefront URL; the scanner fetches public pages and DNS, matches 65 app signatures (`v10/netlify/functions/lib/rules.js`), benchmarks the detected paid apps against published pricing, and returns a savings band plus a keep/replace/remove/test action plan. The pitch is that it "pays for itself if it kills one bad app" (`v10/index.html:528`).

The product started (v8) as a generic 15-source "Open Intelligence Engine" searching GitHub, Product Hunt, HN and similar for open-source SaaS alternatives (the `netlify-v8-githubscout/` tree, since deleted). It was narrowed to Shopify cost savings because that was the only angle with an ad-able pain (`docs/meta-campaign-structure.md`). The name "GitHub Scout" is a leftover; the product no longer touches GitHub, and the author's own checklist flags the name as a trademark exposure to rename off (`v10/LAUNCH-CHECKLIST.md`).

Design stance of the current build (v2, merged 2026-07-08): "the machine works and is honest". Savings are computed only from detected apps, never from the ad-spend dropdown; confidence is capped at 95%; costs are labeled benchmarks (`v10/README.md`, `v10/methodology.html`).

## ICP

| Persona                                     | Framing in copy                                | Where                                                   |
| ------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------- |
| Shopify store owner / DTC founder (primary) | Cut app costs, find the plugin spend leak      | `v10/index.html:262`, `v10/checkout-operator.html:43`   |
| Ecommerce marketer / CRO lead               | Stop paying for tools that do not move revenue | `v10/index.html:435`                                    |
| Agency owner / consultant                   | Audit faster before you scope                  | `v10/index.html:434`, `v10/agency-pricing.html:155-160` |
| Builder / developer                         | Do not rebuild what already exists             | `v10/index.html:436`                                    |

Beta target band: merchants doing $10k to $100k per month with visibly heavy app stacks (`v10/docs/BETA-OUTREACH.md`). Qualification signal in the ad plan: app spend over $100 per month (`docs/meta-campaign-structure.md`). The capture form asks for an ad-spend band (Under $10k / $10k-100k / $100k-250k / $250k+) which only drives urgency copy, never dollars (`v10/netlify/functions/lib/aggregate.js:15-27`).

## Offer ladder

Live ladder (wired to Stripe Payment Links in `v10/assets/launch-config.js:5-6`):

| Tier          | Price                                 | Quota                                               | Stripe                                                       | Notes                                                                            |
| ------------- | ------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Free URL scan | $0 (email + URL + spend band + goal)  | teaser depth: top 3 apps, 2 recommendations         | none                                                         | `v10/operator-shopify-savings.html`                                              |
| Operator      | $17/mo                                | 10 storefront analyses/mo                           | `price_1TlvIVBht9XEKTLjQUEoYXEU`, `buy.stripe.com/5kQ8wO...` | `v10/index.html:470-480`, `v10/terms.html:20`                                    |
| Director      | $37/mo                                | 30 analyses/mo per marketing and Terms; 100 in code | `price_1TlvIWBht9XEKTLjnQ7iU1HM`, `buy.stripe.com/dRm28q...` | `v10/index.html:483-493`, `v10/terms.html:21`; code at `operator-url-scan.js:13` |
| Command       | retired; route 301s to agency pricing | (code still has `command: 30`)                      | none                                                         | `v10/netlify.toml:11-21`                                                         |
| Agency        | custom, contact form                  | "more than 30 storefronts"                          | none                                                         | `v10/agency-pricing.html`                                                        |

Guarantee: 14-day first-month refund on Operator and Director (`v10/refunds.html:19`). Annual toggle exists in the homepage but stays inert until annual Payment Links are filled in (`v10/assets/launch-config.js:8-9`). Price IDs and links are also listed in `docs/checkout-readiness.md`.

Exploratory ladder, recorded here because the mockups that held it have been deleted (they were never wired to anything): $149 one-off "App Waste Audit Sprint" (v11-v13), then in v14 a four-rung ladder of $0 scan, $149 self-serve report, $950+ replacement sprint, $2.5k+ implementation. The author's own note in `v10/LAUNCH-CHECKLIST.md` says a single $17/mo plan cannot sustain paid CAC.

## Funnels

Primary (paid traffic), per `v10/README.md` and `docs/meta-campaign-structure.md`:

1. Meta ads (3 angles, $20/day x 3 ad sets x 7 days = $420 test; pixel ID is still empty at `v10/assets/launch-config.js:18`).
2. `v10/operator-shopify-savings.html#capture` collects email, store URL, ad-spend band, goal, UTMs.
3. POST `intent=lead` then `intent=analyze` to `/.netlify/functions/operator-url-scan`; `v10/operator-url-analysis.html` renders the teaser report.
4. "Start Operator" CTA to `v10/checkout-operator.html`, which opens the Stripe Payment Link via `v10/assets/launch-checkout.js`.
5. Stripe returns to `v10/operator-thank-you.html`.

Leads are forwarded to a GHL/Zapier webhook when `GHL_WEBHOOK_URL` is set (`operator-url-scan.js:27`); pipeline stages are described in `docs/weekend-sales-launch-runbook.md`.

Secondary: homepage pricing cards (`v10/index.html`), agency contact form (Netlify Forms, `v10/agency-pricing.html`), "Monthly Gems" nurture capture, and the beta proof loop of free audits for permissioned quotes (`v10/docs/BETA-OUTREACH.md`).

## Canonical folder and live URLs

Canonical code: `netlify-v10-githubscout-ecommerce/`. It is the only tree with the v2 scanner, auth, webhook, tests, and the corrected copy. `netlify-v9-githubscout-ecommerce/` is a superseded copy, still deployed, frozen. The v8 tree and the root v11-v14 mockups have been deleted.

| Site           | URL                                                           | State (2026-08-20)                                                                           |
| -------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| V10 production | `https://githubscout-ecommerce-v10-20260624.netlify.app`      | 200, but serves the pre-v2 build: `/login.html`, `/dashboard.html`, `stripe-webhook` all 404 |
| V9             | `https://githubscout-ecommerce-v9-20260609.netlify.app`       | 200, old scanner, fabricated social proof still live                                         |
| V8             | `https://githubscout-ecommerce-v8-20260605.netlify.app`       | 200, static                                                                                  |
| V2 staging     | `githubscout-v2-staging` (site id in `v10/DEPLOY-STAGING.md`) | empty                                                                                        |
| Domain         | `githubscout.ai`                                              | does not resolve; `support@githubscout.ai` on every legal page is a dead mailbox             |

URLs are listed in root `README.md:8-10`. The v2 build (`15aaebb`, merged as `5761f1e`) has never been deployed anywhere.

## How a paid order is meant to be fulfilled

Two generations of fulfillment coexist in the repo and were never reconciled.

Gen 1, manual (v9 era, still present in v10):

1. Stripe Payment Link checkout lands on `v10/operator-thank-you.html`.
2. Welcome email asks the buyer to submit URLs via `v10/customer-onboarding.html` (a Netlify Form). Templates: `docs/customer-onboarding-email-templates.md` (Email 1 welcome, Email 2 nudge, Email 3 report delivery, Email 4 refund safety).
3. Operator writes the report by hand from `docs/paid-scan-report-template.md` (Customer Snapshot, Executive Summary, Current Stack Signals, Recommendations, Keep/Replace/Remove/Test, 7-Day Action Plan, Next Scan Prompt, Disclaimer).

Gen 2, self-serve (v2 build, coded but undeployed):

1. Stripe fires `checkout.session.completed` to `/.netlify/functions/stripe-webhook`.
2. Webhook creates the account and subscription row in Supabase, then emails a magic sign-in link via Resend (`v10/netlify/functions/stripe-webhook.js:73-92`).
3. Buyer lands on `v10/dashboard.html`, runs scans at full depth, quota decremented server-side via the `usage_increment` RPC, scans saved for compare and print-to-PDF.
4. `invoice.payment_failed` sets `past_due` and suspends access; `invoice.paid` restores it.

Known breaks in Gen 2 as wired: the webhook resolves every buyer to `operator` because the Payment Links carry `github_scout_plan` metadata, not `plan` (`stripe-webhook.js:80-81` vs `scripts/create-stripe-githubscout-links.js`); `PLAN_QUOTAS` gives Director 100 instead of 30; nothing is deployed, so today a buyer is charged and receives nothing.

## Glossary

- **Operator**: the $17/mo plan, 10 scans per month. Also the internal plan key `operator`, which is the webhook's default.
- **Director**: the $37/mo plan, 30 scans per month in marketing and Terms, 100 in `PLAN_QUOTAS`.
- **Command**: retired $97/mo v8 tier with API access; route now 301s to `agency-pricing.html`; the key `command` still exists in `PLAN_QUOTAS`, `STRIPE_PRICE_COMMAND`, and the schema comment.
- **Agency**: contact-form tier for more than 30 storefronts per month; no price, no Stripe product.
- **Teaser vs full depth**: `buildReport(scan, submission, depth)`; anonymous and unsubscribed users get `teaser` (3 apps, 2 recs, no evidence trails), active subscribers get `full`.
- **Source**: one of the evidence adapters in `lib/adapters.js`. 10 are live, 6 are catalog entries marked planned. Several pages still say "15".
- **Signature**: an entry in `appSignatures` in `lib/rules.js`: patterns, hosts, dns fragments, benchmark `cost`, optional `pricingUrl`.
- **Benchmark cost**: a typical published mid-tier price hand-typed into `rules.js`; never the store's invoice. 23 of 65 cite a `pricingUrl`.
- **Confidence**: `min(95, 50 + 12 * distinctSources + 10 if host match)`; a formula, not a calibrated probability.
- **Evidence score**: 0-100 measure of how much the scan saw (sources succeeded, detections, corroborated detections).
- **Savings band**: 15-40% of the summed benchmark cost of detected paid apps; null when nothing paid is detected.
- **Overlap**: two or more paid apps in the same category; the consolidation line item.
- **Cockpit**: the v8/v9 name for the old GitHub-opportunity dashboard UI; survives as a 60-second demo MP4 (`v10/assets/githubscout-cockpit-v2-clicked-tabs-demo-60s.mp4`) and a homepage section.
- **Dossier**: a per-repo detail panel in that old dashboard; the code (`v10/assets/dossiers.js`, `dossiers.css`) was dead and has been deleted.
- **opportunities.json / ecommerce_opportunities.json**: `v10/data/*.json`, v8-era seed data (GitHub repo metrics from May 2026 and hand-typed ecommerce ideas). Read by nothing; deleted.
- **Magic link**: passwordless sign-in; 32-byte token, sha256-hashed in `magic_links`, 15-minute TTL, 5 per hour per email.
- **`gs_session`**: the HttpOnly session cookie, 30 days.
- **GHL**: GoHighLevel, the CRM that receives lead webhooks when configured.
- **Preflight**: `bun scripts/preflight.js` (`v10/scripts/preflight.js`), fails on legal placeholders and banned "15 sources" phrasing; currently exits 1.
- **v11-v14 launchpads**: root HTML mockups exploring the $149 audit offer; never wired to checkout or the v10 scanner (they called the `servers/commerce_scan_api.py` prototype on `127.0.0.1:8767`). Both are deleted; the ladder they proposed survives above and in `docs/GAP-TO-MARKET.md`, and their evidence taxonomy shipped as `detected` / `likely` / `possible` in `lib/aggregate.js`.
