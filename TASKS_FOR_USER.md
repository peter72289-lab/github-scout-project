# Tasks for You (the human)

The exact things only you can do, why they matter, and **what stays blocked until you do them**.
Kept in sync with the Blockers index in [`STATUS.md`](STATUS.md) and the stream ledgers under
[`status/`](status/). Any session may add items here (this is also the **decision parking lot**);
whichever session receives your answer records it where it belongs (plan, ledger, doc) and moves
the item to Done. Blocking items go at the top of the table; answering in chat is fine, you never
need to edit this file yourself.

**Last updated:** 2026-08-20

## At a glance

**Three things block everything downstream: items 1, 2, and 3.** Until the Stripe key is
confirmed rotated, the accounts are confirmed yours, and the purge scope is decided, agents can
only do offline code fixes.

| #   | Do this                                                                                                | Effort  | Unblocks                              | Priority   |
| --- | ------------------------------------------------------------------------------------------------------ | ------- | ------------------------------------- | ---------- |
| 1   | Confirm in the Stripe dashboard that the unrestricted live secret key was rolled; roll it if unsure    | ~5 min  | PLT-1, any billing work, M4           | blocking   |
| 2   | Confirm which accounts you control: Stripe, Netlify (3 sites + staging), GitHub remote, Resend, domain | ~10 min | PLT-2, M1, deploy planning            | blocking   |
| 3   | Decide purge scope: deploy zip, verification PNGs, duplicate media, v8/v9 folders, repo visibility     | ~10 min | PLT-4, M2, history rewrite            | blocking   |
| 4   | Legal: entity name, jurisdiction, business address, support mailbox; rename off "GitHub Scout" or not  | ~15 min | PLT-3, M5, preflight green            | decision   |
| 5   | Create Supabase project, Resend domain, Stripe webhook endpoint; put keys in `~/.api-keys` and Netlify | ~30 min | PLT-2, M4                             | after 1-2  |
| 6   | Decide the fulfillment model: self-serve dashboard (v2) or manual onboarding form, not both            | ~5 min  | M3 copy fixes, thank-you page, emails | decision   |
| 7   | Decide what happens to the v8 and v9 Netlify sites (retire, redirect, or leave)                        | ~5 min  | M7; removes retracted claims from web | decision   |
| 8   | Decide whether account delete must cancel the Stripe subscription (needs Stripe API in functions)      | ~2 min  | M3 unit for `account-delete.js`       | decision   |
| 9   | Decide pricing direction: keep $17/$37 subscriptions, or the v11-v14 audit/sprint ladder               | ~10 min | Copy, Stripe products, ads            | whenever   |
| 10  | Give a go/no-go on pushing this session's files and on a first commit                                  | ~1 min  | Anything leaving this machine         | when ready |

## 1. Stripe key rotation (blocking)

**The repo's own docs say a live unrestricted Stripe secret key was exposed; it is not in this git history, so we cannot tell whether it was rotated.**

Where it came from: `docs/launch-readiness-25-status.md:44` (added 2026-06-24, the same day
`scripts/create-stripe-githubscout-links.js` landed; it reads `STRIPE_SECRET_KEY` from env or
stdin), then `docs/weekend-launch-qa-checklist.md:7` (2026-07-03), and on 2026-07-08
`netlify-v10-githubscout-ecommerce/SETUP.md:60`, `LAUNCH-CHECKLIST.md:7`, `LAUNCH-READINESS.md:50,82`,
`docs/SECRETS-PURGE.md:3`. A full-history grep for `sk_live_`,
`rk_live_`, `whsec_`, and JWT prefixes found only placeholder strings.

What to do: Stripe dashboard, Developers, API keys. If there is any doubt, roll the secret key and
create a restricted key for any future scripting. Tell a session "key rolled" and it closes PLT-1.

Impact today: any session that touches billing could be working against a compromised account.

## 2. Account ownership (blocking)

**Everything was built under `peter72289-lab`; we need to know which dashboards you can actually log into.**

Known identifiers: Netlify site ids `3f86b1e7-…` (v9), `c7971299-…` (v10), `84089b10-…`
(staging, empty); GitHub remote `peter72289-lab/github-scout-project` (public per its docs); Stripe
Payment Links `buy.stripe.com/5kQ8wO…` and `…/dRm28q…`; price ids in `docs/checkout-readiness.md:17,20`;
domain `githubscout.ai` (does not resolve). No Supabase or Resend project is referenced anywhere.

What to do: list which of these you control. If the GitHub remote is not yours, a session will
set a new origin when you say so. `.github/ISSUE_TEMPLATE/config.yml:4` links to this file at that
remote; GitHub requires an absolute URL there, so it 404s until the remote is decided and this file
is pushed, and must be updated then.

## 3. Purge scope (blocking)

**The repo is public and carries 81 MB of history; deciding what leaves the tree is a one-time owner call.**

Candidates, from the ops audit:

- `netlify-v10-githubscout-ecommerce/deploy-1783114711014-…zip` (5.3 MB, stale snapshot, duplicates tracked files): recommend remove and rewrite history.
- Root `v12-*/v13-*/v14-*-verification.png` (12 files, ~4 MB) and the four `github-scout-commerce-launchpad-v11..v14-*.html`: recommend move to an `archive/` folder or delete.
- `ads/**/*.png` (~55 MB, several ads bake in "15 sources"): recommend remove from git, keep elsewhere.
- MP4 tracked three times (`cockpit-v2-demo/`, v9 `assets/`, v10 `assets/`): keep one.
- `netlify-v8-githubscout/`, `netlify-v9-githubscout-ecommerce/`: archive folder or delete once item 7 is decided.
- `assets/launch-config.js`: either `git rm --cached` to honor the ignore rule, or drop the ignore rule (the Payment Links are public anyway). Recommend drop the ignore rule.
- Repo visibility: make private (`LAUNCH-READINESS.md:51` still open).

Answer with keep/remove per line. A session prepares the PR; you run the history rewrite per
`netlify-v10-githubscout-ecommerce/docs/SECRETS-PURGE.md`.

## 4. Legal placeholders and the name (decision)

**`terms.html:33-36` and `privacy.html:37-38` still read `[[LEGAL ENTITY NAME]]`, `[[GOVERNING JURISDICTION]]`, `[[BUSINESS ADDRESS]]`, `[[SUPPORT EMAIL]]`; preflight fails until they are filled.**

Also needed: a support mailbox that exists (`support@githubscout.ai` is on a domain that does not
resolve) and a decision on renaming off "GitHub Scout"
(`netlify-v10-githubscout-ecommerce/LAUNCH-CHECKLIST.md:14` and `LAUNCH-READINESS.md:43` flag
trademark exposure). A rename touches every page, the Stripe product names, the Resend From domain, and the
ads; say so before any copy work starts.

## 5. Service credentials (after 1 and 2)

**Auth, dashboard, quotas, and fulfillment are coded but have never run; they need Supabase, Resend, and a Stripe webhook.**

Checklist is in `netlify-v10-githubscout-ecommerce/SETUP.md` and `LAUNCH-READINESS.md`. Env names:
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_OPERATOR`,
`STRIPE_PRICE_DIRECTOR`, `RESEND_API_KEY`, `AUTH_EMAIL_FROM`, optional `GHL_WEBHOOK_URL`. Add
values to `~/.api-keys` under a `GitHub Scout` section and to the staging site's Netlify env; a
session then runs `supabase/schema.sql` and checks `/health` for `productionReady: true`.

## 6. Fulfillment model (decision)

**Two paths coexist: the v2 self-serve dashboard and the v9 manual `customer-onboarding.html` form plus email templates; a buyer today gets neither.**

Pick one. Self-serve is what the v2 code and `operator-thank-you.html` promise; manual is what
`docs/customer-onboarding-email-templates.md` and `docs/paid-scan-report-template.md` describe.
The unchosen path gets removed so copy stops promising it.

## 7. Legacy sites (decision)

**v8 and v9 are still live at public URLs and serve the retracted "15 sources" claim, ad-spend-derived savings, fabricated reviews, and a consent-free pixel path.**

Options: delete the sites, 301 them to v10, or leave them. Leaving them keeps the claims the
AD-CLAIMS-GUIDE prohibits on the open web.

## 8. Delete and billing (decision)

**`account-delete.js` erases the account but not the Stripe subscription, so a deleted customer keeps being charged.**

Fixing it means calling the Stripe API from a function (no SDK in the repo; a fetch call is
enough). Say yes and it becomes an M3 unit.

## 9. Pricing direction (whenever)

**The live ladder is $17/$37 subscriptions; the v11-v14 mockups and `netlify-v10-githubscout-ecommerce/LAUNCH-CHECKLIST.md:20` argue $17 cannot carry paid CAC and sketch a $0 / $149 / $950+ / $2.5k+ ladder.**

No code depends on this yet. It decides which copy, Stripe products, and ads get built next.

## 10. Go/no-go on commit and push (when ready)

**Nothing from this session is committed; per house rules no agent pushes without your word.**

Say "commit" for a local commit on a `docs/adopt-repo` branch; say "push" separately.

## Done — kept for history

None yet.

## What you do NOT need to do right now

Everything else is the agents': the code fixes in M3, tests, CI, docs, the ledgers, and the purge
PR itself all proceed without you. Escalation lands here only when something genuinely needs your
action, and the session says so in chat when this file changes.
