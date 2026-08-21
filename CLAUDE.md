# CLAUDE.md

Guidance for Claude Code (and any coding agent) working in this repository. These instructions
override default behavior. Follow them exactly. Global rules from `~/.claude/CLAUDE.md` still apply
(Bun first, no pushes without explicit instruction, no force-push, no emojis, no AI attribution in
commits, commit locally when a unit is complete, terse replies). This file adds only what is
project-specific.

## What this repo is

GitHub Scout ("Scout") is a paid Shopify app-stack audit: a merchant submits a public storefront
URL, ten keyless sources are fetched (HTML, `/products.json`, robots, headers, DNS, script hosts,
JSON-LD, checkout fingerprint), 65 signatures in `rules.js` detect apps, and a report ranks
keep / replace / remove / test with a savings band derived only from detected paid apps. Operator
$17/mo (10 scans) and Director $37/mo (30 scans) sell through Stripe Payment Links; accounts,
quotas, and a dashboard are coded (magic-link auth, Supabase, Stripe webhook) but have never been
deployed or run against real services.

**`docs/GAP-TO-MARKET.md` is the plan of record**: read it before substantial work. Also
`docs/PRODUCT-OVERVIEW.md` (what we sell and to whom), `docs/ARCHITECTURE.md` (how the v10 build
works), and `netlify-v10-githubscout-ecommerce/docs/AD-CLAIMS-GUIDE.md` (what copy may claim).

## Architecture (flat repo, one canonical app)

- `netlify-v10-githubscout-ecommerce/` is the **canonical app**. Static HTML at the root of that
  folder (`publish = "."` in `netlify.toml`), Netlify Functions in `netlify/functions/*.js`
  (CommonJS, zero npm deps), engine in `netlify/functions/lib/` (guard, adapters, rules,
  aggregate, supabase, auth), schema in `supabase/schema.sql`, tests in `tests/run-tests.js`,
  launch gate in `scripts/preflight.js`. All product work happens here.
- `netlify-v10-githubscout-ecommerce/docs/` holds RUNBOOK, DATA-RETENTION, EMAIL-DNS-SETUP,
  SECRETS-PURGE, BETA-OUTREACH, AD-CLAIMS-GUIDE; SETUP.md, LAUNCH-READINESS.md, LAUNCH-CHECKLIST.md,
  DEPLOY-STAGING.md, COMMIT-PLAN.md sit at the v10 root.
- `docs/` (repo root): project-level docs, the plan of record, and the pre-v2 marketing and
  launch runbooks (Meta campaign, checkout readiness, onboarding email templates).
- **Legacy, frozen. Do not edit, do not build on:** `netlify-v8-githubscout/` (generic OSS search
  site), `netlify-v9-githubscout-ecommerce/` (pre-v2 funnel, still deployed, still serves the
  retracted "15 sources" and ad-spend-derived savings), the four root
  `github-scout-commerce-launchpad-v11..v14-*.html` mockups and their `v1*-verification.png`
  screenshots, `servers/commerce_scan_api.py` (orphaned prototype), `cockpit-v2-demo/`, `ads/`.
  Touch them only to archive or delete, and only as its own PR.
- Dead code inside v10 that no page loads: `assets/{app,ecommerce,dossiers}.js`, `data/*.json`.
  Do not extend them; removal is a tracked unit in `docs/GAP-TO-MARKET.md`.
- Read-only ground truth for product decisions: the Stripe dashboard, the Netlify dashboards, and
  the live sites listed in `README.md`. Never assume a deploy happened; check `/health`.

## Commands

Run from `netlify-v10-githubscout-ecommerce/` unless noted. Bun runs every script here; Node 18+ is
the fallback only because `netlify dev` executes functions under Node.

- `bun tests/run-tests.js` (or `bun run test`): 49 unit tests, no network. **The gate.** Run
  before every commit.
- `bun scripts/preflight.js` (or `bun run preflight`): launch-readiness gate. Currently exits 1
  on the `[[LEGAL ENTITY]]` placeholders in `terms.html` / `privacy.html`; that is a real blocker,
  not noise. Do not edit the preflight to make it pass.
- `bunx netlify dev`: local site + functions on :8888. Needs the Netlify CLI; functions degrade
  gracefully with no env vars (scanner works, auth/webhook return 503).
- `bunx netlify deploy --prod`: **never run this.** Deploys are user-run release events.
- `bun ../scripts/verify-githubscout-launch.js <site-url>`: live smoke test against a deployed URL.
- `bunx prettier@3 --check "*.md" "status/**/*.md" ".github/**/*.md" "docs/{GAP-TO-MARKET,PRODUCT-OVERVIEW,ARCHITECTURE}.md"`
  from the repo root:
  formatting gate, scoped to the adopted files until the v10 tree is formatted (tracked chore).
- Never claim a change works without running the relevant command and observing the output.

## Environment and secrets

- All keys live in `/Users/mbergvinson/.api-keys` (global rule). There are no Scout entries there
  yet; when the user provides Supabase / Stripe webhook / Resend / Netlify values, append them
  under a `GitHub Scout` section per the global procedure.
- Runtime env (set in Netlify UI, never in files): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_OPERATOR`, `STRIPE_PRICE_DIRECTOR`, `RESEND_API_KEY`,
  `AUTH_EMAIL_FROM`, optional `GHL_WEBHOOK_URL`. `URL` is Netlify-provided.
- `assets/launch-config.js` holds the two public Stripe Payment Link URLs and nothing secret. It is
  listed in v10's `.gitignore` yet tracked; do not put anything secret in it, and do not "fix" the
  tracking without a decision recorded in `TASKS_FOR_USER.md`.
- The repo's docs assert a live Stripe secret key was once exposed. It is not in this git history.
  Treat the key as compromised until the user confirms rotation (see `TASKS_FOR_USER.md`).
- Never paste a key into a prompt, log, test fixture, or doc. CI greps tracked files for
  `sk_live_`, `whsec_`, and `service_role` values and fails on a match.

## Project ledger and blocked work

- **`STATUS.md`** (repo root) is the ledger index: milestones, stream registry, blockers index.
  Each work stream keeps detail in **`status/<stream>.md`**, edited only by that stream. At the
  start of a session read `STATUS.md`, your stream file, `status/HANDOFFS.md`, and
  `TASKS_FOR_USER.md`. Update them as you work. The ledger, not chat history, is the handoff.
- **When blocked** (permission, dependency, decision, environment, external, data): do not guess
  around it or silently skip. Record it in your stream's Blockers with a stream-prefixed ID, type,
  what is blocked, what unblocks it, owner; add a one-line row to the `STATUS.md` blockers index;
  surface it in your reply; if the user must act, add a `TASKS_FOR_USER.md` item and open a GitHub
  issue labeled `blocked`; then continue other unblocked work.
- **`status/HANDOFFS.md`** is the cross-stream channel (`HX-n`). Write the entry first, then
  optionally `SendMessage` a live peer session as a doorbell. Check your section at session start.
- **`TASKS_FOR_USER.md`** is the user parking lot: only things the human can do. Blocking items at
  the top of the table. When the user answers, record the answer where it belongs and move the
  item to Done. Closing an item means editing both its detail section and its At-a-glance row.
- **Ledger section contract.** Every `status/<stream>.md` has: `## Current state` whose first
  block is a live summary that is rewritten, never appended above; `### History`; `## Next steps`
  as `- DONE / - TODO / - BLOCKED` bullets (not `- [ ]` task lists); `## Blockers (<PREFIX>-)`
  with a bold one-line lead per blocker and a table; `## Recently completed` append-only, newest
  first. Every blocker, handoff, task, and completed entry begins with a bold executive summary
  of at most 140 characters that states impact. One fact, one home: if a value is copied for
  readability, name the source file beside it.
- **Before you finish a session:** re-read your State lead as if you had never seen it. If it
  describes merged work or a moved milestone, rewrite it. Update `STATUS.md` only if milestones
  or the blockers index changed.

## Ground truth: never invent, always cite

- Do not fabricate app prices, detection counts, source counts, savings ranges, test counts,
  review scores, customer quotes, or deploy status. 42 of the 65 signatures in `rules.js` have no
  `pricingUrl`; 35 of those carry a paid cost benchmark (7 are cost 0). Adding one requires a
  `pricingUrl`.
- Cite the file and line for any domain value you introduce or change.
- If a needed value, column, env var, or API is not confirmed in a real file, verify before using
  it. Claims of success are backed by an observed run.

## Facts that must stay correct (regression guards)

- Live sources: **10** (`lib/adapters.js`). "15 sources" is never present tense. The phrase
  "All 15" still survives on several v10 pages; fixing it is a tracked unit, not a rewrite license.
- Savings come only from detected paid apps, banded 15-40% of benchmark cost; the ad-spend
  dropdown changes urgency text only. Zero detections means no estimate, never a placeholder range.
- Confidence is capped at 95 and is a corroboration score, not a probability. Say so in copy.
- Plans: Operator $17/mo, 10 scans; Director $37/mo, 30 scans. `PLAN_QUOTAS` in
  `operator-url-scan.js` says director 100 and still carries a retired `command` key; reconciling
  it is a tracked unit. Command is retired; `/checkout-command*` 301s to agency pricing.
- The webhook resolves every purchase to `operator` as currently wired to the Payment Links. Do
  not describe Director fulfillment as working until that is fixed and observed.
- The v2 build has never been deployed. Production (v9 and the old v10 deploy) is the pre-July
  funnel. Do not write "live" about any v2 feature.

## Marketing-claims rule

Every customer-facing string obeys `netlify-v10-githubscout-ecommerce/docs/AD-CLAIMS-GUIDE.md`.
No dollar figure that is not computed from detections, no source count other than the live count,
no testimonials or review scores without a permissioned real quote, no implied GitHub affiliation,
no guaranteed savings. When a page and the engine disagree, the engine is the fact and the page
gets fixed. `scripts/preflight.js` greps for a few banned phrases; passing it is necessary, not
sufficient.

## Quality bar

- Functions stay dependency-free CommonJS unless an ADR says otherwise. Validate every inbound
  body and every env-derived value at the boundary; no silent fallbacks that fabricate output.
- A change ships with its test in `tests/run-tests.js`. Test the real function, not a copy of it
  (the Stripe signature test currently re-implements the verifier; do not repeat that pattern).
- Prettier clean (`.prettierrc.json` at root) for every file you create or touch. No stray `console.log`, no commented-out blocks,
  no dead code added. Comments explain why.
- Definition of Done: tests green, preflight unchanged or improved, docs and the owning ledger
  updated, behavior observed by running it.

## Tone and copy rules

Terse, sentence-case, no explanatory subtitles, no "AI/ML/model" framing. Wordmark "GitHub Scout"
for now; the rename is an open user decision, so do not introduce new brand strings.

## Git and workflow

- `main` is the trunk. Work on `feat/…`, `fix/…`, `chore/…`, `docs/…` branches cut from fresh
  `origin/main`; never stack on an unmerged branch.
- Conventional Commits with scope (`feat(scanner): …`, `docs(ledger): …`). No AI attribution.
- Commit locally when a unit is complete. **Never push, open a PR, merge, force-push, rewrite
  history, or run `--no-verify` without an explicit instruction from the user in this session.**
  The user runs history purges (`docs/SECRETS-PURGE.md`) and deploys.
- PRs use `.github/pull_request_template.md`; always `--base main`; squash-merge with branch
  delete is the user's call.
- After any rebase or merge-from-main, `git diff origin/main --stat` and explain every file you
  did not intend to touch. Reverting prose breaks no test, so nothing else will catch it.
- Parallel sessions: one session owns the primary checkout; others work in worktrees under
  `../githubscout-wt/`. Serialized zones (never edited concurrently): `netlify.toml`,
  `supabase/schema.sql`, `package.json`, `.github/`, `STATUS.md`, `TASKS_FOR_USER.md`.

## Doc map

| Need                                          | Read                                                                               |
| --------------------------------------------- | ---------------------------------------------------------------------------------- |
| What to do next, in order                     | `docs/GAP-TO-MARKET.md`                                                            |
| What the product is, pricing, funnels, claims | `docs/PRODUCT-OVERVIEW.md`                                                         |
| How the v10 build works, flows, env, data     | `docs/ARCHITECTURE.md`                                                             |
| Where things stand today                      | `STATUS.md`, `status/<stream>.md`                                                  |
| Things only the owner can do                  | `TASKS_FOR_USER.md`                                                                |
| Asks between sessions                         | `status/HANDOFFS.md`                                                               |
| Deploy and env wiring                         | `netlify-v10-githubscout-ecommerce/SETUP.md`, `DEPLOY-STAGING.md`                  |
| What copy may claim                           | `netlify-v10-githubscout-ecommerce/docs/AD-CLAIMS-GUIDE.md`                        |
| Incident and retention procedures             | `netlify-v10-githubscout-ecommerce/docs/{RUNBOOK,DATA-RETENTION,SECRETS-PURGE}.md` |

## Do not

- Do not edit v8, v9, the launchpad HTML, or the Python server except to archive them.
- Do not deploy, push, or touch Stripe / Supabase / Netlify / Resend accounts without instruction.
- Do not add npm dependencies to `netlify/functions/` without an ADR.
- Do not commit `.env*`, zips, build output, or anything matching the CI secret patterns.
- Do not change prices, quotas, or plan names in one place; they live in `launch-config.js`,
  `operator-url-scan.js`, `terms.html`, and the checkout pages, and a change is one unit that
  touches all of them with the ledger entry listing each file.
- Do not add placeholder numbers to any UI state. An empty state says it is empty.
- Do not weaken `scripts/preflight.js`, `lib/guard.js`, or the CSP to make something pass.
- Do not write "done", "live", or "works" for anything you did not run and observe.
