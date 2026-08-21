# Stream ledger — platform (PLT-)

- **Scope:** everything in the repo: `netlify-v10-githubscout-ecommerce/`, root docs, CI, hygiene.
  Split into more streams only when two sessions need to run concurrently.
- **Owner:** unclaimed. Primary checkout at `/Users/mbergvinson/cursor-projects/githubscout`.
- **Branches:** `feat/platform-…`, `fix/…`, `chore/…`, `docs/…`. Blocker prefix `PLT-`.
- **Last updated:** 2026-08-20

## Current state

**M0 complete and M3 started: plan quotas and Stripe plan resolution now have one source of truth (`lib/plans.js`), 68 tests pass. Nothing committed or pushed yet.**

> Keep the block above current. Rewrite it as the situation changes; never append a newer bullet
> above it. New work goes to `## Recently completed`; detail goes under `### History`.

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

| ID    | Opened     | Type       | Blocks              | What unblocks it                                                                  | Owner | State           |
| ----- | ---------- | ---------- | ------------------- | --------------------------------------------------------------------------------- | ----- | --------------- |
| PLT-1 | 2026-08-20 | permission | M1, M4, any billing | User confirms in Stripe that the key was rolled, or rolls it                      | User  | waiting-on-user |
| PLT-2 | 2026-08-20 | dependency | M4                  | User creates Supabase project, Resend domain, webhook; adds keys to `~/.api-keys` | User  | waiting-on-user |
| PLT-3 | 2026-08-20 | decision   | M5, preflight green | User supplies entity, jurisdiction, support address; rename decision              | User  | waiting-on-user |
| PLT-4 | 2026-08-20 | decision   | M2                  | User answers `TASKS_FOR_USER.md` item 3                                           | User  | waiting-on-user |

## Recently completed (append-only, newest first)

- 2026-08-20 — **Plans have one source of truth: Director is 30 scans, not 100, and the webhook no longer resolves every buyer to operator.** New `netlify/functions/lib/plans.js:32` holds the two live plans (operator $17/10, director $37/30, per `terms.html:20-21`), marks `command` retired, and returns `null` for anything unknown instead of falling back. `operator-url-scan.js:41-42,82-87` uses it and returns 403 with a support message when a subscription names a plan it cannot price, rather than silently granting the smallest tier. `stripe-webhook.js:74-84` resolves the plan from `metadata.plan`, `metadata.github_scout_plan` (the key the live Payment Links actually carry — `scripts/create-stripe-githubscout-links.js:75,88,103`), `metadata.price_id`, then an optional restricted read-only Stripe API lookup; with no signal it writes `plan: unresolved` / `status: needs_review`, logs the session id and email domain only, and still sends the sign-in email so the buyer is not stranded. `lib/auth.js:89` now surfaces `needs_review` subscriptions so that 403 can fire, `auth-me.js:25` serves `quota`, and `dashboard.html:131,137` consumes it and shows a "needs manual review" notice instead of "Free". `supabase/schema.sql:37-38` comments updated. 68 tests pass (49 existing + 19 new); `SETUP.md` documents the optional `STRIPE_SECRET_KEY` and the metadata requirement without it. Uncommitted pending user instruction.

- 2026-08-20 — **Repo adopted: CLAUDE.md, STATUS.md, ledgers, TASKS_FOR_USER.md, CI, PR and issue templates, .gitignore, Prettier config written.** No code changed; 49 tests still pass; preflight still fails on known placeholders. Uncommitted pending user instruction.
