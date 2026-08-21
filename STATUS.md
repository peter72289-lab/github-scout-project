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

## Where things stand (verified 2026-08-21, not remembered)

- **Code.** The canonical app is `netlify-v10-githubscout-ecommerce/`. 143 unit tests pass under
  `bun tests/run-tests.js`. Ten PRs (#2-#10) closed every code-side defect the gap analysis
  found; what is left needs credentials or a decision, not engineering.
- **Deployed.** Unchanged, and this is the headline: **the v2 build has still never been
  deployed anywhere.** Two Netlify sites (v9, old v10) answer 200 with the pre-v2 funnel;
  `/login.html`, `/dashboard.html`, and the webhook 404, and `/health` is the old handler.
  Staging is empty. `githubscout.ai` does not resolve, so `support@githubscout.ai` is dead.
  Nothing in PRs #2-#10 is live. Do not describe any of it as shipped.
- **Money.** The two live Stripe Payment Links still exist, but no page can reach them:
  `fulfillmentReady: false` in `assets/launch-config.js` gates every CTA. Flipping that switch is
  the deliberate launch action, and it should not be flipped until `/health` reports
  `productionReady: true` on a deploy and a test-mode purchase has been watched end to end.
- **Fixed since 2026-08-20.** Director buyers no longer get the Operator quota; savings require a
  confirmed Shopify storefront and a fetched page; the client invents no figures; "15 sources" is
  gone; a failed crawl costs no credit and reports as blocked; deleting an account cancels billing
  first; data export and an online cancel path exist; a deploy no longer serves runbooks or the
  schema; the Stripe signature tests can now actually fail; every scan leaves a PII-free record.
- **Hygiene.** Working tree 84 MB -> 73 MB. `.git` is still 76 MB: shrinking it needs a history
  rewrite, which is owner work. `ads/` (57 MB) is 78% of what remains and awaits the purge
  decision. A live Stripe secret key is asserted exposed in the prior author's runbooks; it is not
  in this history and rotation is still unconfirmed.
- **Unknown.** Whether the Stripe key was rotated; whether anyone has ever paid (and therefore
  received nothing); who owns the Netlify and Stripe accounts; whether the Netlify Forms intake
  submissions were ever read.

## Milestones and work streams

| #   | Scope                                                                                         | State   |
| --- | --------------------------------------------------------------------------------------------- | ------- |
| M0  | Repo adopted: agent rules, ledgers, CI, hygiene files, gap analysis                           | DONE    |
| M1  | Owner access confirmed: Stripe, Netlify, GitHub, domain; key rotation confirmed               | BLOCKED |
| M2  | Deploy surface locked down; dead weight deleted (history rewrite still owner work)            | DONE    |
| M3  | Code fixes: plan mapping, quotas, evidence gating, client honesty, accounts, telemetry        | DONE    |
| M4  | Services wired on staging: Supabase schema, Stripe webhook, Resend; `/health` productionReady | BLOCKED |
| M5  | Legal: entity, jurisdiction, support mailbox, rename decision; preflight green                | BLOCKED |
| M6  | Proof: 3-5 real store scans logged, beta merchants, ads regenerated per AD-CLAIMS-GUIDE       | TODO    |
| M7  | v2 deployed to production; v8 removed, v9 retired                                             | TODO    |

Every remaining milestone is blocked on the owner. There is no unblocked engineering left that is
worth doing before a deploy proves the assumptions.

## Streams

| Stream   | Ledger               | Current phase                           | Session note                     |
| -------- | -------------------- | --------------------------------------- | -------------------------------- |
| platform | `status/platform.md` | M0/M2/M3 done; M1, M4, M5 owner-blocked | Created 2026-08-20, no owner yet |

Single stream until there is a reason for more. Blocker prefix `PLT-`. Add a row here when a
second stream is opened; its ledger is created in the same PR.

## Next 3 actions

1. User: `TASKS_FOR_USER.md` items 1-3 (Stripe key rotation, account ownership, purge scope).
   Nothing downstream is safe until these close.
2. User: items 4, 12, 13 (legal placeholders, Customer Portal link, restricted billing key). The
   first makes preflight green; the other two are required before a first live sale.
3. Platform, once M1/M4 clear: apply `supabase/schema.sql`, deploy to staging, run a test-mode
   purchase end to end, confirm `/health` `productionReady: true`, then flip `fulfillmentReady`.

## Blockers index (detail in stream ledgers; protocol in CLAUDE.md)

| ID                          | Stream   | Summary                                                             | State           |
| --------------------------- | -------- | ------------------------------------------------------------------- | --------------- |
| [PLT-1](status/platform.md) | platform | Stripe live key rotation unconfirmed; no money work until confirmed | waiting-on-user |
| [PLT-2](status/platform.md) | platform | No Supabase / Resend / webhook credentials; M4 cannot start         | waiting-on-user |
| [PLT-3](status/platform.md) | platform | Legal entity, jurisdiction, and support mailbox undecided           | waiting-on-user |
| [PLT-4](status/platform.md) | platform | Purge scope (zip, PNGs, v8/v9, repo visibility) needs a decision    | waiting-on-user |
| [PLT-5](status/platform.md) | platform | robots.txt Disallow vs the `/cart` live source needs a decision     | waiting-on-user |
