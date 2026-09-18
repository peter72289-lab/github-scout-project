# GitHub Scout — product and code assessment

**Date:** 2026-09-09 (live URLs fetched and scanned the same day)
**Scope:** read-only. Repo `peter72289-lab/github-scout-project` at `d159bcd` on `main`, plus the three public Netlify sites.
**Related live marketing site named in the brief:** https://githubscout-ecommerce-v9-20260609.netlify.app/
**Audience:** founder. Act on the first page; the rest is evidence.

This report does not change product code. It records what is in the tree, what the live sites actually serve, and how that compares to the dual-function concept (P&L waste calculator + GitHub/OSS opportunity repo) and the two avatars (solo marketing manager vs multi-store / agency).

Internal plan-of-record already exists and is largely correct: `docs/GAP-TO-MARKET.md` (2026-08-20), `docs/PRODUCT-OVERVIEW.md`, `docs/ARCHITECTURE.md`, `STATUS.md`. Ten PRs (#2–#10) closed most **code-side** defects after that analysis. **None of that work is deployed.** What a buyer sees today is still the pre-v2 funnel.

---

## 0. Executive verdict

You do not have two products. You have **one real engine** (a keyless Shopify app-fingerprint scanner) sitting undeployed, and **one live marketing site** that sells a different product (a 15-source “Open Intelligence Engine” that queries GitHub, HN, Product Hunt, and 12 other indexes).

The live site is not a thin wrapper around the scanner. It is a **demo theater**: the “free query” is hardcoded JavaScript; the “340+ operators,” G2/Trustpilot scores, Product Hunt badge, named testimonials, and “47 founding seats” are fabricated; the storefront “ROI” numbers on the live scanner are keyed off the ad-spend dropdown, not detections. I observed this on 2026-09-09 by fetching the page and POSTing the live scan function (see §2).

The scanner itself is the asset. In the **undeployed** v10 tree it is careful: 10 public sources, 65 signatures, evidence-strength gating, SSRF-hardened fetch, 128 unit tests in `tests/run-tests.js`. That is a credible seed for avatar A (solo Shopify operator who wants to cut app bloat). It is **not** a P&L system, **not** BigCommerce/WooCommerce, **not** a GitHub opportunity repository, and **not** an agency portfolio tool.

**If you do one thing this week:** take the live v8/v9/old-v10 sites offline or password-protect them, and deactivate the two Stripe Payment Links. A card can be charged today against a product that cannot fulfill and a marketing page that would not survive a complaint.

**If you do one product thing next:** pick a single offer — a Shopify storefront audit, fulfilled with the scanner plus a human review — and stop selling the intelligence engine until it exists.

---

## 1. Repo structure, stack, maturity

### What the repo is

Flat monorepo. One canonical app, two frozen marketing trees, a lot of ad/demo weight.

| Path                                 | Role                                                                                                                                                                                         | Maturity                                                        |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `netlify-v10-githubscout-ecommerce/` | Canonical product. Static HTML + CommonJS Netlify Functions, zero npm deps in functions. Engine in `netlify/functions/lib/`. Schema in `supabase/schema.sql`. Tests in `tests/run-tests.js`. | Real engine + coded-but-never-run accounts. **Never deployed.** |
| `netlify-v9-githubscout-ecommerce/`  | Pre-v2 funnel. Frozen per `CLAUDE.md`. Still the public marketing site.                                                                                                                      | Demo + older scanner. **Live.**                                 |
| `ads/` (58 MB)                       | Meta creative. Several creatives bake in “15 sources.”                                                                                                                                       | Marketing artifact.                                             |
| `cockpit-v2-demo/` (4.9 MB)          | Capture scripts + a 60s MP4 of a dashboard that is not in the product.                                                                                                                       | Demo asset.                                                     |
| `docs/`, `status/`, `.github/`       | Plan of record, ledgers, CI. High quality.                                                                                                                                                   | Process, not product.                                           |
| `netlify-v8-githubscout/`            | Deleted from the tree (PR #9). The **site** is still live.                                                                                                                                   | Legacy.                                                         |

Working tree ~147 MB; `.git` 73 MB. 222 tracked files excluding git internals. Single stream (`status/platform.md`). Last code merge on `main`: `d159bcd` (ledger refresh after #2–#10).

### Stack (v10)

- **Front:** static HTML/CSS/JS. No React, no bundler. `publish = "."` in `netlify.toml`.
- **API:** Netlify Functions, CommonJS, Node 18+, no npm dependencies. Stripe HMAC and Supabase REST are hand-rolled.
- **Engine:** `guard.js` (SSRF-pinned fetch) → `adapters.js` (10 live sources) → `rules.js` (65 signatures) → `aggregate.js` (detect / score / savings).
- **Accounts (coded, unused):** magic-link auth via Resend, sessions in Supabase, Stripe webhook, atomic quota RPC, GDPR delete/export, daily cleanup cron.
- **Money:** Stripe Payment Links, not Checkout Sessions. `fulfillmentReady: false` in v10 `assets/launch-config.js` (line 10) gates CTAs **in the undeployed tree only**.
- **Tests:** 128 `t(` / `ta(` cases in `tests/run-tests.js` (README still says 121; `STATUS.md` says 143 — the file itself is the count). No network. Pure functions plus some handler imports. Not an integration suite.

### Demo vs real

| Surface                                                                                                             | Real?            | Where                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Shopify URL scan (public HTML, `/products.json`, robots, headers, DNS, script hosts, JSON-LD, checkout fingerprint) | Yes              | v10 `lib/adapters.js` lines 10–20. Older, weaker copy is what is **live**.                                                                     |
| 65 app signatures, keep/replace/remove, 15–40% savings band                                                         | Yes, in v10      | `lib/rules.js`, `lib/aggregate.js`                                                                                                             |
| Accounts, dashboard, quotas, webhook, magic link                                                                    | Coded, never run | v10 functions + `supabase/schema.sql`. Live `/login.html`, `/dashboard.html`, `stripe-webhook` all **404**.                                    |
| “15 sources / 2 modes / 6-dimension scoring / 340+ operators”                                                       | Marketing only   | Live v9 homepage. No corresponding engine.                                                                                                     |
| Free query that “queries 15 sources”                                                                                | Hardcoded demo   | `netlify-v9-githubscout-ecommerce/index.html` lines 1687–1738: four canned result sets, 1.2s `setTimeout`, copy says “Querying 15 sources...”  |
| GitHub / GitLab / LibHunt / HN / Product Hunt aggregation                                                           | Not implemented  | Zero matches for `api.github`, scrape, gitlab, libhunt, producthunt under `netlify-v10-githubscout-ecommerce/netlify/functions/`.              |
| Cockpit / dossiers / opportunities.json                                                                             | Dead or demo     | v10 `data/*.json` deleted. v9 still ships `data/opportunities.json` (May 2026 Obsidian-AI seed list, not storefronts). Cockpit is an MP4.      |
| Academy, Hidden Gem alerts, weekly digest, partner program                                                          | Copy only        | Homepage sections. No content, no send path.                                                                                                   |
| BigCommerce / WooCommerce storefront analysis                                                                       | Not implemented  | One BigCommerce **checkout** fingerprint in `adapters.js` line 41. No WooCommerce adapter, no BC catalog adapter, no platform gate for either. |

**Maturity label:** pre-revenue prototype with a real detection kernel and a live marketing site that oversells a retired concept. Not a shipped SaaS.

---

## 2. Implemented vs marketing claims

Two different “products” are on the internet. Compare them separately.

### 2a. Live v9 — https://githubscout-ecommerce-v9-20260609.netlify.app/

Fetched 2026-09-09. This is the site named in the brief. Title: “Scout — The Open Intelligence Engine · v9”.

| Claim on the live page                                                                                                                                                                                                                | What actually runs                                                                                                           | Verdict                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| “15 Sources · 2 Intelligence Modes · 6-Dimension Scoring · 340+ Operators” (hero)                                                                                                                                                     | No 15-source aggregator. No scoring dimensions in code. “340+” is a number on a landing page.                                | False                                           |
| “Scout aggregates 15 open-source intelligence platforms simultaneously” (GitHub, GitLab, LibHunt, HN, PH, awesome-selfhosted, OSSAlt, Artifact Hub, Docker Hub, Codeberg, SourceForge, DEV.to, Lobsters, CNCF, SaaSHub, PickYourTech) | None of these are queried. The scan function fetches a storefront URL. The free-query box returns canned repos.              | False                                           |
| “This is the real engine, not a demo environment”                                                                                                                                                                                     | `runFreeQuery()` picks `demoResults.crm` / `.analytics` / `.email` / `.default` after a 1.2s delay (`index.html` 1710–1738). | False; the page says the opposite of the code   |
| “4.8/5 on G2 · 127 reviews”, “4.9/5 on Trustpilot · 89 reviews”, “#1 … Product Hunt”                                                                                                                                                  | No G2/Trustpilot/PH listing exists in this repo or in any linked asset.                                                      | Fabricated social proof                         |
| “47 founding seats remaining”, “founding rate locked forever”                                                                                                                                                                         | Scarcity copy. No seat counter, no Stripe coupon, no inventory.                                                              | Fake urgency                                    |
| Named logos: Momentum Studio, Clearpath DTC ($4.2M), Devstack Labs, GrowthLeaf, …                                                                                                                                                     | No customer records. Zero paying accounts in any deployed system.                                                            | Fake logos                                      |
| Testimonials: “Marcus R.”, “Jamie K.”, “Tara S.” with quoted dollar/hour savings                                                                                                                                                      | Commented-out **real** testimonial slots exist on v10 (`index.html` 450–454) and are empty. v9 ships the quotes.             | Fake testimonials                               |
| “As Seen In” Product Hunt / TechCrunch / Indie Hackers / HN / …                                                                                                                                                                       | Decorative. No placements.                                                                                                   | Fake press                                      |
| “Avg. First-Session Savings $340”                                                                                                                                                                                                     | Invented.                                                                                                                    | False                                           |
| “8–14 weeks early” vs Product Hunt in the comparison table                                                                                                                                                                            | No measurement.                                                                                                              | Unsubstantiated                                 |
| ROI calculator (12 tools × $89 × 30% waste → $3,844/yr)                                                                                                                                                                               | Client-side sliders. Not tied to a scan. Same pattern on v10 homepage (`index.html` 405–424).                                | Illustrative math sold as “your actual savings” |
| Storefront URL scan                                                                                                                                                                                                                   | **Real HTTP fetch** of the submitted URL. Older engine. Observed 2026-09-09 (below).                                         | Partial — scan is real, dollars are not         |
| Pricing: Operator $17/10, Director $37/30, agency contact                                                                                                                                                                             | Prices match Stripe Payment Links (200 on `buy.stripe.com/5kQ8wO…` and `…/dRm28q…`). Fulfillment does not exist.             | Price is real; product behind it is not         |
| 14-day money-back / cancel anytime                                                                                                                                                                                                    | `support@githubscout.ai` on a domain that does not resolve. No Customer Portal URL.                                          | Unexercisable                                   |

**Live v9 scan, observed 2026-09-09** (`POST /.netlify/functions/operator-url-scan`):

- `https://www.allbirds.com`, spend band “Under $10,000”: crawl 200, **5 detections** (Attentive, Yotpo, PayPal, GA, Shop Pay), summary **`$120–$420/mo`**. That band is the default of `spendProfile()` in v9 `operator-url-scan.js` lines 97–101 — it is selected by the dropdown, not by the detections. PayPal is billed at a fabricated **$80/mo**.
- `https://www.nytimes.com`, spend band “More than $250,000”: crawl 200, **0 detections**, summary **`$1.8k–$6.5k/mo` / `$21.6k–$78k/yr`**, score 94, “Critical”. Same function: zero apps, full savings theater. Recommendations still invent “$288–$1,430/mo” review-stack waste.

v9 `health`: `{"ok":true,"service":"github-scout-v9-ecommerce"}` — a timestamp, nothing about readiness.

v9 checkout pages load `launch-config.js` **without** `fulfillmentReady`. CTAs can open the live Payment Links.

### 2b. Live v10 — https://githubscout-ecommerce-v10-20260624.netlify.app/

Fetched 2026-09-09. This is **not** the v2 build in the repo. `/health` returns `service: "github-scout-v10-ecommerce"` with no `productionReady` field (the undeployed handler in `netlify/functions/health.js` would return that field). `/login.html`, `/dashboard.html`, `stripe-webhook` **404**.

The live v10 homepage still says “Scout pulls from 15 sources”, “All 15 sources included”, and ships the same slider ROI ($3.1k from 14 apps × $79 × 24%). A live allbirds POST to the v10 scan function returned the **same v9-shaped payload** (`monthlySavings: "$120-$420"`, PayPal $80). So production v10 is the pre-July funnel with a Shopify skin, not the honest engine.

v8 is also still 200: https://githubscout-ecommerce-v8-20260605.netlify.app/ — “Open Intelligence Engine · v8”, still contains “15 sources”, “4.8”, “G2”.

`githubscout.ai` does not resolve. Staging site `githubscout-v2-staging` is documented as empty.

### 2c. Undeployed v10 (what the repo would serve if shipped)

This is the product you actually built after July. It is better than anything live.

| Claim / feature                                           | Repo status                                          | Notes                                                                                                                                                                                                         |
| --------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 10 live sources, 15 total (5 planned)                     | True                                                 | `lib/adapters.js` 10–30. Pages use `[data-source-count]` filled by `sources.js`.                                                                                                                              |
| “15 sources” as present tense                             | Removed from v10 HTML; preflight fails if it returns | `scripts/preflight.js` line 71                                                                                                                                                                                |
| Savings only from detected paid apps, 15–40% of benchmark | True in engine                                       | `aggregate.js` `savingsFromDetected`. Null when nothing paid / not Shopify / no pages / crawl blocked.                                                                                                        |
| Confidence capped at 95; corroboration, not probability   | True                                                 | `scoreConfidence` in `aggregate.js` 54–57                                                                                                                                                                     |
| Evidence strength `detected` / `likely` / `possible`      | True                                                 | DNS-only / robots-only cannot produce dollars                                                                                                                                                                 |
| Operator $17/10, Director $37/30                          | True in `lib/plans.js` 32–35                         | Webhook reads `metadata.plan` **and** `metadata.github_scout_plan`                                                                                                                                            |
| Checkout                                                  | Disarmed                                             | `fulfillmentReady: false` (`assets/launch-config.js` 10)                                                                                                                                                      |
| Accounts / dashboard / quotas                             | Coded                                                | Never run against real Supabase/Resend/Stripe                                                                                                                                                                 |
| Legal entity                                              | Placeholders                                         | `terms.html` 33–35, `privacy.html` — `[[LEGAL ENTITY NAME]]` etc. Preflight exits 1.                                                                                                                          |
| Academy, monthly gems, GitHub-as-a-source FAQ             | Copy leftovers                                       | FAQ still says “GitHub is one source. Scout blends 10 live sources…” (`index.html` 527) — GitHub is **not** a live source. Homepage still has a client-side ROI slider and an “Academy” grid with no lessons. |
| Sample report / methodology / changelog                   | Present                                              | Honest enough to show.                                                                                                                                                                                        |

**Source catalog (the only count that may be published):**

Live: home HTML, product HTML, cart HTML, `/products.json`, robots+sitemap, HTTP headers, DNS TXT/MX, script-host census, JSON-LD/meta generator, checkout fingerprint.

Planned: Shopify App Store cross-check, page-speed, Wayback, ad-library, email-capture flow.

JSON-LD is fetched and **feeds no signature**. `/cart` is fetched even though Shopify’s default `robots.txt` disallows it (`TASKS_FOR_USER.md` item 11 / PLT-5).

**Signatures:** 65 apps, 15 categories. 23 have a `pricingUrl`; 7 are cost 0; **35 paid benchmarks have no citation**. Flat mid-tier number, no plan tiers, no `checkedAt`.

---

## 3. Architecture quality, tech debt, security / privacy

### What is genuinely good

- **`lib/guard.js`:** connect-time DNS validation, redirect re-check per hop, private/CGNAT/link-local/v6 blocks, 6.5s timeout, 900 KB / 180k-char caps, gzip/br decode under the same cap, identifiable UA (`GitHubScoutOperatorScan/2.0`). Better than typical indie crawlers.
- **Money-path primitives in v10:** Stripe HMAC with `timingSafeEqual` and 300s tolerance; `stripe_events` idempotency; `past_due` suspend; hashed magic links (15 min, 5/hour/email); HttpOnly `gs_session`; atomic `usage_increment` with reserve/release so a blocked crawl does not burn a credit; delete cancels Stripe **before** rows if `STRIPE_BILLING_KEY` is set, else 409.
- **Integrity posture:** AD-CLAIMS-GUIDE, preflight banned-phrase grep, “Stack is quiet” card, commented testimonial slots, `fulfillmentReady` master switch, PII-free `scan_events` (HMAC hostname, 24-month retention).
- **Zero-dependency functions** keep the attack surface small and deploys simple.

### Tech debt that will bite

1. **Three live sites, one undeployed canonical tree.** Buyers, ads, and Google see v8/v9/old-v10. Engineers edit v10. This is how the retracted claims stay on the internet after the code was fixed.
2. **Two fulfillment models** still in the tree: manual `customer-onboarding.html` + email templates vs self-serve dashboard. Thank-you copy can promise both.
3. **Offer too thin for $17/mo.** Recommendations are templated strings; action plan is four fixed sentences; teaser already shows top apps + 2 recs. Merchants already have the app list in Shopify Admin. The engine itself tells a quiet stack to look there (`aggregate.js` 260–266).
4. **`publish = "."`** plus a long deny-list. Preflight section 9 is the safety net; one forgotten file is a leak. Moving to `public/` is the durable fix (already recommended in GAP-TO-MARKET M5; deny-list shipped in #9 as a stopgap).
5. **CSP `'unsafe-inline'`** (`netlify.toml` 160). Fine for a static marketing page; not a bar for an account product.
6. **RLS enabled, zero policies.** Service role bypasses RLS. Correct only if the service key never reaches a browser. It must not.
7. **Rate limit is per-lambda** until Supabase exists. Anonymous scans are free and unbounded across cold starts.
8. **No monitoring.** Nothing watches `/health`. Webhook failures live in Netlify logs.
9. **Name.** “GitHub Scout” + `github_scout_*` metadata implies GitHub affiliation. Product does not call GitHub. Trademark / misrepresentation risk flagged in `LAUNCH-CHECKLIST.md`.
10. **Ads folder (58 MB)** and cockpit MP4 still teach the old story. Regenerating ads against AD-CLAIMS-GUIDE is a precondition for any paid traffic.

### Security / privacy notes

| Item                                                      | Risk                                                                                                                   | Evidence                                                                                                              |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Live Stripe Payment Links reachable from v8/v9/old-v10    | Buyer pays; no account, no email, no report                                                                            | Links 200 on 2026-09-09; thank-you promises a sign-in email that cannot be sent                                       |
| Unrestricted live Stripe secret key documented as exposed | Treat account as compromised until rotation confirmed                                                                  | `TASKS_FOR_USER.md` item 1; key is **not** in this git history (grep-clean)                                           |
| Repo is public                                            | Schema, site IDs, price IDs, runbooks, Payment Link URLs                                                               | `peter72289-lab/github-scout-project`                                                                                 |
| `support@githubscout.ai`                                  | Dead mailbox; refunds/privacy/deletion contact                                                                         | Domain does not resolve                                                                                               |
| Legal placeholders                                        | Cannot form a contract or name a merchant of record                                                                    | `terms.html` 33–35                                                                                                    |
| Crawler ignores `robots.txt` Disallow                     | Fetches `/cart` on Shopify                                                                                             | PLT-5; owner decision required                                                                                        |
| Lead webhook (`GHL_WEBHOOK_URL`)                          | Forwards email + URL + spend band; must stay on subprocessors list                                                     | `operator-url-scan.js` 26–35; `subprocessors.html` updated in #9                                                      |
| v9 analytics                                              | Pixel fires when `metaPixelId` is set, no consent gate in the v9 file                                                  | v9 `launch-analytics.js` 25–35. v10 has `consent.js`. Live pixel ID is empty, so currently inert.                     |
| Scan telemetry                                            | PII-free by design; erasure cannot reach `scan_events`                                                                 | Documented in `privacy.html` / `DATA-RETENTION.md` — must stay true                                                   |
| SSRF                                                      | Guarded in v10; v9 guard is thinner (private IPv4/IPv6 checks, no `guardedLookup` custom DNS hook of the same quality) | Live scan accepts arbitrary public URLs — expected, but v9 will happily “audit” nytimes.com and invent a savings band |

No malware, no hidden backdoors, no secrets in the current tree. The live **integrity** problem is marketing, not RCE.

---

## 4. Gaps vs the two avatars

Founder concept (this brief):

1. Calculator / analyzer of wasted P&L on Shopify **and** BigCommerce **and** WooCommerce via unused apps / plugins / widgets.
2. A repository of opportunities scraped from public GitHub and other OSS sources.

Avatars:

- **A.** Marketing managers / solopreneurs — best-practice guidance and cost cutting.
- **B.** Experienced multi-store / agency users — opportunity tracking, bloat across dozens of stores, competitor replacement options.

### Function 1 — P&L waste calculator

| Need                                 | Today                               | Gap                                                                                                                                                   |
| ------------------------------------ | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| See unused / installed-but-dark apps | External HTML/DNS fingerprints only | Cannot see Shopify Admin app list, billed-but-not-loaded apps, server-side pixels, or apps behind consent/GTM. The “Stack is quiet” card admits this. |
| Actual P&L / invoices                | Benchmark mid-tier list prices      | 35/65 paid apps uncited; no tiers; never the merchant’s bill. Ad-spend dropdown on **live** sites invents the dollar band.                            |
| Shopify                              | Yes (v10, undeployed)               | Bot-protected stores (Bombas-class) need an explicit blocked state — coded in v10, not live.                                                          |
| BigCommerce                          | Checkout host pattern only          | No BC adapters, no signatures, no `bigcommerceConfirmed` gate.                                                                                        |
| WooCommerce                          | Absent                              | Zero Woo / WordPress adapters.                                                                                                                        |
| Actionable keep/replace/remove       | Templated category strings          | No merchant-specific writeup, no “open admin and confirm,” no measured lift. Thin for a subscription.                                                 |

Avatar A can get value **if** a human turns the scan into a one-page audit (the path in `docs/paid-scan-report-template.md` and `docs/GAP-TO-MARKET.md` Phase 2). The machine report alone is a teaser.

### Function 2 — GitHub / OSS opportunity repository

**Not built.** v8/v9 marketing describes it. `data/opportunities.json` on v9 is a May 2026 hand list of Obsidian/AI repos, not a scrape pipeline. The cockpit MP4 is a recording of a UI that is not in the canonical app. No cron, no index, no scoring dimensions, no “Hidden Gem” digest.

Building this is a different company: crawlers, ToS, rate limits, ranking, freshness, and a reason a marketer would trust it over GitHub search + LibHunt. It is not an MVP increment on the Shopify scanner.

### Avatar A — solo marketing manager / solopreneur

**Job:** “Tell me which apps to cancel this month so I save more than $17.”

Fits the scanner **if** fulfillment is a reviewed audit, not a self-serve dashboard of templated sentences. Does not fit a $17/mo subscription with 10 scans — one store does not need 10 scans/month, and CAC on Meta will exceed $17 (`LAUNCH-CHECKLIST.md` already says this). Best-practice guidance (Academy, playbooks) is empty.

### Avatar B — agency / multi-store

**Job:** “Show bloat across 20 stores, track it monthly, give me replacement options I can put in a client deck.”

| Need                           | Today                                                                                    |
| ------------------------------ | ---------------------------------------------------------------------------------------- |
| Multi-store portfolio          | No. Quota is a flat scan count. No org, no clients, no tags.                             |
| Cross-store bloat / overlap    | No. Compare exists for two saved scans of one account (`dashboard-data.js`), undeployed. |
| Competitor replacement options | Category `cheaper` / `native` strings in `rules.js`. Not a live alternative graph.       |
| Opportunity tracking over time | Telemetry table designed (`scan_events`); no product UI.                                 |
| Client-ready export            | Print-to-PDF on dashboard (undeployed). No white-label.                                  |
| Agency plan                    | Contact form only.                                                                       |

Director at $37/30 scans is a volume knob, not an agency product.

**Bottom line:** the avatars in the brief still match the **v9 homepage story**. The code has already narrowed to Shopify cost-cutting. That narrowing is the right commercial instinct (`docs/PRODUCT-OVERVIEW.md`). The homepage and the founder brief have not caught up.

---

## 5. Recommendations (MVP vs later)

Prioritized by “stops harm” then “makes the first dollar honest.” Effort is technical, not calendar.

### Do now (ops, not features)

1. **Deactivate or blank the two Stripe Payment Links.** Confirm in the Stripe dashboard whether anyone has ever been charged; refund or manually deliver if yes. (`TASKS_FOR_USER.md` item 1 + GAP-TO-MARKET Q6.)
2. **Take v8 and v9 (and old v10) off the public internet** — delete, password, or 301. Leaving them up keeps fabricated proof and the retracted savings engine indexed. This is the single largest credibility risk.
3. **Roll the Stripe live secret key** if rotation is not already confirmed. Make the GitHub repo private.
4. **Name a legal entity, jurisdiction, support mailbox, and a domain you control.** Fill `[[LEGAL ENTITY]]` placeholders. Preflight stays red until this happens — that is correct.

### MVP (one product, one avatar)

Ship **only** the Shopify audit. Kill the intelligence-engine story until you have a crawler.

5. **Offer:** one-off Store Audit (~$149) + optional founder review against the merchant’s Shopify Admin app list. Keep the free teaser scan as a lead magnet. Agency seat later, not in the MVP. Retire or hide $17/$37 until fulfillment is proven. (GAP-TO-MARKET Phase 2; `LAUNCH-CHECKLIST.md` already doubts $17 CAC.)
6. **Deploy the current v10 tree to staging**, apply `supabase/schema.sql`, wire Resend + webhook, run one test-mode purchase end-to-end, confirm `/health` `productionReady: true`, then promote. Do not flip `fulfillmentReady` before that.
7. **Fulfillment = scanner + human.** Use `docs/paid-scan-report-template.md`. The automated report is a draft, not the product.
8. **3–5 permissioned beta audits** (`docs/BETA-OUTREACH.md`) before any ad spend. Fill the commented testimonial slots with real quotes only. Measure per-signature precision (`scripts/rules-accuracy.js` is already written).
9. **Copy freeze:** every public page must match AD-CLAIMS-GUIDE. No “15 sources,” no GitHub-as-a-live-source FAQ, no slider that implies the subscription finds $3k. The v10 tree is close; the **deployed** pages are not.
10. **Cite or drop the 35 uncited paid benchmarks.** A test that fails on `cost > 0 && !pricingUrl` is the enforcement.

### Later (after 10 paid audits, not before)

11. BigCommerce / WooCommerce adapters — only if beta demand is real. Do not advertise them now.
12. Agency portfolio: orgs, client tags, cross-store overlap, proposal export. This is avatar B. It is a second product.
13. Headless fallback for bot-protected stores; honour or openly document `robots.txt` Disallow (PLT-5).
14. Tiered, dated cost table; App Store UUID map; detection feedback loop into signature quality (tables already exist).
15. **GitHub / OSS opportunity repo** — only as a new bet with its own ToS, index, and buyer. Do not bolt it onto the audit MVP. If you still want the name “Scout” for that, split the brands.

---

## 6. Risk flags (credibility)

These are visible on the public web or in the repo today. They are not theoretical.

| Flag                                                                                      | Where I saw it                                                                              | Why it matters                                                                                            |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Fabricated G2 4.8/127, Trustpilot 4.9/89, Product Hunt #1                                 | Live v9 hero and “Numbers That Back the Claims”; live v8                                    | FTC / platform ToS / chargeback. Undefendable if a journalist or competitor opens the page.               |
| “340+ operators”, “47 founding seats remaining”, “this isn’t manufactured urgency”        | Live v9                                                                                     | Zero customers. The copy denies that it is fake.                                                          |
| Fake testimonials (Marcus R., Jamie K., Tara S.) and fake firm names with revenue figures | Live v9 “What Operators Actually Say” / “Who’s Using Scout”                                 | Explicitly forbidden by `docs/AD-CLAIMS-GUIDE.md`. v10 homepage correctly refuses this; v9 is still live. |
| “This is the real engine, not a demo” over a `setTimeout` + canned repos                  | Live v9 `index.html` 1687–1738                                                              | Direct lie about product nature.                                                                          |
| Ad-spend-derived savings on a 0-detection scan ($21.6k–$78k on nytimes.com)               | Live v9 and live v10 scan functions, 2026-09-09                                             | The retracted engine is what customers hit.                                                               |
| Invented PayPal $80/mo                                                                    | Live scan payloads                                                                          | Removed in v10 `rules.js` (cost 0 + note). Still live.                                                    |
| Checkout armed, fulfillment absent                                                        | Payment Links 200; `/login.html` 404; domain dead                                           | Money taken, nothing delivered. Legal and reputational.                                                   |
| “GitHub Scout” with no GitHub use                                                         | Name, metadata, FAQ                                                                         | Implied affiliation. Rename before buying a domain or running ads.                                        |
| Legal pages with `[[LEGAL ENTITY NAME]]`                                                  | v10 `terms.html` / `privacy.html` (undeployed). Live v9 terms still claim “all 15 sources.” | Cannot enforce ToS; refund path is a dead email.                                                          |
| Public repo + documented key exposure                                                     | `TASKS_FOR_USER.md`                                                                         | Assume Stripe live key is burned until proven rotated.                                                    |
| Slider ROI sold as “estimated waste”                                                      | Live v10 homepage; live v9 ROI section                                                      | Not a scan. Easy to screenshot as a promise.                                                              |

The v10 tree’s integrity work (PRs #4, #5, #8) is the right ethic. It does not count until the live sites match it.

---

## 7. What I would tell the founder in one paragraph

You built a decent Shopify fingerprint scanner and then spent more energy on a landing page for a GitHub-intelligence product that does not exist. The live site is the liability: fake reviews, fake customers, fake query engine, and a checkout that can charge a card. The scanner is the asset: keep it, deploy it behind an honest one-off audit, prove it on five real stores, and only then talk about agencies or a second platform. Do not scrape GitHub until someone will pay for that job. Take v9 down this week.

---

## 8. Evidence appendix (commands and URLs, 2026-09-09)

```
GET  https://githubscout-ecommerce-v9-20260609.netlify.app/          200  (Open Intelligence Engine)
GET  https://githubscout-ecommerce-v9-20260609.netlify.app/.netlify/functions/health
     {"ok":true,"service":"github-scout-v9-ecommerce"}
POST same origin /.netlify/functions/operator-url-scan
     allbirds + under-$10k  → 5 apps, $120-$420  (dropdown band)
     nytimes  + $250k+      → 0 apps, $21.6k-$78k (dropdown band)
GET  https://githubscout-ecommerce-v10-20260624.netlify.app/         200  (15-sources homepage)
GET  …/login.html  …/dashboard.html  …/stripe-webhook                 404
POST …/operator-url-scan  allbirds  → same v9-shaped $120-$420 body
GET  https://githubscout-ecommerce-v8-20260605.netlify.app/          200  (v8 engine + G2 copy)
GET  https://buy.stripe.com/5kQ8wO0H268D5Hqh2zcQU00                 200
GET  https://buy.stripe.com/dRm28q61m2Wrd9SfYvcQU01                 200
DNS  githubscout.ai                                                 NXDOMAIN
```

Repo facts cited above: `lib/adapters.js` 10–30, `lib/rules.js` 10 / 33–99, `lib/plans.js` 32–35, `lib/aggregate.js` 15–38 / 239–278, `assets/launch-config.js` 10–12, `terms.html` 20–35, `index.html` 270–272 / 405–424 / 450–454 / 527, v9 `index.html` 1687–1738, v9 `operator-url-scan.js` 97–101.

Owner action list (unchanged, still blocking): `TASKS_FOR_USER.md` items 1–4 and 11–13.
