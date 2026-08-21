# GitHub Scout

A paid Shopify app-stack audit. A merchant submits a public storefront URL; the scanner fetches
ten keyless public sources (HTML, `/products.json`, robots, headers, DNS, script hosts, JSON-LD,
checkout fingerprint), matches them against 65 app signatures, and returns a report that ranks
each detected app keep / replace / remove / test with a savings band derived only from apps it
actually detected. No detection, no dollar figure.

Sold as Operator $17/mo (10 scans) and Director $37/mo (30 scans) through Stripe Payment Links.
"GitHub Scout" is a leftover name from an earlier product; renaming is an open owner decision.

## Current status

The v2 build — scanner, magic-link auth, Supabase schema, Stripe webhook, dashboard — is merged
and passes its tests locally, but **it has never been deployed**. The Netlify sites that answer
today serve the pre-v2 funnel, so nothing described above is live and no URL here should be read
as running the current code. Checkout is deliberately disarmed: `fulfillmentReady` in
`assets/launch-config.js` is `false`, which hides the Stripe buttons, because a purchase today
would be fulfilled by nothing. `scripts/preflight.js` fails on the two `[[LEGAL ENTITY]]`
placeholders in `terms.html` and `privacy.html`; that is a real launch blocker, not noise.

`STATUS.md` is the current ledger. Read it before assuming anything here is still true.

## Layout

- `netlify-v10-githubscout-ecommerce/` — **the canonical app.** All product work happens here.
  Static HTML at the folder root, Netlify Functions in `netlify/functions/` (CommonJS, zero npm
  dependencies), the engine in `netlify/functions/lib/`, schema in `supabase/schema.sql`.
- `netlify-v9-githubscout-ecommerce/` — legacy. The pre-v2 funnel that is still deployed. Frozen;
  its fate is an open owner decision (`TASKS_FOR_USER.md` item 7).
- `docs/` — project-level docs and the plan of record.
- `ads/`, `cockpit-v2-demo/`, `fixtures/`, `scripts/` — ad renders, demo capture assets, test
  fixtures, and repo-level verification scripts.

## Running it

From `netlify-v10-githubscout-ecommerce/`:

```bash
bun tests/run-tests.js     # 121 unit tests, no network. The gate — run before every commit.
bun scripts/preflight.js   # launch-readiness gate; exits 1 on the legal placeholders above
bunx netlify dev           # site + functions on :8888; functions degrade with no env vars
```

From the repo root:

```bash
bunx prettier@3 --check "*.md" "status/**/*.md" ".github/**/*.md" \
  "docs/{GAP-TO-MARKET,PRODUCT-OVERVIEW,ARCHITECTURE}.md"
```

Deploys are owner-run release events. Do not run `netlify deploy` from an agent session.

## Docs

| Need                                           | Read                                                                          |
| ---------------------------------------------- | ----------------------------------------------------------------------------- |
| Rules for anyone (human or agent) writing code | `CLAUDE.md`                                                                   |
| What to do next, in order                      | `docs/GAP-TO-MARKET.md`                                                       |
| What the product is, pricing, claims           | `docs/PRODUCT-OVERVIEW.md`                                                    |
| How the build works — flows, env, data         | `docs/ARCHITECTURE.md`                                                        |
| Where things stand today                       | `STATUS.md`, `status/<stream>.md`                                             |
| Things only the owner can do                   | `TASKS_FOR_USER.md`                                                           |
| Deploy and env wiring                          | `netlify-v10-githubscout-ecommerce/SETUP.md`                                  |
| What copy may claim                            | `netlify-v10-githubscout-ecommerce/docs/AD-CLAIMS-GUIDE.md`                   |
| Incident, refund, and retention procedures     | `netlify-v10-githubscout-ecommerce/docs/RUNBOOK.md`, `docs/DATA-RETENTION.md` |

## Ground rules

Numbers in this repo are cited or they do not ship. Ten live sources, not fifteen. Savings come
only from detected paid apps. Confidence is a corroboration score capped at 95, not a probability.
Nothing is "live" until someone has run it and watched it work.
