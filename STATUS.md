# GitHub Scout — project status (index)

Thin index only. Sessions log work, next steps, and blocker detail in the owning stream's
`status/<stream>.md`. Plan of record: `docs/GAP-TO-MARKET.md`. Agent rules: `CLAUDE.md`.
Cross-stream asks: `status/HANDOFFS.md`. Owner-only actions: `TASKS_FOR_USER.md`.

> Checklists use `- DONE / - TODO / - BLOCKED / - WIP` bullets (not `- [ ]` task-list syntax) on
> purpose: some editors rewrite GFM task lists on save. Keep this style here and in every
> `status/` file.

Legend: DONE · WIP in progress · TODO not started · BLOCKED

- **Last reconciled:** 2026-08-20 (first reconciliation; repo adopted from
  `peter72289-lab/github-scout-project` at `5761f1e`)

## Where things stand (verified 2026-08-20, not remembered)

- **Code.** The v2 product build (commit `15aaebb`, merged as PR #1) is the canonical app at
  `netlify-v10-githubscout-ecommerce/`. The scanner runs locally against real stores (10/10
  sources on a test storefront). 49 unit tests pass under `bun tests/run-tests.js`.
- **Deployed.** Three Netlify sites answer 200 (v8, v9, old v10). None runs the v2 build:
  `/.netlify/functions/auth-me`, `/login.html`, `/dashboard.html`, `/subprocessors.html` return
  404 on the v10 site and `/health` is the pre-v2 handler. Staging `githubscout-v2-staging`
  is empty. `githubscout.ai` does not resolve, so `support@githubscout.ai` is a dead mailbox.
- **Money.** Two live Stripe Payment Links exist (Operator $17, Director $37) and are wired from
  the checkout pages. No webhook endpoint, no Supabase project, no Resend domain, no env vars.
  A paying customer today receives nothing automated.
- **Known broken in code.** Webhook maps every purchase to `operator` (metadata mismatch with the
  Payment Links); Director quota is 100 in code vs 30 in terms; retired `command` plan key still
  in `PLAN_QUOTAS`; account delete does not cancel the Stripe subscription; quota is consumed
  before the crawl; present-tense "15 sources" copy survives on five v10 pages ("All 15" on three of
  them); `[[LEGAL ENTITY]]`
  placeholders fail preflight; `operator-url-analysis.html` paints `$120-$420/mo` on
  recommendations the server returned with no figure.
- **Hygiene.** A 5.3 MB deploy zip, ~55 MB of ad PNGs, duplicated MP4s, and `launch-config.js`
  (gitignored but tracked) are in history. Repo is public per its own docs. A live Stripe secret
  key is asserted exposed in the author's own runbooks (`TASKS_FOR_USER.md` item 1 lists them); it
  is not in this history, rotation unconfirmed.
- **Unknown.** Whether the Stripe key was rotated; whether anyone has paid; whether the Netlify
  Forms "backup intake" submissions were ever read; who owns the Netlify and Stripe accounts the
  user now controls.

## Milestones and work streams

| #   | Scope                                                                                         | State   |
| --- | --------------------------------------------------------------------------------------------- | ------- |
| M0  | Repo adopted: agent rules, ledgers, CI, hygiene files, gap analysis                           | DONE    |
| M1  | Owner access confirmed: Stripe, Netlify, GitHub, domain; key rotation confirmed               | BLOCKED |
| M2  | Purge: zip, verification PNGs, duplicate media out of tree; repo private; `.gitignore` real   | TODO    |
| M3  | Code fixes: webhook plan mapping, quota table, "All 15" copy, client placeholder figures      | TODO    |
| M4  | Services wired on staging: Supabase schema, Stripe webhook, Resend; `/health` productionReady | BLOCKED |
| M5  | Legal: entity, jurisdiction, support mailbox, rename decision; preflight green                | BLOCKED |
| M6  | Proof: 3-5 real store scans logged, beta merchants, ads regenerated per AD-CLAIMS-GUIDE       | TODO    |
| M7  | v2 deployed to production; v8/v9 retired                                                      | TODO    |

## Streams

| Stream   | Ledger               | Current phase                 | Session note                     |
| -------- | -------------------- | ----------------------------- | -------------------------------- |
| platform | `status/platform.md` | M0 done; M2/M3 ready to start | Created 2026-08-20, no owner yet |

Single stream until there is a reason for more. Blocker prefix `PLT-`. Add a row here when a
second stream is opened; its ledger is created in the same PR.

## Next 3 actions

1. User: confirm account access and Stripe key rotation (`TASKS_FOR_USER.md` items 1-3). Nothing
   downstream is safe to ship until M1 closes.
2. Platform: M3 code fixes in one branch each, tests first (`docs/GAP-TO-MARKET.md` lists them in
   order). Zero external dependencies; can start now.
3. Platform, after the purge decision lands: M2 hygiene PR, then the user runs the history rewrite
   per `netlify-v10-githubscout-ecommerce/docs/SECRETS-PURGE.md`.

## Blockers index (detail in stream ledgers; protocol in CLAUDE.md)

| ID                          | Stream   | Summary                                                             | State           |
| --------------------------- | -------- | ------------------------------------------------------------------- | --------------- |
| [PLT-1](status/platform.md) | platform | Stripe live key rotation unconfirmed; no money work until confirmed | waiting-on-user |
| [PLT-2](status/platform.md) | platform | No Supabase / Resend / webhook credentials; M4 cannot start         | waiting-on-user |
| [PLT-3](status/platform.md) | platform | Legal entity, jurisdiction, and support mailbox undecided           | waiting-on-user |
| [PLT-4](status/platform.md) | platform | Purge scope (zip, PNGs, v8/v9, repo visibility) needs a decision    | waiting-on-user |
| [PLT-5](status/platform.md) | platform | robots.txt Disallow vs the `/cart` live source needs a decision     | waiting-on-user |
