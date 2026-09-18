# Tasks for You (the human)

The exact things only you can do, why they matter, and **what stays blocked until you do them**.
Kept in sync with the Blockers index in [`STATUS.md`](STATUS.md) and the stream ledgers under
[`status/`](status/). Any session may add items here (this is also the **decision parking lot**);
whichever session receives your answer records it where it belongs (plan, ledger, doc) and moves
the item to Done. Blocking items go at the top of the table; answering in chat is fine, you never
need to edit this file yourself.

**Last updated:** 2026-09-18

## At a glance

**There is no unblocked engineering left.** PRs #2-#11 closed every code-side defect the gap
analysis found (143 tests pass), and PR #12 added an independent assessment. Everything below
needs your credentials, your money, or your decision.

**Item 1 is urgent and was re-verified today.** Three marketing sites are live, both Stripe
Payment Links still return 200, and the live site publishes fabricated reviews. The
`fulfillmentReady: false` switch we shipped protects the repo, **not** the deployed sites — the
live `assets/launch-config.js` has no such key. A card can be charged today for a product that
cannot fulfil.

| #   | Do this                                                                                                  | Effort  | Unblocks                                         | Priority    |
| --- | -------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------ | ----------- |
| 1   | Take v8/v9/old-v10 offline (or password them) **and** deactivate both Stripe Payment Links               | ~15 min | Stops the active credibility + billing risk      | urgent      |
| 2   | Confirm in Stripe that the unrestricted live secret key was rolled; roll it if unsure                    | ~5 min  | PLT-1, any billing work, M4                      | blocking    |
| 3   | Confirm which accounts you control: Stripe, Netlify (3 sites + staging), Resend, domain                  | ~10 min | PLT-2, M1, deploy planning                       | blocking    |
| 4   | Check Stripe for historical charges on either Payment Link; refund or deliver manually if any exist      | ~5 min  | Whether we owe anyone a report                   | blocking    |
| 5   | Legal: entity name, jurisdiction, business address, support mailbox; rename off "GitHub Scout" or not    | ~15 min | PLT-3, M5, preflight green                       | blocking    |
| 6   | Decide purge scope: `ads/` (57 MB), `cockpit-v2-demo/`, the v9 folder, duplicate MP4s, repo visibility   | ~10 min | PLT-4, M2, history rewrite                       | decision    |
| 7   | Create Supabase project, Resend domain, Stripe webhook; put keys in `~/.api-keys` and Netlify            | ~30 min | PLT-2, M4, everything downstream                 | after 2-3   |
| 8   | Create the Stripe Customer Portal link and paste it into `stripeCustomerPortalUrl`                       | ~5 min  | Online cancellation (legally required)           | before sale |
| 9   | Create a restricted `STRIPE_BILLING_KEY` (Subscriptions: write only) and set it in Netlify               | ~5 min  | Subscribers being able to self-delete            | high        |
| 10  | Fix the two live Stripe product descriptions — they still say "all 15 GitHub Scout sources"              | ~3 min  | An honest receipt                                | high        |
| 11  | Decide the offer: keep $17/$37, or the one-off ~$149 audit the assessment recommends                     | ~15 min | Copy, Stripe products, ads, fulfilment           | decision    |
| 12  | Decide the fulfilment model: self-serve dashboard, or scanner + human audit, not both                    | ~5 min  | Thank-you copy, emails, onboarding page          | decision    |
| 13  | Decide whether the scanner honours `robots.txt` Disallow (Shopify disallows `/cart`, a live source)      | ~5 min  | PLT-5; the published live-source count           | decision    |
| 14  | Say whether the product still intends the GitHub/OSS opportunity repo and BigCommerce/WooCommerce        | ~10 min | Roadmap scope; what copy may promise             | decision    |
| 15  | Break the avatar tie: solo merchant first, or agency (5-30 stores) first — your two advisors disagree    | ~10 min | Items 11 and 12; the whole roadmap               | decision    |
| 16  | Decide whether a Shopify App Store listing is ever the plan (it mandates Shopify billing, not Stripe)    | ~10 min | Money architecture, before more work             | decision    |
| 17  | Apply for Shopify `read_apps` Admin API access, or decide not to (case-by-case, long lead time)          | ~20 min | Real installed-app data vs benchmarks            | decision    |
| 18  | Take down the public Perplexity "V2.1 Opportunity Intelligence Cockpit" page                             | ~5 min  | A 4th public surface selling the retired story   | urgent      |
| 19  | Decide whether your `scout-avatar-pages/` prototype comes into this repo                                 | ~5 min  | Whether it is a foundation or dead weight        | decision    |
| 20  | Approve a merchant-evidence intake policy before any beta asks for invoices                              | ~15 min | Beta outreach; keeping invoices out of telemetry | before beta |
| 21  | Say whether to merge Peter's second research branch (competitor + platform research, 1.7 MB of binaries) | ~2 min  | Keeping the best research we have                | decision    |

---

## 1. The live sites are the active risk (urgent)

**Re-verified 2026-09-18: all three sites return 200, both Payment Links return 200, and the live v9 page still publishes "127 reviews" and "47 founding seats remaining".**

The `fulfillmentReady: false` master switch shipped in PR #8 gates checkout in the **repo**. The
deployed `assets/launch-config.js` on v9 has no `fulfillmentReady` key at all and still carries
`operatorCheckoutUrl: 'https://buy.stripe.com/5kQ8wO…'`. Nothing we merged protects a live visitor.

What is on the public web right now, per the assessment merged as PR #12
([`assessment-report.md`](assessment-report.md) §2a, §6):

- Fabricated social proof: "4.8/5 on G2 · 127 reviews", "4.9/5 on Trustpilot · 89 reviews",
  "#1 on Product Hunt", named testimonials, named client firms with revenue figures, "As Seen In"
  press logos. All invented; there are zero customers.
- "47 founding seats remaining" scarcity, next to copy asserting "this isn't manufactured urgency".
- A "free query" box that says "This is the real engine, not a demo environment" over a
  `setTimeout` returning four canned result sets (v9 `index.html` 1687-1738).
- The retracted savings engine: nytimes.com with a "$250k+" spend band returned **0 detections and
  "$21.6k-$78k/yr"**. The dropdown picks the number, not the scan. A fabricated PayPal fee of
  $80/mo is still billed.
- The live v10 site serves the same v9-shaped payload — it is not the honest engine we built.

There is also a **fourth public surface**: a "V2.1 Opportunity Intelligence Cockpit" page shared
publicly on perplexity.ai with seeded scenario data, still selling the retired 15-source story. It
is on no takedown list (item 18).

Fastest safe action: in Netlify, set each site to password-protected (Site settings, Access
control) or delete it; in Stripe, deactivate both Payment Links. Then tell a session and we will
plan the redirect/retirement properly.

## 2. Stripe key rotation (blocking)

**The repo's own docs say a live unrestricted Stripe secret key was exposed; it is not in this git history, so we cannot tell whether it was rotated.**

Where it came from: `docs/launch-readiness-25-status.md:44` (2026-06-24, the same day
`scripts/create-stripe-githubscout-links.js` landed; it reads `STRIPE_SECRET_KEY` from env or
stdin), then `docs/weekend-launch-qa-checklist.md:7`, and on 2026-07-08
`netlify-v10-githubscout-ecommerce/SETUP.md`, `LAUNCH-CHECKLIST.md`, `LAUNCH-READINESS.md`,
`docs/SECRETS-PURGE.md`. A full-history grep for `sk_live_`, `rk_live_`, `whsec_`, and JWT prefixes
found only placeholders.

What to do: Stripe dashboard, Developers, API keys. If there is any doubt, roll the secret key and
create a restricted key for future scripting. Tell a session "key rolled" and it closes PLT-1.

## 3. Account ownership (blocking)

**Everything was built under `peter72289-lab`; we need to know which dashboards you can actually log into.**

Partly answered since the last revision: **the GitHub remote works.** This session pushed eleven
PRs to `peter72289-lab/github-scout-project` as `matthewbergvinson` with push (not admin) rights.
Admin is still needed to change repo visibility, so item 6's "make private" is not something a
session can do.

Still unknown: Netlify site ids `3f86b1e7-…` (v9), `c7971299-…` (v10), `84089b10-…` (staging,
empty); Stripe (Payment Links `buy.stripe.com/5kQ8wO…` and `…/dRm28q…`, price ids in
`docs/checkout-readiness.md:17,20`); domain `githubscout.ai` (NXDOMAIN). No Supabase or Resend
project is referenced anywhere.

`.github/ISSUE_TEMPLATE/config.yml` links to this file at that remote; it resolves now that the
repo is public and the file is pushed, and must be updated if the remote or visibility changes.

## 4. Has anyone actually paid? (blocking)

**Both Payment Links have been live and reachable since June. If anyone bought, they received nothing — no account, no email, no report.**

Stripe dashboard, Payments, filtered to those two links. If there are charges: refund them, or
deliver a manual audit using `docs/paid-scan-report-template.md`, and tell a session so the
fulfilment gap is recorded. If there are none, say so and this closes.

## 5. Legal entity, support mailbox, and the name (blocking)

**`terms.html` and `privacy.html` still read `[[LEGAL ENTITY NAME]]`, `[[GOVERNING JURISDICTION]]`, `[[BUSINESS ADDRESS]]`, `[[SUPPORT EMAIL]]`; preflight exits 1 until they are filled, which is correct.**

Also needed: a support mailbox that exists (`support@githubscout.ai` is on a domain that does not
resolve, and it is the refund, privacy, and deletion contact on every legal page), and a decision on
renaming off "GitHub Scout". The product does not call GitHub at all, so the name implies an
affiliation that does not exist — flagged in `LAUNCH-CHECKLIST.md:14`, `LAUNCH-READINESS.md:43`,
and again in the assessment. A rename touches every page, the Stripe product names, the Resend From
domain, and the ads; say so before any copy work starts.

## 6. Purge scope (decision)

**Most of the original list is already gone. What remains is media and a visibility call.**

Deleted in PR #9 (no action needed): the 5.2 MB deploy zip, 12 verification PNGs, the four
launchpad mockups, `netlify-v8-githubscout/`, the orphaned Python prototype, and v10's dead assets.
Working tree went 84 MB -> 73 MB.

Still here, needing your call:

- `ads/` — **57 MB, 78% of the remaining tree.** Several creatives bake in "15 sources". Recommend
  removing from git and keeping elsewhere; they must be regenerated before any paid traffic anyway.
- `cockpit-v2-demo/` — 4.8 MB, including a 60s MP4 of a dashboard that is not in the product.
- `netlify-v9-githubscout-ecommerce/` — 5.7 MB. Tied to item 1; delete once the site is retired.
- The same MP4 is tracked **four times** (`cockpit-v2-demo/` x2, v9 `assets/`, v10 `assets/`). Keep one.
- `assets/launch-config.js` is listed in v10's `.gitignore` yet tracked. The Payment Links in it are
  public anyway. Recommend dropping the ignore rule so the file is honestly tracked.
- **Repo visibility.** Still public (verified today). Needs your admin rights.

Note: deleting files from the tree does **not** shrink `.git` (still 73 MB). That needs a history
rewrite, which you run per `netlify-v10-githubscout-ecommerce/docs/SECRETS-PURGE.md`.

## 7. Service credentials (after 2 and 3)

**Auth, dashboard, quotas, telemetry, and fulfilment are all coded and tested but have never run against a real service.**

Checklist is in `netlify-v10-githubscout-ecommerce/SETUP.md`. The full env list, verified against
the code today:

| Variable                                         | Needed for                                                                              |
| ------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`      | Accounts, sessions, quotas, saved scans, telemetry                                      |
| `STRIPE_WEBHOOK_SECRET`                          | Turning a payment into an entitlement                                                   |
| `STRIPE_PRICE_OPERATOR`, `STRIPE_PRICE_DIRECTOR` | Mapping a purchase to the right plan                                                    |
| `RESEND_API_KEY`, `AUTH_EMAIL_FROM`              | Magic-link sign-in and the welcome email                                                |
| `SCAN_TELEMETRY_SALT`                            | New in PR #10. Without it `store_hash` is written null and repeat-scan analysis is lost |
| `STRIPE_SECRET_KEY`                              | Optional, restricted **read-only**; makes plan resolution automatic                     |
| `STRIPE_BILLING_KEY`                             | Item 9 below — restricted, Subscriptions:write                                          |
| `SCAN_CONTACT_EMAIL`                             | Optional; adds a `From` header to outbound crawls                                       |
| `GHL_WEBHOOK_URL` / `LEAD_WEBHOOK_URL`           | Optional lead forwarding (disclosed on `subprocessors.html`)                            |

Add values to `~/.api-keys` under a `GitHub Scout` section and to the staging site's Netlify env; a
session then applies `supabase/schema.sql` and checks `/health` for `productionReady: true`.

## 8. Stripe Customer Portal link (before the first sale)

**`refunds.html` promises that cancellation stops future charges, and there is no way for a customer to cancel online. California's Automatic Renewal Law requires one for anything sold online.**

Stripe Dashboard, Settings, Billing, Customer portal: enable cancellation and payment-method
updates, create a login link, paste it into `stripeCustomerPortalUrl` in
`netlify-v10-githubscout-ecommerce/assets/launch-config.js`.

Already wired: the "Manage billing" controls on `dashboard.html` and `refunds.html` are removed
from the page entirely while that value is empty, so nothing renders a dead cancel link meanwhile.

## 9. Restricted Stripe billing key (high)

**Without it, a subscriber cannot delete their account — deletion refuses rather than erasing the record of a subscription that would keep charging them.**

Create a _restricted_ key with **Subscriptions: write** and nothing else, and set it in Netlify as
`STRIPE_BILLING_KEY`. Deliberately not the same key as `STRIPE_SECRET_KEY` (read-only, used by the
public webhook endpoint) — the webhook should never hold write access to billing.

## 10. Live Stripe product descriptions (high)

**Both live products still tell every customer, on their receipt, that they get "all 15 GitHub Scout sources". There are 10.**

PR #5 fixed the generator script; it cannot reach products that already exist. In the Stripe
Dashboard, Products, edit the description on both (and in test mode too, if provisioned):

- **Operator** ($17/mo): `10 storefront URL analyses per month across all 10 live GitHub Scout detection sources (15 planned).`
- **Director** ($37/mo): `30 storefront URL analyses per month across all 10 live GitHub Scout detection sources (15 planned).`

## 11. The offer (decision)

**Three positions are on the table and they imply different products.**

- **What is live:** $17/mo (10 scans) and $37/mo (30 scans) subscriptions.
- **What the repo's own docs argue** (`LAUNCH-CHECKLIST.md:20`, `docs/GAP-TO-MARKET.md` Phase 2):
  $17 cannot carry paid CAC; a one-off ~$149 audit plus an agency seat fits better.
- **What the assessment recommends** ([`assessment-report.md`](assessment-report.md) §5): ship only
  a Shopify audit at ~$149, fulfilled by scanner **plus** a human review, keep the free teaser as
  the lead magnet, and retire $17/$37 until fulfilment is proven.

The engineering argument for the last one: the automated report is templated strings and a four-line
action plan, the free teaser already shows the top apps and two recommendations, and merchants can
already see their app list in Shopify Admin. One store also does not need ten scans a month.

**New and materially adverse:** research on Peter's second branch found a direct competitor we did
not know existed. **CostPilot Pro** (`apps.shopify.com/spendlens`, launched 2026-08-27) scans a
storefront, detects duplicate apps, flags unused subscriptions, suggests Shopify-native
replacements and shows estimated costs — our exact pitch — at **$9.99/mo or $79/yr**, which is 59%
of Operator's price. It has zero reviews, so there is no traction yet; that is the opening, but it
caps what a thin automated report can charge. A second one, `Shopify App Cost Auditor`, is a free
Chrome extension doing curated price lookup and redundancy grouping.

Also relevant: **Shopify Sidekick is free with every Shopify plan and sits inside the admin**, which
is the zero-friction substitute for a solo merchant; **Koala Inspector** ($22/mo) already does public
Shopify stack detection; and **Vitals** ($29.99/mo) sells consolidation directly. Detection is not
the moat — the reviewed, cited audit is.

Your call. It decides which copy, which Stripe products, and which ads get built next.

## 12. Fulfilment model (decision)

**Two paths still coexist: the v2 self-serve dashboard, and the manual `customer-onboarding.html` form plus the email templates in `docs/`. Thank-you copy can promise both.**

Pick one; the other gets removed so copy stops promising it. This follows directly from item 11 —
a ~$149 reviewed audit implies the manual path, a subscription implies self-serve.

## 13. robots.txt Disallow (decision)

**The scanner fetches `robots.txt` as an evidence source but never evaluates its `Disallow` rules, and Shopify's default `robots.txt` disallows `/cart` — which the `cart-html` adapter fetches on every scan.**

- **Honour Disallow.** Most defensible, and consistent with an integrity-first product. Cost:
  `cart-html` drops for nearly every Shopify store, the published live-source count goes from 10 to
  9, and cart-only signals (some upsell and checkout apps) stop being detected.
- **Keep fetching `/cart`, transparently.** The merchant submitted their own storefront, we fetch
  one page at low volume, and we identify ourselves so any operator can block or contact us. Cost:
  still a norms violation someone could fairly write up.

Already decided and shipped: the crawler **stays identifiable**. A browser-shaped User-Agent was
tried, measured against five live storefronts, changed zero source counts, and was reverted — a
disguised UA plus unevaluated Disallow rules would have been evasion for no gain.

## 14. Is the original concept still the plan? (decision)

**The assessment was written against a founder brief describing a product that is much larger than what exists, and we should not build toward it by accident.**

That brief describes (a) a P&L waste calculator spanning Shopify **and BigCommerce and
WooCommerce**, and (b) a repository of opportunities scraped from GitHub and other OSS sources, for
two avatars: solo marketing managers, and multi-store/agency users.

Where the code actually is: Shopify only. BigCommerce exists as a single checkout-host pattern; there
is no WooCommerce support at all; and nothing anywhere queries GitHub, GitLab, HN, or Product Hunt —
the "15 open-source intelligence platforms" on the live site are not implemented in any form. The
agency story is a contact form; Director is a volume knob, not a portfolio product.

Confirm which of these is still the intent. The assessment's view is that the OSS opportunity repo is
a separate company (crawlers, ToS, ranking, freshness, a different buyer) and should not be bolted
onto the audit MVP, and that BigCommerce/WooCommerce should wait for real beta demand. If you agree,
a session will strip the leftover copy that still promises them.

## 15. Which avatar comes first (decision)

**Your two advisors landed on opposite buyers, and everything downstream depends on which wins.**

- The merged assessment ([`assessment-report.md`](assessment-report.md) §5) says solo Shopify
  merchant first, one-off ~$149 audit, "agency seat later, not in the MVP".
- Peter's second research branch says the primary buyer is "a Shopify-focused agency managing
  approximately 5-30 stores".
- `docs/GAP-TO-MARKET.md` Phase 2 currently hedges and proposes both.

Evidence for the agency side that we did not have before: ManageWP, MainWP and WP Umbrella
(from $1.99/site/mo) prove agencies already pay for portfolio monitoring — though that is
WordPress, not Shopify. Evidence for the solo side: it is a far shorter path to a first dollar.

One of them has to lose. This unblocks items 11 and 12.

## 16. Shopify App Store distribution (decision)

**If the product is ever listed on the Shopify App Store, Shopify mandates Shopify-provided billing. The Stripe Payment Link architecture does not port.**

Nothing in our docs mentioned this. It is worth deciding before any more money-path engineering,
because "list on the App Store" and "sell via Stripe" are different architectures, and we have
already built the second one.

## 17. Shopify `read_apps` API access (decision)

**This is the difference between a benchmark estimate and a real audit, and only you can apply for it.**

Research on Peter's branch found that Shopify's `currentAppInstallation` returns only the
authenticated app's own installation — not a ledger of the merchant's other app bills. Real
installed-app and billing data needs `read_apps` scope, which per Shopify staff replies is approved
**case-by-case**, with inconsistent reference documentation. It needs validating with a dev app
before we promise automated inventory anywhere in copy.

Long lead time. Either start it or rule it out.

## 18. The Perplexity page (urgent)

**A "V2.1 Opportunity Intelligence Cockpit" is publicly shared on perplexity.ai with seeded scenario data, selling the retired 15-source concept.**

It is a fourth public surface and is not on any takedown list. Same reasoning as item 1.

## 19. Your `scout-avatar-pages/` prototype (decision)

**You have a newer analyser nobody working in this repo can see.**

Peter's research references `scout-avatar-pages/`, its own git repo at `0b6d887` dated 2026-09-09:
a Cloudflare Worker that analyses a public homepage over HTTPS, with DNS and redirect validation, a
per-isolate rate limiter, and 13 passing local tests he ran. He calls it "a candidate foundation,
not deployed evidence". It does not exist in this checkout.

Either it comes in as a candidate foundation, or it is declared dead. Right now it is a second
codebase competing with `netlify-v10-githubscout-ecommerce/` and no one here can evaluate it.

## 20. Merchant-evidence intake policy (before any beta)

**`docs/BETA-OUTREACH.md` assumes we can just ask merchants for their invoices. We should not, until you approve how they are handled.**

The moment a beta merchant sends a real app invoice, we are holding their commercial records.
Needed before that: required fields, redaction instructions, how they are transferred and stored,
who can read them, consent and revocation, retention and deletion — and an explicit rule keeping
them out of `scan_events`, which is deliberately PII-free and cannot be reached by an erasure
request.

## 21. Peter's second research branch (decision)

**The best research of the three is on a branch with no PR, and merging it has one real cost.**

`origin/codex/research-assessment-2026-09-09` contains competitor research (18 entries, prices
first-party-sourced and dated), the Shopify/BigCommerce/WooCommerce platform-feasibility findings,
and a savings model with a five-state evidence ladder (installed / active / observed / used /
billed) plus first-year net cash — which subtracts replacement cost, hosting, migration labour and
overlap. Its worked example: a $120/mo app replaced by $30 software + $15 hosting + $17 Scout nets
$58/mo, but at $900 setup the **first year is -$204**. Our engine reports gross benchmark savings
only and cannot currently make that argument.

The cost: it adds ~1.7 MB of binaries (a 1 MB PDF and 8 screenshots) to a repo whose `.git` is
already 73 MB and whose history-rewrite decision (item 6) is still open.

Options: merge as-is; merge the markdown only and drop the binaries; or leave the branch unmerged
and cite it. Recommend **markdown only** — the research is the value, and it keeps item 6 clean.

A third branch, `origin/research/2026-09-09-assessment`, is an earlier draft of the same work with
broken image paths pointing at a local home directory. Recommend deleting it.

## Done — kept for history

- **Account delete vs billing** (was item 8). Decided yes and shipped in PR #7: deletion cancels the
  Stripe subscription before erasing rows, and refuses outright if it cannot. Superseded by item 9,
  which supplies the key it needs.
- **Go/no-go on commit and push** (was item 10). Granted 2026-08-20. Eleven PRs (#2-#11) were merged
  into `main`, plus the assessment as PR #12.

## What you do NOT need to do right now

Nothing in the codebase. Tests, CI, docs, the ledgers, and the purge PR itself are the agents' work.
Escalation lands here only when something genuinely needs your action, and the session says so in
chat when this file changes.
