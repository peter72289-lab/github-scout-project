# GitHub Scout: Gap-to-Market Analysis

Repo: `/Users/mbergvinson/cursor-projects/githubscout`. Canonical product tree: `netlify-v10-githubscout-ecommerce/` (referred to as `v10/`). All `file:line` references were verified by reading the file unless marked INFER. Synthesized 2026-08-20 from four reader reports (product, tech, history, ops) and three lens analyses (product-market, technical, trust/legal/ops).

## 1. Executive summary

GitHub Scout is a Shopify app-stack audit tool: paste a storefront URL, get detected apps, a benchmark-based savings band, and a keep/replace/remove plan, sold at $17/mo (10 scans) and $37/mo (30 scans) via live Stripe Payment Links.

Where it actually stands: the scanner is real, keyless, and fast (VERIFIED by execution: 10/10 sources on allbirds.com in 1.25s). The v2 build (accounts, webhook, quotas, dashboard; commit `15aaebb`, merged `5761f1e`) is fully coded, passes 49 unit tests, and has never been deployed. Production (`githubscout-ecommerce-v10-20260624.netlify.app`) serves a pre-July static funnel where `/login.html`, `/dashboard.html`, and `/.netlify/functions/stripe-webhook` all 404. Zero customers, zero beta audits, no domain, no legal entity named, no support mailbox that resolves.

Single biggest gap: the checkout is armed and fulfillment does not exist. A buyer is charged today and lands on a page promising an email that cannot be sent. Close behind: even once deployed, the automated report is too thin to justify a monthly subscription to a single-store merchant.

Recommended path: disarm checkout today (Phase 0), deploy v2 with real infra and fix the plan-mapping and savings-gating bugs (Phase 1), then relaunch the offer as a one-off ~$149 merchant audit fulfilled with the scanner plus founder review, and an agency monthly seat (Phase 2). First 10 paying customers should come from beta outreach and direct sales, not Meta ads. Roughly 8 working days of engineering plus 2-3 weeks of calendar time for outreach.

## 2. What exists today

**Product surface (v10).** Homepage with pricing cards (`v10/index.html`), ad landing page with email/URL/spend capture (`operator-shopify-savings.html`), teaser report page (`operator-url-analysis.html`), checkout pages pointing to Stripe Payment Links (`checkout-operator.html`, `checkout-director.html`, links in `assets/launch-config.js:5-6`), agency contact form, legal set (privacy, terms, refunds, data-handling, subprocessors, methodology, sample-report, changelog), and the undeployed v2 pages (`login.html`, `dashboard.html`).

**Tech.** Static HTML on Netlify (`netlify.toml:2` `publish = "."`), zero-dependency CommonJS Netlify Functions. Scanner: `lib/guard.js` (SSRF-pinned fetch, rate limit), `lib/adapters.js` (10 live public sources: home/cart/product HTML, `/products.json`, robots, headers, DNS TXT/MX, script-host census, JSON-LD, checkout fingerprint), `lib/rules.js` (65 signatures, 15 categories), `lib/aggregate.js` (detect, confidence, savings, recommendations). Accounts: magic-link auth via Resend, sessions in Supabase, Stripe webhook provisioning, atomic quota RPC (`supabase/schema.sql`), GDPR delete, daily cleanup cron. 49 passing unit tests on pure functions only.

**Data.** None stored. Each scan is computed live from the target store plus `rules.js`. `data/*.json` are dead v8-era files. 23 of 65 signature costs cite a `pricingUrl` (VERIFIED: 24 occurrences incl. one comment); 42 have none, and 35 of those carry a paid hand-typed benchmark (7 are cost 0).

**Ops.** Three Netlify sites live (v8, v9, v10), all serving the same two Stripe links. No Supabase project, no Resend, no webhook endpoint, no Meta pixel ID, no GHL webhook evidence. `githubscout.ai` does not resolve. Repo is public (per author's docs) at `peter72289-lab/github-scout-project`, 81 MB `.git`, single author (not the current user). Docs assert a live Stripe key was exposed out-of-band; rotation unchecked in every checklist.

## 3. Promise vs delivery

| Promise (where)                                                                                                                                                                                         | What the code delivers                                                                                                                                                                                                        | Status                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| "A sign-in link has been emailed to the address you paid with" (`v10/operator-thank-you.html:26`)                                                                                                       | No webhook, Supabase, or Resend deployed; nothing sent                                                                                                                                                                        | Broken in prod                          |
| Director = 30 storefront analyses/mo (`terms.html:20-21`, `index.html:483-493`)                                                                                                                         | `PLAN_QUOTAS = {operator:10, command:30, director:100}` (`operator-url-scan.js:13`); webhook resolves every buyer to `operator` (`stripe-webhook.js:80-81`)                                                                   | Three different numbers                 |
| "15 Sources included" (`operator-shopify-savings.html:106`), "All 15" (`checkout-operator.html:46`, `agency-pricing.html:158`, `customer-onboarding.html:44`), "15 research sources" (`index.html:272`) | 10 live sources (`lib/adapters.js:10-20`); own claims guide forbids this (`docs/AD-CLAIMS-GUIDE.md`)                                                                                                                          | False present-tense claim               |
| "Savings only from detected apps, never invented" (`README.md:46-53`, `methodology.html:64-67`)                                                                                                         | Server: true. Client: `$120-$420` painted before any response (`operator-url-analysis.html:108`) and on null-savings cards (`:393`); canned "12-18% waste risk" fallback recs (`:219`, `:489`); `confidence \|\| 72` (`:468`) | Contradicted by the UI                  |
| "We audited your storefront"                                                                                                                                                                            | Savings emitted with no Shopify gate or page-fetch gate; nytimes.com produced "Klaviyo 62%, $27-$72/mo" from a DNS TXT record alone (VERIFIED by execution, technical lens)                                                   | Core promise unreliable                 |
| Cost benchmarks "published pricing" (`methodology.html:61`)                                                                                                                                             | 42/65 signatures have no `pricingUrl` (35 of them paid, 7 cost 0); single flat number per app, no tier                                                                                                                        | Partially substantiated                 |
| 14-day refund via support (`refunds.html:19`)                                                                                                                                                           | `support@githubscout.ai` on a non-resolving domain; no cancel button, no Customer Portal                                                                                                                                      | Unexercisable                           |
| Data export on request (`privacy.html:35`)                                                                                                                                                              | No export endpoint; only `account-delete.js`                                                                                                                                                                                  | Unimplemented                           |
| Account deletion                                                                                                                                                                                        | Deletes DB rows; never cancels the Stripe subscription (`account-delete.js`, no Stripe reference)                                                                                                                             | Keeps billing                           |
| Legal operator identified (`terms.html:33`, `privacy.html:37`)                                                                                                                                          | `[[LEGAL ENTITY NAME]]`, `[[STATE/COUNTRY]]`, `[[BUSINESS ADDRESS]]`, `[[SUPPORT EMAIL]]` placeholders; `bun scripts/preflight.js` exits 1                                                                                    | Placeholders                            |
| "No borrowed logos, no stock testimonials" (`v10/index.html:443-448`)                                                                                                                                   | v9 site still live with "4.8/5 on G2 · 127 reviews", "#1 on Product Hunt", "47 founding seats remaining" (`netlify-v9-githubscout-ecommerce/index.html:754-774, 1337-1351, 1547-1551`)                                        | Fabricated proof live on a sibling site |
| Full report worth $17/mo                                                                                                                                                                                | Templated one-variable recommendation strings, four fixed action-plan sentences, 15-40% band on benchmark sum (`aggregate.js`); teaser already shows top apps and 2 recs                                                      | Thin                                    |

## 4. Gaps, ranked

### Blockers (no revenue without these)

**B1. Checkout is live, fulfillment is not deployed.**
Evidence: live Stripe links in `v10/assets/launch-config.js:5-6` served by v8, v9, v10 sites; prod v10 returns 404 for `login.html`, `dashboard.html`, `auth-me`, `stripe-webhook`; `/health` returns the pre-v2 handler shape (ops reader, 2026-08-20). `LAUNCH-READINESS.md` steps 31-44 unchecked. Staging `githubscout-v2-staging` is empty.
Fix: today, blank both URLs in `launch-config.js` (CTAs already gate on them, `checkout-operator.html:54`) or deactivate the Payment Links in Stripe. Then deploy v2 with `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `AUTH_EMAIL_FROM`; apply `supabase/schema.sql`; register webhook for 5 events; one test-mode purchase end to end; confirm `/health` `productionReady:true`.
Effort: 1 hour to disarm; 2 days to deploy and verify.

**B2. Webhook maps every buyer to `operator`; quota table contradicts Terms.**
Evidence: `stripe-webhook.js:80-81` reads `session.metadata.price_id` then `session.metadata.plan`, defaulting to `'operator'`. Payment Links were created with `metadata[github_scout_plan]` (`scripts/create-stripe-githubscout-links.js:75,88,103`), never `plan` or `price_id`. INFER: Stripe does not copy Payment Link metadata to session metadata unless set as checkout-session metadata; either way the key names do not match, so Director buyers get 10 scans. `PLAN_QUOTAS` gives director 100 and keeps retired `command` (`operator-url-scan.js:13`); `netlify.toml:12,18` 301s the Command route away.
Fix: set `metadata[plan]=operator|director` on each Payment Link (or fetch `/v1/checkout/sessions/{id}/line_items` with a restricted key and map by price id); `PLAN_QUOTAS = {operator:10, director:30}`; one handler-level test with a recorded `checkout.session.completed` fixture. Also reject one-time sessions at `:81` (`session.subscription || session.id`).
Effort: 0.5 day.

**B3. Savings and detections are not gated on evidence quality.**
Evidence: `aggregate.js:61` confidence = `min(95, 50 + 12*sources + hostBoost)`, one DNS substring = 62; `:80-81` sums any `cost > 0` regardless of evidence kind; `buildReport` emits `shopifyConfirmed` as a field (`:181`) but never gates savings on it or on `pages.length`. Executed: nytimes.com, zero pages fetched, returned Klaviyo $180 and a $27-$72/mo band.
Fix: savings only when `shopifyConfirmed && pages.length >= 1`; DNS-only or single-substring matches go to a `possible` bucket excluded from savings (v14's detected/entered/likely/unknown taxonomy); add a non-Shopify negative fixture test.
Effort: 1.5 days.

**B4. Legal entity, jurisdiction, and support mailbox do not exist.**
Evidence: `terms.html:33,35`, `privacy.html:37` placeholders; `bun scripts/preflight.js` exits 1 on them; `githubscout.ai` does not resolve, so `support@githubscout.ai` (refund, privacy, deletion contact on every legal page) and Resend's default From `login@transactional.githubscout.ai` (`lib/auth.js`) are dead; `.well-known/security.txt` points at a GitHub Issues URL.
Fix: name the entity, fill placeholders, buy/point a domain you control, real `support@` mailbox, verify sending domain (`docs/EMAIL-DNS-SETUP.md`).
Effort: 0.5 day plus DNS propagation.

**B5. Unsubstantiated numbers and the "15 sources" claim on money pages and receipts.**
Evidence: `operator-url-analysis.html:108, 393, 219, 468, 489`; `operator-shopify-savings.html:106`; `checkout-operator.html:46`; `agency-pricing.html:158`; `customer-onboarding.html:44`; `index.html:272`; `operator-sample-reports.html:50-82` (savings ranges for never-scanned stores); Stripe product descriptions "across all 15 GitHub Scout sources" (`scripts/create-stripe-githubscout-links.js:31,39`). `scripts/preflight.js:52` greps three exact phrases and misses all of these. "5 more" vs "6 more" on one page (`operator-url-analysis.html:143,168`).
Fix: remove `|| '$120-$420/mo'`, `|| 72`, the initial placeholder; gate `fallbackAnalysis` to crawl-failure with no dollar math; render `evidence[]` instead of nonexistent `matched`; replace every "15" with "10 live (15 planned)"; edit Stripe product descriptions; broaden preflight regex to `/\b15\b[^.]{0,30}sources?/i`, `/all 15/i`, and `\$\d+-\$\d+` outside labeled sample pages.
Effort: 0.5 day.

**B6. v8 and v9 sites are live with fabricated social proof and the retracted savings engine.**
Evidence: URLs return 200 (ops reader). `netlify-v9-githubscout-ecommerce/index.html:754-774, 1337-1351, 1547-1551` fake G2/Trustpilot/Product Hunt/seat scarcity; v9 `netlify/functions/operator-url-scan.js:98` ad-spend-keyed `$21.6k-$78k` tiers, `:56` invented PayPal $80 fee, `:506` intent-keyed rate limit bypass; v9 `launch-analytics.js:25` fires pixel without consent. `docs/meta-campaign-structure.md` still targets v9 URLs.
Fix: delete or password-protect both Netlify sites; remove `netlify-v8-githubscout/` from the repo.
Effort: 30 minutes.

**B7. Treat the Stripe live secret key as compromised; repo is public.**
Evidence: no key value in this repo's git history (both history and ops readers grepped all commits); but `docs/launch-readiness-25-status.md:44`, `docs/weekend-launch-qa-checklist.md:7`, `SETUP.md`, `docs/SECRETS-PURGE.md:3` assert exposure, rotation unchecked. INFER: pasted into a terminal/agent session on 2026-06-24 when the link script ran. Repo contains site IDs, price IDs, runbooks, schema.
Fix: roll the key; create a restricted key for any future script use; make the repo private; add `gitleaks` pre-commit.
Effort: 20 minutes.

**B8. The paid unit is not worth $17/mo to a single-store merchant (value prop).**
Evidence: recommendations are templated strings (`aggregate.js`), action plan is four fixed sentences, savings = benchmark sum x 15-40%; teaser already exposes most of the information; merchants already have their app list in Shopify Admin; the engine's own "Stack is quiet" card tells them to look there. `LAUNCH-CHECKLIST.md:20`: "single $17/mo cannot sustain paid CAC". Author's v11-v14 mockups already moved to $149 audit / $950 sprint / $2.5k implementation.
Fix: change the offer (see Phase 2): one-off merchant audit where the scanner pre-fills `docs/paid-scan-report-template.md` and the founder verifies against the merchant's Shopify Admin app list and writes cited downgrade/replace cards; agency monthly seat for recurring multi-store use.
Effort: 0.5 day Stripe/pages; ongoing founder time per order.

### Major (revenue at risk / cannot scale past a handful)

**M1. Bot-protected stores defeat the crawler; quota debited before crawl.** Executed: bombas.com 1/10 sources, gymshark 6/10. `usage_increment` at `operator-url-scan.js:41` runs before `runAdapters` at `:87`. Fix: debit on `crawl.ok` only; browser-like UA/Accept headers; explicit "blocked by bot protection" state; later a headless fallback adapter. Effort: 0.5 day (+3 for headless).

**M2. 42 of 65 signatures lack a `pricingUrl` (35 paid benchmarks uncited), flat, untiered.** `lib/rules.js`, `RULES_VERSION = '2.0.0'`, no checkedAt. Fix: JSON cost table `{appId, tier, monthly, checkedAt, sourceUrl}`, 2-3 tiers, pick tier from spend band or catalog size; test fails on any paid app without `sourceUrl`. Effort: 3 days (mostly research).

**M3. Account delete does not cancel Stripe; no data export.** `account-delete.js` has no Stripe call; later webhooks dropped at `stripe-webhook.js:98-99`; `privacy.html:35` promises export. Fix: cancel subscription via REST before delete (or block delete while active and link Customer Portal); add `account-export.js`. Effort: 0.5 day.

**M4. No cancel/refund/dunning operations.** `refunds.html` promises Stripe-processed refunds and cancellation stopping renewals; no portal link on `dashboard.html`, no SOP in `docs/RUNBOOK.md`. California ARL requires online cancel. Fix: enable Stripe Customer Portal + Smart Retries, link from dashboard and refunds page, 10-line refund SOP. Effort: 2 hours.

**M5. `publish = "."` will serve runbooks, schema, tests, and a 5.3 MB zip.** `netlify.toml:2`; `v10/deploy-1783114711014-*.zip` tracked. 404 today only because prod is old. Fix: move site files to `public/`, set `publish = "public"`; `git rm` the zip; add `*.zip` to `.gitignore`. Effort: 0.5 day.

**M6. Two fulfillment models coexist with no owner.** Manual: `customer-onboarding.html`, `docs/paid-scan-report-template.md`, `docs/customer-onboarding-email-templates.md`. Self-serve: dashboard/webhook. `operator-thank-you.html` references both; Netlify Forms submissions have no consumer. Fix: pick one per the Phase 2 offer; delete or archive the other. Effort: 2 hours.

**M7. Rate limiting is per-lambda until Supabase exists; no per-target-host limit.** `lib/guard.js:172-194`; `auth-request-link.js:12` uses only the in-memory limiter. Fix: shared limiter everywhere once DB is on, per-hostname cap, 10-minute report cache per host, Turnstile on the anonymous form. Effort: 1 day.

**M8. Zero handler/DB/webhook tests; one test cannot fail.** `tests/run-tests.js:138-148` re-implements the signature verifier instead of importing it; `:116-117` async assertion inside sync wrapper. Fix: export verifier and plan resolver, fixture-driven handler tests with injectable `db`, fix the async test; move to `bun test`. Effort: 1.5 days.

**M9. Funnel cannot reach the ICP as built.** No domain, `metaPixelId: ''` (`launch-config.js:18`), ad creatives bake in "15 Sources" (`ads/operator-shopify-savings-9x16/render_ads.html:226,261-262`), zero beta quotes (`docs/BETA-OUTREACH.md`). Fix: domain, pixel, regenerate 3 ads against `docs/AD-CLAIMS-GUIDE.md`, 5 permissioned beta audits before spending on ads. Effort: 1 day ops + 2 weeks calendar.

**M10. "GitHub Scout" name and `github_scout_*` metadata.** Flagged by the author (`LAUNCH-CHECKLIST.md`, `LAUNCH-READINESS.md`); product no longer touches GitHub. Fix: rename before buying a domain, pixel history, or Stripe products. Effort: 1 day find-and-replace after a name is chosen.

**M11. No monitoring, alerting, or backup posture.** Nothing polls `health.js`; webhook failures only in Netlify logs. Fix: UptimeRobot on `/health` asserting `productionReady`, Stripe webhook failure emails, Slack webhook in catch blocks, Supabase backups confirmed. Effort: 0.5 day.

**M12. GHL/Zapier lead forwarding not in subprocessor list.** `operator-url-scan.js:27` forwards PII to `GHL_WEBHOOK_URL`; `subprocessors.html` omits it. Fix: add or drop. Effort: 30 minutes.

**M13. No data moat; anonymous scans discarded; JSON-LD source feeds no signature.** Only signed-in scans persist (`operator-url-scan.js:94-104`). Fix: persist every scan as PII-free `scan_events`, add "is this right?" feedback per detection, build the `cdn.shopify.com/extensions/<uuid>` app-UUID table. Effort: 1 day (+3).

### Minor

- Source-count drift: `SETUP.md` "9 live", error fallback `sourcesLive: 9` (`operator-url-scan.js:89`), `methodology.html:48,54` checkout fingerprint both Live and Planned, `lib/adapters.js:26` duplicate planned entry. Fix: render counts from the adapter catalog. 1 hour.
- Support page has no SLA (`support.html`). 10 minutes.
- Magic-link path lies when Resend is unset (`auth-request-link.js:27` says "on its way" while `auth.js` only console-logs); `URL` fallback to `localhost:8888`. Make Resend + verified domain a hard `productionReady` requirement. 0.5 day.
- CSP `'unsafe-inline'` (`netlify.toml:57`). Move inline scripts to `assets/`. 1 day.
- `assets/launch-config.js` gitignored but tracked (`.gitignore:5`); Payment Links are public anyway and appear in `docs/`. Drop the ignore rule. 10 minutes.
- Repo bloat: 81 MB `.git`, MP4 tracked three times, ~55 MB ad PNGs, 12 root verification PNGs, 1,042 lines of dead JS (`assets/app.js`, `ecommerce.js`, `dossiers.js`), `data/*.json`, `servers/commerce_scan_api.py`. See section 6. 0.5 day.

## 5. Path to first 10 paying customers

### Phase 0: Stop the bleeding (day 1, owner with logins)

- Blank `operatorCheckoutUrl`/`directorCheckoutUrl` in `v10/assets/launch-config.js` and redeploy, or deactivate both Payment Links in Stripe (B1).
- Roll the Stripe live secret key; make the GitHub repo private (B7).
- Delete or password-protect the v8 and v9 Netlify sites (B6).
- Decide entity name and product name (B4, M10); buy/point the domain; create `support@`.
  Exit criteria: no public page can charge a card; v8/v9 unreachable; key rotated; repo private; domain resolves and `support@` receives a test email.

### Phase 1: Viable fulfillment (days 2-9, ~8 engineering days)

- Fix `stripe-webhook.js:80-81` plan resolution and `PLAN_QUOTAS` (B2); set Payment Link metadata.
- Gate savings on `shopifyConfirmed` and fetched pages; demote DNS-only matches (B3).
- Strip client-side fabricated numbers and all "15" copy; broaden preflight (B5).
- Fill legal placeholders; `bun scripts/preflight.js` green (B4).
- Debit quota after successful crawl (M1 quick fix); delete cancels Stripe, add export (M3); enable Customer Portal (M4).
- Move site into `public/`, `publish = "public"`, remove zip (M5); delete manual-onboarding path or mark internal (M6).
- Add handler tests with a `checkout.session.completed` fixture; fix the async test (M8).
- Stand up Supabase, Resend (verified domain), webhook; deploy to staging; run a test-mode purchase through to a dashboard scan; promote to prod; UptimeRobot on `/health` (M11).
  Exit criteria: test-mode Director purchase provisions a `director` account with 30 scans, welcome email lands, scan saves to dashboard, nytimes.com-style URL returns no savings, preflight passes, `/health` reports `productionReady:true`, v8/v9 gone, prod serves no `.md`/`.sql`.

### Phase 2: Funnel live with an offer that fits the job (weeks 2-4)

- Relaunch offer: one-off Store Audit (~~$99-$149, Stripe one-time price) where the scanner pre-fills `docs/paid-scan-report-template.md` and the founder verifies against the merchant's Shopify Admin app list and writes cited downgrade/replace cards; keep the free teaser scan as lead magnet; agency seat (~~$79-$149/mo, 30+ scans, client-proposal export from v13) for the only recurring persona. Retire $17/$37 or keep Operator only as an upsell after the audit (owner decision, Q3).
- Run 5 free beta audits for permissioned quotes and a measured per-signature precision (`docs/BETA-OUTREACH.md`); publish the hit rate on `methodology.html`; fill the commented testimonial slots in `index.html:450-454` with real quotes only.
- Direct outreach (Shopify communities, agency partners, warm network) before paid ads. Regenerate 3 ads against `docs/AD-CLAIMS-GUIDE.md`; set pixel; run the $420 Meta test only after 3 paid audits have closed organically.
- Add GHL to subprocessors or drop it (M12); write refund SOP; support SLA line.
  Exit criteria: 3 paid audits delivered within 48 hours each, zero refunds, 3 permissioned quotes live, precision number published, Meta test launched with compliant creative.

### Phase 3: Scale to 10 and beyond (weeks 4-8)

- Cited, tiered cost table (M2); persist every scan and add detection feedback (M13a/b); browser-like headers then headless fallback for bot-protected stores (M1); shared rate limit and per-host cap (M7); app-UUID extension table (M13c).
- Automate the audit report progressively as the founder learns which manual edits recur.
- Annual pricing and upgrade path once churn data exists.
  Exit criteria: 10 paying customers; refund rate under 10%; 80%+ of scans on ICP stores return 7/10+ sources; every paid app in `rules.js` has a cited price; founder time per audit under 30 minutes.

## 6. Cut, consolidate, canonical

**Canonical:** `netlify-v10-githubscout-ecommerce/` only. Rename to `site/` or promote to repo root. Keep `netlify/functions/**`, `supabase/`, `tests/`, `scripts/preflight.js`, `assets/{launch-*,consent}.js`, all v10 HTML, `docs/AD-CLAIMS-GUIDE.md`, `docs/BETA-OUTREACH.md`, `docs/paid-scan-report-template.md`, `docs/EMAIL-DNS-SETUP.md`, `docs/DATA-RETENTION.md`, `docs/RUNBOOK.md`.

**Cut (delete from repo and take offline):**

- `netlify-v8-githubscout/` (static, no functions, superseded; live site still serving fabricated proof).
- `netlify-v9-githubscout-ecommerce/` (old scanner with retracted savings tiers, PayPal fee, rate-limit bypass, unconditional pixel, fake reviews). Archive to a separate private repo if history matters.
- `servers/commerce_scan_api.py` (102 lines, no detection logic; port 8767 is called only by the v11-v14 launchpad mockups, `github-scout-commerce-launchpad-v11-practical-audit.html:1042`, `v12-conversion-audit.html:1519`, `v13-product-funnel.html:1894`, `v14-trust-report-engine.html:2091`, and by nothing in v10; cut it with the launchpads).
- `v10/assets/app.js`, `assets/ecommerce.js` (polls nonexistent `localhost:7842`), `assets/dossiers.js`, `assets/dossiers.css`, `assets/ecommerce.css`, `data/opportunities.json`, `data/ecommerce_opportunities.json`, `scout-demo-video.html` (dead v8 dashboard era, unreferenced by any v10 page).
- `v10/deploy-1783114711014-*.zip` (5.3 MB stale build artifact; also filter from history).
- Root `github-scout-commerce-launchpad-v11..v14-*.html` and 12 `v1x-*-verification.png` (8,808 lines of unwired prototypes). Before deleting, lift two ideas into tickets: v14's detected/entered/likely/unknown evidence taxonomy (directly fixes B3) and the $149 / $950 / $2.5k offer ladder (Phase 2).
- `cockpit-v2-demo/`, duplicate MP4s, and the three `operator-*-ad.png` duplicated across v9/v10 assets.
- `ads/v9-static-9x16/`, `ads/operator-shopify-savings-9x16/` (~55 MB, all predate the integrity fixes and bake in "15 Sources"); keep `render_ads.html` as a template, regenerate outputs outside git or via LFS.
- `v10/customer-onboarding.html` and `docs/customer-onboarding-email-templates.md` if self-serve wins; or `dashboard.html` path if concierge wins. Not both.
- `PLAN_QUOTAS.command`, `STRIPE_PRICE_COMMAND`, `checkout-command.html` (already 301'd).
- `COMMIT-PLAN.md`, `DEPLOY-STAGING.md` site IDs, `docs/SECRETS-PURGE.md` (superseded; the key is not in this repo's history, full-history grep clean; the author's docs say it was once committed, presumably before the squashed `5ae4cf6 Publish GitHub Scout project` commit, so rotation is still required but a history rewrite of this clone would not remove anything).

**Consolidate:** one `lib/plans.js` exporting name/price/quota/Stripe price id, consumed by the scan function, dashboard, and an HTML build step; render source counts from `lib/adapters.js`; one `.gitignore` at root covering `node_modules/`, `.env*`, `*.zip`, `*.log`, `gitleaks-report.json`.

## 7. Open questions for the owner

1. Was the exposed unrestricted Stripe live key ever rolled? If you cannot confirm from the Stripe Dashboard key list, roll it now.
2. Who is the merchant of record (entity name, jurisdiction, address) for `terms.html:33` and `privacy.html:37`?
3. Offer decision: keep the $17/$37 subscription, switch to a one-off ~$149 audit plus agency seat, or run both? This determines which fulfillment path survives (M6).
4. Concierge or self-serve for the first 10 customers? The analysis recommends concierge (scanner pre-fills, founder verifies) because the automated report is thin; is founder time per order available?
5. New product name and domain? "GitHub Scout" must go; is `githubscout.ai` owned, or was it never bought?
6. Do the two live Payment Links (`price_1TlvIVBht9XEKTLjQUEoYXEU`, `price_1TlvIWBht9XEKTLjnQ7iU1HM`) have any historical charges? If yes, those buyers received nothing and need refunds or manual delivery.
7. Is there an existing Supabase project, Resend account, or GHL workspace for this product anywhere, or does everything start from zero? (`~/.api-keys` has no Scout entries.)
8. Is the GitHub repo `peter72289-lab/github-scout-project` under your control to make private, and is Peter Hewlett still involved?
9. Do you have 3-5 Shopify merchants (own stores, clients, friends) who will let you audit and quote them? This is the gating input for any honest marketing.
10. Are the v8 and v9 Netlify sites safe to delete outright, or is anything (ads, emails, links in the wild) still pointing at them?
11. Budget and timeline: is the $420 Meta test still the plan, or will first customers come from direct outreach?
12. Should the agency tier be real (self-serve seat with a price) or remain a contact form?

## 8. Strengths worth keeping

- **The scanner works, keyless, in about one second.** 10 public sources, per-source pass/fail recorded in every report, no API costs. `lib/adapters.js` and `lib/aggregate.js` are the core.
- **`lib/guard.js` is a genuinely careful SSRF guard:** connect-time DNS validation via custom `lookup`, redirect re-validation per hop, private/CGNAT/link-local/v6 blocks, size and time caps. Better than most indie tools ship.
- **Zero-dependency functions with correct money-path primitives:** manual Stripe HMAC with `timingSafeEqual` and 300s tolerance, `stripe_events` idempotency table, `past_due` suspension, hashed magic-link tokens, HttpOnly sessions, atomic `usage_increment` RPC, RLS on by default.
- **The integrity posture is the real differentiator.** "No estimate without detection," "benchmark, not your invoice," 95% confidence cap, the "Stack is quiet" card, commented-out testimonial slots refusing fabricated quotes, `docs/AD-CLAIMS-GUIDE.md`, and `scripts/preflight.js` failing the build on banned phrases. BuiltWith and Wappalyzer do detection; honest cost reasoning on top of detection is the wedge. The gaps above are mostly places where that standard was not applied to its own UI.
- **`lib/rules.js` is the seed of the only proprietary asset:** 65 signatures, 15 categories, native/cheaper alternatives per category. Cite and tier the prices and it becomes defensible.
- **Legal and compliance surface is unusually complete for a pre-launch solo project:** privacy, terms, refunds, data-handling, subprocessors, retention doc, GDPR delete, consent-gated pixel, security headers. It needs names and a mailbox, not a rewrite.
- **The author's own docs already diagnosed most of this** (`LAUNCH-CHECKLIST.md`, `BETA-OUTREACH.md` "having audited nobody is the gap", `LAUNCH-CHECKLIST.md:20` on CAC) and the v11-v14 pivot to a $149 audit / sprint ladder is the right commercial instinct. The engineering outran the offer; the fix is to catch the offer up, not to rebuild.
