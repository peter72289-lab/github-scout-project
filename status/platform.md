# Stream ledger — platform (PLT-)

- **Scope:** everything in the repo: `netlify-v10-githubscout-ecommerce/`, root docs, CI, hygiene.
  Split into more streams only when two sessions need to run concurrently.
- **Owner:** unclaimed. Primary checkout at `/Users/mbergvinson/cursor-projects/githubscout`.
- **Branches:** `feat/platform-…`, `fix/…`, `chore/…`, `docs/…`. Blocker prefix `PLT-`.
- **Last updated:** 2026-08-20

## Current state

**M0 complete: repo adopted, agent rules, ledgers, CI, hygiene files, and gap analysis written. Nothing committed or pushed yet; no code changed. Next is M3 code fixes, which need no credentials.**

> Keep the block above current. Rewrite it as the situation changes; never append a newer bullet
> above it. New work goes to `## Recently completed`; detail goes under `### History`.

### History

- 2026-08-20 — Repo cloned from `peter72289-lab/github-scout-project` at `5761f1e`. Four
  reader passes (product, tech, history, ops) produced `docs/GAP-TO-MARKET.md`,
  `docs/PRODUCT-OVERVIEW.md`, `docs/ARCHITECTURE.md`. Conventions ported from musselshield.

## Next steps — M2 / M3

- TODO Fix webhook plan resolution so Director purchases get `director`
  (`netlify/functions/stripe-webhook.js:80-81`); test against a real `checkout.session.completed`
  payload shape, not a copy of the verifier.
- TODO Reconcile `PLAN_QUOTAS` (`operator-url-scan.js:13`) with terms: operator 10, director 30;
  drop `command`. Update `dashboard.html:132` client copy of the table in the same unit.
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

- 2026-08-20 — **Repo adopted: CLAUDE.md, STATUS.md, ledgers, TASKS_FOR_USER.md, CI, PR and issue templates, .gitignore, Prettier config written.** No code changed; 49 tests still pass; preflight still fails on known placeholders. Uncommitted pending user instruction.
