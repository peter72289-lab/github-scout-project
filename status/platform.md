# Stream ledger — platform (PLT-)

- **Scope:** everything in the repo: `netlify-v10-githubscout-ecommerce/`, root docs, CI, hygiene.
  Split into more streams only when two sessions need to run concurrently.
- **Owner:** unclaimed. Primary checkout at `/Users/mbergvinson/cursor-projects/githubscout`.
- **Branches:** `feat/platform-…`, `fix/…`, `chore/…`, `docs/…`. Blocker prefix `PLT-`.
- **Last updated:** 2026-08-20

## Current state

**All code-side work is done: money path, scan honesty, customer exit, deploy surface, and the first data asset. 143 tests pass. PRs #2-#10. Everything remaining needs owner credentials or a decision.**

> Keep the block above current. Rewrite it as the situation changes; never append a newer bullet
> above it. New work goes to `## Recently completed

- 2026-08-21 — **M13 closed: every scan now leaves a PII-free record, and signed-in customers can mark a detection right or wrong — the first asset here a competitor cannot copy.** New `scan_events` (no FK to any account; hostname stored as an HMAC keyed by `SCAN_TELEMETRY_SALT`, and written as null rather than an unkeyed digest when the salt is missing, since a bare hostname digest is brute-forceable) and `detection_feedback` (unique per account/scan/signature, so a customer can change their answer). Writes are fire-and-forget off the scan's critical path, with tests asserting the handler returns before the insert settles and that a throwing insert leaves the report intact. `buildReport` split into `buildFullReport` + `toTeaser` so telemetry reads the full report instead of re-running detection. New `scripts/rules-accuracy.js` reports per-signature frequency, confirmed/denied counts, dead rules, and co-occurring pairs — the report that says which of the 65 signatures are worth keeping. Retention wired into `cleanup-scheduled.js` at 24 months; `privacy.html` states plainly that erasure cannot reach `scan_events` and why. Also refreshed `docs/ARCHITECTURE.md`, whose env and schema tables had gone stale across PRs #3-#10 while still claiming to be complete.

- 2026-08-20 — **M2 closed: a deploy no longer serves runbooks, schema, tests, or a 5.2 MB build zip, and 20k lines of dead weight are gone.** `netlify.toml` gained 14 forced-404 deny rules (extension globs do not work in Netlify's matcher — directories need a splat, root files are listed individually), validated by running `netlify dev --offline` and curling 31 paths. New preflight section 9 is default-deny over the publish root and was negative-tested three ways, so the exposure cannot regress. Deleted: the deploy zip, five dead v8-era assets, both `data/*.json`, `scout-demo-video.html`, `checkout-command.html` (the 301s still resolve), `netlify-v8-githubscout/`, `servers/commerce_scan_api.py`, and the four launchpad prototypes with their 12 verification PNGs — each grep-verified unreferenced first, and one live dangling `ecommerce.css` link in `checkout-director.html` found and fixed. `subprocessors.html` now discloses the CRM lead-forwarding processor; `support.html` states a one-business-day first reply; `README.md` rewritten to say plainly that v2 has never been deployed. Working tree 84 MB -> 73 MB; `.git` unchanged at 76 MB (history rewrite is owner work, PLT-4). Kept: `netlify-v9-*` (deployed), `ads/` (57 MB) and `cockpit-v2-demo/` — all await the owner's purge decision.

- 2026-08-20 — **Checkout cannot charge a card until `fulfillmentReady` is flipped, and the Stripe signature tests can now fail.** `assets/launch-config.js` gains a master switch defaulting to false; `launch-checkout.js` gates every CTA on it, and `checkout-operator.html`, `checkout-director.html`, and the dashboard upsell were rerouted through the shared gate (the two checkout pages were reading config directly and did not even load the asset). A test asserts the committed config ships with the switch off. Separately, `tests/run-tests.js` carried its own copy of the Stripe HMAC verifier, so the four signature tests passed whatever `stripe-webhook.js` did; they now import the shipped `verifyStripeSignature`. Verified by mutation: stubbing the verifier to `return true` fails three of them, where before it failed none.

- 2026-08-20 — **M3/M4 closed: deleting an account now cancels billing first, data export exists, and there is a cancel path.** `account-delete.js` cancels the Stripe subscription via a separate restricted `STRIPE_BILLING_KEY` before touching a row, and aborts the whole deletion on any cancel failure — erasing the row first stranded the subscription, since `stripe-webhook.js` drops lifecycle events it cannot match. With no key configured it refuses (409) instead of deleting. New `account-export.js` satisfies the export promised at `privacy.html:35` and names in-file what it cannot include. `stripeCustomerPortalUrl` gates "Manage billing" controls on `dashboard.html` and `refunds.html` so an unconfigured portal renders nothing rather than a dead cancel link. Refund/cancellation SOP added to `docs/RUNBOOK.md`. Opened owner tasks 12 (portal link, blocking before first sale — ARL requires online cancellation) and 13 (billing key).

- 2026-08-20 — **M1 closed: a failed scan no longer costs a credit, and a bot-blocked store is reported as blocked instead of clean.** `usage_increment` is now a reservation released by a new `usage_decrement` when the crawl produced no storefront page (`operator-url-scan.js`, `supabase/schema.sql` — serialized zone, schema not yet deployed anywhere so the addition is safe). Blocked detection lives in `lib/adapters.js` (`scan.crawlBlock`) and surfaces as `crawl.blocked` / `crawl.blockedBy` / `savingsSuppressedReason: 'crawl-blocked'`, rendered by `operator-url-analysis.html` as "Not visible" rather than a count of zero, with a single `Access` recommendation replacing the "stack is quiet" card. `guard.js` gained gzip/deflate/br decoding with the size cap applied to the decompressed stream. Measured live: bombas.com now reports Vercel bot protection (HTTP 429) instead of an empty stack; allbirds and gymshark unchanged at 10/10.
- 2026-08-20 — **Reverted the browser User-Agent an agent proposed: measured against five storefronts it changed zero source counts, and it would have made our unevaluated robots.txt Disallow rules indefensible.** The scanner stays identifiable as `GitHubScoutOperatorScan/2.0`, with a test asserting it does not impersonate a browser. Opened PLT-5 for the Disallow decision itself (`TASKS_FOR_USER.md` item 11).

- 2026-08-20 — **B5 closed: every fabricated client-side figure and every present-tense "15 sources" claim is gone; source counts now derive from the adapter catalog.** `operator-url-analysis.html` lost its ~120-line second copy of the savings engine, which invented `$120-$420` bands, `72%` confidence, and two percentage claims, and rendered a phantom `matched` field. It now renders `strength`, real `evidence[]`, and `savingsSuppressedReason` from the server, with honest empty and loading states. New `netlify/functions/sources.js` + `assets/source-counts.js` fill every `[data-source-count]` element from `lib/adapters.js`; the duplicate planned `checkout-fingerprint-plan` entry is deleted, settling the catalog at 10 live / 15 total. `methodology.html` confidence scoring rewritten to match `classifyStrength`/`scoreConfidence`, and the crawl gate stated publicly. `preflight.js` now fails on `all 15`, bare `15 ... sources`, unlabelled dollar ranges outside sample pages, and any `data-source-count` fallback that disagrees with the catalog (33 checked). Also fixed `moneyRange`, which suffixed the annual figure `/mo`.`; detail goes under `### History`.

### History

- 2026-08-20 — Repo cloned from `peter72289-lab/github-scout-project` at `5761f1e`. Four
  reader passes (product, tech, history, ops) produced `docs/GAP-TO-MARKET.md`,
  `docs/PRODUCT-OVERVIEW.md`, `docs/ARCHITECTURE.md`. Conventions ported from musselshield.

## Next steps — M2 / M3

- DONE Fix webhook plan resolution so Director purchases get `director`
  (`netlify/functions/stripe-webhook.js:74-84,152-170`); tested against a real `checkout.session.completed`
  payload shape via the exported `resolvePlanFromSession`, not a copy of the verifier.
- DONE Reconcile `PLAN_QUOTAS` with terms: operator 10, director 30; drop `command`. Quotas now
  live in `netlify/functions/lib/plans.js`; `dashboard.html:137` reads `quota` from `auth-me.js`
  instead of keeping its own table.
- DONE Gate savings on evidence quality (B3): `lib/aggregate.js:15-59` classifies every detection
  `detected` / `likely` / `possible`; `:130-190` withholds every dollar unless
  `shopifyConfirmed && pages.length >= 1` and the detection was seen on the storefront.
- TODO Wire the client to `summary.savingsSuppressedReason`, `summary.strengthCounts`, and the
  per-detection `strength` / `countsTowardSavings` fields (`operator-url-analysis.html:346`,
  `dashboard.html:195-198`).
- TODO Remove "All 15" / "15 research sources" from `index.html:272`,
  `operator-shopify-savings.html:106`, `checkout-operator.html:46`, `agency-pricing.html:158`,
  `customer-onboarding.html:44`; widen `preflight.js:52` grep.
- TODO Remove client placeholder figures in `operator-url-analysis.html:108,393,219-316,468`.
- TODO `account-delete.js`: decide with user whether delete must cancel the Stripe subscription
  (needs Stripe API; no SDK in repo).
- TODO Move quota decrement after a successful crawl (`operator-url-scan.js:76-83`).
- TODO Delete dead code: `assets/{app,ecommerce,dossiers}.js`, `data/*.json`,
  `adapters.js:26` duplicate planned entry, methodology duplicate row; reconcile "5 more" vs
  "6 more" planned sources (`operator-url-analysis.html:143,168`; the 6 counts the duplicate).
- BLOCKED M2 purge and repo-private: PLT-4.
- BLOCKED M4 service wiring: PLT-2.
- BLOCKED M5 legal placeholders: PLT-3.

## Blockers (PLT-)

**PLT-1 — A live Stripe secret key is documented as exposed; rotation is unconfirmed, so no billing work is safe.**

**PLT-2 — No Supabase, Resend, or Stripe webhook credentials exist; auth, dashboard, and fulfillment cannot be run anywhere.**

**PLT-3 — Legal entity, jurisdiction, and a working support mailbox are undecided; preflight fails and legal pages cannot ship.**

**PLT-4 — Purge scope is undecided: deploy zip, PNGs, duplicate media, v8/v9 sites, and repo visibility all need the owner's call.**

**PLT-5 — The scanner does not evaluate robots.txt Disallow, and Shopify disallows `/cart`, which is a live source; honouring it drops the published count from 10 to 9.**

| ID    | Opened     | Type       | Blocks                 | What unblocks it                                                                  | Owner | State           |
| ----- | ---------- | ---------- | ---------------------- | --------------------------------------------------------------------------------- | ----- | --------------- |
| PLT-1 | 2026-08-20 | permission | M1, M4, any billing    | User confirms in Stripe that the key was rolled, or rolls it                      | User  | waiting-on-user |
| PLT-2 | 2026-08-20 | dependency | M4                     | User creates Supabase project, Resend domain, webhook; adds keys to `~/.api-keys` | User  | waiting-on-user |
| PLT-3 | 2026-08-20 | decision   | M5, preflight green    | User supplies entity, jurisdiction, support address; rename decision              | User  | waiting-on-user |
| PLT-4 | 2026-08-20 | decision   | M2                     | User answers `TASKS_FOR_USER.md` item 3                                           | User  | waiting-on-user |
| PLT-5 | 2026-08-20 | decision   | Published source count | User decides: honour Disallow (9 live sources) or keep fetching `/cart` openly    | User  | waiting-on-user |

## Recently completed (append-only, newest first)

- 2026-08-20 — **B3 closed: the scanner no longer prices a store it never reached. nytimes.com now returns a possible-strength signal and no dollars.** `netlify/functions/lib/aggregate.js:15-59` adds an evidence-strength taxonomy computed from the kind and independence of evidence, not the match count: `detected` (2+ distinct sources, or a third-party script host parsed off a fetched page; confidence 70-95), `likely` (a single storefront page pattern; 60), `possible` (DNS records, a robots.txt reference, or a lone substring with no page and no host; 25). Bands are contiguous and non-overlapping, the 95 cap is unchanged, and the old `50 + 12*sources + hostBoost` floor of 62 for one DNS TXT substring is gone (`:110-116`). `:130-135` adds the crawl gate — savings exist only when `scan.shopifyConfirmed` is true and `scan.pages.length >= 1`, otherwise `savingsFromDetected(detected, scan)` (`:151`, signature changed to take the scan) returns the existing null shape with `suppressedReason` of `not-shopify`, `no-pages-fetched`, or `no-paid-detections` and a basis string that says so in plain words. `findOverlaps(detected, scan)` (`:175`) takes the same gate, and both it and the benchmark recommendations (`:216`) count only `detected` / `likely` paid apps, so a `possible` match is reported but never priced. `buildReport` surfaces `summary.savingsSuppressedReason` (`:281`, null when a range is shown) and `summary.strengthCounts` (`:285`); `summary.detectedCount` keeps its existing meaning (every signal at any strength) for `operator-url-analysis.html:346` and `dashboard.html:195`. Teaser depth carries `strength` and `countsTowardSavings` but still no evidence trails or raw costs (`:296-299`). 76 tests pass under both Bun and Node (68 existing + 8 new: a nytimes-shaped negative fixture, a page-plus-host positive, a mixed fixture proving a DNS-only paid app adds zero dollars, a two-`possible` overlap case, band ordering, and teaser depth); the three existing `savingsFromDetected` tests and the overlap test were updated to pass a scan context because the function now requires one. Client wiring is a separate unit. Uncommitted pending user instruction.

- 2026-08-20 — **Plans have one source of truth: Director is 30 scans, not 100, and the webhook no longer resolves every buyer to operator.** New `netlify/functions/lib/plans.js:32` holds the two live plans (operator $17/10, director $37/30, per `terms.html:20-21`), marks `command` retired, and returns `null` for anything unknown instead of falling back. `operator-url-scan.js:41-42,82-87` uses it and returns 403 with a support message when a subscription names a plan it cannot price, rather than silently granting the smallest tier. `stripe-webhook.js:74-84` resolves the plan from `metadata.plan`, `metadata.github_scout_plan` (the key the live Payment Links actually carry — `scripts/create-stripe-githubscout-links.js:75,88,103`), `metadata.price_id`, then an optional restricted read-only Stripe API lookup; with no signal it writes `plan: unresolved` / `status: needs_review`, logs the session id and email domain only, and still sends the sign-in email so the buyer is not stranded. `lib/auth.js:89` now surfaces `needs_review` subscriptions so that 403 can fire, `auth-me.js:25` serves `quota`, and `dashboard.html:131,137` consumes it and shows a "needs manual review" notice instead of "Free". `supabase/schema.sql:37-38` comments updated. 68 tests pass (49 existing + 19 new); `SETUP.md` documents the optional `STRIPE_SECRET_KEY` and the metadata requirement without it. Uncommitted pending user instruction.

- 2026-08-20 — **Repo adopted: CLAUDE.md, STATUS.md, ledgers, TASKS_FOR_USER.md, CI, PR and issue templates, .gitignore, Prettier config written.** No code changed; 49 tests still pass; preflight still fails on known placeholders. Uncommitted pending user instruction.
